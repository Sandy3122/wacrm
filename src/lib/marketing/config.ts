/**
 * Single source of truth for all editable marketing-site content:
 * brand identity, contact emails, navigation, and pricing. Everything
 * a non-developer might want to change lives here so the components
 * stay presentational. Pricing is intentionally a plain object (no
 * hard-coded Meta fees) so plans can be tuned before launch.
 */

// Normalize a public origin: strip any trailing slash and force https
// (except on localhost) so canonical/sitemap/OG URLs are always
// Meta- and SEO-ready, even if NEXT_PUBLIC_SITE_URL is set with http.
function normalizeOrigin(raw: string): string {
  const trimmed = raw.replace(/\/$/, "")
  const isLocal = trimmed.includes("localhost") || trimmed.includes("127.0.0.1")
  return trimmed.startsWith("http://") && !isLocal
    ? trimmed.replace(/^http:\/\//, "https://")
    : trimmed
}

export const siteConfig = {
  name: "Softivum Connect",
  company: "Softivum",
  // Canonical public origin (no trailing slash, https). Falls back to
  // the production domain if the env var is absent so absolute URLs in
  // metadata / JSON-LD are always valid.
  domain: normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL ?? "https://connect.softivum.com"),
  companyWebsite: "https://www.softivum.com",
  contactEmail: "contact@softivum.com",
  supportEmail: "contact@softivum.com",
  privacyEmail: "contact@softivum.com",
  securityEmail: "contact@softivum.com",
  location: "India",
  tagline: "WhatsApp Business Communication & Automation",
} as const

/** Primary header navigation (desktop + mobile share this list). */
export const mainNav = [
  { label: "Features", href: "/features" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const

export const footerNav = {
  product: [
    { label: "Features", href: "/features" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Security", href: "/security" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Support", href: "/support" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "Data Deletion", href: "/data-deletion" },
  ],
  account: [
    { label: "Log In", href: "/login" },
    { label: "Get Started", href: "/signup" },
  ],
} as const

export type PricingPlan = {
  id: string
  name: string
  description: string
  /** Display price. Kept as a string so "Custom" / "Contact us" work. */
  price: string
  priceSuffix?: string
  features: string[]
  cta: { label: string; href: string }
  /** Visually highlight one plan as the recommended option. */
  featured?: boolean
}

/**
 * Pricing is not finalised — edit freely. Prices are display strings,
 * not numbers, and intentionally omit Meta's per-conversation fees,
 * which are disclosed separately on the pricing page.
 */
export const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For small businesses getting started.",
    price: "Free",
    priceSuffix: "to start",
    features: [
      "One WhatsApp connection",
      "Basic team inbox",
      "Approved template sending",
      "Message status tracking",
      "Basic contact management",
    ],
    cta: { label: "Start Free", href: "/signup" },
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams using automation.",
    price: "Contact us",
    features: [
      "Multiple team members",
      "Workflow automation",
      "Conversation assignment",
      "Advanced filters",
      "Integrations",
      "Priority support",
    ],
    cta: { label: "Choose Growth", href: "/contact" },
    featured: true,
  },
  {
    id: "business",
    name: "Business",
    description: "For agencies and larger organizations.",
    price: "Custom",
    features: [
      "Multiple workspaces",
      "Advanced access controls",
      "Custom workflow limits",
      "Dedicated onboarding",
      "Priority assistance",
      "Custom integrations",
    ],
    cta: { label: "Contact Sales", href: "/contact" },
  },
]

export const pricingDisclaimer =
  "WhatsApp conversation charges, template charges or Meta-related messaging fees may apply separately according to Meta's current pricing and policies."

/** Business-type options reused across contact / signup forms. */
export const businessTypes = [
  "E-commerce / Retail",
  "Healthcare",
  "Education",
  "Real Estate",
  "Financial Services",
  "Travel & Hospitality",
  "Professional Services",
  "Agency / Reseller",
  "Other",
] as const
