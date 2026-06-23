import type { Metadata } from "next"
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Webhook,
  UserCog,
  Activity,
  Database,
  Server,
  AlertTriangle,
  Mail,
} from "lucide-react"
import { Container } from "@/components/marketing/container"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { SectionHeading } from "@/components/marketing/section-heading"
import { SecurityCard } from "@/components/marketing/security-card"
import { CtaSection } from "@/components/marketing/cta-section"
import { siteConfig } from "@/lib/marketing/config"

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Softivum Connect approaches security: HTTPS, server-side credential handling, webhook validation, access controls, logging, backups and responsible disclosure.",
  alternates: { canonical: "/security" },
}

const practices = [
  { icon: Lock, title: "Secure HTTPS communication", description: "Traffic is served over HTTPS using modern transport encryption." },
  { icon: KeyRound, title: "Server-side credential handling", description: "Access credentials are processed on the server and are not exposed to the browser." },
  { icon: ShieldCheck, title: "Encrypted secrets", description: "Sensitive secrets are stored using encryption at rest." },
  { icon: Webhook, title: "Webhook signature validation", description: "Incoming webhook events are validated before they are processed." },
  { icon: UserCog, title: "Access controls", description: "Role-based permissions limit what each team member can access." },
  { icon: Activity, title: "Logging and monitoring", description: "Application activity is logged to support monitoring and troubleshooting." },
  { icon: Database, title: "Database access restrictions", description: "Database access is restricted to authorized services and personnel." },
  { icon: Server, title: "Backup practices", description: "Regular backups support recovery. Backups may retain data for a limited period." },
]

export default function SecurityPage() {
  return (
    <>
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <Container className="py-10">
          <Breadcrumbs items={[{ label: "Security", href: "/security" }]} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-[#081426]">
            Security at Softivum Connect
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[#475569]">
            Practical safeguards across credentials, transport, access and data. We describe what we
            do honestly and do not claim certifications we have not obtained.
          </p>
        </Container>
      </div>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {practices.map((p) => (
              <SecurityCard key={p.title} {...p} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#F8FAFC] py-16 sm:py-20">
        <Container className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#081426]">
              <AlertTriangle className="h-5 w-5 text-[#F59E0B]" aria-hidden="true" /> Incident response
            </h2>
            <p className="mt-4 text-[#475569]">
              If you believe there is a security incident affecting your account or data, contact us
              as soon as possible so we can investigate and respond.
            </p>
            <a
              href={`mailto:${siteConfig.securityEmail}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#2563EB] hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> {siteConfig.securityEmail}
            </a>
          </div>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-[#081426]">
              <ShieldCheck className="h-5 w-5 text-[#0EA5A4]" aria-hidden="true" /> Responsible disclosure
            </h2>
            <p className="mt-4 text-[#475569]">
              We welcome reports from security researchers. If you discover a vulnerability, please
              report it privately and give us reasonable time to address it before public disclosure.
            </p>
            <a
              href={`mailto:${siteConfig.securityEmail}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#2563EB] hover:underline"
            >
              <Mail className="h-4 w-4" aria-hidden="true" /> {siteConfig.securityEmail}
            </a>
          </div>
        </Container>
      </section>

      <CtaSection
        title="Questions about security or data handling?"
        description="Read our privacy practices or reach out — we're happy to help."
        actions={[
          { label: "Privacy Policy", href: "/privacy-policy", variant: "onDark" },
          { label: "Contact Us", href: "/contact", variant: "outlineOnDark" },
        ]}
      />
    </>
  )
}
