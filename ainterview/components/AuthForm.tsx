"use client";

import { useState, useEffect } from "react";
import { createClient, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// FIX: renamed NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY → NEXT_PUBLIC_SUPABASE_ANON_KEY
// (the old name resolved to `undefined` at runtime, breaking all auth calls)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthForm() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      router.push("/configuration");
    }
  }, [session, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    // FIX: execute the correct auth action based on `isLogin` flag
    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage(
        isLogin ? "Logged in successfully!" : "Account created. Check your email."
      );
      setEmail("");
      setPassword("");
      // After sign-up, switch to login mode so the user can sign in
      if (!isLogin) setIsLogin(true);
    }

    setLoading(false);
  };

  // Only show the loader before we know the session status
  if (loading && !session) {
    return <div>Loading…</div>;
  }

  return (
    <div>
      <h1>{isLogin ? "Login" : "Sign Up"}</h1>

      {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
      {successMessage && <p role="status" style={{ color: "green" }}>{successMessage}</p>}

      <form onSubmit={handleAuth}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          minLength={6}
          required
        />

        {/* FIX: button is inside the form so pressing Enter or clicking it
            both trigger handleAuth via the form's onSubmit */}
        <button type="submit" disabled={loading}>
          {loading ? "Processing…" : isLogin ? "Login" : "Sign Up"}
        </button>
      </form>

      {/* FIX: this is outside the form so it doesn't accidentally submit it */}
      <button type="button" onClick={() => setIsLogin(!isLogin)}>
        Switch to {isLogin ? "Sign Up" : "Login"}
      </button>
    </div>
  );
}
