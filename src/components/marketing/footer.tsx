import Link from "next/link"
import { Mail, Globe, MapPin } from "lucide-react"
import { Container } from "./container"
import { Logo } from "./logo"
import { footerNav, siteConfig } from "@/lib/marketing/config"

/**
 * Global footer rendered on every public page. Carries the four nav
 * columns (Product / Company / Legal / Account) required for Meta App
 * Review — the legal links here are the canonical, login-free entry
 * points to Privacy, Terms and Data Deletion. Also includes the
 * trademark / independence disclaimer.
 */
const columns: { title: string; links: readonly { label: string; href: string }[] }[] = [
  { title: "Product", links: footerNav.product },
  { title: "Company", links: footerNav.company },
  { title: "Legal", links: footerNav.legal },
  { title: "Account", links: footerNav.account },
]

export function Footer() {
  const year = 2026
  return (
    <footer className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-xs text-sm text-[#475569]">
              WhatsApp Business communication and automation for teams that want faster,
              better-organized customer conversations.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-[#475569]">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                <a className="hover:text-[#2563EB]" href={`mailto:${siteConfig.contactEmail}`}>
                  {siteConfig.contactEmail}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                <a
                  className="hover:text-[#2563EB]"
                  href={siteConfig.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.softivum.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                <span>{siteConfig.location}</span>
              </li>
            </ul>
          </div>

          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-sm font-semibold text-[#081426]">{col.title}</h2>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[#475569] transition-colors hover:text-[#2563EB]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[#E2E8F0] pt-8 text-sm text-[#475569] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {siteConfig.company}. All rights reserved.</p>
          <p className="max-w-xl text-xs text-[#94a3b8] sm:text-right">
            Softivum Connect is an independent business communication platform. WhatsApp and Meta
            are trademarks of their respective owners.
          </p>
        </div>
      </Container>
    </footer>
  )
}
