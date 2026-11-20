import type { NextRequest } from "next/server"

import { hasValidSession } from "@/lib/server/admin"
import { createComplaint, listComplaints } from "@/lib/server/complaints"
import { noStoreJson, tooManyRequests, unauthorized } from "@/lib/server/http"
import { consumeRateLimit, getClientIp } from "@/lib/server/rate-limit"
import { normalizeFeedbackInput } from "@/lib/validation"

export async function GET(request: NextRequest) {
  if (!(await hasValidSession(request))) return unauthorized()

  const { searchParams } = request.nextUrl
  const items = await listComplaints({
    category: searchParams.get("category"),
    since: searchParams.get("since"),
    until: searchParams.get("until"),
    limit: Number(searchParams.get("limit") ?? 100),
  })

  return noStoreJson({ items })
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const limit = consumeRateLimit(`complaints:${ip}`, 30, 60_000)
  if (!limit.allowed) return tooManyRequests(limit.retryAfterSeconds)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 })
  }

  const validated = normalizeFeedbackInput(body)
  if (!validated.ok) {
    return noStoreJson({ error: validated.error }, { status: 400 })
  }

  try {
    const result = await createComplaint(validated.value)
    return noStoreJson(result, { status: result.duplicate ? 200 : 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save feedback."
    return noStoreJson({ error: message }, { status: 400 })
  }
}
