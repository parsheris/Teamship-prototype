"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { useQueue } from "@/hooks/useQueue"
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Inbox,
  Loader2,
  RefreshCw,
  Settings,
} from "lucide-react"

import { ComplaintCard } from "@/components/admin/ComplaintCard"
import {
  DashboardFilters,
  RANGE_DAYS,
} from "@/components/admin/DashboardFilters"
import type {
  DateRangeValue,
  RangeKey,
} from "@/components/admin/DashboardFilters"
import { PinSettings } from "@/components/admin/PinSettings"
import { SyncPanel } from "@/components/admin/SyncPanel"
import { Logo } from "@/components/ui/logo"
import { useKioskSettings } from "@/hooks/useKioskSettings"
import { ApiError, fetchComplaints, logoutAdmin, syncComplaints } from "@/lib/api"
import { occurredTime, startOfToday } from "@/lib/datetime"
import {
  getQueue,
  markSynced,
  removeSynced,
  saveSettings,
} from "@/lib/offlineStore"
import { HAPPINESS_LABELS } from "@/lib/types"
import type { ComplaintRecord, QueuedComplaint, SyncStatus } from "@/lib/types"

const ACTION =
  "flex h-10 items-center justify-center gap-2 rounded-md border px-3.5 text-[0.82rem] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/30 disabled:cursor-not-allowed disabled:opacity-50"
const SYNC_BATCH_SIZE = 500
const EXPORT_LIMIT = 5000

function queueToRecord(entry: QueuedComplaint): ComplaintRecord {
  return {
    id: entry.local_id,
    local_id: entry.local_id,
    employee_name: entry.employee_name,
    category: entry.category,
    message: entry.message,
    happiness: entry.happiness ?? undefined,
    submitted_at: entry.submitted_at,
    occurred_at: entry.occurred_at ?? undefined,
    created_date: entry.submitted_at,
  }
}

function normalizeTime(value?: string): number {
  if (!value) return Number.NaN
  return Date.parse(value)
}

function filterLocalQueue(
  queue: QueuedComplaint[],
  category: string,
  since?: string,
  until?: string,
): ComplaintRecord[] {
  const parsedSince = normalizeTime(since)
  const parsedUntil = normalizeTime(until)
  const sinceTime = Number.isNaN(parsedSince) ? Number.NEGATIVE_INFINITY : parsedSince
  const untilTime = Number.isNaN(parsedUntil) ? Number.POSITIVE_INFINITY : parsedUntil

  return queue
    .filter((entry) => {
      if (category !== "all" && entry.category !== category) return false
      const timestamp = occurredTime(entry)
      return timestamp >= sinceTime && timestamp <= untilTime
    })
    .map(queueToRecord)
    .sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))
}

function mergeRecords(records: ComplaintRecord[], queue: QueuedComplaint[]): ComplaintRecord[] {
  const merged = new Map(records.map((record) => [record.local_id, record]))

  for (const entry of queue) {
    if (!merged.has(entry.local_id)) merged.set(entry.local_id, queueToRecord(entry))
  }

  return [...merged.values()].sort(
    (a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at),
  )
}

