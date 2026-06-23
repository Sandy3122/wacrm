import type { LucideIcon } from "lucide-react"

/**
 * Compact card for the use-cases grid. Smaller and lighter than a
 * FeatureCard — icon + title + one supporting line.
 */
export function UseCaseCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex h-full items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 transition-colors hover:border-[#2563EB]/40">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
        <p className="text-sm text-[#475569]">{description}</p>
      </div>
    </div>
  )
}
