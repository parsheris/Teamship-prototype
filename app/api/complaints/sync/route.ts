import type { NextRequest } from "next/server"

import { hasValidSession } from "@/lib/server/admin"
import { createComplaints } from "@/lib/server/complaints"
import { noStoreJson, unauthorized } from "@/lib/server/http"

const MAX_BATCH_SIZE = 500

export async function POST(request: NextRequest) {
  if (!(await hasValidSession(request))) return unauthorized()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noStoreJson({ error: "Invalid JSON body." }, { status: 400 })
  }

  const items =
    body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items)
      ? (body as { items: unknown[] }).items
      : null

  if (!items) {
    return noStoreJson({ error: "Expected an items array." }, { status: 400 })
  }

  if (items.length > MAX_BATCH_SIZE) {
    return noStoreJson(
      { error: `Sync batches are limited to ${MAX_BATCH_SIZE} entries.` },
      { status: 413 },
    )
  }

  const result = await createComplaints(items)
  return noStoreJson(result)
}
