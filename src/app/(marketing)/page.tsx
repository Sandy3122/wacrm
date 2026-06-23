import type { Metadata } from "next"
import Link from "next/link"
import {
  Plug,
  Smartphone,
  Inbox,
  FileText,
  Workflow,
  CheckCheck,
  UserPlus,
  Calendar,
  LifeBuoy,
  Package,
  MessageSquare,
  Megaphone,
  GraduationCap,
  Stethoscope,
  Building2,
  Wrench,
  ShieldCheck,
  ArrowRight,
  Lock,
  KeyRound,
  Webhook,
  Database,
  Trash2,
  UserCog,
  Users,
  BarChart3,
  Save,
  Bell,
} from "lucide-react"
import { Container } from "@/components/marketing/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import { CtaButton } from "@/components/marketing/cta-button"
import { FeatureCard } from "@/components/marketing/feature-card"
import { StepCard } from "@/components/marketing/step-card"
import { UseCaseCard } from "@/components/marketing/use-case-card"
import { SecurityCard } from "@/components/marketing/security-card"
import { CtaSection } from "@/components/marketing/cta-section"
import { FaqAccordion } from "@/components/marketing/faq-accordion"
import { WorkflowDiagram } from "@/components/marketing/workflow-diagram"
import { DashboardPreview } from "@/components/marketing/dashboard-preview"
import { ConversationPreview } from "@/components/marketing/conversation-preview"
import { JsonLd } from "@/components/marketing/json-ld"
import { siteConfig } from "@/lib/marketing/config"

export const metadata: Metadata = {
  // `absolute` pins the exact home title, bypassing parent title
  // templates so no "— wacrm" suffix is appended.
  title: { absolute: "Softivum Connect – WhatsApp Business Communication & Automation" },
  description:
    "Connect your WhatsApp Business account, manage conversations, send approved templates, automate customer workflows and track message delivery with Softivum Connect.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Softivum Connect – WhatsApp Business Communication & Automation",
    description:
      "Connect your WhatsApp Business account, manage conversations, send approved templates, automate customer workflows and track message delivery with Softivum Connect.",
    url: siteConfig.domain,
  },
}

const benefits = [
  { icon: Plug, title: "WhatsApp Business onboarding" },
  { icon: Inbox, title: "Unified customer conversations" },
  { icon: Workflow, title: "Workflow automation" },
  { icon: CheckCheck, title: "Message delivery tracking" },
]

const features = [
  {
    icon: Plug,
    title: "Connect your WhatsApp Business account",
    description:
      "Complete onboarding through Meta Embedded Signup and connect your WhatsApp Business account securely.",
    benefit: "Get set up without sharing sensitive credentials.",
  },
  {
    icon: Smartphone,
    title: "Coexistence support",
    description:
      "Eligible businesses may continue using the WhatsApp Business mobile app while connecting supported business messaging features. Eligibility depends on Meta and account availability.",
    benefit: "Keep your familiar app where supported.",
  },
  {
    icon: Inbox,
    title: "Shared team inbox",
    description: "View, manage and respond to customer conversations from one place as a team.",
    benefit: "No more conversations lost on a single phone.",
  },
  {
    icon: FileText,
    title: "Message templates",
    description:
      "Send approved WhatsApp message templates for notifications, support updates, reminders and customer engagement.",
    benefit: "Stay compliant with WhatsApp messaging rules.",
  },
  {
    icon: Workflow,
    title: "Automation workflows",
    description:
      "Create workflows for lead follow-up, appointment reminders, support routing and common customer requests.",
    benefit: "Respond faster with less manual effort.",
  },
  {
    icon: CheckCheck,
    title: "Delivery tracking",
    description: "Track message states such as sent, delivered, read and failed.",
    benefit: "Know exactly what reached your customer.",
  },
]

const steps = [
  { step: 1, icon: UserPlus, title: "Create your Softivum Connect account", description: "Sign up and set up your workspace in minutes." },
  { step: 2, icon: Plug, title: "Connect your WhatsApp Business account", description: "Complete Meta onboarding and link an eligible account." },
  { step: 3, icon: FileText, title: "Configure templates, contacts and automations", description: "Add approved templates, import contacts and build workflows." },
  { step: 4, icon: MessageSquare, title: "Start messaging and tracking conversations", description: "Message customers and follow delivery in real time." },
]

const coexistenceBenefits = [
  "Continue using the familiar mobile experience",
  "Access connected customer conversations",
  "Use automation and templates",
  "Track message events",
  "Keep business communication organized",
]

