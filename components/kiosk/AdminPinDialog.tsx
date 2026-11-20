"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { Delete, Loader2, LockKeyhole } from "lucide-react"

import { Logo } from "@/components/ui/logo"
import { ApiError, loginAdmin } from "@/lib/api"

const PIN_LENGTH = 4
const MAX_ATTEMPTS = 5
const LOCKOUT_SECONDS = 30
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"] as const

const subscribeToMount = () => () => {}
const getMounted = () => true
const getServerMounted = () => false
const nowMs = () => Date.now()

type AdminPinDialogProps = {
  onCancel: () => void
  onSuccess: () => void
}

export function AdminPinDialog({ onCancel, onSuccess }: AdminPinDialogProps) {
  const mounted = useSyncExternalStore(subscribeToMount, getMounted, getServerMounted)
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(0)
  const busyRef = useRef(false)

  useEffect(() => {
    if (!lockedUntil) return

    const timer = window.setInterval(() => {
      const current = nowMs()
      setNow(current)

      if (current >= lockedUntil) {
        setLockedUntil(0)
        setAttempts(0)
      }
    }, 500)

    return () => window.clearInterval(timer)
  }, [lockedUntil])

  const locked = lockedUntil > now
  const remaining = locked ? Math.max(1, Math.ceil((lockedUntil - now) / 1000)) : 0

  const verify = async (pin: string) => {
    if (busyRef.current) return

    busyRef.current = true
    setVerifying(true)
    setError("")

    try {
      await loginAdmin(pin)
      setAttempts(0)
      onSuccess()
    } catch (loginError) {
      const nextAttempts = attempts + 1
      setAttempts(nextAttempts)
      setValue("")

      if (
        (loginError instanceof ApiError && loginError.status === 429) ||
        nextAttempts >= MAX_ATTEMPTS
      ) {
        const current = nowMs()
        setLockedUntil(current + LOCKOUT_SECONDS * 1000)
        setNow(current)
        setError(`Too many attempts. Wait ${LOCKOUT_SECONDS} seconds.`)
      } else {
        setError(loginError instanceof ApiError ? loginError.message : "Could not verify PIN.")
      }
    } finally {
      busyRef.current = false
      setVerifying(false)
    }
  }

  const press = (digit: string) => {
    if (verifying || locked) return

    const next = (value + digit).slice(0, PIN_LENGTH)
    setValue(next)
    setError("")

    if (next.length === PIN_LENGTH) {
      void verify(next)
    }
  }

  const clear = () => {
    if (verifying) return
    setValue("")
    setError("")
  }

  const back = () => {
    if (verifying) return
    setValue((current) => current.slice(0, -1))
    setError("")
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-paper/95 px-6 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-pin-title"
    >
      <div className="relative w-full max-w-[21rem] rounded-xl border border-line bg-surface p-7 text-center sm:p-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 mx-auto h-[2px] w-16 rounded-b-full bg-accent"
        />

        <Logo className="mx-auto w-28" sizes="112px" />

        <p className="mt-7 flex items-center justify-center gap-2 text-[0.64rem] font-medium uppercase tracking-[0.2em] text-steel">
          <LockKeyhole className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          Restricted area
        </p>
        <h2
          id="admin-pin-title"
          className="mt-2 text-xl font-medium tracking-[-0.02em] text-ink"
        >
          Admin access
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/45">
          Enter the four-digit PIN to manage this kiosk.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3" aria-hidden="true">
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <span
              key={index}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                index < value.length ? "bg-accent" : "bg-ink/15"
              }`}
            />
          ))}
        </div>

        <p
          className="mt-2.5 min-h-5 text-xs text-accent-deep"
          role="alert"
          aria-live="assertive"
        >
          {locked ? `Locked for ${remaining}s` : error}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === "clear") clear()
                else if (key === "back") back()
                else press(key)
              }}
              disabled={verifying || locked}
              aria-label={key === "clear" ? "Clear PIN" : key === "back" ? "Delete last digit" : key}
              className="flex h-14 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink transition-colors hover:border-line-strong hover:bg-paper/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/30 active:bg-paper-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              {key === "clear" ? (
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-ink/50">
                  Clear
                </span>
              ) : key === "back" ? (
                <Delete className="h-5 w-5 text-ink/50" strokeWidth={1.75} aria-hidden="true" />
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 border-t border-line pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-ink/45 transition-colors hover:text-ink focus:outline-none focus-visible:underline"
          >
            Cancel
          </button>
          {verifying && (
            <span className="flex items-center gap-1.5 text-xs text-steel" role="status">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Verifying…
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
