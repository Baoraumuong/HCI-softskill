"use client";

import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";
import { User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthPage } from "./AuthPage";

type EmailPasswordProps = {
  user: User | null;
};

type Mode = "signup" | "signin" | "forgot";

export default function EmailPassword({ user }: EmailPasswordProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const supabase = getSupabaseBrowserClient();
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  // auth state listener 
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setCurrentUser(session?.user ?? null);
        // Redirect to configuration whenever a sign-in is detected
        if (event === "SIGNED_IN") {
          router.push("/dashboard/configuration");
        }
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Handle form submission for sign up, sign in, and password reset
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setStatus(error.message);
      } else {
        setStatus("Password reset link sent. Check your email inbox.");
      }

      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/configuration`,
        },
      });
      if (error) {
        setStatus(error.message);
      } else {
        setStatus("Check your inbox to confirm the new account.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setStatus(error.message);
      } else {
        router.push("/dashboard/configuration");
      }
    }
  }

  return (
    <AuthPage
      title="Welcome to the AI-powered platform for mock interview in IT"
      intro="Users can experience real-time interviews with AI "
      steps={[
        "Practice coding problems.",
        "Answer behavioral questions.",
        "Get the analytic results immediately by AI.",
      ]}
    >
      {!currentUser && (
        <form
          className="relative overflow-hidden rounded-[32px] border border-black-500/30 bg-gradient-to-br from-[hsl(180,2%,89%)] via-[#e3e3e3] to-[rgb(219,222,221)] p-8 text-black shadow-[0_35px_90px_rgba(2,6,23,0.65)]"
          onSubmit={handleSubmit}
        >
          <div
            className="pointer-events-none absolute -left-4 -top-4 -z-10 h-20 w-28 rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.25),_transparent)] blur-lg"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-10 right-2 -z-10 h-28 w-40 rounded-full bg-[linear-gradient(140deg,_rgba(45,212,191,0.32),_rgba(59,130,246,0.12))] blur-xl"
            aria-hidden="true"
          />
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-black">
                {mode === "signup"
                  ? "Create an account"
                  : mode === "signin"
                    ? "Welcome back"
                    : "Reset your password"}
              </h3>
            </div>
            <div className="flex rounded-full border border-white/10 bg-white/[0.07] p-1 text-xs font-semibold text-black">
              {(["signup", "signin"] as Mode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  onClick={() => {
                    setStatus("");
                    setMode(option);
                  }}
                  className={`rounded-full px-4 py-1 transition ${
                    mode === option
                      ? "bg-red-500/30 text-black shadow shadow-red-500/20"
                      : "text-black-400"
                  }`}
                >
                  {option === "signup" ? "Sign up" : "Sign in"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-black-200">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#e9e9e6] px-3 py-2.5 text-base text-black placeholder-slate-500 shadow-inner shadow-black/30 focus:border-red-400 focus:outline-none"
                placeholder="you@email.com"
              />
            </label>
            {mode !== "forgot" && (
              <label className="block text-sm font-medium text-black-200">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#e9e9e6] px-3 py-2.5 text-base text-black placeholder-slate-500 shadow-inner shadow-black/30 focus:border-red-400 focus:outline-none"
                  placeholder="At least 6 characters"
                />
              </label>
            )}
          </div>
          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-600/40"
          >
            {mode === "signup"
              ? "Create account"
              : mode === "signin"
                ? "Sign in"
                : "Send reset link"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("");
              setMode(mode === "forgot" ? "signin" : "forgot");
            }}
            className="mt-3 w-full text-center text-xs font-semibold text-red-600 transition hover:text-red-500"
          >
            {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
          </button>
          {status && (
            <p className="mt-4 text-sm text-black" role="status" aria-live="polite">
              {status}
            </p>
          )}
        </form>
      )}
    </AuthPage>
  );
}
