import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type FeatureStatus = "available" | "coming-soon" | "planned" | "under-development"

const statusLabels: Record<Exclude<FeatureStatus, "available">, string> = {
  "coming-soon": "Coming soon",
  planned: "Planned",
  "under-development": "Under development",
}

/**
 * Rounded feature card: icon tile, title, description and an optional
 * "practical benefit" line. Unfinished capabilities carry an honest
 * status badge (coming soon / planned / under development) so the site
 * never claims an unbuilt feature is live.
 */
export function FeatureCard({
  icon: Icon,
  title,
  description,
  benefit,
  status = "available",
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  benefit?: string
  status?: FeatureStatus
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {status !== "available" ? (
          <span className="rounded-full bg-[#FEF3C7] px-2.5 py-1 text-xs font-medium text-[#92400E]">
            {statusLabels[status]}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
        <p className="text-sm text-[#475569]">{description}</p>
      </div>
      {benefit ? (
        <p className="mt-auto border-t border-[#E2E8F0] pt-3 text-sm text-[#0EA5A4]">
          {benefit}
        </p>
      ) : null}
    </div>
  )
}
