"use client"

import { AlertCircle, CheckCircle2, CloudUpload, Loader2 } from "lucide-react"

import type { SyncStatus } from "@/lib/types"

function formatLastSync(value: string | null): string {
  if (!value) return "This device has never synced."

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "This device has never synced."

  return `Last sync ${parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`
}

type SyncPanelProps = {
  pendingCount: number
  syncedCount: number
  syncing: boolean
  status: SyncStatus | null
  lastSync: string | null
  onSync: () => void
  onClearLocal: () => void
}

export function SyncPanel({
  pendingCount,
  syncedCount,
  syncing,
  status,
  lastSync,
  onSync,
  onClearLocal,
}: SyncPanelProps) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="hidden h-11 w-11 items-center justify-center rounded-md border border-line bg-paper/60 text-steel sm:flex">
            <CloudUpload className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
          </div>
          <div>
            <p className="text-[0.66rem] font-medium uppercase tracking-[0.18em] text-steel">
              Device sync
            </p>
            <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-ink/50">
              <span className="text-xl font-medium tabular-nums text-ink">{pendingCount}</span>
              <span>{pendingCount === 1 ? "entry" : "entries"} waiting</span>
              <span className="text-ink/20">/</span>
              <span className="text-xs text-ink/40">{formatLastSync(lastSync)}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSync}
          disabled={syncing || pendingCount === 0}
          className="flex h-10 min-w-[9.5rem] items-center justify-center gap-2.5 rounded-md bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-[#c96b3c] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:bg-accent/35"
        >
          {syncing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <CloudUpload className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          )}
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {status && (
        <div
          className={`mt-4 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
            status.type === "error"
              ? "border-accent/25 bg-accent/[0.08] text-accent-deep"
              : "border-steel/20 bg-steel/[0.06] text-steel"
          }`}
          role={status.type === "error" ? "alert" : "status"}
        >
          {status.type === "error" ? (
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}
          {status.text}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
        <p className="text-xs text-ink/40">
          Each entry uploads once. Syncing again never duplicates.
        </p>
        <button
          type="button"
          onClick={onClearLocal}
          disabled={syncedCount === 0}
          className="text-xs text-ink/45 underline underline-offset-4 transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
        >
          Clear {syncedCount > 0 ? `${syncedCount} synced ` : "synced "}
          {syncedCount === 1 ? "entry" : "entries"} from device
        </button>
      </div>
    </section>
  )
}
