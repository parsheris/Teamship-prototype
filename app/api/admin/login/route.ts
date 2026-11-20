import type { NextRequest } from "next/server"

import {
  ADMIN_COOKIE,
  createSession,
  verifyAdminPin,
} from "@/lib/server/admin"
import { noStoreJson, tooManyRequests } from "@/lib/server/http"
import { consumeRateLimit, getClientIp, resetRateLimit } from "@/lib/server/rate-limit"
import { normalizePin } from "@/lib/validation"

const LOGIN_WINDOW_MS = 5 * 60_000

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimitKey = `admin-login:${ip}`
  const globalRateLimitKey = "admin-login:global"

  const limit = consumeRateLimit(rateLimitKey, 5, LOGIN_WINDOW_MS)
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds)

  const globalLimit = consumeRateLimit(globalRateLimitKey, 10, LOGIN_WINDOW_MS)
  if (!globalLimit.allowed) return tooManyRequests(globalLimit.retryAfterSeconds)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 })
  }

  const pin = normalizePin((body as { pin?: unknown } | null)?.pin)
  if (!pin) {
    return noStoreJson({ error: "Enter a 4-digit PIN." }, { status: 400 })
  }

  let valid: boolean
  try {
    valid = await verifyAdminPin(pin)
  } catch (error) {
    console.error("[spark-kiosk] Admin initialization failed:", error)
    return noStoreJson(
      { error: "Admin setup is incomplete. Set ADMIN_PIN and restart the server." },
      { status: 503 },
    )
  }

  if (!valid) {
    return noStoreJson({ error: "Incorrect PIN." }, { status: 401 })
  }

  resetRateLimit(rateLimitKey)
  resetRateLimit(globalRateLimitKey)
  const session = await createSession(request)
  const response = noStoreJson({ ok: true })

  response.cookies.set({
    name: ADMIN_COOKIE,
    value: session.token,
    httpOnly: true,
    sameSite: "strict",
    secure: session.secure,
    path: "/",
    maxAge: session.maxAge,
  })

  return response
}
