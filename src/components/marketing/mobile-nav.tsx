"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { mainNav } from "@/lib/marketing/config"
import { CtaButton } from "./cta-button"
import { Logo } from "./logo"

/**
 * Mobile-only slide-down navigation. The primary CTA stays visible in
 * the header at all widths (rendered by Header); this owns only the
 * hamburger toggle and the full-screen menu panel. Locks body scroll
 * while open and closes on Escape / route link click for keyboard and
 * touch users alike.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open])

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#0F172A] outline-none hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-white" role="dialog" aria-modal="true">
          <div className="flex h-16 items-center justify-between border-b border-[#E2E8F0] px-5">
            <Logo onClick={() => setOpen(false)} />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#0F172A] outline-none hover:bg-[#F8FAFC] focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 px-5 py-6" aria-label="Mobile">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-medium text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-6 flex flex-col gap-3">
              <CtaButton href="/login" variant="secondary" size="lg" onClick={() => setOpen(false)}>
                Log In
              </CtaButton>
              <CtaButton href="/signup" variant="primary" size="lg" onClick={() => setOpen(false)}>
                Connect WhatsApp
              </CtaButton>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  )
}
