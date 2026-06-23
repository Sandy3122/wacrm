import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/marketing/config"

/**
 * robots.txt. Public marketing + legal pages are crawlable (legal
 * pages are explicitly NOT blocked, as required for Meta App Review).
 * The authenticated app surface, API routes and the noindex auth pages
 * are disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/dashboard",
        "/inbox",
        "/contacts",
        "/pipelines",
        "/broadcasts",
        "/automations",
        "/flows",
        "/settings",
        "/login",
        "/signup",
        "/forgot-password",
      ],
    },
    sitemap: `${siteConfig.domain}/sitemap.xml`,
    host: siteConfig.domain,
  }
}
