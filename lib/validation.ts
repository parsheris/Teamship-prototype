import { FUTURE_SKEW_MS } from "./datetime"
import { FEEDBACK_CATEGORIES, HAPPINESS_LEVELS } from "./types"
import type { FeedbackCategory, HappinessLevel } from "./types"

const CATEGORY_LOOKUP = new Map<string, FeedbackCategory>(
  FEEDBACK_CATEGORIES.map((category) => [category.toLowerCase(), category]),
)

export const MAX_NAME_LENGTH = 80
export const MAX_MESSAGE_LENGTH = 2000
export const PIN_LENGTH = 4

export type NormalizedFeedback = {
  employee_name: string
  category: FeedbackCategory
  message: string
  happiness: HappinessLevel | null
  local_id?: string
  submitted_at?: string
  occurred_at?: string
}

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string }

export function normalizeCategory(value: unknown): FeedbackCategory {
  if (typeof value !== "string") return "Other"
  return CATEGORY_LOOKUP.get(value.trim().toLowerCase()) ?? "Other"
}

export function normalizePin(value: unknown): string | null {
  if (typeof value !== "string") return null
  const pin = value.trim()
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin) ? pin : null
}

export function normalizeName(value: unknown): string {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, MAX_NAME_LENGTH)
}

export function normalizeHappiness(value: unknown): HappinessLevel | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null
  return HAPPINESS_LEVELS.includes(value as HappinessLevel) ? (value as HappinessLevel) : null
}

export function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  const now = Date.now()
  if (date.getTime() > now + FUTURE_SKEW_MS) return undefined

  return date.toISOString()
}

export function normalizeOccurredAt(
  value: unknown,
): ValidationResult<string | undefined> {
  if (value === undefined || value === null) return { ok: true, value: undefined }
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, error: "The date and time could not be read." }
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "The date and time could not be read." }
  }

  if (date.getTime() > Date.now() + FUTURE_SKEW_MS) {
    return { ok: false, error: "The date and time cannot be in the future." }
  }

  return { ok: true, value: date.toISOString() }
}

export function normalizeLocalId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const id = value.trim()
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : undefined
}

export function normalizeFeedbackInput(value: unknown): ValidationResult<NormalizedFeedback> {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Invalid feedback payload." }
  }

  const input = value as Record<string, unknown>
  const message = typeof input.message === "string" ? input.message.trim() : ""
  const employeeName = normalizeName(input.employee_name)
  const happiness = normalizeHappiness(input.happiness)

  if (!message && !employeeName && happiness === null) {
    return { ok: false, error: "Please answer at least one question." }
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Feedback must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    }
  }

  const occurredAt = normalizeOccurredAt(input.occurred_at)
  if (!occurredAt.ok) return occurredAt

  return {
    ok: true,
    value: {
      employee_name: employeeName,
      category: normalizeCategory(input.category),
      message,
      happiness,
      local_id: normalizeLocalId(input.local_id),
      submitted_at: normalizeDate(input.submitted_at),
      occurred_at: occurredAt.value,
    },
  }
}
