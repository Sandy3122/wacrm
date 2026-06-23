import type { ReactNode } from "react"
import Link from "next/link"
import {
  CheckCheck,
  Inbox,
  MessageSquare,
  Workflow,
  Zap,
} from "lucide-react"
import { Logo } from "@/components/marketing/logo"
import { siteConfig } from "@/lib/marketing/config"
import { AuthFooterLinks } from "./auth-form"

const highlights = [
  {
    icon: Inbox,
    title: "Shared team inbox",
    description: "Every customer conversation in one place.",
  },
  {
    icon: Workflow,
    title: "Workflow automation",
    description: "Follow up faster with less manual work.",
  },
  {
    icon: CheckCheck,
    title: "Delivery tracking",
    description: "Know when messages are sent, delivered, and read.",
  },
] as const

function AuthShowcase() {
  return (
    <div className="relative mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-300">Live inbox preview</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16A34A]/20 px-2 py-0.5 text-[10px] font-medium text-[#86EFAC]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" aria-hidden="true" />
          3 unread
        </span>
      </div>
      <div className="space-y-2">
        {[
          { name: "Priya S.", msg: "Is my order ready for pickup?", time: "2m", active: true },
          { name: "Rahul M.", msg: "Thanks for the quick reply!", time: "14m", active: false },
          { name: "Demo Lead", msg: "Can I get a demo tomorrow?", time: "1h", active: false },
        ].map((row) => (
          <div
            key={row.name}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
              row.active ? "bg-white/10" : "bg-white/5"
            }`}
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#0EA5A4] text-[10px] font-bold text-white">
              {row.name.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-white">{row.name}</p>
                <span className="text-[10px] text-slate-400">{row.time}</span>
              </div>
              <p className="truncate text-[11px] text-slate-400">{row.msg}</p>
            </div>
            {row.active ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#38BDF8]" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-[#081426]/60 px-3 py-2">
        <MessageSquare className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
        <span className="text-[11px] text-slate-400">Reply with templates or automate…</span>
        <Zap className="ml-auto h-3.5 w-3.5 text-[#0EA5A4]" aria-hidden="true" />
      </div>
    </div>
  )
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** Wider form column for signup. */
  wide?: boolean
}) {
  return (
    <div className="flex min-h-screen [color-scheme:light]">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-[#081426] px-10 py-12 text-white lg:flex xl:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-[#2563EB]/25 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-[#0EA5A4]/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative">
          <Logo variant="light" href="/" />
        </div>

        <div className="relative flex flex-1 flex-col justify-center py-10">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="h-2 w-2 rounded-full bg-[#4ADE80]" aria-hidden="true" />
            {siteConfig.tagline}
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-balance xl:text-4xl">
            WhatsApp conversations, automation, and visibility — in one workspace.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-pretty text-slate-400">
            {siteConfig.name} helps your team respond faster, send approved templates, and
            automate follow-ups without losing the personal touch.
          </p>

          <ul className="mt-8 space-y-4">
            {highlights.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#38BDF8]">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-400">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <AuthShowcase />
        </div>

        <p className="relative text-xs text-slate-500">
          © {new Date().getFullYear()} {siteConfig.company}. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <div className="flex flex-1 flex-col bg-white">
        <div className="flex items-center justify-between px-6 py-5 lg:justify-end lg:px-10">
          <div className="lg:hidden">
            <Logo href="/" />
          </div>
          <p className="hidden text-sm text-[#64748B] sm:block">
            Need help?{" "}
            <Link href="/support" className="font-medium text-[#2563EB] hover:underline">
              Contact support
            </Link>
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-10 lg:px-10">
          <div className={`w-full ${wide ? "max-w-lg" : "max-w-md"}`}>
            {eyebrow ? (
              <p className="mb-2 text-xs font-semibold tracking-wider text-[#2563EB] uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight text-[#081426] sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-sm text-pretty text-[#64748B]">{description}</p>
            ) : null}

            <div className="mt-8">{children}</div>

            {footer ? <div className="mt-6">{footer}</div> : null}
          </div>
        </div>

        <div className="px-6 pb-8 lg:px-10">
          <AuthFooterLinks />
        </div>
      </div>
    </div>
  )
}
