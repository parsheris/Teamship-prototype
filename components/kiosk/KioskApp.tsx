"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"

import { AdminPinDialog } from "@/components/kiosk/AdminPinDialog"
import { FeedbackForm } from "@/components/kiosk/FeedbackForm"
import { IdleScreen } from "@/components/kiosk/IdleScreen"
import { SuccessScreen } from "@/components/kiosk/SuccessScreen"
import { useKioskSettings } from "@/hooks/useKioskSettings"
import { useWakeLock } from "@/hooks/useWakeLock"
import { submitComplaint } from "@/lib/api"
import { addToQueue, markSynced } from "@/lib/offlineStore"
import type { FeedbackInput } from "@/lib/types"

type Mode = "idle" | "form" | "thanks"

export function KioskApp() {
  const [mode, setMode] = useState<Mode>("idle")
  const [pinOpen, setPinOpen] = useState(false)
  const settings = useKioskSettings()
  const router = useRouter()

  useWakeLock(true)

  const showIdle = useCallback(() => setMode("idle"), [])
  const showForm = useCallback(() => setMode("form"), [])

  const handleSubmit = useCallback(async (input: FeedbackInput) => {
    const record = addToQueue(input)

    void submitComplaint({
      employee_name: record.employee_name,
      category: record.category,
      message: record.message,
      happiness: record.happiness ?? undefined,
      local_id: record.local_id,
      submitted_at: record.submitted_at,
      occurred_at: record.occurred_at ?? undefined,
    })
      .then(() => markSynced([record.local_id]))
      .catch(() => {
        // The entry stays in the local queue and can be synced from the dashboard.
      })

    setMode("thanks")
  }, [])

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-paper text-ink">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] bg-accent" />

      {mode === "idle" && <IdleScreen onStart={showForm} onAdmin={() => setPinOpen(true)} />}

      {mode === "form" && (
        <FeedbackForm
          key="feedback-form"
          timeoutSeconds={settings.form_timeout}
          formFields={settings.form_fields}
          onCancel={showIdle}
          onSubmit={handleSubmit}
        />
      )}

      {mode === "thanks" && <SuccessScreen onDone={showIdle} />}

      {pinOpen && (
        <AdminPinDialog
          onCancel={() => setPinOpen(false)}
          onSuccess={() => {
            setPinOpen(false)
            router.push("/admin")
          }}
        />
      )}
    </main>
  )
}
