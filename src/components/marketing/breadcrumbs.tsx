import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { siteConfig } from "@/lib/marketing/config"
import { JsonLd } from "./json-ld"

export type Crumb = { label: string; href: string }

/**
 * Accessible breadcrumb trail + matching BreadcrumbList JSON-LD. The
 * last crumb is the current page (not a link, marked aria-current).
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const trail = [{ label: "Home", href: "/" }, ...items]

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            item: `${siteConfig.domain}${c.href === "/" ? "" : c.href}`,
          })),
        }}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[#475569]">
          {trail.map((c, i) => {
            const last = i === trail.length - 1
            return (
              <li key={c.href} className="flex items-center gap-1.5">
                {last ? (
                  <span aria-current="page" className="font-medium text-[#0F172A]">
                    {c.label}
                  </span>
                ) : (
                  <>
                    <Link href={c.href} className="hover:text-[#2563EB]">
                      {c.label}
                    </Link>
                    <ChevronRight className="h-4 w-4 text-[#94a3b8]" aria-hidden="true" />
                  </>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
