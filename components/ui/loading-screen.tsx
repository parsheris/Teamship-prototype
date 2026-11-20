import { Loader2 } from "lucide-react"

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface">
        <Loader2 className="h-5 w-5 animate-spin text-steel" aria-hidden="true" />
      </div>
      <p
        className="text-[0.68rem] font-medium uppercase tracking-[0.18em] text-ink/45"
        role="status"
      >
        {label}
      </p>
    </div>
  )
}
