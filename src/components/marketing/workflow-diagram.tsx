import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"

export type WorkflowStep = { label: string; icon?: LucideIcon }

/**
 * Horizontal (wraps to vertical on small screens) flow diagram used by
 * the automation section and the how-it-works page. Renders a chain of
 * labelled nodes joined by arrows. Decorative arrows are aria-hidden;
 * the sequence reads correctly as an ordered list for screen readers.
 */
export function WorkflowDiagram({ steps }: { steps: WorkflowStep[] }) {
  return (
    <ol className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
      {steps.map((step, i) => {
        const Icon = step.icon
        return (
          <li key={step.label} className="flex items-center gap-3 sm:contents">
            <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 shadow-sm sm:flex-none">
              {Icon ? (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              ) : null}
              <span className="text-sm font-medium text-[#0F172A]">{step.label}</span>
            </div>
            {i < steps.length - 1 ? (
              <ArrowRight
                className="h-5 w-5 shrink-0 rotate-90 text-[#94a3b8] sm:rotate-0"
                aria-hidden="true"
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
