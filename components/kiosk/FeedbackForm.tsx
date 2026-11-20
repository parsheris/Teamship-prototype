"use client"

import { useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  Angry,
  ArrowRight,
  Check,
  Frown,
  Laugh,
  Loader2,
  Meh,
  Smile,
  X,
} from "lucide-react"

import { DateTimeField } from "@/components/ui/date-time-field"
import { Logo } from "@/components/ui/logo"
import {
  isFutureDateTime,
  parseDateTimeParts,
  toDateTimeParts,
} from "@/lib/datetime"
import type { DateTimeParts } from "@/lib/datetime"
import {
  DEFAULT_FORM_FIELDS,
  FEEDBACK_CATEGORIES,
  HAPPINESS_LABELS,
} from "@/lib/types"
import type {
  FeedbackInput,
  HappinessLevel,
  KioskFormFields,
} from "@/lib/types"
import { MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH } from "@/lib/validation"

const LABEL =
  "mb-2 block text-[0.69rem] font-medium uppercase tracking-[0.16em] text-steel"

const FIELD =
  "h-12 w-full rounded-lg border border-line-strong bg-surface px-4 text-base text-ink placeholder:text-ink/30 transition-colors focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/15"

const HAPPINESS_OPTIONS: Array<{
  value: HappinessLevel
  label: string
  icon: LucideIcon
}> = [
  { value: 1, label: HAPPINESS_LABELS[1], icon: Angry },
  { value: 2, label: HAPPINESS_LABELS[2], icon: Frown },
  { value: 3, label: HAPPINESS_LABELS[3], icon: Meh },
  { value: 4, label: HAPPINESS_LABELS[4], icon: Smile },
  { value: 5, label: HAPPINESS_LABELS[5], icon: Laugh },
]

const nowMs = () => Date.now()

type FeedbackFormProps = {
  onSubmit: (input: FeedbackInput) => Promise<void> | void
  onCancel: () => void
  timeoutSeconds?: number
  formFields?: KioskFormFields
}

