import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * Brand button used across the marketing site. Renders a real <a>
 * (via next/link) for navigation CTAs, or a <button> when `type` is
 * passed (form submits). Self-styled with explicit brand colors so it
 * is independent of the app's dark theme tokens. Meets the 44px touch
 * target at md+ sizes.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2563EB] disabled:pointer-events-none disabled:opacity-60"

const variants = {
  primary: "bg-[#2563EB] text-white hover:bg-[#1d4ed8] shadow-sm",
  secondary: "bg-white text-[#0F172A] border border-[#E2E8F0] hover:bg-[#F8FAFC]",
  ghost: "text-[#2563EB] hover:bg-[#EFF6FF]",
  onDark: "bg-white text-[#081426] hover:bg-[#EFF6FF] shadow-sm",
  outlineOnDark: "border border-white/30 text-white hover:bg-white/10",
} as const

const sizes = {
  sm: "h-9 px-4",
  md: "h-11 px-5",
  lg: "h-12 px-7 text-base",
} as const

export type CtaVariant = keyof typeof variants
export type CtaSize = keyof typeof sizes

type CommonProps = {
  variant?: CtaVariant
  size?: CtaSize
  className?: string
  children: React.ReactNode
}

export function CtaButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & { href: string } & React.ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </Link>
  )
}

export function CtaSubmit({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </button>
  )
}
