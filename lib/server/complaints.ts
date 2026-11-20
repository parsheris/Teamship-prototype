import { randomUUID } from "node:crypto"

import { occurredTime } from "@/lib/datetime"
import { normalizeFeedbackInput } from "@/lib/validation"
import type { ComplaintRecord } from "@/lib/types"

import { getDataFile, readJsonFile, withFileLock, writeJsonFile } from "./json-store"

type ComplaintStore = {
  items: ComplaintRecord[]
}

const STORE_VERSION = 1
const MAX_RECORDS = 5000

function storeFile(): string {
  return getDataFile("complaints.json")
}

function isComplaintRecord(value: unknown): value is ComplaintRecord {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === "string" &&
    typeof record.local_id === "string" &&
    typeof record.message === "string" &&
    typeof record.submitted_at === "string" &&
    (record.occurred_at === undefined ||
      (typeof record.occurred_at === "string" && !Number.isNaN(Date.parse(record.occurred_at)))) &&
    (record.happiness === undefined ||
      (typeof record.happiness === "number" &&
        Number.isInteger(record.happiness) &&
        record.happiness >= 1 &&
        record.happiness <= 5))
  )
}

async function readStore(): Promise<ComplaintStore> {
  const raw = await readJsonFile<unknown>(storeFile(), { version: STORE_VERSION, items: [] })

  if (Array.isArray(raw)) {
    return { items: raw.filter(isComplaintRecord) }
  }

  if (raw && typeof raw === "object" && Array.isArray((raw as ComplaintStore).items)) {
    return { items: (raw as ComplaintStore).items.filter(isComplaintRecord) }
  }

  return { items: [] }
}

async function writeStore(store: ComplaintStore): Promise<void> {
  await writeJsonFile(storeFile(), { version: STORE_VERSION, ...store })
}

export type ListComplaintsOptions = {
  category?: string | null
  since?: string | null
  until?: string | null
  limit?: number
}

export async function listComplaints(
  options: ListComplaintsOptions = {},
): Promise<ComplaintRecord[]> {
  const store = await readStore()
  const category = options.category?.trim()
  const sinceDate = options.since ? new Date(options.since) : null
  const untilDate = options.until ? new Date(options.until) : null
  const sinceTime =
    sinceDate && !Number.isNaN(sinceDate.getTime()) ? sinceDate.getTime() : Number.NEGATIVE_INFINITY
  const untilTime =
    untilDate && !Number.isNaN(untilDate.getTime()) ? untilDate.getTime() : Number.POSITIVE_INFINITY
  const requestedLimit = Math.floor(options.limit ?? 100)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(MAX_RECORDS, Math.max(1, requestedLimit))
    : 100

  return store.items
    .filter((record) => {
      if (category && category !== "all" && record.category !== category) return false
      const timestamp = occurredTime(record)
      return timestamp >= sinceTime && timestamp <= untilTime
    })
    .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))
    .slice(0, limit)
}

export function createComplaint(
  input: unknown,
): Promise<{ item: ComplaintRecord; duplicate: boolean }> {
  return withFileLock(storeFile(), async () => {
    const validated = normalizeFeedbackInput(input)
    if (!validated.ok) throw new Error(validated.error)

    const store = await readStore()
    const localId = validated.value.local_id ?? randomUUID()
    const existing = store.items.find((record) => record.local_id === localId)
    if (existing) return { item: existing, duplicate: true }

    const now = new Date().toISOString()
    const item: ComplaintRecord = {
      id: randomUUID(),
      local_id: localId,
      employee_name: validated.value.employee_name,
      category: validated.value.category,
      message: validated.value.message,
      ...(validated.value.happiness ? { happiness: validated.value.happiness } : {}),
      submitted_at: validated.value.submitted_at ?? now,
      ...(validated.value.occurred_at ? { occurred_at: validated.value.occurred_at } : {}),
      created_date: now,
    }

    const items = [item, ...store.items].slice(0, MAX_RECORDS)
    await writeStore({ items })
    return { item, duplicate: false }
  })
}

export type BulkCreateResult = {
  uploaded: number
  duplicates: number
  invalid: number
  synced_ids: string[]
}

export function createComplaints(inputs: unknown[]): Promise<BulkCreateResult> {
  return withFileLock(storeFile(), async () => {
    const store = await readStore()
    const knownLocalIds = new Set(store.items.map((record) => record.local_id))
    const newItems: ComplaintRecord[] = []
    const syncedIds: string[] = []
    let uploaded = 0
    let duplicates = 0
    let invalid = 0

    for (const input of inputs) {
      const validated = normalizeFeedbackInput(input)
      if (!validated.ok) {
        invalid += 1
        continue
      }

      const localId = validated.value.local_id ?? randomUUID()

      if (knownLocalIds.has(localId)) {
        duplicates += 1
        syncedIds.push(localId)
        continue
      }

      const now = new Date().toISOString()
      newItems.push({
        id: randomUUID(),
        local_id: localId,
        employee_name: validated.value.employee_name,
        category: validated.value.category,
        message: validated.value.message,
        ...(validated.value.happiness ? { happiness: validated.value.happiness } : {}),
        submitted_at: validated.value.submitted_at ?? now,
        ...(validated.value.occurred_at ? { occurred_at: validated.value.occurred_at } : {}),
        created_date: now,
      })

      knownLocalIds.add(localId)
      syncedIds.push(localId)
      uploaded += 1
    }

    if (newItems.length > 0) {
      const items = [...newItems, ...store.items]
        .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))
        .slice(0, MAX_RECORDS)
      await writeStore({ items })
    }

    return { uploaded, duplicates, invalid, synced_ids: syncedIds }
  })
}
