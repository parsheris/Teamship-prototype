import { ADMIN_COOKIE } from "@/lib/server/admin"
import { noStoreJson } from "@/lib/server/http"

export async function POST() {
  const response = noStoreJson({ ok: true })
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })
  return response
}
