import type { LucideIcon } from "lucide-react"

/**
 * Card for the security/practices grids. Describes one safeguard in
 * factual terms — deliberately avoids certification claims.
 */
export function SecurityCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-6">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#0EA5A4]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="text-base font-semibold text-[#0F172A]">{title}</h3>
      <p className="text-sm text-[#475569]">{description}</p>
    </div>
  )
}
