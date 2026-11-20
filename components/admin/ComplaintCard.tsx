import { formatDateTime } from "@/lib/datetime"
import { HAPPINESS_LABELS } from "@/lib/types"
import type { ComplaintRecord } from "@/lib/types"

function timeBlock(value: string | undefined, label: string) {
  if (!value) return null
  const formatted = formatDateTime(value)
  if (!formatted.iso) return null

  return (
    <div>
      <p className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-ink/35">
        {label}
      </p>
      <time
        dateTime={formatted.iso}
        className="mt-1.5 block text-[0.8rem] leading-snug text-ink/70"
      >
        <span className="block">{formatted.date}</span>
        <span className="block text-[0.72rem] tabular-nums text-ink/40">{formatted.time}</span>
      </time>
    </div>
  )
}

export function ComplaintCard({ record }: { record: ComplaintRecord }) {
  const happiness = record.happiness ? HAPPINESS_LABELS[record.happiness] : null

  return (
    <article className="grid gap-4 px-4 py-5 transition-colors hover:bg-paper/40 sm:px-5 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-8">
      <div className="flex gap-6 lg:block lg:space-y-4">
        {timeBlock(record.occurred_at, "Happened")}
        {timeBlock(record.submitted_at || record.created_date, record.occurred_at ? "Logged" : "Submitted")}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="border border-steel/20 bg-steel/[0.05] px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-steel">
            {record.category || "Other"}
          </span>
          {happiness && (
            <span className="border border-accent/25 bg-accent/[0.06] px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-[0.14em] text-accent-deep">
              {happiness}
            </span>
          )}
          <span className="text-[0.82rem] text-ink/60">
            {record.employee_name || "Anonymous"}
          </span>
        </div>

        {record.message ? (
          <p className="mt-3 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-ink/90">
            {record.message}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-ink/35">No comment provided.</p>
        )}
      </div>
    </article>
  )
}
