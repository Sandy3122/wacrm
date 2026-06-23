import type { Metadata } from "next"
import { LegalLayout } from "@/components/marketing/legal-layout"
import { siteConfig } from "@/lib/marketing/config"

export const metadata: Metadata = {
  title: "Data Deletion",
  description:
    "Softivum Connect data deletion instructions: how to request deletion of your account and associated data by email, and what is removed.",
  alternates: { canonical: "/data-deletion" },
  robots: { index: true, follow: true },
}

export default function DataDeletionPage() {
  return (
    <LegalLayout
      title="Softivum Connect Data Deletion Instructions"
      breadcrumb={{ label: "Data Deletion", href: "/data-deletion" }}
      intro="You can request deletion of your Softivum Connect account and associated data using the method below. This page is publicly available and does not require a login."
    >
      <p>
        We respect your right to control your data. If you would like to delete your{" "}
        {siteConfig.name} account and the data associated with it, follow the instructions below.
      </p>

      <h2>Method: Email request</h2>
      <p>
        Send an email to{" "}
        <a href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</a> with the subject:
      </p>
      <p>
        <strong>Softivum Connect Data Deletion Request</strong>
      </p>
      <p>Please include the following so we can verify and locate your account:</p>
      <ul>
        <li>Registered name</li>
        <li>Registered email</li>
        <li>Company name</li>
        <li>Connected WhatsApp business number</li>
        <li>Reason for deletion (optional)</li>
      </ul>

      <h2>What may be deleted</h2>
      <p>On a verified request, we will work to delete data associated with your account, including:</p>
      <ul>
        <li>Your {siteConfig.name} account</li>
        <li>Workspace information</li>
        <li>Stored Meta account identifiers</li>
        <li>Connected WhatsApp Business Account identifiers</li>
        <li>Stored contacts</li>
        <li>Stored messages</li>
        <li>Automation configurations</li>
        <li>Application logs associated with the account, subject to legal retention requirements</li>
      </ul>

      <h2>Processing time</h2>
      <p>
        Requests are normally processed within <strong>7 to 30 business days</strong>, subject to
        identity verification and legal retention requirements. Because some data may persist
        temporarily in encrypted backups or must be retained to meet legal obligations, we cannot
        promise immediate or instantaneous deletion in all cases.
      </p>

      <h2>Confirmation</h2>
      <p>
        Once your request is processed, we will send a confirmation to your registered email address.
        If we need additional information to verify your identity, we will contact you before
        proceeding.
      </p>

      <h2>Contact</h2>
      <p>
        For any question about data deletion, contact{" "}
        <a href={`mailto:${siteConfig.privacyEmail}`}>{siteConfig.privacyEmail}</a>. You can also
        review how we handle data in our <a href="/privacy-policy">Privacy Policy</a>.
      </p>
    </LegalLayout>
  )
}
