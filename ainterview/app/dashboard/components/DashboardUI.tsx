import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-8">
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.09em] text-red-800">
        {eyebrow}
      </p>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-gray-900">
        {title}
      </h1>
      <p className="text-[13px] text-gray-500">{subtitle}</p>
    </header>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.09em] text-gray-400">
      {children}
    </p>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="mb-0.5 text-[13px] font-semibold text-gray-900">{title}</h2>
      <p className="text-[11.5px] text-gray-500">{subtitle}</p>
    </div>
  );
}
