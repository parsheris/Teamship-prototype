import Link from "next/link"
import { FileQuestion } from "lucide-react"

import { Logo } from "@/components/ui/logo"

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-paper px-6 py-10 text-center">
      <Logo className="w-36 opacity-80" sizes="144px" />

      <div className="mt-10 flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface">
        <FileQuestion className="h-6 w-6 text-steel" strokeWidth={1.7} aria-hidden="true" />
      </div>
      <div className="mt-5">
        <h1 className="text-xl font-medium tracking-[-0.02em] text-ink">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/50">
          This kiosk only has a feedback screen and an admin dashboard.
        </p>
      </div>
      <Link
        href="/"
        className="mt-7 flex h-11 items-center rounded-md bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-[#252d35] focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/40 focus-visible:ring-offset-2"
      >
        Back to kiosk
      </Link>
    </main>
  )
}
