import type { Metadata } from "next"
import { LegalLayout } from "@/components/marketing/legal-layout"
import { siteConfig } from "@/lib/marketing/config"

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing use of Softivum Connect, including business responsibilities, WhatsApp and Meta policy compliance, consent requirements and prohibited usage.",
  alternates: { canonical: "/terms-of-service" },
  robots: { index: true, follow: true },
}

const EFFECTIVE_DATE = "23 June 2026"

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      effectiveDate={EFFECTIVE_DATE}
      breadcrumb={{ label: "Terms of Service", href: "/terms-of-service" }}
      intro={`These Terms govern your use of ${siteConfig.name}, provided by ${siteConfig.company}.`}
    >
      <h2>1. Acceptance of terms</h2>
      <p>
        By accessing or using {siteConfig.name} (the &ldquo;Service&rdquo;), you agree to these Terms
        of Service. If you do not agree, do not use the Service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be able to form a binding contract and use the Service for a lawful business
        purpose. You are responsible for ensuring your use complies with applicable laws and
        platform policies.
      </p>

      <h2>3. Business account responsibilities</h2>
      <p>You are responsible for:</p>
      <ul>
        <li>Obtaining valid customer consent before messaging;</li>
        <li>Following all applicable laws and regulations;</li>
        <li>Following Meta and WhatsApp policies;</li>
        <li>Avoiding spam and unsolicited bulk messaging;</li>
        <li>Avoiding misleading, harmful or unlawful content;</li>
        <li>Protecting your login credentials and account access.</li>
      </ul>

      <h2>4. Account security</h2>
      <p>
        You are responsible for safeguarding your credentials and for all activity under your
        account. Notify us promptly of any unauthorized use.
      </p>

      <h2>5. WhatsApp and Meta policy compliance</h2>
      <p>
        Your use of WhatsApp messaging through the Service is subject to Meta&apos;s and
        WhatsApp&apos;s terms and policies, including the WhatsApp Business Messaging Policy. You are
        responsible for complying with those policies.
      </p>

      <h2>6. Customer consent requirements</h2>
      <p>
        You must obtain and maintain appropriate consent from recipients before sending messages, and
        honor opt-out requests in line with applicable law and WhatsApp policy.
      </p>

      <h2>7. Prohibited usage</h2>
      <ul>
        <li>Unsolicited bulk or spam messaging;</li>
        <li>Sending unlawful, deceptive, harassing or harmful content;</li>
        <li>Infringing intellectual property or privacy rights;</li>
        <li>Attempting to disrupt, reverse engineer or misuse the Service;</li>
        <li>Any use that violates Meta or WhatsApp policies.</li>
      </ul>
      <p>
        {siteConfig.name} must not be used as an unsolicited bulk messaging tool.
      </p>

      <h2>8. Messaging templates</h2>
      <p>
        Where required, you must use message templates approved within your WhatsApp Business
        account. Template approval and availability are controlled by Meta.
      </p>

      <h2>9. Third-party services</h2>
      <p>
        The Service relies on third-party platforms, including Meta&apos;s WhatsApp Business
        Platform. We are not responsible for the availability, policies or decisions of those
        third parties.
      </p>

      <h2>10. Subscription and billing</h2>
      <p>
        Paid plans, where offered, are billed as described at the time of purchase. Fees are for the
        {" "}
        {siteConfig.name} Service itself.
      </p>

      <h2>11. Meta messaging charges</h2>
      <p>
        WhatsApp conversation charges, template charges and other Meta-related messaging fees are
        separate from your {siteConfig.name} subscription and are governed by Meta&apos;s current
        pricing and policies.
      </p>

      <h2>12. Availability</h2>
      <p>
        We aim to keep the Service available but do not guarantee uninterrupted operation. The
        Service may be affected by maintenance or by third-party platforms outside our control.
      </p>

      <h2>13. Suspension</h2>
      <p>
        We may suspend access if we reasonably believe your use violates these Terms, applicable law,
        or Meta/WhatsApp policies, or poses a security risk.
      </p>

      <h2>14. Termination</h2>
      <p>
        You may stop using the Service at any time. We may terminate or suspend the Service or your
        account in accordance with these Terms. On termination, certain provisions survive.
      </p>

      <h2>15. Intellectual property</h2>
      <p>
        The Service, including its software and branding, is owned by {siteConfig.company} or its
        licensors. These Terms do not grant you rights to our intellectual property except as needed
        to use the Service.
      </p>

      <h2>16. Data responsibilities</h2>
      <p>
        You are responsible for the data you process through the Service and for having a lawful
        basis to do so. Our handling of data is described in our{" "}
        <a href="/privacy-policy">Privacy Policy</a>.
      </p>

      <h2>17. Confidentiality</h2>
      <p>
        Each party will protect the other&apos;s non-public information shared in connection with the
        Service and use it only as permitted.
      </p>

      <h2>18. Disclaimers</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind to the extent
        permitted by law. We do not warrant that the Service will be error-free or uninterrupted.
      </p>

      <h2>19. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {siteConfig.company} is not liable for indirect,
        incidental or consequential damages, or for outages, policy decisions or actions of Meta or
        WhatsApp.
      </p>

      <h2>20. Indemnity</h2>
      <p>
        You agree to indemnify {siteConfig.company} against claims arising from your use of the
        Service in violation of these Terms, applicable law or platform policies.
      </p>

      <h2>21. Governing law</h2>
      <p>
        These Terms are governed by the laws of India, without regard to conflict-of-law principles,
        unless otherwise required by applicable law.
      </p>

      <h2>22. Dispute handling</h2>
      <p>
        We encourage you to contact us first to resolve any dispute informally. Disputes not resolved
        informally will be handled in accordance with applicable law.
      </p>

      <h2>23. Contact information</h2>
      <p>
        Questions about these Terms? Contact{" "}
        <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
      </p>

      <h2>24. Changes to terms</h2>
      <p>
        We may update these Terms from time to time. Continued use after changes take effect
        constitutes acceptance of the updated Terms.
      </p>

      <hr />
      <p>
        <strong>Disclaimer:</strong> These Terms are provided for transparency and should receive
        independent legal review before final publication.
      </p>
    </LegalLayout>
  )
}
