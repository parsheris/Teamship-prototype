"use client"

import { ArrowRight, Lock } from "lucide-react"

import { Logo } from "@/components/ui/logo"

type IdleScreenProps = {
  onStart: () => void
  onAdmin: () => void
}

export function IdleScreen({ onStart, onAdmin }: IdleScreenProps) {
  return (
    <div
      onClick={onStart}
      className="screen-enter relative flex h-full w-full cursor-pointer select-none flex-col bg-paper px-6 py-6 sm:px-10 sm:py-8 lg:px-14 lg:py-10"
    >
      <header>
        <Logo
          className="w-36 sm:w-44"
          priority
          sizes="(max-width: 640px) 144px, 176px"
        />
      </header>

      <div className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-5xl py-12 lg:py-16">
          <h1 className="max-w-[10ch] text-balance text-[clamp(3rem,7vw,6rem)] font-medium leading-[0.94] tracking-[-0.055em] text-ink">
            Reporting
          </h1>

          <p className="mt-6 text-base text-ink/55 sm:text-lg">
            By QuickCatch.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onStart()
              }}
              className="group flex h-14 items-center justify-center gap-3 rounded-lg bg-accent px-8 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#c96b3c] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Start
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </div>

      <footer className="flex justify-end border-t border-line pt-4">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onAdmin()
          }}
          aria-label="Admin"
          className="flex h-10 w-10 items-center justify-center rounded-md text-ink/35 transition-colors hover:bg-ink/[0.04] hover:text-ink/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-steel/30"
        >
          <Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
        </button>
      </footer>
    </div>
  )
}
