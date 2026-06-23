import Link from "next/link"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/marketing/config"

/**
 * Original Softivum Connect wordmark — a speech-bubble "S" mark plus
 * the product name. No raster logo asset ships with the repo, so this
 * SVG mark is the brand. It is theme-agnostic: pass `variant="light"`
 * on dark backgrounds (footer) so the text flips to white.
 *
 * The mark is a single self-contained SVG (no external file) which
 * keeps it crisp at any size and avoids a network request / layout
 * shift.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#0EA5A4] shadow-sm",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3/5 w-3/5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Chat bubble */}
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
        {/* Connection dots */}
        <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
      </svg>
    </span>
  )
}

export function Logo({
  variant = "dark",
  className,
  href = "/",
  onClick,
}: {
  /** "dark" = dark text for light backgrounds, "light" = white text. */
  variant?: "dark" | "light"
  className?: string
  href?: string | null
  onClick?: () => void
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-8 w-8" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[15px] font-bold tracking-tight",
            variant === "light" ? "text-white" : "text-[#081426]",
          )}
        >
          Softivum
          <span className="text-[#2563EB]"> Connect</span>
        </span>
      </span>
    </span>
  )

  if (href === null) return content

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={`${siteConfig.name} home`}
      className="inline-flex rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  )
}
