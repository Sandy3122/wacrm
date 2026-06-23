"use client"

import { useState } from "react"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { CtaSubmit } from "./cta-button"
import { businessTypes, siteConfig } from "@/lib/marketing/config"

/**
 * Public contact / enquiry form. Validates on the client for fast
 * feedback, then re-validates server-side at /api/contact. Includes a
 * hidden honeypot field ("company_website") that real users never see;
 * a filled honeypot is treated as spam by the API. Renders explicit
 * loading / success / error states.
 */
type Status = "idle" | "submitting" | "success" | "error"

const inputClass =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] outline-none placeholder:text-[#94a3b8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
const labelClass = "text-sm font-medium text-[#0F172A]"

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle")
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(data: FormData): Record<string, string> {
    const next: Record<string, string> = {}
    const name = String(data.get("fullName") ?? "").trim()
    const email = String(data.get("email") ?? "").trim()
    const message = String(data.get("message") ?? "").trim()
    const consent = data.get("consent")

    if (name.length < 2) next.fullName = "Please enter your full name."
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Please enter a valid work email."
    if (message.length < 10) next.message = "Please tell us a little more (10+ characters)."
    if (!consent) next.consent = "Please provide consent to continue."
    return next
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const found = validate(data)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setStatus("submitting")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      })
      if (!res.ok) throw new Error("Request failed")
      setStatus("success")
      form.reset()
    } catch {
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-2xl border border-[#16A34A]/30 bg-[#F0FDF4] p-8 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-[#16A34A]" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-[#0F172A]">Thank you.</h3>
        <p className="text-sm text-[#475569]">
          Your enquiry has been submitted successfully. Our team will contact you shortly.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {status === "error" ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-[#DC2626]/30 bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>We could not submit your enquiry. Please try again or email {siteConfig.contactEmail}.</span>
        </div>
      ) : null}

      {/* Honeypot — visually hidden, off the tab order. Bots fill it; humans don't. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="company_website">Company website</label>
        <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="fullName" label="Full name" error={errors.fullName} required>
          <input id="fullName" name="fullName" type="text" autoComplete="name" className={inputClass} placeholder="Jane Doe" />
        </Field>
        <Field id="email" label="Work email" error={errors.email} required>
          <input id="email" name="email" type="email" autoComplete="email" className={inputClass} placeholder="jane@company.com" />
        </Field>
        <Field id="phone" label="Phone number" error={errors.phone}>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} placeholder="+91 90000 00000" />
        </Field>
        <Field id="company" label="Company name" error={errors.company}>
          <input id="company" name="company" type="text" autoComplete="organization" className={inputClass} placeholder="Company Pvt Ltd" />
        </Field>
        <Field id="businessType" label="Business type" error={errors.businessType}>
          <select id="businessType" name="businessType" className={inputClass} defaultValue="">
            <option value="" disabled>
              Select an option
            </option>
            {businessTypes.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <Field id="whatsappUsage" label="Current WhatsApp usage" error={errors.whatsappUsage}>
          <select id="whatsappUsage" name="whatsappUsage" className={inputClass} defaultValue="">
            <option value="" disabled>
              Select an option
            </option>
            <option>Not using WhatsApp for business yet</option>
            <option>Using the WhatsApp Business app</option>
            <option>Using the WhatsApp Business Platform (API)</option>
            <option>Using another provider</option>
          </select>
        </Field>
        <Field id="monthlyConversations" label="Estimated monthly conversations" error={errors.monthlyConversations}>
          <select id="monthlyConversations" name="monthlyConversations" className={inputClass} defaultValue="">
            <option value="" disabled>
              Select a range
            </option>
            <option>Under 500</option>
            <option>500 – 2,000</option>
            <option>2,000 – 10,000</option>
            <option>10,000+</option>
          </select>
        </Field>
      </div>

      <Field id="message" label="Message" error={errors.message} required>
        <textarea
          id="message"
          name="message"
          rows={4}
          className={inputClass}
          placeholder="Tell us about your use case and how we can help."
        />
      </Field>

      <div>
        <label htmlFor="consent" className="flex items-start gap-3 text-sm text-[#475569]">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            value="yes"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]"
          />
          <span>
            I agree that {siteConfig.company} may contact me regarding {siteConfig.name}. I have
            reviewed the{" "}
            <a href="/privacy-policy" className="font-medium text-[#2563EB] hover:underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {errors.consent ? (
          <p className="mt-1.5 text-sm text-[#DC2626]">{errors.consent}</p>
        ) : null}
      </div>

      <CtaSubmit type="submit" size="lg" disabled={status === "submitting"} className="sm:self-start">
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Submitting…
          </>
        ) : (
          "Send enquiry"
        )}
      </CtaSubmit>
    </form>
  )
}

function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <span className="text-[#DC2626]"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-[#DC2626]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
