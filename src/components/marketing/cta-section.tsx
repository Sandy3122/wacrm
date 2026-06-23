import { Container } from "./container"
import { CtaButton, type CtaVariant } from "./cta-button"

export type CtaAction = { label: string; href: string; variant?: CtaVariant }

/**
 * Reusable closing call-to-action band on the brand navy gradient.
 * Used at the bottom of the home page and most marketing pages.
 */
export function CtaSection({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions: CtaAction[]
}) {
  return (
    <section className="py-20">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-[#081426] px-6 py-14 text-center sm:px-12">
          {/* Soft brand glow — decorative only. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#2563EB]/30 to-[#0EA5A4]/30 blur-3xl"
          />
          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
            <h2 className="text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">
              {title}
            </h2>
            {description ? <p className="text-base text-pretty text-slate-300">{description}</p> : null}
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              {actions.map((a) => (
                <CtaButton
                  key={a.href + a.label}
                  href={a.href}
                  size="lg"
                  variant={a.variant ?? "onDark"}
                >
                  {a.label}
                </CtaButton>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
