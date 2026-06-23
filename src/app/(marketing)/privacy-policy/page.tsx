import type { Metadata } from "next"
import { LegalLayout } from "@/components/marketing/legal-layout"
import { siteConfig } from "@/lib/marketing/config"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Softivum Connect collects, uses, stores and protects data when businesses use our WhatsApp Business communication and automation platform.",
  alternates: { canonical: "/privacy-policy" },
  robots: { index: true, follow: true },
}

const EFFECTIVE_DATE = "23 June 2026"

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      effectiveDate={EFFECTIVE_DATE}
      breadcrumb={{ label: "Privacy Policy", href: "/privacy-policy" }}
      intro={`This Privacy Policy explains how ${siteConfig.company} handles data in connection with the ${siteConfig.name} platform.`}
    >
      <p>
        This policy applies specifically to {siteConfig.name} (the &ldquo;Service&rdquo;), operated
        by {siteConfig.company} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). It describes the information we
        process to provide WhatsApp Business communication functionality, why we process it, and the
        choices and rights available to you.
      </p>

      <h2>1. Company identity and contact</h2>
      <p>
        {siteConfig.name} is provided by {siteConfig.company}, located in {siteConfig.location}. For
        any privacy question or request, contact us at{" "}
        <a href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</a>.
      </p>

      <h2>2. Information you provide</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email address and authentication details used to
          create and secure your account.
        </li>
        <li>
          <strong>Business information:</strong> company name, workspace details and business
          configuration you add to the Service.
        </li>
        <li>
          <strong>Contact information:</strong> details you submit through forms (for example, the
          contact form) or add to your workspace.
        </li>
      </ul>

      <h2>3. WhatsApp Business Account information</h2>
      <p>
        When you connect a WhatsApp Business account through Meta&apos;s onboarding, we may process:
      </p>
      <ul>
        <li>Phone number identifiers associated with your WhatsApp Business account;</li>
        <li>Meta account identifiers required to operate the connection;</li>
        <li>Contact information for the people you communicate with through the Service;</li>
        <li>Messages and message metadata (such as timestamps and template identifiers);</li>
        <li>Delivery and read events for messages you send;</li>
        <li>Webhook data delivered by Meta&apos;s WhatsApp Business Platform.</li>
      </ul>
      <p>
        {siteConfig.name} may process the data required to provide WhatsApp Business communication
        functionality on your behalf.
      </p>

      <h2>4. Device and usage information</h2>
      <p>
        We may collect limited technical information such as device and browser type, IP address and
        usage events to operate, secure and improve the Service.
      </p>

      <h2>5. Cookies and analytics</h2>
      <p>
        We use necessary cookies to keep you signed in and to operate the Service. Where analytics
        are used, they help us understand aggregate usage and improve the product. You can control
        cookies through your browser settings.
      </p>

      <h2>6. Why we collect data and how we use it</h2>
      <ul>
        <li>To provide, operate and maintain the Service;</li>
        <li>To send and receive messages through your connected WhatsApp Business account;</li>
        <li>To authenticate users and secure accounts;</li>
        <li>To provide support and respond to your requests;</li>
        <li>To monitor, troubleshoot and improve the Service;</li>
        <li>To comply with legal obligations.</li>
      </ul>
      <p>
        We do <strong>not</strong> sell personal data for unrelated advertising purposes.
      </p>

      <h2>7. How data is stored</h2>
      <p>
        Data is stored using reputable cloud infrastructure and database services with access
        controls and encryption in transit. Some data may be retained in backups for a limited
        period.
      </p>

      <h2>8. Service providers and processors</h2>
      <p>
        We rely on third-party service providers (for example, cloud hosting, database and
        infrastructure providers, and Meta&apos;s WhatsApp Business Platform) to deliver the Service.
        These providers process data on our behalf under appropriate terms. Because providers process
        data to deliver the Service, we cannot state that data is never shared with anyone; we share
        only what is necessary to operate the Service.
      </p>

      <h2>9. Data sharing</h2>
      <p>
        We may share data with service providers as described above, with Meta as required to operate
        the WhatsApp connection, and where required by law or to protect our rights and users. We do
        not sell your data for unrelated advertising.
      </p>

      <h2>10. Data retention</h2>
      <p>
        We retain data for as long as your account is active or as needed to provide the Service.
        When you request deletion, we remove data as described on our{" "}
        <a href="/data-deletion">Data Deletion</a> page, subject to backup cycles and legal retention
        requirements.
      </p>

      <h2>11. Data security</h2>
      <p>
        We use technical and organizational measures including HTTPS, server-side handling of
        sensitive credentials, role-based access and webhook validation. No method of transmission or
        storage is completely secure, and we cannot guarantee absolute security.
      </p>

      <h2>12. International processing</h2>
      <p>
        Data may be processed in countries other than your own, including where our service providers
        operate. Where applicable, we take steps intended to protect data during such transfers.
      </p>

      <h2>13. Your rights</h2>
      <p>
        Depending on your location, you may have rights to access, correct, export or delete your
        personal data, and to object to or restrict certain processing. To exercise these rights,
        contact <a href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</a>.
      </p>

      <h2>14. Account deletion</h2>
      <p>
        You can request deletion of your account and associated data at any time. See the{" "}
        <a href="/data-deletion">Data Deletion</a> page for methods and the expected processing
        timeframe.
      </p>

      <h2>15. Contact procedure</h2>
      <p>
        Send privacy requests to{" "}
        <a href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</a>. We may need to
        verify your identity before acting on a request.
      </p>

      <h2>16. Updates to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be reflected by updating
        the effective date above and, where appropriate, by additional notice.
      </p>

      <hr />
      <p>
        <strong>Disclaimer:</strong> This policy is provided for transparency and should receive
        independent legal review before final publication.
      </p>
    </LegalLayout>
  )
}
