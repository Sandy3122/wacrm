"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Plug } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { siteConfig, businessTypes } from "@/lib/marketing/config";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthAlert,
  AuthField,
  AuthInput,
  AuthPasswordInput,
  AuthSection,
  AuthSelect,
  AuthSubmit,
} from "@/components/auth/auth-form";
import { CtaButton } from "@/components/marketing/cta-button";

const countries = [
  "India",
  "United States",
  "United Kingdom",
  "United Arab Emirates",
  "Singapore",
  "Australia",
  "Canada",
  "Germany",
  "Other",
];

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company,
          country,
          business_type: businessType,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <AuthShell
        eyebrow="Almost there"
        title="Check your email"
        description="Verify your address to activate your workspace."
        footer={
          <p className="text-center text-sm text-[#64748B]">
            Wrong email?{" "}
            <button
              type="button"
              onClick={() => setSuccess(false)}
              className="font-semibold text-[#2563EB] hover:underline"
            >
              Go back
            </button>
          </p>
        }
      >
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7]">
              <CheckCircle2 className="h-5 w-5 text-[#16A34A]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#081426]">Confirmation link sent</p>
              <p className="mt-1 text-sm text-[#64748B]">
                We&apos;ve sent a link to{" "}
                <span className="font-medium text-[#0F172A]">{email}</span>. Open it to verify
                your account, then sign in.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2563EB]/15 bg-[#EFF6FF] p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#081426]">
              <Plug className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
              Next: Connect WhatsApp Business
            </p>
            <p className="mt-1.5 text-sm text-[#475569]">
              After signing in, start WhatsApp onboarding from your dashboard whenever
              you&apos;re ready.
            </p>
          </div>

          <CtaButton href="/login" size="md" className="w-full">
            Continue to sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </CtaButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      wide
      eyebrow="Get started"
      title="Create your account"
      description={`Set up ${siteConfig.name} in a few minutes — no credit card required.`}
      footer={
        <p className="text-center text-sm text-[#64748B]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#2563EB] hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSignup} className="flex flex-col gap-7" noValidate>
        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <AuthSection title="Your details" description="How we'll address you in the workspace.">
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label="Full name" htmlFor="fullName">
              <AuthInput
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </AuthField>
            <AuthField label="Work email" htmlFor="email">
              <AuthInput
                id="email"
                type="email"
                autoComplete="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </AuthField>
          </div>
        </AuthSection>

        <AuthSection title="Business profile" description="Helps us tailor your onboarding experience.">
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField label="Company name" htmlFor="company">
              <AuthInput
                id="company"
                type="text"
                autoComplete="organization"
                placeholder="Company Pvt Ltd"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </AuthField>
            <AuthField label="Country" htmlFor="country">
              <AuthSelect
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="" disabled>
                  Select a country
                </option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </AuthSelect>
            </AuthField>
            <div className="sm:col-span-2">
              <AuthField label="Business type" htmlFor="businessType">
                <AuthSelect
                  id="businessType"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  {businessTypes.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </AuthSelect>
              </AuthField>
            </div>
          </div>
        </AuthSection>

        <AuthSection title="Security" description="Use at least 6 characters.">
          <div className="grid gap-4">
            <AuthField label="Password" htmlFor="password">
              <AuthPasswordInput
                id="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={setPassword}
                required
              />
            </AuthField>
            <AuthField label="Confirm password" htmlFor="confirmPassword">
              <AuthPasswordInput
                id="confirmPassword"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                required
              />
            </AuthField>
          </div>
        </AuthSection>

        <label htmlFor="consent" className="flex items-start gap-3 text-sm text-[#64748B]">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]"
          />
          <span>
            By creating an account, you agree to the{" "}
            <Link href="/terms-of-service" className="font-medium text-[#2563EB] hover:underline">
              Terms of Service
            </Link>{" "}
            and acknowledge the{" "}
            <Link href="/privacy-policy" className="font-medium text-[#2563EB] hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <AuthSubmit loading={loading} loadingLabel="Creating account…">
          Create account
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
