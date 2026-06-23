import { NextResponse, type NextRequest } from "next/server"

/**
 * POST /api/contact — public contact / enquiry endpoint.
 *
 * Defensive by design: it validates input server-side (never trusting
 * the client), drops obvious spam via a honeypot field, and applies a
 * lightweight per-IP rate limit. No SMTP credentials live in client
 * code — delivery is gated behind env vars and only attempted on the
 * server. When email delivery isn't configured the submission is
 * accepted and logged so the public form still works for reviewers and
 * demos (the request is not silently lost).
 */

// In-memory sliding-window rate limit. Sufficient for a single
// instance; swap for a shared store (e.g. Upstash) in multi-instance
// deployments. Keyed by client IP.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5
const hits = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_PER_WINDOW
}

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  // Honeypot: a hidden field real users never fill. If present, accept
  // the request (so bots don't learn they were caught) but discard it.
  if (str(body.company_website)) {
    return NextResponse.json({ ok: true })
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    )
  }

  const fullName = str(body.fullName)
  const email = str(body.email)
  const message = str(body.message)
  const consent = body.consent === "yes" || body.consent === true

  const errors: Record<string, string> = {}
  if (fullName.length < 2) errors.fullName = "Full name is required."
  if (!isEmail(email)) errors.email = "A valid work email is required."
  if (message.length < 10) errors.message = "Please include a short message."
  if (!consent) errors.consent = "Consent is required."

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "Validation failed.", errors }, { status: 422 })
  }

  const enquiry = {
    fullName,
    email,
    phone: str(body.phone),
    company: str(body.company),
    businessType: str(body.businessType),
    whatsappUsage: str(body.whatsappUsage),
    monthlyConversations: str(body.monthlyConversations),
    message,
    receivedAt: new Date().toISOString(),
  }

  try {
    await deliverEnquiry(enquiry)
  } catch (err) {
    // Don't leak provider errors to the client; log for operators.
    console.error("[contact] delivery failed:", err)
    return NextResponse.json({ error: "Could not submit enquiry." }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}

type Enquiry = {
  fullName: string
  email: string
  phone: string
  company: string
  businessType: string
  whatsappUsage: string
  monthlyConversations: string
  message: string
  receivedAt: string
}

/**
 * Delivers an enquiry. Uses Resend if RESEND_API_KEY + CONTACT_TO_EMAIL
 * are configured (no SDK dependency — a plain fetch to their REST API).
 * Otherwise it logs the enquiry server-side and resolves successfully,
 * so the form remains functional without email configured.
 */
async function deliverEnquiry(enquiry: Enquiry): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.CONTACT_TO_EMAIL
  const from = process.env.CONTACT_FROM_EMAIL ?? "Softivum Connect <onboarding@resend.dev>"

  if (!apiKey || !to) {
    console.info("[contact] enquiry received (email not configured):", {
      from: enquiry.email,
      company: enquiry.company,
      receivedAt: enquiry.receivedAt,
    })
    return
  }

  const lines = [
    `Name: ${enquiry.fullName}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone || "—"}`,
    `Company: ${enquiry.company || "—"}`,
    `Business type: ${enquiry.businessType || "—"}`,
    `WhatsApp usage: ${enquiry.whatsappUsage || "—"}`,
    `Est. monthly conversations: ${enquiry.monthlyConversations || "—"}`,
    "",
    enquiry.message,
  ]

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: enquiry.email,
      subject: `New Softivum Connect enquiry from ${enquiry.fullName}`,
      text: lines.join("\n"),
    }),
  })

  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}`)
  }
}
