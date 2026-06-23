import type { Metadata } from "next"
import Link from "next/link"
import {
  Rocket,
  Plug,
  Smartphone,
  FileText,
  MessageSquare,
  CheckCheck,
  UserCog,
  Trash2,
  Mail,
  ArrowRight,
} from "lucide-react"
import { Container } from "@/components/marketing/container"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { SectionHeading } from "@/components/marketing/section-heading"
import { siteConfig } from "@/lib/marketing/config"

export const metadata: Metadata = {
  title: "Support",
  description:
    "Help with Softivum Connect: getting started, connecting WhatsApp, Embedded Signup, Coexistence eligibility, templates, replies, delivery statuses, account access and data deletion.",
  alternates: { canonical: "/support" },
}

const topics = [
  { icon: Rocket, title: "Getting started", description: "Create a workspace and find your way around Softivum Connect.", href: "/how-it-works" },
  { icon: Plug, title: "Connecting WhatsApp", description: "Link an eligible WhatsApp Business account to your workspace.", href: "/how-it-works" },
  { icon: Smartphone, title: "Embedded Signup help", description: "What to expect during Meta's Embedded Signup flow.", href: "/how-it-works" },
  { icon: Smartphone, title: "Coexistence eligibility", description: "Understand when the WhatsApp Business app can be used alongside connected features.", href: "/features" },
  { icon: FileText, title: "Sending approved templates", description: "Use templates approved within your WhatsApp Business account.", href: "/features" },
  { icon: MessageSquare, title: "Receiving replies", description: "How incoming customer replies arrive in your inbox.", href: "/features" },
  { icon: CheckCheck, title: "Understanding delivery statuses", description: "What sent, delivered, read and failed mean.", href: "/features" },
  { icon: UserCog, title: "Managing account access", description: "Invite teammates and manage roles and permissions.", href: "/features" },
  { icon: Trash2, title: "Data deletion", description: "Request deletion of your account and associated data.", href: "/data-deletion" },
]

export default function SupportPage() {
  return (
    <>
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <Container className="py-10">
          <Breadcrumbs items={[{ label: "Support", href: "/support" }]} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-[#081426]">
            How can we help?
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[#475569]">
            Browse common topics below, or reach out to our team directly.
          </p>
        </Container>
      </div>

      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading align="left" eyebrow="Help topics" title="Popular help topics" />
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <Link
                key={t.title}
                href={t.href}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-shadow hover:shadow-md"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <t.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-base font-semibold text-[#0F172A]">{t.title}</h2>
                <p className="text-sm text-[#475569]">{t.description}</p>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-[#2563EB]">
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#F8FAFC] py-16 sm:py-20">
        <Container>
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-3xl border border-[#E2E8F0] bg-white p-10 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <Mail className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="text-2xl font-bold text-[#081426]">Contact support</h2>
            <p className="text-[#475569]">
              Can&apos;t find what you need? Email our support team and we&apos;ll help you out.
            </p>
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="inline-flex items-center gap-2 text-base font-semibold text-[#2563EB] hover:underline"
            >
              {siteConfig.supportEmail}
            </a>
          </div>
        </Container>
      </section>
    </>
  )
}
