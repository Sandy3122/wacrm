import type { Metadata } from "next"
import { Info } from "lucide-react"
import { Container } from "@/components/marketing/container"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { PricingCard } from "@/components/marketing/pricing-card"
import { FaqAccordion } from "@/components/marketing/faq-accordion"
import { SectionHeading } from "@/components/marketing/section-heading"
import { CtaSection } from "@/components/marketing/cta-section"
import { pricingPlans, pricingDisclaimer } from "@/lib/marketing/config"

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent Softivum Connect plans for businesses of every size. WhatsApp conversation and template charges from Meta may apply separately.",
  alternates: { canonical: "/pricing" },
}

const pricingFaqs = [
  {
    question: "Are WhatsApp or Meta fees included?",
    answer:
      "No. WhatsApp conversation charges, template charges or other Meta-related messaging fees are billed according to Meta's current pricing and policies and may apply separately from your Softivum Connect plan.",
  },
  {
    question: "Is pricing final?",
    answer:
      "Plans and prices shown here may be adjusted before launch. Contact us for current pricing and a quote tailored to your usage.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. You can move between plans as your needs change. Contact us to discuss the right fit.",
  },
]

export default function PricingPage() {
  return (
    <>
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <Container className="py-10">
          <Breadcrumbs items={[{ label: "Pricing", href: "/pricing" }]} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-[#081426]">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[#475569]">
            Choose a plan that fits your team. Talk to us for a quote tailored to your messaging
            volume.
          </p>
        </Container>
      </div>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid items-stretch gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <PricingCard key={plan.id} plan={plan} />
            ))}
          </div>

          <div className="mt-10 flex items-start gap-3 rounded-2xl border border-[#F59E0B]/30 bg-[#FFFBEB] p-5 text-sm text-[#92400E]">
            <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{pricingDisclaimer}</p>
          </div>
        </Container>
      </section>

      <section className="bg-[#F8FAFC] py-16 sm:py-20">
        <Container className="max-w-3xl">
          <SectionHeading eyebrow="Pricing FAQ" title="Questions about pricing" />
          <div className="mt-10">
            <FaqAccordion items={pricingFaqs} />
          </div>
        </Container>
      </section>

      <CtaSection
        title="Not sure which plan fits?"
        description="Tell us about your use case and we'll recommend the right plan for your team."
        actions={[
          { label: "Contact Sales", href: "/contact", variant: "onDark" },
          { label: "Start Free", href: "/signup", variant: "outlineOnDark" },
        ]}
      />
    </>
  )
}
