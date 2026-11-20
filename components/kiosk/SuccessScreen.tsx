"use client"

import { useEffect } from "react"

import { Logo } from "@/components/ui/logo"

type SuccessScreenProps = {
  onDone: () => void
  seconds?: number
}

export function SuccessScreen({ onDone, seconds = 4 }: SuccessScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [onDone, seconds])

  return (
    <div
      className="screen-enter flex h-full w-full flex-col items-center justify-center bg-paper px-8 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-lg py-12">
        <Logo className="mx-auto w-32" sizes="128px" />

        <div className="relative mx-auto mt-11 flex h-24 w-24 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-accent/30"
            style={{ animation: "success-ring 900ms ease-out both" }}
          />
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-accent shadow-[0_10px_28px_rgba(217,119,70,0.22)]"
            style={{ animation: "success-pop 520ms cubic-bezier(0.2, 0.9, 0.25, 1.15) both" }}
          >
            <svg className="h-11 w-11" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <path
                d="M13.5 25.5 21 33 34.5 17.5"
                stroke="white"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={36}
                strokeDasharray={36}
                strokeDashoffset={36}
                style={{ animation: "success-check 380ms 160ms ease-out both" }}
              />
            </svg>
          </div>
        </div>

        <h1 className="mt-8 text-balance text-4xl font-medium tracking-[-0.04em] text-ink">
          Thank you
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-ink/50">
          Your feedback was saved.
        </p>

        <div className="mx-auto mt-9 h-0.5 w-44 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full w-full origin-left bg-accent"
            style={{ animation: `kiosk-drain ${seconds}s linear forwards` }}
          />
        </div>
      </div>
    </div>
  )
}
