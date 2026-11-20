"use client"

import { useState } from "react"
import { CalendarRange } from "lucide-react"

import { DateTimeField } from "@/components/ui/date-time-field"
import {
  isFutureDateTime,
  isoToDateTimeParts,
  parseDateTimeParts,
  startOfToday,
  toDateTimeParts,
} from "@/lib/datetime"
import type { DateTimeParts } from "@/lib/datetime"
import { FEEDBACK_CATEGORIES } from "@/lib/types"

export const RANGE_DAYS = {
  today: 1,
  week: 7,
  month: 30,
} as const

export type RangeKey = "all" | keyof typeof RANGE_DAYS | "custom"

export type DateRangeValue = {
  since: string
  until: string
}

const RANGES: Array<[RangeKey, string]> = [
  ["all", "All time"],
  ["today", "Today"],
  ["week", "7 days"],
  ["month", "30 days"],
  ["custom", "Custom"],
]

type DashboardFiltersProps = {
  category: string
  range: RangeKey
  customRange: DateRangeValue | null
  onCategory: (category: string) => void
  onRange: (range: RangeKey) => void
  onCustomRange: (range: DateRangeValue) => void
  disabled?: boolean
}

type CustomRangePanelProps = {
  value: DateRangeValue | null
  onApply: (range: DateRangeValue) => void
  disabled: boolean
}

function defaultCustomRange(): DateRangeValue {
  const now = new Date()
  return {
    since: startOfToday(now).toISOString(),
    until: now.toISOString(),
  }
}

function CustomRangePanel({ value, onApply, disabled }: CustomRangePanelProps) {
  const initial = value ?? defaultCustomRange()
  const [since, setSince] = useState<DateTimeParts>(
    () => isoToDateTimeParts(initial.since) ?? toDateTimeParts(new Date()),
  )
  const [until, setUntil] = useState<DateTimeParts>(
    () => isoToDateTimeParts(initial.until) ?? toDateTimeParts(new Date()),
  )
  const [error, setError] = useState("")

  const apply = () => {
    const sinceDate = parseDateTimeParts(since.date, since.time)
    const untilDate = parseDateTimeParts(until.date, until.time)

    if (!sinceDate || !untilDate) {
      setError("Choose a valid start and end date.")
      return
    }

    if (sinceDate.getTime() > untilDate.getTime()) {
      setError("The start must come before the end.")
      return
    }

    if (isFutureDateTime(untilDate)) {
      setError("The end time cannot be in the future.")
      return
    }

    setError("")
    onApply({ since: sinceDate.toISOString(), until: untilDate.toISOString() })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-steel">
          <CalendarRange className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
          Custom period
        </p>
        <p className="text-xs text-ink/40">Times use this device&apos;s clock.</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <DateTimeField
          id="range-from"
          label="From"
          date={since.date}
          time={since.time}
          onDateChange={(date) => {
            setSince((current) => ({ ...current, date }))
            setError("")
          }}
          onTimeChange={(time) => {
            setSince((current) => ({ ...current, time }))
            setError("")
          }}
          onNow={() => {
            setSince(toDateTimeParts(new Date()))
            setError("")
          }}
          disabled={disabled}
          compact
        />
        <DateTimeField
          id="range-to"
          label="To"
          date={until.date}
          time={until.time}
          onDateChange={(date) => {
            setUntil((current) => ({ ...current, date }))
            setError("")
          }}
          onTimeChange={(time) => {
            setUntil((current) => ({ ...current, time }))
            setError("")
          }}
          onNow={() => {
            setUntil(toDateTimeParts(new Date()))
            setError("")
          }}
          disabled={disabled}
          compact
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={apply}
          disabled={disabled}
          className="h-10 rounded-md bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-[#252d35] focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/35 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:opacity-50"
        >
          Apply range
        </button>
        {error && (
          <p className="text-xs text-accent-deep" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

export function DashboardFilters({
  category,
  range,
  customRange,
  onCategory,
  onRange,
  onCustomRange,
  disabled = false,
}: DashboardFiltersProps) {
  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filter by category"
        >
          <button
            type="button"
            onClick={() => onCategory("all")}
            aria-pressed={category === "all"}
            disabled={disabled}
            className={`h-9 rounded-md border px-3.5 text-[0.82rem] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/30 disabled:opacity-50 ${
              category === "all"
                ? "border-ink bg-ink text-white"
                : "border-line text-ink/60 hover:border-line-strong hover:text-ink"
            }`}
          >
            All categories
          </button>

          {FEEDBACK_CATEGORIES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onCategory(option)}
              aria-pressed={category === option}
              disabled={disabled}
              className={`h-9 rounded-md border px-3.5 text-[0.82rem] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/30 disabled:opacity-50 ${
                category === option
                  ? "border-ink bg-ink text-white"
                  : "border-line text-ink/60 hover:border-line-strong hover:text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5 lg:justify-end"
          role="group"
          aria-label="Filter by period"
        >
          {RANGES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onRange(value)}
              aria-pressed={range === value}
              disabled={disabled}
              className={`h-9 rounded-md border px-3.5 text-[0.82rem] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50 ${
                range === value
                  ? "border-accent bg-accent text-white"
                  : "border-line text-ink/60 hover:border-line-strong hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {range === "custom" && (
        <div className="border-t border-line bg-paper/45 p-4 sm:p-5">
          <CustomRangePanel
            key={`${customRange?.since ?? "default"}-${customRange?.until ?? "default"}`}
            value={customRange}
            onApply={onCustomRange}
            disabled={disabled}
          />
        </div>
      )}
    </section>
  )
}