const useCases = [
  { icon: UserPlus, title: "Lead follow-up", description: "Reach new enquiries quickly and consistently." },
  { icon: Calendar, title: "Appointment reminders", description: "Reduce no-shows with timely reminders." },
  { icon: LifeBuoy, title: "Customer support", description: "Resolve questions in a shared inbox." },
  { icon: Package, title: "Order updates", description: "Send order and delivery notifications." },
  { icon: MessageSquare, title: "Enquiry management", description: "Capture and route incoming enquiries." },
  { icon: Megaphone, title: "Campaign notifications", description: "Notify opted-in customers with approved templates." },
  { icon: GraduationCap, title: "Education & admissions", description: "Support applicants and students respectfully." },
  {
    icon: Stethoscope,
    title: "Healthcare communication",
    description: "Share appointment and general updates. Avoid sending sensitive medical details over chat.",
  },
  { icon: Building2, title: "Real estate enquiries", description: "Respond to property enquiries faster." },
  { icon: Wrench, title: "Service businesses", description: "Coordinate bookings and service updates." },
]

const automationSteps = [
  { label: "New enquiry", icon: Bell },
  { label: "Save contact", icon: Save },
  { label: "Send approved template", icon: FileText },
  { label: "Assign conversation", icon: UserCog },
  { label: "Notify team", icon: Users },
  { label: "Track reply", icon: CheckCheck },
]

const security = [
  { icon: KeyRound, title: "Secure server-side token handling", description: "Access credentials are processed on the server, never exposed to the browser." },
  { icon: Lock, title: "Encrypted data transmission", description: "Traffic is served over HTTPS using modern transport encryption." },
  { icon: UserCog, title: "Role-based account access", description: "Limit what each team member can see and do." },
  { icon: Webhook, title: "Webhook validation", description: "Incoming webhook events are validated before processing." },
  { icon: Database, title: "Data retention controls", description: "Configurable handling of stored conversation data." },
  { icon: Trash2, title: "Account deletion process", description: "A clear, documented path to request data deletion." },
]

