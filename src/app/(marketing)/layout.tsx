import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Header } from "@/components/marketing/header"
import { Footer } from "@/components/marketing/footer"
import { JsonLd } from "@/components/marketing/json-ld"
import { siteConfig } from "@/lib/marketing/config"

/**
 * Layout for the public marketing website. Unlike the rest of the app
 * (a dark, no-index dashboard), these pages are light-themed and
 * indexable. We:
 *  - set metadataBase + a title template so child pages only specify a
 *    short title,
 *  - re-enable indexing (the root layout sets index:false for the app),
 *  - force a light color-scheme via the `.marketing-root` wrapper so
 *    native controls render correctly regardless of the app theme,
 *  - render the shared Header/Footer and site-wide Organization +
 *    WebSite JSON-LD.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.domain),
  title: {
    default: `${siteConfig.name} – ${siteConfig.tagline}`,
    template: `%s – ${siteConfig.name}`,
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="marketing-root flex min-h-screen flex-col bg-white text-[#0F172A] [color-scheme:light]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: siteConfig.company,
          url: siteConfig.domain,
          sameAs: [siteConfig.companyWebsite],
          email: siteConfig.contactEmail,
          address: {
            "@type": "PostalAddress",
            addressCountry: "IN",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: siteConfig.domain,
        }}
      />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
