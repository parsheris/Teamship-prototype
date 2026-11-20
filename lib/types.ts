export const FEEDBACK_CATEGORIES = [
  "Workplace",
  "Safety",
  "Equipment",
  "Management",
  "Scheduling",
  "Other",
] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export const HAPPINESS_LEVELS = [1, 2, 3, 4, 5] as const
export type HappinessLevel = (typeof HAPPINESS_LEVELS)[number]

export const HAPPINESS_LABELS: Record<HappinessLevel, string> = {
  1: "Very unsatisfied",
  2: "Unsatisfied",
  3: "Neutral",
  4: "Satisfied",
  5: "Very satisfied",
}

export type KioskFormFields = {
  name: boolean
  category: boolean
  happiness: boolean
  message: boolean
  datetime: boolean
}

export const DEFAULT_FORM_FIELDS: KioskFormFields = {
  name: true,
  category: true,
  happiness: true,
  message: true,
  datetime: true,
}

export type FeedbackInput = {
  employee_name?: string
  category?: string
  message: string
  happiness?: HappinessLevel
  local_id?: string
  submitted_at?: string
  occurred_at?: string
}

export type ComplaintRecord = {
  id: string
  local_id: string
  employee_name: string
  category: string
  message: string
  happiness?: HappinessLevel
  submitted_at: string
  occurred_at?: string
  created_date: string
}

export type QueuedComplaint = {
  local_id: string
  employee_name: string
  category: string
  message: string
  happiness: HappinessLevel | null
  submitted_at: string
  occurred_at: string | null
  synced: boolean
}

export type KioskSettings = {
  form_timeout: number
  form_fields: KioskFormFields
  last_sync_at: string | null
}

export type SyncStatus = {
  type: "success" | "error"
  text: string
}
