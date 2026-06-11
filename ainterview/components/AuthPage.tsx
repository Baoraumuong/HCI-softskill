"use client";

import type { ReactNode } from "react";

type AuthPageProps = {
  title: string;
  intro: string;
  steps: string[];
  children: ReactNode;
};

export function AuthPage({
  title,
  intro,
  steps,
  children,
}: AuthPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[rgb(232,232,233)] via-[rgba(237,237,237,0.9)] to-[rgb(239,235,238)] text-black">
      <header className="border-b border-white/10 bg-white backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
              ainterview
            </p>
            <h1 className="text-2xl font-semibold text-black">{title}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_25px_70px_rgba(2,6,23,0.65)] backdrop-blur">
            <p className="text-lg font-medium text-black">{intro}</p>
            <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-black">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <div className="flex flex-col gap-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