export function FeedbackForm({
  onSubmit,
  onCancel,
  timeoutSeconds = 90,
  formFields = DEFAULT_FORM_FIELDS,
}: FeedbackFormProps) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState<string>(FEEDBACK_CATEGORIES[0])
  const [happiness, setHappiness] = useState<HappinessLevel | null>(null)
  const [message, setMessage] = useState("")
  const [occurred, setOccurred] = useState<DateTimeParts>(() =>
    toDateTimeParts(new Date()),
  )
  const [occurredError, setOccurredError] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const lastActivity = useRef<number | null>(null)
  const savingRef = useRef(false)

  useEffect(() => {
    const timeout = Math.max(15, timeoutSeconds)
    const timer = window.setInterval(() => {
      const current = nowMs()
      if (lastActivity.current === null) {
        lastActivity.current = current
        return
      }

      const idleSeconds = Math.floor((current - lastActivity.current) / 1000)
      if (idleSeconds >= timeout && !savingRef.current) onCancel()
    }, 1000)

    return () => window.clearInterval(timer)
  }, [timeoutSeconds, onCancel])

  const noteActivity = () => {
    lastActivity.current = nowMs()
  }

  const hasAnswer =
    message.trim().length > 0 ||
    (formFields.name && name.trim().length > 0) ||
    (formFields.happiness && happiness !== null)
  const canSubmit = hasAnswer && !saving

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return

    let occurredAt: string | undefined

    if (formFields.datetime) {
      const parsed = parseDateTimeParts(occurred.date, occurred.time)

      if (!parsed) {
        setOccurredError("Choose a valid date and time.")
        return
      }

      if (isFutureDateTime(parsed)) {
        setOccurredError("Choose a time that is not in the future.")
        return
      }

      occurredAt = parsed.toISOString()
    }

    setOccurredError("")
    setSaving(true)
    savingRef.current = true
    setError("")

    try {
      await onSubmit({
        employee_name: formFields.name ? name : "",
        category: formFields.category ? category : undefined,
        happiness: formFields.happiness ? (happiness ?? undefined) : undefined,
        message: formFields.message ? message : "",
        occurred_at: occurredAt,
      })
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save your feedback. Please try again.",
      )
      setSaving(false)
      savingRef.current = false
    }
  }

  return (
    <div
      className="h-full w-full overflow-y-auto bg-paper text-ink"
      onPointerDown={noteActivity}
      onKeyDown={noteActivity}
      onFocus={noteActivity}
    >
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-6 py-7 sm:px-10 sm:py-9 lg:px-12 lg:py-10">
        <header className="flex items-start justify-between gap-6">
          <Logo className="w-36 sm:w-40" sizes="(max-width: 640px) 144px, 160px" />
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel feedback"
            className="-mr-1 flex h-11 w-11 items-center justify-center rounded-md border border-line text-ink/45 transition-colors hover:border-line-strong hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/30"
          >
            <X className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>

        <div className="mx-auto mt-9 grid w-full max-w-5xl flex-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
          <aside className="screen-enter self-start lg:sticky lg:top-10">
            <h1 className="max-w-[10ch] text-balance text-3xl font-medium leading-[1.02] tracking-[-0.04em] text-ink sm:text-4xl">
              Reporting
            </h1>
    </aside>

          <form onSubmit={handleSubmit} className="screen-enter min-w-0" noValidate>
            <div className="rounded-xl border border-line bg-surface">
              <div className="space-y-7 p-5 sm:p-7">
                {formFields.name && (
                  <div>
                    <label htmlFor="employee-name" className={LABEL}>
                      Name{" "}
                      <span className="tracking-normal text-ink/35">(optional)</span>
                    </label>
                    <input
                      id="employee-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="off"
                      maxLength={MAX_NAME_LENGTH}
                      placeholder="Leave blank to stay anonymous"
                      className={FIELD}
                    />
                  </div>
                )}

                {formFields.happiness && (
                  <div>
                    <span className={LABEL} id="happiness-label">
                      Happiness
                    </span>
                    <div
                      className="grid grid-cols-5 gap-2 sm:gap-2.5"
                      role="group"
                      aria-labelledby="happiness-label"
                    >
                      {HAPPINESS_OPTIONS.map(({ value, label, icon: Icon }) => {
                        const active = happiness === value
                        return (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={active}
                            aria-label={label}
                            onClick={() => {
                              setHappiness(value)
                              noteActivity()
                            }}
                            className={`flex h-16 items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 sm:h-[4.5rem] ${
                              active
                                ? "border-accent bg-accent/[0.09] text-accent-deep"
                                : "border-line bg-surface text-ink/35 hover:border-line-strong hover:text-ink/60"
                            }`}
                          >
                            <Icon
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              strokeWidth={1.6}
                              aria-hidden="true"
                            />
                          </button>
                        )
                      })}
                    </div>
                    <p
                      className={`mt-2 min-h-5 text-sm ${
                        happiness ? "font-medium text-accent-deep" : "text-ink/35"
                      }`}
                      aria-live="polite"
                    >
                      {happiness ? HAPPINESS_LABELS[happiness] : "Choose one"}
                    </p>
                  </div>
                )}

                {formFields.category && (
                  <div>
                    <span className={LABEL} id="category-label">
                      Category
                    </span>
                    <div
                      className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                      role="group"
                      aria-labelledby="category-label"
                    >
                      {FEEDBACK_CATEGORIES.map((option) => {
                        const active = category === option
                        return (
                          <button
                            key={option}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              setCategory(option)
                              noteActivity()
                            }}
                            className={`flex h-11 items-center justify-center gap-1.5 rounded-md border text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/30 ${
                              active
                                ? "border-ink bg-ink font-medium text-white"
                                : "border-line bg-surface text-ink/65 hover:border-line-strong hover:text-ink"
                            }`}
                          >
                            {active && (
                              <Check
                                className="h-3.5 w-3.5"
                                strokeWidth={2.5}
                                aria-hidden="true"
                              />
                            )}
                            {option}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {formFields.datetime && (
                  <DateTimeField
                    id="occurred-at"
                    label="When did this happen?"
                    date={occurred.date}
                    time={occurred.time}
                    maxDate={toDateTimeParts(new Date()).date}
                    onDateChange={(date) => {
                      setOccurred((current) => ({ ...current, date }))
                      setOccurredError("")
                      noteActivity()
                    }}
                    onTimeChange={(time) => {
                      setOccurred((current) => ({ ...current, time }))
                      setOccurredError("")
                      noteActivity()
                    }}
                    onNow={() => {
                      setOccurred(toDateTimeParts(new Date()))
                      setOccurredError("")
                      noteActivity()
                    }}
                    hint="Prefilled with this device's time. Change it if the issue happened earlier."
                    error={occurredError}
                  />
                )}

                {formFields.message && (
                  <div>
                    <div className="flex items-baseline justify-between gap-4">
                      <label htmlFor="feedback-message" className={LABEL}>
                        Your feedback
                      </label>
                      <span
                        className={`text-xs tabular-nums ${
                          message.length > MAX_MESSAGE_LENGTH * 0.9
                            ? "text-accent-deep"
                            : "text-ink/35"
                        }`}
                        aria-live="polite"
                      >
                        {message.length}/{MAX_MESSAGE_LENGTH}
                      </span>
                    </div>
                    <textarea
                      id="feedback-message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="What would you like to share?"
                      rows={6}
                      maxLength={MAX_MESSAGE_LENGTH}
                      className="min-h-[9.5rem] w-full resize-none rounded-lg border border-line-strong bg-surface px-4 py-3 text-base leading-relaxed text-ink placeholder:text-ink/30 transition-colors focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/15"
                    />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div
                className="mt-4 flex items-start gap-2.5 rounded-lg border border-accent/25 bg-accent/[0.08] px-4 py-3 text-sm text-accent-deep"
                role="alert"
              >
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-5 border-t border-line pt-5">
              <button
                type="submit"
                disabled={!canSubmit}
                className="group flex h-12 items-center justify-center gap-2.5 rounded-lg bg-accent px-8 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#c96b3c] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed disabled:bg-accent/35"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {saving ? "Saving…" : "Submit feedback"}
                {!saving && (
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="text-sm text-ink/45 transition-colors hover:text-ink focus:outline-none focus-visible:underline"
              >
                Cancel
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
