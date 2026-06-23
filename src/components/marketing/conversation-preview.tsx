import { Search, Send, FileText, CheckCheck, Filter, UserCheck, Bot } from "lucide-react"

/**
 * Illustrative shared-inbox preview for the home page. A static visual
 * (not a working inbox) showing the contact list, filters, an active
 * conversation, the composer with a template selector, and assignment /
 * status labels. All data is clearly fictional sample data.
 */
const contacts = [
  { initials: "TC", name: "Test Customer", preview: "Hello, I would like to know…", time: "10:24", unread: true, active: true },
  { initials: "AR", name: "Sample Lead", preview: "Is this available today?", time: "09:51", unread: true, active: false },
  { initials: "MP", name: "Demo Contact", preview: "Thank you!", time: "Y3", unread: false, active: false },
]

export function ConversationPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-lg">
      <div className="grid md:grid-cols-[260px_1fr]">
        {/* Left: list + filters */}
        <div className="border-b border-[#E2E8F0] md:border-r md:border-b-0">
          <div className="border-b border-[#E2E8F0] p-3">
            <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#94a3b8]">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search conversations
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-medium text-[#2563EB]">
                <Filter className="h-3 w-3" aria-hidden="true" /> Unread
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] text-[#475569]">
                <UserCheck className="h-3 w-3" aria-hidden="true" /> Assigned
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[11px] text-[#475569]">
                <Bot className="h-3 w-3" aria-hidden="true" /> Automated
              </span>
            </div>
          </div>
          <ul>
            {contacts.map((c) => (
              <li
                key={c.name}
                className={`flex items-center gap-3 border-b border-[#E2E8F0] px-3 py-3 ${
                  c.active ? "bg-[#EFF6FF]" : ""
                }`}
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-xs font-semibold text-[#475569]">
                  {c.initials}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#0F172A]">{c.name}</p>
                    <span className="text-[10px] text-[#94a3b8]">{c.time}</span>
                  </div>
                  <p className="truncate text-xs text-[#475569]">{c.preview}</p>
                </div>
                {c.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#2563EB]" aria-hidden="true" /> : null}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: active conversation */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-semibold text-[#2563EB]">
                TC
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-[#0F172A]">Test Customer</p>
                <p className="text-[11px] text-[#475569]">+91 90000 00000</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-1 text-[11px] text-[#475569]">
              <UserCheck className="h-3 w-3" aria-hidden="true" /> Priya (Support)
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3 bg-[#F8FAFC] px-4 py-5">
            <div className="max-w-[80%] self-start rounded-2xl rounded-tl-sm border border-[#E2E8F0] bg-white px-3.5 py-2.5">
              <p className="text-sm text-[#0F172A]">Hello, I would like to know more about your services.</p>
            </div>
            <div className="max-w-[80%] self-end rounded-2xl rounded-tr-sm bg-[#2563EB] px-3.5 py-2.5 text-white">
              <p className="text-sm">Happy to help! Sharing the details now.</p>
              <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-blue-100">
                Read <CheckCheck className="h-3 w-3" aria-hidden="true" />
              </p>
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-[#E2E8F0] p-3">
            <div className="flex items-center gap-2 rounded-xl border border-[#E2E8F0] px-3 py-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#EFF6FF] px-2 py-1 text-xs font-medium text-[#2563EB]"
                tabIndex={-1}
                aria-hidden="true"
              >
                <FileText className="h-3.5 w-3.5" /> Template
              </button>
              <span className="flex-1 text-sm text-[#94a3b8]">Type a message…</span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-white">
                <Send className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
