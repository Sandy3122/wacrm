import type { Metadata } from "next"
import {
  Plug,
  Smartphone,
  Inbox,
  Users,
  FileText,
  MessageSquare,
  Webhook,
  CheckCheck,
  Workflow,
  UserCog,
  Filter,
  History,
  KeyRound,
  LayoutGrid,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from "lucide-react"
import { Container } from "@/components/marketing/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import { FeatureCard, type FeatureStatus } from "@/components/marketing/feature-card"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { CtaSection } from "@/components/marketing/cta-section"
import { ConversationPreview } from "@/components/marketing/conversation-preview"

export const metadata: Metadata = {
  title: "Features",
  description:
    "Explore Softivum Connect features: WhatsApp Business onboarding, Embedded Signup, shared inbox, approved templates, two-way conversations, automation workflows, delivery tracking, role-based access and more.",
  alternates: { canonical: "/features" },
}

type Feature = {
  icon: typeof Plug
  title: string
  description: string
  benefit: string
  status?: FeatureStatus
}

const groups: { heading: string; eyebrow: string; items: Feature[] }[] = [
  {
    eyebrow: "Onboarding",
    heading: "Connect your WhatsApp Business account",
    items: [
      {
        icon: Plug,
        title: "WhatsApp Business onboarding",
        description: "Guided setup to connect an eligible WhatsApp Business account to your workspace.",
        benefit: "Start messaging from a connected business number.",
      },
      {
        icon: Smartphone,
        title: "Embedded Signup",
        description: "Onboard through Meta's Embedded Signup flow, initiated by a clear user action.",
        benefit: "A familiar, Meta-hosted connection experience.",
      },
      {
        icon: Smartphone,
        title: "Coexistence support",
        description:
          "Eligible accounts may keep using the WhatsApp Business app alongside connected features. Eligibility is determined by Meta and may vary by region and account.",
        benefit: "Adopt without disrupting your current setup.",
      },
    ],
  },
  {
    eyebrow: "Conversations",
    heading: "Manage every customer conversation",
    items: [
      {
        icon: Inbox,
        title: "Shared inbox",
        description: "One place for your team to read and reply to customer conversations.",
        benefit: "Nothing slips through the cracks.",
      },
      {
        icon: Users,
        title: "Contact management",
        description: "Keep customer contacts organized with the details your team needs.",
        benefit: "Context for every conversation.",
      },
      {
        icon: MessageSquare,
        title: "Two-way conversations",
        description: "Send and receive messages with customers in real time.",
        benefit: "Have real conversations, not one-way blasts.",
      },
      {
        icon: FileText,
        title: "Approved templates",
        description: "Use message templates approved within your WhatsApp Business account.",
        benefit: "Stay within WhatsApp messaging policies.",
      },
    ],
  },
  {
    eyebrow: "Messaging engine",
    heading: "Send, receive and track reliably",
    items: [
      {
        icon: Webhook,
        title: "Incoming webhook processing",
        description: "Inbound messages and events are received and processed through validated webhooks.",
        benefit: "Replies arrive in your inbox automatically.",
      },
      {
        icon: CheckCheck,
        title: "Sent, delivered & read tracking",
        description: "Follow supported message states including sent, delivered, read and failed.",
        benefit: "Know what actually reached the customer.",
      },
      {
        icon: History,
        title: "Activity history",
        description: "Review the history of conversations and message events.",
        benefit: "A clear record for your team.",
      },
    ],
  },
  {
    eyebrow: "Automation",
    heading: "Automate the repetitive work",
    items: [
      {
        icon: Workflow,
        title: "Workflow automation",
        description: "Build workflows for follow-ups, reminders, routing and common requests.",
        benefit: "Respond faster with less manual effort.",
      },
      {
        icon: UserCog,
        title: "Team assignment",
        description: "Assign conversations to the right team member, manually or by rule.",
        benefit: "Clear ownership for every conversation.",
      },
      {
        icon: Filter,
        title: "Conversation filters",
        description: "Filter by unread, assigned user or automation status to focus your queue.",
        benefit: "Find what needs attention, fast.",
      },
    ],
  },
  {
    eyebrow: "Access & scale",
    heading: "Built for teams and multiple brands",
    items: [
      {
        icon: KeyRound,
        title: "Secure access-token management",
        description: "Access credentials are stored and processed on the server, never exposed to users.",
        benefit: "Sensitive tokens stay protected.",
      },
      {
        icon: LayoutGrid,
        title: "Multi-workspace support",
        description: "Run multiple workspaces for different brands, teams or clients.",
        benefit: "Keep brands and data separated.",
      },
      {
        icon: ShieldCheck,
        title: "Role-based access",
        description: "Control what each member can see and do with roles and permissions.",
        benefit: "Least-privilege access by default.",
      },
      {
        icon: BarChart3,
        title: "Reporting overview",
        description: "A high-level view of messaging activity and delivery.",
        benefit: "Spot trends at a glance.",
        status: "coming-soon",
      },
    ],
  },
]

export default function FeaturesPage() {
  return (
    <>
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <Container className="py-10">
          <Breadcrumbs items={[{ label: "Features", href: "/features" }]} />
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-balance text-[#081426]">
            Everything you need for WhatsApp business messaging
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[#475569]">
            From onboarding and a shared inbox to automation, delivery tracking and role-based
            access — here is what Softivum Connect offers. Features still in progress are marked
            clearly.
          </p>
        </Container>
      </div>

      {groups.map((group, idx) => (
        <section key={group.heading} className={idx % 2 === 1 ? "bg-[#F8FAFC] py-16" : "py-16"}>
          <Container>
            <SectionHeading align="left" eyebrow={group.eyebrow} title={group.heading} />
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {group.items.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>

            {/* Illustrative product preview after the conversations group */}
            {group.eyebrow === "Conversations" ? (
              <div className="mt-12">
                <ConversationPreview />
              </div>
            ) : null}
          </Container>
        </section>
      ))}

      <CtaSection
        title="See the features in action"
        description="Create your workspace, connect WhatsApp and explore the product for yourself."
        actions={[
          { label: "Get Started", href: "/signup", variant: "onDark" },
          { label: "Book a Demo", href: "/contact", variant: "outlineOnDark" },
        ]}
      />
    </>
  )
}
