"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, StopCircle } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

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
          <BrandMark />

          <span className="ml-0.5 hidden border-l border-gray-200 pl-2.5 text-[11px] text-gray-500 sm:block">
            Live interview
          </span>
        </div>

        {/* Right — timer + end button */}
        <div className="flex items-center gap-2">
          {/* Timer */}
          <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1">
            <Clock size={12} className="text-gray-400" />

            <span className="font-mono text-[12px] tabular-nums text-gray-700">
              {mounted ? fmt(seconds) : "00:00:00"}
            </span>
          </div>

          {/* End session */}
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1 text-[12px] font-semibold text-white shadow-sm transition hover:bg-red-500 active:scale-[0.97]"
          >
            <StopCircle size={12} />
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
