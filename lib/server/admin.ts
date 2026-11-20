import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"
import type { NextRequest } from "next/server"

import { PIN_LENGTH, normalizePin } from "@/lib/validation"

import { getDataFile, readJsonFile, withFileLock, writeJsonFile } from "./json-store"

export const ADMIN_COOKIE = "spark_kiosk_admin"
export const SESSION_TTL_SECONDS = 60 * 60 * 8

const DEFAULT_DEV_PIN = "1234"
const FALLBACK_SECRET = "spark-kiosk-insecure-development-secret"

let sessionSecret: string | null = null

type AdminStore = {
  pin_hash: string
  updated_at: string
}

type SessionPayload = {
  exp: number
  v: string
}

function adminFile(): string {
  return getDataFile("admin.json")
}

function getSessionSecret(): string {
  if (sessionSecret) return sessionSecret

  const configured = process.env.ADMIN_SESSION_SECRET?.trim()
  if (configured) {
    sessionSecret = configured
    return sessionSecret
  }

  if (process.env.NODE_ENV !== "production") {
    sessionSecret = FALLBACK_SECRET
    return sessionSecret
  }

  const secretFile = getDataFile("session-secret")
  try {
    const existing = readFileSync(secretFile, "utf8").trim()
    if (existing) {
      sessionSecret = existing
      return existing
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }

  const generated = randomBytes(48).toString("base64url")
  mkdirSync(path.dirname(secretFile), { recursive: true, mode: 0o700 })

  const temporaryFile = `${secretFile}.${process.pid}.tmp`
  writeFileSync(temporaryFile, `${generated}\n`, { encoding: "utf8", mode: 0o600 })
  renameSync(temporaryFile, secretFile)

  sessionSecret = generated
  console.info("[spark-kiosk] Created a persistent admin session secret in the data directory.")
  return generated
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(pin, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

function verifyHash(pin: string, stored: string): boolean {
  const [salt, expected] = stored.split(":")
  if (!salt || !expected) return false

  const actual = scryptSync(pin, salt, 64).toString("hex")
  return safeEqual(actual, expected)
}

export function getInitialPin(): string {
  const configured = normalizePin(process.env.ADMIN_PIN)
  if (configured) return configured

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ADMIN_PIN must be set before the first production start. Set a 4-digit PIN and restart.",
    )
  }

  return DEFAULT_DEV_PIN
}

async function readAdminStore(): Promise<AdminStore> {
  const existing = await readJsonFile<AdminStore | null>(adminFile(), null)
  if (existing?.pin_hash && existing.updated_at) return existing

  return withFileLock(adminFile(), async () => {
    const rechecked = await readJsonFile<AdminStore | null>(adminFile(), null)
    if (rechecked?.pin_hash && rechecked.updated_at) return rechecked

    const created: AdminStore = {
      pin_hash: hashPin(getInitialPin()),
      updated_at: new Date().toISOString(),
    }
    await writeJsonFile(adminFile(), created)
    return created
  })
}

export async function verifyAdminPin(pin: string): Promise<boolean> {
  const normalized = normalizePin(pin)
  if (!normalized) return false

  const store = await readAdminStore()
  return verifyHash(normalized, store.pin_hash)
}

export async function setAdminPin(pin: string): Promise<void> {
  const normalized = normalizePin(pin)
  if (!normalized) throw new Error(`PIN must be exactly ${PIN_LENGTH} digits.`)

  await withFileLock(adminFile(), async () => {
    await writeJsonFile(adminFile(), {
      pin_hash: hashPin(normalized),
      updated_at: new Date().toISOString(),
    } satisfies AdminStore)
  })
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url")
}

function isSecureRequest(request: NextRequest): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto")
  if (forwardedProto) return forwardedProto.split(",")[0]?.trim() === "https"
  return request.nextUrl.protocol === "https:"
}

export async function createSession(
  request: NextRequest,
): Promise<{ token: string; maxAge: number; secure: boolean }> {
  const store = await readAdminStore()
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    v: store.updated_at,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")

  return {
    token: `${encoded}.${signPayload(encoded)}`,
    maxAge: SESSION_TTL_SECONDS,
    secure: isSecureRequest(request),
  }
}

export async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ADMIN_COOKIE)?.value
  if (!token) return false

  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) return false
  if (!safeEqual(signature, signPayload(encoded))) return false

  let payload: SessionPayload
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload
  } catch {
    return false
  }

  if (
    !payload ||
    typeof payload.exp !== "number" ||
    typeof payload.v !== "string" ||
    payload.exp <= Math.floor(Date.now() / 1000)
  ) {
    return false
  }

  const store = await readAdminStore()
  return payload.v === store.updated_at
}
