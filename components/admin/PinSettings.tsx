"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { ApiError, updateAdminPin } from "@/lib/api"
import { saveSettings } from "@/lib/offlineStore"
import type { KioskFormFields, KioskSettings } from "@/lib/types"
import { PIN_LENGTH } from "@/lib/validation"

type FeedbackMessage = {
  type: "success" | "error"
  text: string
}

type PinSettingsProps = {
  settings: KioskSettings
  onClose: () => void
}

const field =
  "h-11 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-base text-ink transition-colors placeholder:text-ink/30 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/15 disabled:opacity-60"
const label = "mb-2 block text-[0.69rem] font-medium uppercase tracking-[0.16em] text-steel"

const FORM_FIELD_OPTIONS: Array<{
  key: keyof KioskFormFields
  label: string
  description: string
}> = [
  { key: "name", label: "Name", description: "Optional employee name" },
  { key: "category", label: "Category", description: "Workplace, safety, equipment, and more" },
  { key: "happiness", label: "Happiness", description: "Angry to happy face scale" },
  { key: "message", label: "Comments", description: "Open-ended written feedback" },
  {
    key: "datetime",
    label: "Date & time",
    description: "When it happened, with a Now shortcut",
  },
]

export function PinSettings({ settings, onClose }: PinSettingsProps) {
  const [form, setForm] = useState({
    form_timeout: String(settings.form_timeout),
    form_fields: { ...settings.form_fields },
    pin: "",
    confirm_pin: "",
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<FeedbackMessage | null>(null)

  const update = (patch: Partial<typeof form>) => {
    setForm((current) => ({ ...current, ...patch }))
    setMessage(null)
  }

  const toggleFormField = (key: keyof KioskFormFields) => {
    update({ form_fields: { ...form.form_fields, [key]: !form.form_fields[key] } })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    const timeout = Number(form.form_timeout)
    const pin = form.pin.trim()
    const confirmPin = form.confirm_pin.trim()

    if (!Number.isInteger(timeout) || timeout < 15 || timeout > 600) {
      setMessage({ type: "error", text: "Reset time must be between 15 and 600 seconds." })
      return
    }

    if (!form.form_fields.name && !form.form_fields.happiness && !form.form_fields.message) {
      setMessage({
        type: "error",
        text: "Keep at least one of Name, Happiness, or Comments visible.",
      })
      return
    }

    if (pin || confirmPin) {
      if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
        setMessage({ type: "error", text: `Admin PIN must be exactly ${PIN_LENGTH} digits.` })
        return
      }
      if (pin !== confirmPin) {
        setMessage({ type: "error", text: "The PIN confirmation does not match." })
        return
      }
    }

    setSaving(true)

    try {
      if (pin) await updateAdminPin(pin)

      saveSettings({
        form_timeout: timeout,
        form_fields: form.form_fields,
      })

      setForm((current) => ({ ...current, pin: "", confirm_pin: "" }))
      setMessage({
        type: "success",
        text: pin ? "Settings and admin PIN saved." : "Settings saved.",
      })
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof ApiError ? error.message : "Could not save settings. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 rounded-xl border border-line bg-surface p-5 sm:grid-cols-3 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line pb-4 sm:col-span-3">
        <div>
          <p className="text-[0.62rem] font-medium uppercase tracking-[0.2em] text-steel">
            This device
          </p>
          <h2 className="mt-1 text-lg font-medium tracking-[-0.02em] text-ink">Kiosk settings</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="text-xs text-ink/40 transition-colors hover:text-ink focus:outline-none focus-visible:underline disabled:opacity-40"
        >
          Close
        </button>
      </div>

      <fieldset className="sm:col-span-3">
        <legend className={label}>Questions shown on the kiosk</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {FORM_FIELD_OPTIONS.map((option) => (
            <label
              key={option.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 transition-colors hover:border-line-strong hover:bg-paper/40"
            >
              <input
                type="checkbox"
                checked={form.form_fields[option.key]}
                onChange={() => toggleFormField(option.key)}
                disabled={saving}
                className="mt-0.5 h-4 w-4 shrink-0 accent-steel"
              />
              <span>
                <span className="block text-sm font-medium text-ink">{option.label}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink/45">
                  {option.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className={label}>Reset after (seconds)</span>
        <input
          value={form.form_timeout}
          onChange={(event) => update({ form_timeout: event.target.value })}
          inputMode="numeric"
          disabled={saving}
          className={field}
        />
      </label>

      <label className="block">
        <span className={label}>New admin PIN</span>
        <input
          value={form.pin}
          onChange={(event) => update({ pin: event.target.value.replace(/\D/g, "") })}
          inputMode="numeric"
          type="password"
          autoComplete="new-password"
          maxLength={PIN_LENGTH}
          disabled={saving}
          placeholder="Leave blank to keep"
          className={field}
        />
      </label>

      <label className="block">
        <span className={label}>Confirm new PIN</span>
        <input
          value={form.confirm_pin}
          onChange={(event) => update({ confirm_pin: event.target.value.replace(/\D/g, "") })}
          inputMode="numeric"
          type="password"
          autoComplete="new-password"
          maxLength={PIN_LENGTH}
          disabled={saving}
          placeholder="Repeat new PIN"
          className={field}
        />
      </label>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4 sm:col-span-3">
        <button
          type="submit"
          disabled={saving}
          className="flex h-10 items-center gap-2 rounded-md bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-[#252d35] focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/40 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {saving ? "Saving…" : "Save settings"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              message.type === "error" ? "text-accent-deep" : "text-steel"
            }`}
            role={message.type === "error" ? "alert" : "status"}
          >
            {message.text}
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed text-ink/40 sm:col-span-3">
        The admin PIN protects this dashboard. Changing it signs out any other admin sessions.
        Reset time and visible questions apply to this device.
      </p>
    </form>
  )
}
