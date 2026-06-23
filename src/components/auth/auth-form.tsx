"use client"

import * as React from "react"
import Link from "next/link"
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { CtaSubmit } from "@/components/marketing/cta-button"

export const authInputClass =
  "w-full rounded-xl border border-[#E2E8F0] bg-[#FAFBFC] px-3.5 py-2.5 text-sm text-[#0F172A] outline-none transition-colors placeholder:text-[#94a3b8] hover:border-[#CBD5E1] focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"

export function AuthLabel({
  htmlFor,
  children,
  action,
}: {
  htmlFor: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[#0F172A]">
        {children}
      </label>
      {action}
    </div>
  )
}

export function AuthField({
  label,
  htmlFor,
  labelAction,
  children,
}: {
  label: string
  htmlFor: string
  labelAction?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <AuthLabel htmlFor={htmlFor} action={labelAction}>
        {label}
      </AuthLabel>
      {children}
    </div>
  )
}

export function AuthInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { id: string },
) {
  return <input {...props} className={cn(authInputClass, props.className)} />
}

export function AuthSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { id: string },
) {
  return <select {...props} className={cn(authInputClass, props.className)} />
}

export function AuthPasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
}) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <AuthInput
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((s) => !s)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-[#64748B] transition-colors hover:text-[#0F172A]"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}

export function AuthInfo({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#2563EB]/20 bg-[#EFF6FF] px-4 py-3 text-sm text-[#1e40af]">
      {children}
    </div>
  )
}

export function AuthSubmit({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean
  loadingLabel: string
  children: React.ReactNode
}) {
  return (
    <CtaSubmit
      type="submit"
      disabled={loading}
      size="md"
      className="mt-1 w-full"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingLabel}
        </>
      ) : (
        children
      )}
    </CtaSubmit>
  )
}

export function AuthSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="flex flex-col gap-4 border-0 p-0">
      <legend className="mb-1">
        <p className="text-sm font-semibold text-[#081426]">{title}</p>
        {description ? (
          <p className="mt-0.5 text-xs text-[#64748B]">{description}</p>
        ) : null}
      </legend>
      {children}
    </fieldset>
  )
}

export function AuthFooterLinks() {
  return (
    <p className="text-center text-xs text-[#94a3b8]">
      <Link href="/privacy-policy" className="hover:text-[#2563EB]">
        Privacy Policy
      </Link>
      <span className="mx-2">·</span>
      <Link href="/terms-of-service" className="hover:text-[#2563EB]">
        Terms of Service
      </Link>
      <span className="mx-2">·</span>
      <Link href="/support" className="hover:text-[#2563EB]">
        Support
      </Link>
    </p>
  )
}
