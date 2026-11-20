"use client"

import { useEffect, useState } from "react"

type NowClockProps = {
  className?: string
  align?: "left" | "right"
}

export function NowClock({ className = "", align = "right" }: NowClockProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const initial = window.setTimeout(() => setNow(new Date()), 0)
    const timer = window.setInterval(() => setNow(new Date()), 15_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div
      className={`${align === "right" ? "text-right" : "text-left"} ${className}`}
      aria-label="Current device date and time"
    >
      <p className="text-[0.63rem] font-medium uppercase tracking-[0.2em] text-steel">
        Local time
      </p>
      <p className="mt-1 text-sm tabular-nums text-ink">
        {now ? (
          <>
            <span className="text-ink/55">
              {now.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="mx-2 text-ink/25">/</span>
            <span className="font-medium">
              {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </span>
          </>
        ) : (
          <span className="inline-block h-4 w-32 animate-pulse rounded bg-ink/10" aria-hidden="true" />
        )}
      </p>
    </div>
  )
}
