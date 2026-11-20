import type { ComplaintRecord, FeedbackInput, QueuedComplaint } from "./types"

type ApiErrorPayload = {
  error?: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

const REQUEST_TIMEOUT_MS = 10_000

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response: Response

  try {
    response = await fetch(path, {
      cache: "no-store",
      credentials: "same-origin",
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      signal: controller.signal,
    })
  } catch {
    throw new ApiError(
      controller.signal.aborted
        ? "The kiosk server is not responding. Please try again."
        : "Network unavailable. Your entry stays saved on this device.",
      0,
    )
  } finally {
    window.clearTimeout(timeout)
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null
    throw new ApiError(payload?.error ?? "Something went wrong. Please try again.", response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export type ComplaintsQuery = {
  category?: string
  since?: string
  until?: string
  limit?: number
}

export async function fetchComplaints(query: ComplaintsQuery = {}): Promise<ComplaintRecord[]> {
  const params = new URLSearchParams()
  if (query.category && query.category !== "all") params.set("category", query.category)
  if (query.since) params.set("since", query.since)
  if (query.until) params.set("until", query.until)
  if (query.limit) params.set("limit", String(query.limit))

  const suffix = params.size > 0 ? `?${params.toString()}` : ""
  const data = await request<{ items: ComplaintRecord[] }>(`/api/complaints${suffix}`)
  return data.items
}

export function submitComplaint(
  record: Pick<
    FeedbackInput,
    "employee_name" | "category" | "message" | "happiness" | "occurred_at"
  > & {
    local_id?: string
    submitted_at?: string
  },
): Promise<{ item: ComplaintRecord; duplicate: boolean }> {
  return request("/api/complaints", {
    method: "POST",
    body: JSON.stringify(record),
  })
}

export type SyncResult = {
  uploaded: number
  duplicates: number
  invalid: number
  synced_ids: string[]
}

export function syncComplaints(items: QueuedComplaint[]): Promise<SyncResult> {
  return request("/api/complaints/sync", {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

export function loginAdmin(pin: string): Promise<{ ok: true }> {
  return request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ pin }),
  })
}

export function logoutAdmin(): Promise<{ ok: true }> {
  return request("/api/admin/logout", { method: "POST" })
}

export async function hasAdminSession(): Promise<boolean> {
  try {
    await request<{ authenticated: true }>("/api/admin/session")
    return true
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return false
    throw error
  }
}

export function updateAdminPin(pin: string): Promise<{ ok: true }> {
  return request("/api/admin/pin", {
    method: "PUT",
    body: JSON.stringify({ pin }),
  })
}
