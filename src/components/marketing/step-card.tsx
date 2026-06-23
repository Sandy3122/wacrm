import type { LucideIcon } from "lucide-react"

/**
 * Numbered step used by the "How it works" sequences. The number is the
 * primary visual indicator; an optional icon reinforces the action.
 */
export function StepCard({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: number
  title: string
  description: string
  icon?: LucideIcon
}) {
  return (
    <div className="relative flex h-full flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-6">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2563EB] text-sm font-bold text-white">
          {step}
        </span>
        {Icon ? <Icon className="h-5 w-5 text-[#0EA5A4]" aria-hidden="true" /> : null}
      </div>
      <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
      <p className="text-sm text-[#475569]">{description}</p>
    </div>
  )
}
