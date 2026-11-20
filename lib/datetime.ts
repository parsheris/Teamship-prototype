export const FUTURE_SKEW_MS = 5 * 60 * 1000

export type DateTimeParts = {
  date: string
  time: string
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

export function toDateTimeParts(value: Date): DateTimeParts {
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  }
}

export function parseDateTimeParts(dateValue: string, timeValue: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue)
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeValue)
  if (!dateMatch || !timeMatch) return null

  const year = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const day = Number(dateMatch[3])
  const hour = Number(timeMatch[1])
  const minute = Number(timeMatch[2])
  const second = Number(timeMatch[3] ?? 0)

  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (hour > 23 || minute > 59 || second > 59) return null

  const parsed = new Date(year, month - 1, day, hour, minute, second, 0)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return parsed
}

export function partsToIso(parts: DateTimeParts): string | null {
  return parseDateTimeParts(parts.date, parts.time)?.toISOString() ?? null
}

export function isoToDateTimeParts(value: string | null | undefined): DateTimeParts | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return toDateTimeParts(parsed)
}

export function isFutureDateTime(value: Date, now = Date.now()): boolean {
  return value.getTime() > now + FUTURE_SKEW_MS
}

export function occurredTime(record: {
  occurred_at?: string | null
  submitted_at: string
}): number {
  const occurred = record.occurred_at ? Date.parse(record.occurred_at) : Number.NaN
  if (!Number.isNaN(occurred)) return occurred

  const submitted = Date.parse(record.submitted_at)
  return Number.isNaN(submitted) ? Number.NEGATIVE_INFINITY : submitted
}

export function formatDateTime(value: string): { date: string; time: string; iso: string } {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return { date: "Unknown date", time: "", iso: "" }
  }

  return {
    date: parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: parsed.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    }),
    time: parsed.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
    iso: parsed.toISOString(),
  }
}

export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}
