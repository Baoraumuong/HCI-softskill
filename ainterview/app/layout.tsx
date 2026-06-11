import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AInterview",
  description: "AI-powered mock interviews for technical and behavioral practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
