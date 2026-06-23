import { Container } from "./container"
import { Breadcrumbs, type Crumb } from "./breadcrumbs"

/**
 * Shared shell for legal / policy pages: a header band with title +
 * effective date, breadcrumbs, and a constrained prose column. These
 * pages are intentionally public (no login) and indexable for Meta
 * App Review. Prose styling is applied locally (no @tailwindcss/typography
 * dependency) via the `legal-prose` class defined in the marketing layout.
 */
export function LegalLayout({
  title,
  effectiveDate,
  intro,
  breadcrumb,
  children,
}: {
  title: string
  effectiveDate?: string
  intro?: string
  breadcrumb: Crumb
  children: React.ReactNode
}) {
  const crumbs: Crumb[] = [breadcrumb]
  return (
    <div className="bg-white">
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <Container className="py-10">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#081426] sm:text-4xl">
            {title}
          </h1>
          {effectiveDate ? (
            <p className="mt-3 text-sm text-[#475569]">Effective date: {effectiveDate}</p>
          ) : null}
          {intro ? <p className="mt-3 max-w-2xl text-base text-[#475569]">{intro}</p> : null}
        </Container>
      </div>
      <Container className="py-12">
        <article className="legal-prose mx-auto max-w-3xl">{children}</article>
      </Container>
    </div>
  )
}
