"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

import { Logo } from "@/components/ui/logo"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-paper px-6 py-10 text-center">
      <Logo className="w-36 opacity-80" sizes="144px" />

      <div className="mt-10 flex h-14 w-14 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.08]">
        <AlertTriangle className="h-6 w-6 text-accent-deep" aria-hidden="true" />
      </div>
      <div className="mt-5">
        <h1 className="text-xl font-medium tracking-[-0.02em] text-ink">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/50">
          The kiosk hit an unexpected error. Your saved feedback is safe.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="mt-7 h-11 rounded-md bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-[#252d35] focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/40 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </main>
  )
}
