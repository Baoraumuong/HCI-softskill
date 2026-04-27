"use client";
import React, { useState, useEffect } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import { useRouter } from "next/navigation";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL! ;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  //redirect after session changes
  useEffect(() => {
    if (session) {
      router.push("/configuration");
    }
  }, [session,router]);

  const handleLogin: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage('Logged in successfully!');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  const handleSignup: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccessMessage('Account created! Please check your email for confirmation (if email confirmation is enabled). You can now log in.');
      setIsLogin(true);
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  if (loading && !session) {
    return (
      <div className="container">
        <div className="card">
          <div className="loader">Loading...</div>
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="container">
        <div className="card dashboard">
          <h1>Welcome!</h1>
          <p>You are logged in as <strong>{session.user.email}</strong></p>
          <button onClick={handleLogout} disabled={loading} className="logout-btn">
            {loading ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="tabs">
          <button
            className={`tab ${isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(true);
              setError('');
              setSuccessMessage('');
            }}
          >
            Log In
          </button>
          <button
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false);
              setError('');
              setSuccessMessage('');
            }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="error">{error}</div>}
        {successMessage && <div className="success">{successMessage}</div>}

        <form onSubmit={isLogin ? handleLogin : handleSignup}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter......"
              minLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Processing...' : isLogin ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <div className="footer">
          {isLogin ? (
            <p>
              Don't have an account?{' '}
              <button onClick={() => setIsLogin(false)} className="link-btn">
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button onClick={() => setIsLogin(true)} className="link-btn">
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;