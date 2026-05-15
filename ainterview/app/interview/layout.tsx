"use client";

import { JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  };

  const handleEnd = () => {
    sessionStorage.setItem("interviewDuration", String(seconds));
    router.push("performance");
  };

  return (
    <div className={`${jetbrainsMono.variable} flex h-screen flex-col overflow-hidden bg-white text-gray-100 antialiased`}>
      {/* ── Header ── */}
      <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#161b22] px-4">
        {/* Left — logo + wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 shrink-0">
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4,5 1,8 4,11" />
              <polyline points="12,5 15,8 12,11" />
              <line x1="9" y1="3" x2="7" y2="13" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-white">AInterview</span>
          <span className="hidden sm:block text-[11px] text-gray-500 border-l border-white/[0.08] pl-2.5 ml-0.5">
            Live interview
          </span>
        </div>

        {/* Right — timer + end button */}
        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1">
            <svg className="h-3 w-3 text-gray-500" viewBox="0 0 16 16" fill="none"
              stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6.5" />
              <polyline points="8,4.5 8,8 10.5,9.5" strokeLinecap="round" />
            </svg>
            <span className="font-mono text-[12px] tabular-nums text-gray-300">
              {mounted ? fmt(seconds) : "00:00:00"}
            </span>
          </div>

          {/* End session */}
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-red-500 active:scale-[0.97]"
          >
            <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3 4H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/>
            </svg>
            End Session
          </button>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}