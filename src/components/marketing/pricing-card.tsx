import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { CtaButton } from "./cta-button"
import type { PricingPlan } from "@/lib/marketing/config"

/**
 * Pricing card driven entirely by a PricingPlan config object. The
 * featured plan is visually lifted (brand border + badge). Prices are
 * rendered verbatim from config so "Free" / "Custom" / "Contact us"
 * all display correctly.
 */
export function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-white p-7",
        plan.featured
          ? "border-[#2563EB] shadow-lg ring-1 ring-[#2563EB]"
          : "border-[#E2E8F0]",
      )}
    >
      {plan.featured ? (
        <span className="absolute -top-3 left-7 rounded-full bg-[#2563EB] px-3 py-1 text-xs font-semibold text-white">
          Most popular
        </span>
      ) : null}

      <h3 className="text-lg font-semibold text-[#0F172A]">{plan.name}</h3>
      <p className="mt-1 text-sm text-[#475569]">{plan.description}</p>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight text-[#081426]">{plan.price}</span>
        {plan.priceSuffix ? (
          <span className="text-sm text-[#475569]">{plan.priceSuffix}</span>
        ) : null}
      </div>

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-[#334155]">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden="true" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <CtaButton
        href={plan.cta.href}
        variant={plan.featured ? "primary" : "secondary"}
        size="md"
        className="mt-7 w-full"
      >
        {plan.cta.label}
      </CtaButton>
    </div>
  )
}
