import type { Metadata } from "next"
import { Target, Eye, ShieldCheck, Mail, Globe, MapPin } from "lucide-react"
import { Container } from "@/components/marketing/container"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { SectionHeading } from "@/components/marketing/section-heading"
import { CtaSection } from "@/components/marketing/cta-section"
import { siteConfig } from "@/lib/marketing/config"

export const metadata: Metadata = {
  title: "About",
  description:
    "Softivum builds Softivum Connect — a WhatsApp Business communication and automation platform focused on secure, organized and responsible customer messaging.",
  alternates: { canonical: "/about" },
}

const principles = [
  {
    icon: ShieldCheck,
    title: "Responsible messaging",
    description:
      "We build for consent-based, policy-compliant communication — not unsolicited bulk messaging.",
  },
  {
    icon: Eye,
    title: "Transparency",
    description:
      "Clear data practices, honest product claims and public privacy and data deletion information.",
  },
  {
    icon: Target,
    title: "Customer focus",
    description: "Tools that help businesses respond faster and keep conversations organized.",
  },
]

export default function AboutPage() {
  return (
    <>
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <Container className="py-10">
          <Breadcrumbs items={[{ label: "About", href: "/about" }]} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-[#081426]">
            About {siteConfig.company}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[#475569]">
            {siteConfig.company} is the company behind {siteConfig.name}, a WhatsApp Business
            communication and automation platform for businesses that want better customer
            conversations.
          </p>
        </Container>
      </div>

      <section className="py-16 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#081426]">
              <Target className="h-5 w-5 text-[#2563EB]" aria-hidden="true" /> Our mission
            </h2>
            <p className="mt-4 text-[#475569]">
              To help businesses communicate with customers more efficiently through secure,
              organized and responsible automation.
            </p>
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#081426]">
              <Eye className="h-5 w-5 text-[#0EA5A4]" aria-hidden="true" /> Product vision
            </h2>
            <p className="mt-4 text-[#475569]">
              One secure platform where teams connect their WhatsApp Business account, manage every
              conversation, automate the repetitive work and clearly track what reaches their
              customers — without compromising on data handling or compliance.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-[#F8FAFC] py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Principles"
            title="Responsible communication principles"
            description="How we approach building a messaging platform people can trust."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {principles.map((p) => (
              <div key={p.title} className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <p.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-[#0F172A]">{p.title}</h3>
                <p className="mt-2 text-sm text-[#475569]">{p.description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading align="left" eyebrow="Contact" title="Business details" />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 hover:border-[#2563EB]/40"
            >
              <Mail className="h-5 w-5 text-[#2563EB]" aria-hidden="true" />
              <span className="text-sm text-[#0F172A]">{siteConfig.contactEmail}</span>
            </a>
            <a
              href={siteConfig.companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 hover:border-[#2563EB]/40"
            >
              <Globe className="h-5 w-5 text-[#2563EB]" aria-hidden="true" />
              <span className="text-sm text-[#0F172A]">www.softivum.com</span>
            </a>
            <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5">
              <MapPin className="h-5 w-5 text-[#2563EB]" aria-hidden="true" />
              <span className="text-sm text-[#0F172A]">{siteConfig.location}</span>
            </div>
          </div>
        </Container>
      </section>

      <CtaSection
        title="Let's build better customer conversations"
        description="See how Softivum Connect can help your business communicate on WhatsApp."
        actions={[
          { label: "Get Started", href: "/signup", variant: "onDark" },
          { label: "Contact Us", href: "/contact", variant: "outlineOnDark" },
        ]}
      />
    </>
  )
}
