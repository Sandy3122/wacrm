"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Container } from "./container"
import { Logo } from "./logo"
import { CtaButton } from "./cta-button"
import { MobileNav } from "./mobile-nav"
import { mainNav } from "@/lib/marketing/config"
import { cn } from "@/lib/utils"

/**
 * Sticky site header. Gains a subtle border + shadow once the page is
 * scrolled (tracked with a passive scroll listener). Desktop shows the
 * full nav + Log In / Connect WhatsApp actions; mobile collapses the
 * nav into <MobileNav> while keeping the primary CTA visible.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-white/90 backdrop-blur transition-shadow",
        scrolled ? "border-b border-[#E2E8F0] shadow-sm" : "border-b border-transparent",
      )}
    >
      <Container as="nav" className="flex h-16 items-center justify-between gap-4" aria-label="Primary">
        <Logo />

        <ul className="hidden items-center gap-1 lg:flex">
          {mainNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#475569] transition-colors hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <CtaButton href="/login" variant="secondary" size="sm" className="hidden sm:inline-flex">
            Log In
          </CtaButton>
          <CtaButton href="/signup" variant="primary" size="sm" className="hidden sm:inline-flex">
            Connect WhatsApp
          </CtaButton>
          {/* On the smallest screens keep one visible CTA next to the menu */}
          <CtaButton href="/signup" variant="primary" size="sm" className="sm:hidden">
            Get Started
          </CtaButton>
          <MobileNav />
        </div>
      </Container>
    </header>
  )
}
