"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthAlert,
  AuthField,
  AuthInput,
  AuthSubmit,
} from "@/components/auth/auth-form";
import { CtaButton } from "@/components/marketing/cta-button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={success ? "Check your email" : "Reset your password"}
      description={
        success
          ? "Follow the link in your inbox to choose a new password."
          : "Enter the email on your account and we'll send a secure reset link."
      }
      footer={
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium text-[#64748B] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to sign in
        </Link>
      }
    >
      {success ? (
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7]">
              <CheckCircle2 className="h-5 w-5 text-[#16A34A]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#081426]">Reset link sent</p>
              <p className="mt-1 text-sm text-[#64748B]">
                We&apos;ve emailed a link to{" "}
                <span className="font-medium text-[#0F172A]">{email}</span>. Check your spam
                folder if it doesn&apos;t arrive within a few minutes.
              </p>
            </div>
          </div>

          <CtaButton href="/login" variant="secondary" size="md" className="w-full">
            Return to sign in
          </CtaButton>
        </div>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-5" noValidate>
          {error ? <AuthAlert>{error}</AuthAlert> : null}

          <AuthField label="Email address" htmlFor="email">
            <AuthInput
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </AuthField>

          <AuthSubmit loading={loading} loadingLabel="Sending…">
            Send reset link
          </AuthSubmit>
        </form>
      )}
    </AuthShell>
  );
}
