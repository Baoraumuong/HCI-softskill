"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthPage } from "@/components/AuthPage";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("Checking reset link...");
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const checkSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        setStatus(error.message);
        return;
      }

      if (!session) {
        setStatus("Open this page from the password reset email link.");
        return;
      }

      setStatus("");
      setIsReady(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setStatus("");
        setIsReady(true);
      }
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 6) {
      setStatus("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }

    setIsSaving(true);
    setStatus("");

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    setIsSaving(false);

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Password changed. Redirecting to sign in...");
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <AuthPage
      title="Set a new password"
      intro="Use the secure link from your email to choose a new password for your account."
      steps={[
        "Open the reset link from your inbox.",
        "Enter a new password.",
        "Sign in again with the updated password.",
      ]}
    >
      <form
        onSubmit={handleSubmit}
        className="relative overflow-hidden rounded-[32px] border border-black-500/30 bg-gradient-to-br from-[hsl(180,2%,89%)] via-[#e3e3e3] to-[rgb(219,222,221)] p-8 text-black shadow-[0_35px_90px_rgba(2,6,23,0.65)]"
      >
        <h3 className="text-xl font-semibold text-black">Change password</h3>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-black-200">
            New password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              disabled={!isReady || isSaving}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#e9e9e6] px-3 py-2.5 text-base text-black placeholder-slate-500 shadow-inner shadow-black/30 focus:border-red-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="At least 6 characters"
            />
          </label>
          <label className="block text-sm font-medium text-black-200">
            Confirm password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
              disabled={!isReady || isSaving}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[#e9e9e6] px-3 py-2.5 text-base text-black placeholder-slate-500 shadow-inner shadow-black/30 focus:border-red-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Repeat new password"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={!isReady || isSaving}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-600/40"
        >
          {isSaving ? "Changing password..." : "Change password"}
        </button>
        <Link
          href="/"
          className="mt-3 block w-full text-center text-xs font-semibold text-red-600 transition hover:text-red-500"
        >
          Back to sign in
        </Link>
        {status && (
          <p className="mt-4 text-sm text-black" role="status" aria-live="polite">
            {status}
          </p>
        )}
      </form>
    </AuthPage>
  );
}
