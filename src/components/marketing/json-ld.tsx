/**
 * Renders a JSON-LD <script> block. Kept as a tiny shared component so
 * structured data is emitted consistently (and safely stringified)
 * across pages. Server-rendered — no client JS.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is static, author-controlled JSON — safe to inline.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
