"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/app/hooks/useLogout";
import { getSupabaseBrowserClient } from "@/app/lib/supabase/browser-client";
import { getOrCreateUserProfile } from "@/app/lib/user-profile";
import { BrandMark } from "@/components/BrandMark";
import type { User } from "@supabase/supabase-js";
import { BadgeDollarSign, ExternalLink, Gauge, MonitorPlay, History, LogOut, Loader2, Info, ShieldCheck, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard/configuration", label: "Setup Interview", icon: MonitorPlay },
  { href: "/dashboard/history", label: "Past Interviews", icon: History },
  { href: "/dashboard/usage", label: "Usage", icon: Gauge },
  { href: "/dashboard/about", label: "About", icon: Info },
] as const;

const PLUS_CONTACT_URL = "https://www.facebook.com/inhgiabao.287766";
const PLUS_PRICE_LABEL = "100,000 VND / month";

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, isLoggingOut } = useLogout();

  /* ─── Dynamic User State ───────────────────────────────── */
  const [user, setUser] = useState({
    name: "Loading...",
    role: "user",
    accountPlan: "normal",
  });
  const [isRequestingPlus, setIsRequestingPlus] = useState(false);
  const [plusRequestStatus, setPlusRequestStatus] = useState("");
  const [isPlusDetailsOpen, setIsPlusDetailsOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const fetchUserProfile = async (authUser: User) => {
      const { data, error } = await getOrCreateUserProfile(supabase, authUser);

      if (error) {
        console.error("Failed to fetch user profile:", error.message);
        return;
      }

      if (!data) return;

      setUser({
        name: data.user_name || "User",
        role: data.role || "user",
        accountPlan: data.account_plan || "normal",
      });
    };

    // Initial fetch to get current user session
    const checkInitialSession = async () => {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      // Ignore "Auth session missing!" because it only means the user is logged out
      if (error && error.message !== "Auth session missing!") {
        console.error("Supabase auth error:", error.message);
      }

      if (authUser) {
        await fetchUserProfile(authUser);
      }
    };

    checkInitialSession();

    // Listen for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        // Reset state when logged out
        setUser({
          name: "Loading...",
          role: "user",
          accountPlan: "normal",
        });
      }
    });

    // Cleanup listener when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Safely get the first letter for the avatar circle
  const getInitial = (name: string) =>
    name && name !== "Loading..."
      ? name.charAt(0).toUpperCase()
      : "?";

  const canRequestPlus = user.role !== "admin" && user.accountPlan !== "plus";

  const requestAccountPlus = async () => {
    setIsRequestingPlus(true);
    setPlusRequestStatus("");

    try {
      const res = await fetch("/api/account/upgrade-request", { method: "POST" });
      const data = await res.json();
      setPlusRequestStatus(data.message ?? (res.ok ? "Request sent." : "Could not send request."));
      if (res.ok) {
        setIsPlusDetailsOpen(false);
      }
    } catch {
      setPlusRequestStatus("Could not send request. Please try again.");
    } finally {
      setIsRequestingPlus(false);
    }
  };

  return (
    <aside className="w-[220px] min-w-[220px] h-screen sticky top-0 bg-white border-r border-gray-200 flex flex-col font-sans shrink-0 z-10">
      {/* ── Brand / Logo ── */}
      <div className="flex items-center gap-2.5 py-5 px-4 border-b border-gray-100">
        <BrandMark />
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 px-2 mb-2">
          Menu
        </p>

        {[...NAV_ITEMS, ...(user.role === "admin" ? [{ href: "/dashboard/admin", label: "Admin", icon: ShieldCheck }] : [])].map(({ href, label, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group relative ${
                active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span
                className={`flex items-center justify-center shrink-0 transition-colors ${
                  active
                    ? "text-gray-900"
                    : "text-gray-400 group-hover:text-gray-600"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
              </span>

              <span className="flex-1">{label}</span>

              {/* Active Indicator Dot */}
              {active && (
                <span className="w-1.5 h-1.5 bg-gray-900 rounded-full shrink-0" />
              )}
            </Link>
          );
        })}

        {canRequestPlus && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => {
                setPlusRequestStatus("");
                setIsPlusDetailsOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-[13px] font-medium text-gray-700 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex shrink-0 items-center justify-center text-gray-500">
                <BadgeDollarSign size={16} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">Request Account Plus</span>
            </button>
            {plusRequestStatus && (
              <p className="mt-2 px-2 text-[11px] leading-relaxed text-gray-500" role="status" aria-live="polite">
                {plusRequestStatus}
              </p>
            )}
          </div>
        )}
      </nav>

      {/* ── Footer / User Profile ── */}
      <div className="p-3.5 border-t border-gray-100 flex items-center gap-2.5">
        {/* User Info */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-semibold shrink-0 shadow-sm">
            {getInitial(user.name)}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold text-gray-900 truncate"
              title={user.name}
            >
              {user.name}
            </p>
            <p className="mt-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-gray-400">
              {user.accountPlan === "plus" || user.role === "admin" ? "Plus" : "Normal"}
            </p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          disabled={isLoggingOut}
          aria-label="Log out"
          title="Log out"
          className="w-8 h-8 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isLoggingOut ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogOut
              size={14}
              strokeWidth={2}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
          )}
        </button>
      </div>

      {isPlusDetailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plus-upgrade-title"
        >
          <div className="w-full max-w-[320px] rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p id="plus-upgrade-title" className="text-sm font-semibold text-gray-900">
                  Account Plus
                </p>
                <p className="mt-1 text-xs text-gray-500">Please contact admin for payment details.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPlusDetailsOpen(false)}
                aria-label="Close Account Plus details"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-400">Price</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{PLUS_PRICE_LABEL}</p>
            </div>

            <a
              href={PLUS_CONTACT_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
            >
              <span>Contact admin on Facebook</span>
              <ExternalLink size={14} strokeWidth={2} className="shrink-0 text-gray-400" />
            </a>

            <button
              type="button"
              onClick={requestAccountPlus}
              disabled={isRequestingPlus}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRequestingPlus && <Loader2 size={14} className="animate-spin" />}
              Send upgrade request
            </button>

            {plusRequestStatus && (
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500" role="status" aria-live="polite">
                {plusRequestStatus}
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
