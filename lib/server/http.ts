import { NextResponse } from "next/server"

export function noStoreJson(data: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(data, init)
  response.headers.set("Cache-Control", "no-store, max-age=0")
  return response
}

export function unauthorized(): NextResponse {
  return noStoreJson({ error: "Admin authentication required." }, { status: 401 })
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return noStoreJson(
    {
      error: `Too many attempts. Try again in ${retryAfterSeconds} second${
        retryAfterSeconds === 1 ? "" : "s"
      }.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  )
}
