import type { Metadata } from "next"
import { Mail, Globe, MapPin } from "lucide-react"
import { Container } from "@/components/marketing/container"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { ContactForm } from "@/components/marketing/contact-form"
import { siteConfig } from "@/lib/marketing/config"

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Softivum Connect team about WhatsApp Business communication and automation for your business.",
  alternates: { canonical: "/contact" },
}

export default function ContactPage() {
  return (
    <>
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <Container className="py-10">
          <Breadcrumbs items={[{ label: "Contact", href: "/contact" }]} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-[#081426]">
            Let&apos;s discuss how Softivum Connect can help your business
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[#475569]">
            Tell us about your use case and our team will get back to you shortly.
          </p>
        </Container>
      </div>

      <section className="py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 sm:p-8">
            <ContactForm />
          </div>

          <aside className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-[#081426]">Contact details</h2>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 hover:border-[#2563EB]/40"
            >
              <Mail className="mt-0.5 h-5 w-5 text-[#2563EB]" aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium text-[#0F172A]">Email</span>
                <span className="text-sm text-[#475569]">{siteConfig.contactEmail}</span>
              </span>
            </a>
            <a
              href={siteConfig.companyWebsite}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5 hover:border-[#2563EB]/40"
            >
              <Globe className="mt-0.5 h-5 w-5 text-[#2563EB]" aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium text-[#0F172A]">Website</span>
                <span className="text-sm text-[#475569]">https://www.softivum.com</span>
              </span>
            </a>
            <div className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-5">
              <MapPin className="mt-0.5 h-5 w-5 text-[#2563EB]" aria-hidden="true" />
              <span>
                <span className="block text-sm font-medium text-[#0F172A]">Location</span>
                <span className="text-sm text-[#475569]">{siteConfig.location}</span>
              </span>
            </div>
            <p className="rounded-xl bg-[#EFF6FF] p-4 text-sm text-[#475569]">
              Looking for help with an existing account? Visit{" "}
              <a href="/support" className="font-medium text-[#2563EB] hover:underline">
                Support
              </a>
              .
            </p>
          </aside>
        </Container>
      </section>
    </>
  )
}