const faqs = [
  {
    question: "What is Softivum Connect?",
    answer:
      "Softivum Connect is a business communication and automation platform that helps eligible businesses connect their WhatsApp Business account, manage conversations and create automated workflows.",
  },
  {
    question: "Can I continue using my WhatsApp Business mobile app?",
    answer:
      "Certain eligible accounts may be able to use supported Coexistence functionality. Eligibility is controlled by Meta and may vary by account, country and business configuration.",
  },
  {
    question: "Can I send bulk promotional messages?",
    answer:
      "Businesses must follow WhatsApp Business Messaging policies, obtain appropriate consent and use approved templates where required. Softivum Connect must not be used as an unsolicited bulk messaging tool.",
  },
  {
    question: "Does Softivum Connect support message templates?",
    answer: "Yes. Businesses can use templates approved within their WhatsApp Business account.",
  },
  {
    question: "Can I track message delivery?",
    answer: "Supported message events may include sent, delivered, read and failed.",
  },
  {
    question: "Is my access token visible to users?",
    answer: "No. Sensitive access credentials are stored and processed securely on the server.",
  },
  {
    question: "How can I delete my data?",
    answer: "Users can follow the instructions available on the Data Deletion page.",
  },
]

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: siteConfig.name,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "WhatsApp Business communication and automation platform: connect a WhatsApp Business account, manage conversations, send approved templates, automate workflows and track delivery.",
          url: siteConfig.domain,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />

      {/* Section 1: Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EFF6FF] to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[#2563EB]/20 to-[#0EA5A4]/20 blur-3xl"
        />
        <Container className="relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-medium text-[#475569]">
              <span className="h-2 w-2 rounded-full bg-[#16A34A]" /> WhatsApp Business Platform
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-balance text-[#081426] sm:text-5xl">
              Connect WhatsApp. Automate Conversations. Grow Your Business.
            </h1>
            <p className="max-w-xl text-lg text-pretty text-[#475569]">
              Softivum Connect helps businesses manage WhatsApp conversations, onboard their WhatsApp
              Business account, send approved messages, automate customer workflows and track every
              message from one secure platform.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <CtaButton href="/signup" size="lg">
                Connect WhatsApp <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </CtaButton>
              <CtaButton href="/contact" size="lg" variant="secondary">
                Book a Demo
              </CtaButton>
            </div>
            <p className="text-sm text-[#475569]">
              Designed for businesses that want faster customer communication, smarter automation and
              better visibility.
            </p>
          </div>
          <div className="lg:pl-6">
            <DashboardPreview />
          </div>
        </Container>
      </section>

      {/* Section 2: Trust / product statement */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="One platform"
            title="One platform for WhatsApp business communication"
            description="Everything you need to connect, converse and automate — without juggling tools."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="flex flex-col items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#2563EB] shadow-sm">
                  <b.icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-[#0F172A]">{b.title}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Section 3: Core features */}
      <section className="bg-[#F8FAFC] py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Features"
            title="Everything you need to message customers well"
            description="Six core capabilities that take you from connection to conversation to automation."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <CtaButton href="/features" variant="ghost">
              Explore all features <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </CtaButton>
          </div>
        </Container>
      </section>

      {/* Section 4: How it works */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="How it works"
            title="Up and running in four steps"
            description="A straightforward path from sign-up to your first tracked conversation."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <StepCard key={s.step} {...s} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <CtaButton href="/signup" size="lg">
              Start Connecting <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </CtaButton>
          </div>
        </Container>
      </section>

      {/* Section 5: Coexistence */}
      <section className="bg-[#081426] py-16 text-white sm:py-20">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <span className="text-sm font-semibold tracking-wide text-[#0EA5A4] uppercase">
              Coexistence
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Keep using the WhatsApp Business app while expanding your capabilities
            </h2>
            <p className="text-slate-300">
              For eligible WhatsApp Business accounts, Softivum Connect supports onboarding
              experiences designed for businesses that want to continue using their mobile
              application while accessing connected messaging and automation capabilities.
            </p>
            <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Availability and supported functionality may depend on Meta eligibility, business
              verification, account type and regional availability.
            </p>
          </div>
          <ul className="grid gap-3">
            {coexistenceBenefits.map((b) => (
              <li
                key={b}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <CheckCheck className="h-5 w-5 shrink-0 text-[#0EA5A4]" aria-hidden="true" />
                <span className="text-sm">{b}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Section 6: Use cases */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Use cases"
            title="Built for the conversations that grow your business"
            description="From first enquiry to ongoing support, across many industries."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((u) => (
              <UseCaseCard key={u.title} {...u} />
            ))}
          </div>
        </Container>
      </section>

      {/* Section 7: Automation */}
      <section className="bg-[#F8FAFC] py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Automation"
            title="Build workflows that respond faster"
            description="Turn a new enquiry into a tracked, assigned conversation — automatically."
          />
          <div className="mt-12 rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10">
            <WorkflowDiagram steps={automationSteps} />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-[#475569]">
            Businesses are responsible for obtaining appropriate customer consent and following
            WhatsApp Business Messaging policies.
          </p>
        </Container>
      </section>

      {/* Section 8: Conversation management */}
      <section className="py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Shared inbox"
            title="Manage every conversation in one place"
            description="Search, filter, assign and reply — with templates and status labels built in. This is an illustrative product preview."
          />
          <div className="mt-12">
            <ConversationPreview />
          </div>
        </Container>
      </section>

      {/* Section 9: Security & privacy */}
      <section className="bg-[#F8FAFC] py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Security"
            title="Designed with security and responsible data handling in mind"
            description="Practical safeguards across credentials, access and data — with public privacy and data deletion information."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {security.map((s) => (
              <SecurityCard key={s.title} {...s} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <CtaButton href="/security" variant="secondary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> View Security Practices
            </CtaButton>
          </div>
        </Container>
      </section>

      {/* Section 10: FAQ */}
      <section className="py-16 sm:py-20">
        <Container className="max-w-3xl">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <div className="mt-10">
            <FaqAccordion items={faqs} />
          </div>
          <p className="mt-6 text-center text-sm text-[#475569]">
            Still have questions?{" "}
            <Link href="/contact" className="font-medium text-[#2563EB] hover:underline">
              Contact our team
            </Link>
            .
          </p>
        </Container>
      </section>

      {/* Section 11: Final CTA */}
      <CtaSection
        title="Ready to simplify your WhatsApp communication?"
        description="Connect your business account, manage customer conversations and create smarter workflows with Softivum Connect."
        actions={[
          { label: "Get Started", href: "/signup", variant: "onDark" },
          { label: "Contact Sales", href: "/contact", variant: "outlineOnDark" },
        ]}
      />
    </>
  )
}
