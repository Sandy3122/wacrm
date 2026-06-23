import type { MetadataRoute } from "next"
import { siteConfig } from "@/lib/marketing/config"

/**
 * Public sitemap for the marketing site. Lists only the indexable
 * public pages (the app's dashboard and the noindex login/signup pages
 * are intentionally excluded). Legal pages are included so Meta and
 * search crawlers can reach Privacy, Terms and Data Deletion.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.domain
  const lastModified = new Date("2026-06-23")

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/features", priority: 0.9, changeFrequency: "monthly" },
    { path: "/how-it-works", priority: 0.8, changeFrequency: "monthly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/security", priority: 0.7, changeFrequency: "monthly" },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
    { path: "/support", priority: 0.6, changeFrequency: "monthly" },
    { path: "/privacy-policy", priority: 0.5, changeFrequency: "yearly" },
    { path: "/terms-of-service", priority: 0.5, changeFrequency: "yearly" },
    { path: "/data-deletion", priority: 0.5, changeFrequency: "yearly" },
  ]

  return routes.map((r) => ({
    url: `${base}${r.path === "/" ? "" : r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))
}
