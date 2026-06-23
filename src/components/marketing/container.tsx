import { cn } from "@/lib/utils"

/**
 * Centered content wrapper enforcing the ~1280px max width and the
 * site's horizontal gutters. Used by every section so spacing stays
 * consistent. `as` lets callers render it as <section>, <header>, etc.
 */
export function Container({
  className,
  as: Tag = "div",
  children,
}: {
  className?: string
  as?: React.ElementType
  children: React.ReactNode
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-[1280px] px-5 sm:px-6 lg:px-8", className)}>
      {children}
    </Tag>
  )
}
