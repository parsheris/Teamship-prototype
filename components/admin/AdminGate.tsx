"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert } from "lucide-react"

import { AdminPinDialog } from "@/components/kiosk/AdminPinDialog"
import { Logo } from "@/components/ui/logo"
import { LoadingScreen } from "@/components/ui/loading-screen"
import { hasAdminSession } from "@/lib/api"

type GateState = "checking" | "locked" | "unlocked" | "error"

export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [state, setState] = useState<GateState>("checking")

  useEffect(() => {
    let cancelled = false

    hasAdminSession()
      .then((authenticated) => {
        if (!cancelled) setState(authenticated ? "unlocked" : "locked")
      })
      .catch(() => {
        if (!cancelled) setState("error")
      })

    return () => {
      cancelled = true
    }
  }, [])

  const retry = () => {
    setState("checking")
    hasAdminSession()
      .then((authenticated) => setState(authenticated ? "unlocked" : "locked"))
      .catch(() => setState("error"))
  }

  if (state === "checking") {
    return <LoadingScreen label="Checking admin access…" />
  }

  if (state === "error") {
    return (
      <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-paper px-6 py-10 text-center">
        <Logo className="w-36" sizes="144px" />

        <div className="mt-10 flex h-14 w-14 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.08]">
          <ShieldAlert className="h-6 w-6 text-accent-deep" aria-hidden="true" />
        </div>
        <div className="mt-5">
          <h1 className="text-xl font-medium tracking-[-0.02em] text-ink">
            Admin access unavailable
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/50">
            The kiosk server could not be reached. Check that the server is running and try again.
          </p>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-5">
          <button
            type="button"
            onClick={retry}
            className="h-11 rounded-md bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-[#252d35] focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/40 focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="text-sm text-ink/45 transition-colors hover:text-ink focus:outline-none focus-visible:underline"
          >
            Back to kiosk
          </button>
        </div>
      </main>
    )
  }

  if (state === "locked") {
    return (
      <AdminPinDialog
        onCancel={() => router.replace("/")}
        onSuccess={() => setState("unlocked")}
      />
    )
  }

  return <>{children}</>
}
