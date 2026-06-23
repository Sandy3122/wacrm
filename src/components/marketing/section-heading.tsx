import { cn } from "@/lib/utils"

/**
 * Standard section header: an optional eyebrow label, a title, and an
 * optional supporting paragraph. Centers by default; pass align="left"
 * for asymmetric sections. Uses semantic <h2> so page heading order
 * stays correct (pages own the single <h1>).
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  as: Heading = "h2",
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: "center" | "left"
  className?: string
  as?: "h1" | "h2"
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow ? (
        <span className="text-sm font-semibold tracking-wide text-[#2563EB] uppercase">
          {eyebrow}
        </span>
      ) : null}
      <Heading className="text-3xl font-bold tracking-tight text-balance text-[#0F172A] sm:text-4xl">
        {title}
      </Heading>
      {description ? (
        <p className="text-base text-pretty text-[#475569] sm:text-lg">{description}</p>
      ) : null}
    </div>
  )
}
