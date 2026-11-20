"use client"

import { useEffect } from "react"

export function useWakeLock(enabled = true): void {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return

    let lock: WakeLockSentinel | null = null
    let disposed = false

    const acquire = async () => {
      if (disposed || document.visibilityState !== "visible" || lock) return

      try {
        lock = await navigator.wakeLock.request("screen")
        lock.addEventListener("release", () => {
          lock = null
        })
      } catch {
        // Wake lock is optional; the kiosk still works if the browser denies it.
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void acquire()
    }

    void acquire()
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      disposed = true
      document.removeEventListener("visibilitychange", onVisibilityChange)
      void lock?.release().catch(() => {})
      lock = null
    }
  }, [enabled])
}