function csvCell(value: unknown): string {
  let text = String(value ?? "")
  if (/^\s*[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function csvDate(value?: string): string {
  if (!value) return ""
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString()
}

function exportCsv(records: ComplaintRecord[]): void {
  const rows: unknown[][] = [
    ["Happened", "Submitted", "Name", "Category", "Happiness", "Feedback"],
  ]

  for (const record of records) {
    rows.push([
      csvDate(record.occurred_at),
      csvDate(record.submitted_at || record.created_date),
      record.employee_name || "Anonymous",
      record.category || "Other",
      record.happiness ? HAPPINESS_LABELS[record.happiness] : "",
      record.message || "",
    ])
  }

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n")

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `spark-kiosk-feedback-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function rangeSince(range: RangeKey, customRange: DateRangeValue | null): string | undefined {
  if (range === "all") return undefined
  if (range === "custom") return customRange?.since
  return new Date(Date.now() - RANGE_DAYS[range] * 86_400_000).toISOString()
}

function rangeUntil(range: RangeKey, customRange: DateRangeValue | null): string | undefined {
  return range === "custom" ? customRange?.until : undefined
}

export function AdminDashboard() {
  const router = useRouter()
  const settings = useKioskSettings()
  const queue = useQueue()
  const [records, setRecords] = useState<ComplaintRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [category, setCategory] = useState("all")
  const [range, setRange] = useState<RangeKey>("all")
  const [customRange, setCustomRange] = useState<DateRangeValue | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [locking, setLocking] = useState(false)
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    let cancelled = false
    const since = rangeSince(range, customRange)
    const until = rangeUntil(range, customRange)

    fetchComplaints({ category, since, until, limit: 250 })
      .then((items) => {
        if (!cancelled) setRecords(items)
      })
      .catch((error: unknown) => {
        if (cancelled) return

        if (error instanceof ApiError && error.status === 401) {
          setSessionExpired(true)
          setLoadError("Your admin session has expired. Reload the page to sign in again.")
        } else {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : "Could not load feedback from the server. Showing this device's queue.",
          )
        }

        setRecords(filterLocalQueue(getQueue(), category, since, until))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [category, range, customRange, refreshKey])

  const pending = useMemo(() => queue.filter((entry) => !entry.synced), [queue])
  const syncedCount = queue.length - pending.length

  const beginLoad = () => {
    setLoading(true)
    setLoadError(null)
    setSessionExpired(false)
  }

  const handleCategory = (value: string) => {
    if (value === category) return
    beginLoad()
    setCategory(value)
  }

  const handleRange = (value: RangeKey) => {
    if (value === range) return

    if (value === "custom" && !customRange) {
      const now = new Date()
      setCustomRange({
        since: startOfToday(now).toISOString(),
        until: now.toISOString(),
      })
    }

    beginLoad()
    setRange(value)
  }

  const handleCustomRange = (value: DateRangeValue) => {
    if (
      range === "custom" &&
      customRange?.since === value.since &&
      customRange?.until === value.until
    ) {
      return
    }

    beginLoad()
    setCustomRange(value)
    setRange("custom")
  }

  const refresh = () => {
    beginLoad()
    setRefreshKey((value) => value + 1)
  }

  const handleSync = async () => {
    const items = queue.filter((entry) => !entry.synced)
    if (!items.length) return

    setSyncing(true)
    setStatus(null)

    try {
      let uploaded = 0
      let duplicates = 0
      let invalid = 0

      for (let index = 0; index < items.length; index += SYNC_BATCH_SIZE) {
        const result = await syncComplaints(items.slice(index, index + SYNC_BATCH_SIZE))
        uploaded += result.uploaded
        duplicates += result.duplicates
        invalid += result.invalid
        markSynced(result.synced_ids)
      }

      saveSettings({ last_sync_at: new Date().toISOString() })
      refresh()

      const summary = [`${uploaded} ${uploaded === 1 ? "entry" : "entries"} uploaded`]
      if (duplicates > 0) {
        summary.push(`${duplicates} already online`)
      }
      if (invalid > 0) {
        summary.push(`${invalid} ${invalid === 1 ? "entry" : "entries"} could not be read`)
      }

      setStatus({
        type: invalid > 0 ? "error" : "success",
        text: `${summary.join(", ")}.`,
      })
    } catch (error) {
      setStatus({
        type: "error",
        text:
          error instanceof ApiError
            ? error.message
            : "Sync failed. Your entries are still saved on this device.",
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setStatus(null)

    try {
      let online: ComplaintRecord[] = []

      try {
        online = await fetchComplaints({ limit: EXPORT_LIMIT })
      } catch {
        online = []
      }

      const merged = mergeRecords(online, getQueue())

      if (merged.length === 0) {
        setStatus({ type: "error", text: "There is nothing to export yet." })
        return
      }

      exportCsv(merged)
      setStatus({
        type: "success",
        text: `${merged.length} ${merged.length === 1 ? "entry" : "entries"} exported to CSV.`,
      })
    } finally {
      setExporting(false)
    }
  }

  const handleClearLocal = () => {
    removeSynced()
    setStatus({ type: "success", text: "Synced entries cleared from this device." })
  }

  const handleLock = () => {
    setLocking(true)
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      router.replace("/")
    }
    const fallback = window.setTimeout(finish, 2_000)

    void logoutAdmin()
      .catch(() => {
        // Navigating away still closes the dashboard even if logout fails.
      })
      .finally(() => {
        window.clearTimeout(fallback)
        finish()
      })
  }

  return (
    <div className="min-h-[100dvh] bg-paper text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-20 h-[3px] bg-accent"
      />

      <div className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-8 sm:py-9">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-line pb-6">
          <div className="flex items-center gap-4">
            <Logo className="w-32" sizes="128px" />
            <div className="hidden h-9 w-px bg-line sm:block" />
            <div>
              <p className="text-[0.62rem] font-medium uppercase tracking-[0.2em] text-steel">
                Admin
              </p>
              <h1 className="mt-0.5 text-[0.98rem] font-medium leading-tight tracking-[-0.01em]">
              Feedback
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className={`${ACTION} border-line text-ink/70 hover:border-line-strong hover:text-ink`}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              )}
              Export CSV
            </button>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              aria-label="Refresh feedback"
              className={`${ACTION} w-10 border-line px-0 text-ink/60 hover:border-line-strong hover:text-ink`}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={() => setShowSettings((value) => !value)}
              aria-expanded={showSettings}
              className={`${ACTION} border-line text-ink/70 hover:border-line-strong hover:text-ink`}
            >
              <Settings className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Settings
            </button>
            <button
              type="button"
              onClick={handleLock}
              disabled={locking}
              className={`${ACTION} border-ink bg-ink text-white hover:bg-[#252d35]`}
            >
              {locking ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              )}
              Lock &amp; kiosk
            </button>
          </div>
        </header>

        {showSettings && (
          <div className="mt-6">
            <PinSettings settings={settings} onClose={() => setShowSettings(false)} />
          </div>
        )}

        <section className="mt-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-2 w-2 bg-accent" />
              <p className="text-[0.66rem] font-medium uppercase tracking-[0.2em] text-steel">
                Collected feedback
              </p>
            </div>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-medium leading-none tracking-[-0.04em] sm:text-5xl">
                {records.length}
              </span>
              <span className="text-sm text-ink/45">
                {records.length === 1 ? "entry" : "entries"} in view
              </span>
            </p>
          </div>
          <p className="text-xs text-ink/45">
            <span className="font-medium text-ink/70">{pending.length}</span> waiting on this device
          </p>
        </section>

        <div className="mt-5">
          <SyncPanel
            pendingCount={pending.length}
            syncedCount={syncedCount}
            syncing={syncing}
            status={status}
            lastSync={settings.last_sync_at}
            onSync={() => void handleSync()}
            onClearLocal={handleClearLocal}
          />
        </div>

        {loadError && (
          <div
            className="mt-4 flex flex-wrap items-start gap-2.5 rounded-lg border border-accent/25 bg-accent/[0.08] px-4 py-3 text-sm text-accent-deep"
            role="alert"
          >
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="flex-1">{loadError}</span>
            {sessionExpired && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="font-medium underline underline-offset-4"
              >
                Reload
              </button>
            )}
          </div>
        )}

        <div className="mt-6">
          <DashboardFilters
            category={category}
            range={range}
            customRange={customRange}
            onCategory={handleCategory}
            onRange={handleRange}
            onCustomRange={handleCustomRange}
            disabled={loading}
          />
        </div>

        <section className="mt-5 overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <p className="text-[0.66rem] font-medium uppercase tracking-[0.18em] text-steel">
              Feedback
            </p>
          </div>

          <div className="divide-y divide-line">
            {loading && (
              <div
                className="flex items-center gap-3 px-5 py-14 text-sm text-ink/50"
                role="status"
              >
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading entries…
              </div>
            )}

            {!loading && records.length === 0 && (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-ink/30">
                  <Inbox className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                </div>
                <p className="mt-4 text-sm text-ink/55">
                  No feedback matches these filters yet.
                </p>
                {pending.length > 0 && (
                  <p className="mt-1.5 text-xs text-ink/35">
                    {pending.length} {pending.length === 1 ? "entry is" : "entries are"} waiting
                    to sync.
                  </p>
                )}
              </div>
            )}

            {!loading &&
              records.map((record) => <ComplaintCard key={record.id} record={record} />)}
          </div>
        </section>
      </div>
    </div>
  )
}
