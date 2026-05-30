"use client";

import "../globals.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {TrainFront} from "lucide-react"

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(sec).padStart(2, "0")}`;
  };

  const handleEnd = () => {
    sessionStorage.setItem("interviewDuration", String(seconds));
    router.push("/dashboard/history");
  };

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900 antialiased"
    >
      {/* ── Header ── */}
      <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
        {/* Left — logo + wordmark */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <TrainFront
                size={18}
                strokeWidth={2.5}
                className="fill-gray-900"
              />
          </div>
          <span className="text-[13px] font-semibold tracking-tight text-gray-900">
            AInterview
          </span>

          <span className="ml-0.5 hidden border-l border-gray-200 pl-2.5 text-[11px] text-gray-500 sm:block">
            Live interview
          </span>
        </div>

        {/* Right — timer + end button */}
        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1">
            <svg
              className="h-3 w-3 text-gray-400"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="8" cy="8" r="6.5" />
              <polyline
                points="8,4.5 8,8 10.5,9.5"
                strokeLinecap="round"
              />
            </svg>

            <span className="font-mono text-[12px] tabular-nums text-gray-700">
              {mounted ? fmt(seconds) : "00:00:00"}
            </span>
          </div>

          {/* End session */}
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1 text-[12px] font-semibold text-white shadow-sm transition hover:bg-red-500 active:scale-[0.97]"
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3 4H5a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
            </svg>
            End Session
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden bg-gray-50">
        {children}
      </main>
    </div>
  );
}
