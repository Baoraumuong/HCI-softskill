import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Code Interview",
  description: "Free coding interview practice with real-time execution",
};

export default function CodeEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No <html> or <body> here — those belong only in app/layout.tsx.
  // This layout just adds metadata and passes children through.
  return <>{children}</>;
}