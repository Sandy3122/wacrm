"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { siteConfig } from "@/lib/marketing/config";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthAlert,
  AuthField,
  AuthInfo,
  AuthInput,
  AuthPasswordInput,
  AuthSubmit,
} from "@/components/auth/auth-form";

// Reviewer-friendly note for Meta App Review. Never renders credentials.
const showReviewerNote =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_REVIEW_MODE === "true";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      description={`Access your ${siteConfig.name} inbox, automations, and customer conversations.`}
      footer={
        <p className="text-center text-sm text-[#64748B]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-[#2563EB] hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-5" noValidate>
        {showReviewerNote ? (
          <AuthInfo>
            Meta reviewers can use the provided test account credentials from the App Review
            instructions.
          </AuthInfo>
        ) : null}
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

        <AuthField
          label="Password"
          htmlFor="password"
          labelAction={
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-[#2563EB] hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          <AuthPasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            required
          />
        </AuthField>

        <label htmlFor="remember" className="flex items-center gap-2.5 text-sm text-[#64748B]">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            defaultChecked
            className="h-4 w-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]"
          />
          Keep me signed in on this device
        </label>

        <AuthSubmit loading={loading} loadingLabel="Signing in…">
          Sign in
        </AuthSubmit>
      </form>
    </AuthShell>
  );
}
