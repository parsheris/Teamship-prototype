import type { NextRequest } from "next/server"

import { hasValidSession } from "@/lib/server/admin"
import { noStoreJson, unauthorized } from "@/lib/server/http"

export async function GET(request: NextRequest) {
  if (!(await hasValidSession(request))) return unauthorized()
  return noStoreJson({ authenticated: true })
}
