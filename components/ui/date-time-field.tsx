"use client"

type DateTimeFieldProps = {
  id: string
  label?: string
  date: string
  time: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  onNow: () => void
  hint?: string
  error?: string
  disabled?: boolean
  maxDate?: string
  compact?: boolean
}

const LABEL =
  "mb-2 block text-[0.69rem] font-medium uppercase tracking-[0.16em] text-steel"

export function DateTimeField({
  id,
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
  onNow,
  hint,
  error,
  disabled = false,
  maxDate,
  compact = false,
}: DateTimeFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const inputHeight = compact ? "h-10" : "h-12"

  return (
    <div className={disabled ? "opacity-60" : undefined}>
      {label && (
        <label htmlFor={`${id}-date`} className={LABEL}>
          {label}
        </label>
      )}

      <div
        className={`flex flex-col overflow-hidden rounded-lg border bg-surface transition-colors focus-within:border-steel focus-within:ring-2 focus-within:ring-steel/15 sm:flex-row ${
          error ? "border-accent" : "border-line-strong"
        }`}
      >
        <div
          className={`flex min-w-0 flex-1 items-center px-3.5 ${inputHeight} border-b border-line sm:border-b-0 sm:border-r`}
        >
          <input
            id={`${id}-date`}
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
            max={maxDate}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="h-full w-full min-w-0 bg-transparent text-[0.95rem] tabular-nums text-ink outline-none disabled:cursor-not-allowed"
          />
        </div>

        <div
          className={`flex min-w-0 flex-1 items-center px-3.5 ${inputHeight}`}
        >
          <input
            id={`${id}-time`}
            type="time"
            value={time}
            onChange={(event) => onTimeChange(event.target.value)}
            disabled={disabled}
            aria-label={label ? `${label} — time` : "Time"}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className="h-full w-full min-w-0 bg-transparent text-[0.95rem] tabular-nums text-ink outline-none disabled:cursor-not-allowed"
          />
        </div>

        <button
          type="button"
          onClick={onNow}
          disabled={disabled}
          aria-label="Use the current device date and time"
          className={`${inputHeight} shrink-0 border-t border-line px-5 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-accent-deep transition-colors hover:bg-accent/[0.07] focus:outline-none focus-visible:bg-accent/[0.07] disabled:cursor-not-allowed sm:border-l sm:border-t-0`}
        >
          Now
        </button>
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-2 text-xs text-accent-deep" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-ink/45">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
