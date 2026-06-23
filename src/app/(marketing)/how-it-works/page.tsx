import type { Metadata } from "next"
import {
  UserPlus,
  Plug,
  ShieldCheck,
  FileText,
  Send,
  CheckCheck,
  MessageSquare,
  Smartphone,
  Inbox,
} from "lucide-react"
import { Container } from "@/components/marketing/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import { StepCard } from "@/components/marketing/step-card"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { WorkflowDiagram } from "@/components/marketing/workflow-diagram"
import { CtaSection } from "@/components/marketing/cta-section"

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "See how Softivum Connect works: create an account, connect WhatsApp via Meta onboarding, configure messaging, then send, receive and track conversations.",
  alternates: { canonical: "/how-it-works" },
}

const steps = [
  { step: 1, icon: UserPlus, title: "Create an account", description: "Create a Softivum Connect workspace for your business." },
  { step: 2, icon: Plug, title: "Connect WhatsApp", description: "Start the Meta onboarding process and select an eligible WhatsApp Business account." },
  { step: 3, icon: ShieldCheck, title: "Complete setup", description: "The platform stores approved account identifiers securely and displays your connected number." },
  { step: 4, icon: FileText, title: "Configure messaging", description: "Select approved templates and add eligible recipients." },
  { step: 5, icon: Send, title: "Send and receive messages", description: "Messages are processed through the connected WhatsApp Business Platform setup." },
  { step: 6, icon: CheckCheck, title: "Track responses and delivery", description: "Incoming replies and supported delivery events appear in Softivum Connect." },
]

const flow = [
  { label: "Softivum Connect", icon: Inbox },
  { label: "Meta WhatsApp Business Platform", icon: ShieldCheck },
  { label: "Customer WhatsApp", icon: Smartphone },
  { label: "Incoming reply", icon: MessageSquare },
  { label: "Softivum Connect inbox", icon: Inbox },
]

export default function HowItWorksPage() {
  return (
    <>
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <Container className="py-10">
          <Breadcrumbs items={[{ label: "How It Works", href: "/how-it-works" }]} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-[#081426]">
            How Softivum Connect works
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[#475569]">
            A clear, step-by-step journey from creating your workspace to tracking every reply —
            built around Meta&apos;s WhatsApp Business Platform.
          </p>
        </Container>
      </div>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((s) => (
              <StepCard key={s.step} {...s} />
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#F8FAFC] py-16 sm:py-20">
        <Container>
          <SectionHeading
            eyebrow="Message flow"
            title="How a message travels"
            description="Messages route through Meta's WhatsApp Business Platform. Access tokens are never exposed in this flow."
          />
          <div className="mt-12 rounded-3xl border border-[#E2E8F0] bg-white p-6 sm:p-10">
            <WorkflowDiagram steps={flow} />
          </div>
        </Container>
      </section>

      <CtaSection
        title="Ready to connect your account?"
        description="Create your workspace and start your WhatsApp onboarding when you're ready."
        actions={[
          { label: "Get Started", href: "/signup", variant: "onDark" },
          { label: "Talk to us", href: "/contact", variant: "outlineOnDark" },
        ]}
      />
    </>
  )
}
