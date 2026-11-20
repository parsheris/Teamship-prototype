import { DEFAULT_FORM_FIELDS } from "./types"
import type { FeedbackInput, KioskFormFields, KioskSettings, QueuedComplaint } from "./types"
import { normalizeCategory, normalizeFeedbackInput } from "./validation"

const QUEUE_KEY = "spark-kiosk:queue:v1"
const SETTINGS_KEY = "spark-kiosk:settings:v1"
const QUEUE_EVENT = "spark-kiosk:queue-changed"
const SETTINGS_EVENT = "spark-kiosk:settings-changed"
const MAX_QUEUE_ITEMS = 2000
const EMPTY_QUEUE: QueuedComplaint[] = []

const DEFAULT_SETTINGS: KioskSettings = {
  form_timeout: 90,
  form_fields: { ...DEFAULT_FORM_FIELDS },
  last_sync_at: null,
}

let settingsCache: KioskSettings | null = null
let queueCache: QueuedComplaint[] | null = null
let queueRawCache: string | null = null

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeFormFields(value: unknown): KioskFormFields {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {}

  return {
    name: typeof input.name === "boolean" ? input.name : DEFAULT_FORM_FIELDS.name,
    category: typeof input.category === "boolean" ? input.category : DEFAULT_FORM_FIELDS.category,
    happiness: typeof input.happiness === "boolean" ? input.happiness : DEFAULT_FORM_FIELDS.happiness,
    message: typeof input.message === "boolean" ? input.message : DEFAULT_FORM_FIELDS.message,
    datetime: typeof input.datetime === "boolean" ? input.datetime : DEFAULT_FORM_FIELDS.datetime,
  }
}

function normalizeSettings(value: unknown): KioskSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS

  const input = value as Record<string, unknown>
  const rawTimeout = Number(input.form_timeout)
  const formTimeout = Number.isFinite(rawTimeout)
    ? Math.min(600, Math.max(15, Math.round(rawTimeout)))
    : DEFAULT_SETTINGS.form_timeout

  const lastSync =
    typeof input.last_sync_at === "string" && !Number.isNaN(new Date(input.last_sync_at).getTime())
      ? input.last_sync_at
      : null

  return {
    form_timeout: formTimeout,
    form_fields: normalizeFormFields(input.form_fields),
    last_sync_at: lastSync,
  }
}

function normalizeQueuedComplaint(value: unknown): QueuedComplaint | null {
  if (!value || typeof value !== "object") return null

  const input = value as Record<string, unknown>
  const validated = normalizeFeedbackInput(input)
  if (!validated.ok || !validated.value.local_id || !validated.value.submitted_at) return null

  return {
    local_id: validated.value.local_id,
    employee_name: validated.value.employee_name,
    category: validated.value.category,
    message: validated.value.message,
    happiness: validated.value.happiness,
    submitted_at: validated.value.submitted_at,
    occurred_at: validated.value.occurred_at ?? null,
    synced: input.synced === true,
  }
}

function createLocalId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function readQueueFromStorage(): QueuedComplaint[] {
  const raw = safeParse<unknown>(window.localStorage.getItem(QUEUE_KEY), [])
  if (!Array.isArray(raw)) return EMPTY_QUEUE

  return raw
    .map(normalizeQueuedComplaint)
    .filter((entry): entry is QueuedComplaint => entry !== null)
    .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))
}

export function getServerSettingsSnapshot(): KioskSettings {
  return DEFAULT_SETTINGS
}

export function getSettingsSnapshot(): KioskSettings {
  if (!storageAvailable()) return DEFAULT_SETTINGS
  if (settingsCache === null) {
    settingsCache = normalizeSettings(
      safeParse<unknown>(window.localStorage.getItem(SETTINGS_KEY), null),
    )
  }
  return settingsCache
}

export function saveSettings(patch: Partial<KioskSettings>): KioskSettings {
  const next = normalizeSettings({ ...getSettingsSnapshot(), ...patch })

  if (storageAvailable()) {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
    } catch {
      // Storage can be unavailable in private mode or when the disk is full.
    }

    settingsCache = next
    window.dispatchEvent(new Event(SETTINGS_EVENT))
  }

  return next
}

export function subscribeToSettings(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key !== SETTINGS_KEY) return
    settingsCache = null
    listener()
  }
  const onLocalChange = () => listener()

  window.addEventListener("storage", onStorage)
  window.addEventListener(SETTINGS_EVENT, onLocalChange)

  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(SETTINGS_EVENT, onLocalChange)
  }
}

export function getServerQueueSnapshot(): QueuedComplaint[] {
  return EMPTY_QUEUE
}

export function getQueueSnapshot(): QueuedComplaint[] {
  if (!storageAvailable()) return EMPTY_QUEUE

  const raw = window.localStorage.getItem(QUEUE_KEY)
  if (queueCache === null || raw !== queueRawCache) {
    queueCache = readQueueFromStorage()
    queueRawCache = raw
  }

  return queueCache
}

export function getQueue(): QueuedComplaint[] {
  return getQueueSnapshot()
}

function writeQueue(queue: QueuedComplaint[]): void {
  queueCache = queue

  if (storageAvailable()) {
    try {
      const raw = JSON.stringify(queue)
      window.localStorage.setItem(QUEUE_KEY, raw)
      queueRawCache = raw
    } catch {
      queueRawCache = null
    }

    window.dispatchEvent(new Event(QUEUE_EVENT))
  }
}

export function subscribeToQueue(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key !== QUEUE_KEY) return
    queueCache = null
    queueRawCache = null
    listener()
  }
  const onLocalChange = () => listener()

  window.addEventListener("storage", onStorage)
  window.addEventListener(QUEUE_EVENT, onLocalChange)

  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(QUEUE_EVENT, onLocalChange)
  }
}

function enforceQueueLimit(queue: QueuedComplaint[]): QueuedComplaint[] {
  if (queue.length <= MAX_QUEUE_ITEMS) return queue

  const excess = queue.length - MAX_QUEUE_ITEMS
  const removable = new Set(
    queue
      .filter((entry) => entry.synced)
      .slice(-excess)
      .map((entry) => entry.local_id),
  )
  const trimmed = queue.filter((entry) => !removable.has(entry.local_id))

  if (trimmed.length > MAX_QUEUE_ITEMS) {
    throw new Error(
      "This device's feedback queue is full. Ask an admin to sync and clear it before submitting more.",
    )
  }

  return trimmed
}

export function addToQueue(input: FeedbackInput): QueuedComplaint {
  const validated = normalizeFeedbackInput(input)
  if (!validated.ok) throw new Error(validated.error)

  const record: QueuedComplaint = {
    local_id: validated.value.local_id ?? createLocalId(),
    employee_name: validated.value.employee_name,
    category: normalizeCategory(validated.value.category),
    message: validated.value.message,
    happiness: validated.value.happiness,
    submitted_at: validated.value.submitted_at ?? new Date().toISOString(),
    occurred_at: validated.value.occurred_at ?? null,
    synced: false,
  }

  const queue = enforceQueueLimit([
    record,
    ...getQueue().filter((entry) => entry.local_id !== record.local_id),
  ])

  writeQueue(queue)
  return record
}

export function markSynced(localIds: string[]): QueuedComplaint[] {
  const ids = new Set(localIds)
  const queue = getQueue().map((entry) =>
    ids.has(entry.local_id) ? { ...entry, synced: true } : entry,
  )
  writeQueue(queue)
  return queue
}

export function removeSynced(): QueuedComplaint[] {
  const queue = getQueue().filter((entry) => !entry.synced)
  writeQueue(queue)
  return queue
}
