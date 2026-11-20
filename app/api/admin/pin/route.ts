import type { NextRequest } from "next/server"

import {
  ADMIN_COOKIE,
  createSession,
  hasValidSession,
  setAdminPin,
} from "@/lib/server/admin"
import { noStoreJson, unauthorized } from "@/lib/server/http"
import { normalizePin } from "@/lib/validation"

export async function PUT(request: NextRequest) {
  if (!(await hasValidSession(request))) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 })
  }

  const pin = normalizePin((body as { pin?: unknown } | null)?.pin)
  if (!pin) {
    return noStoreJson({ error: "PIN must be exactly 4 digits." }, { status: 400 })
  }

  await setAdminPin(pin)

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
