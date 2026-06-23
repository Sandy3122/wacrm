import { Check, CheckCheck, Phone, Bot, Circle } from "lucide-react"

/**
 * Illustrative product preview for the hero. Pure presentation with
 * clearly fictional sample data ("Test Customer" / +91 90000 00000) —
 * it never renders real customer information. Shows a connected number,
 * an active conversation with incoming/outgoing bubbles, sent /
 * delivered / read states, and an automation-active indicator.
 */
export function DashboardPreview() {
  return (
    <div className="relative">
      {/* Soft brand glow behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-[#2563EB]/15 to-[#0EA5A4]/15 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xl">
        {/* Top bar: connected number + automation indicator */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#16A34A]/10 text-[#16A34A]">
              <Phone className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-[11px] text-[#475569]">Connected WhatsApp Business</p>
              <p className="text-sm font-semibold text-[#0F172A]">+91 90000 00000</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-medium text-[#0EA5A4]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0EA5A4]/60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0EA5A4]" />
            </span>
            Automation active
          </span>
        </div>

        {/* Conversation header */}
        <div className="flex items-center gap-3 border-b border-[#E2E8F0] px-4 py-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF6FF] text-sm font-semibold text-[#2563EB]">
            TC
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-[#0F172A]">Test Customer</p>
            <p className="text-xs text-[#475569]">+91 90000 00000 · Active now</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-3 bg-[#F8FAFC] px-4 py-5">
          {/* Incoming */}
          <div className="max-w-[78%] self-start rounded-2xl rounded-tl-sm border border-[#E2E8F0] bg-white px-3.5 py-2.5">
            <p className="text-sm text-[#0F172A]">
              Hello, I would like to know more about your services.
            </p>
            <p className="mt-1 text-[10px] text-[#94a3b8]">10:24 AM</p>
          </div>

          {/* Outgoing */}
          <div className="max-w-[80%] self-end rounded-2xl rounded-tr-sm bg-[#2563EB] px-3.5 py-2.5 text-white">
            <p className="text-sm">
              Hi! Thanks for reaching out. Here&apos;s a quick overview of how we can help.
            </p>
            <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-blue-100">
              10:24 AM <CheckCheck className="h-3 w-3" aria-hidden="true" />
            </p>
          </div>
        </div>

        {/* Delivery status legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#E2E8F0] px-4 py-3 text-xs text-[#475569]">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-[#94a3b8]" aria-hidden="true" /> Sent
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCheck className="h-3.5 w-3.5 text-[#94a3b8]" aria-hidden="true" /> Delivered
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCheck className="h-3.5 w-3.5 text-[#2563EB]" aria-hidden="true" /> Read
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2 py-0.5 font-medium text-[#2563EB]">
            <Bot className="h-3.5 w-3.5" aria-hidden="true" /> Auto-reply ready
          </span>
        </div>

        {/* Status pill row */}
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16A34A]/10 px-2.5 py-1 text-xs font-medium text-[#16A34A]">
            <Circle className="h-2 w-2 fill-current" aria-hidden="true" /> Delivered
          </span>
          <span className="text-xs text-[#94a3b8]">Sample data — not real customer information</span>
        </div>
      </div>
    </div>
  )
}
