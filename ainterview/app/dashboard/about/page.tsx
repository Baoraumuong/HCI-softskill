import React from "react";
import { 
  Target, 
  BrainCircuit,
  Sparkles, 
  Mail 
} from "lucide-react";

/* Static Data */
const CORE_FEATURES = [
  { id: "ai", name: "AI-Powered Feedback", description: "Get insights on your answes.", icon: BrainCircuit },
  { id: "realistic", name: "Realistic Environments", description: "Simulated high-pressure scenarios to build actual confidence.", icon: Target }
] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold tracking-[0.09em] uppercase text-gray-400 mb-3">{children}</p>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm ${className}`}>{children}</div>;
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[13px] font-semibold text-gray-900 mb-0.5">{title}</h2>
      <p className="text-[11.5px] text-gray-500">{subtitle}</p>
    </div>
  );
}

/* Page*/
export default function AboutPage() {
  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8">
        <p className="text-[10.5px] font-bold tracking-[0.09em] uppercase text-red-800 mb-1.5">About Platform</p>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mb-1">Empowering your career journey</h1>
        <p className="text-[13px] text-gray-500">Learn more about my project.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader 
              title="My Mission" 
              subtitle="Why I built this platform" 
            />
            <div className="text-[13px] leading-relaxed text-gray-600 space-y-4">
              <p>
                Hi!
              </p>
              <p>
                LEarninG ReaCt by creating a platform offering Realistic mock interviews leveraged with AI.
              </p>
            </div>
          </Card>

          {/* Core Features */}
          <Card>
            <CardHeader 
              title="Core Technology" 
              subtitle="INSANE" 
            />
            <div className="flex flex-col gap-2">
              {CORE_FEATURES.map((feature) => (
                <div key={feature.id} 
                  className="flex items-center gap-3 w-full p-3 rounded-lg border border-gray-200 bg-gray-50/50">
                  <div className="flex items-center justify-center w-9 h-9 rounded-md bg-white border border-gray-200 text-gray-700 shadow-sm shrink-0">
                    <feature.icon size={18} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-gray-900 mb-0.5">{feature.name}</p>
                    <p className="text-[11.5px] text-gray-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          
          {/* Platform Info */}
          <Card>
            <div className="flex items-center justify-between mb-3.5">
              <SectionLabel>Platform Info</SectionLabel>
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
                v0.0.0
              </span>
            </div>
            <div className="flex flex-col divide-y divide-gray-100">
              {[
                { label: "Status", value: "Perfect", active: true },
                { label: "Models", value: "Gemini 2.5-flash" },
                { label: "Progress", value: "70%" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center py-2 first:pt-0 last:pb-0">
                  <span className="text-xs text-gray-500">{row.label}</span>
                  <span className={`text-xs font-medium ${row.active ? "text-green-600" : "text-gray-900"}`}>
                    {row.active && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 mb-[1px]" />}
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Connect */}
          <Card>
            <SectionLabel>Connect</SectionLabel>
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {[
                { icon: Mail, text: "Contact via facebook", href: "https://www.facebook.com/inhgiabao.287766" }
              ].map((link, i) => (
                <li key={i}>
                  <a href={link.href} className="flex items-center gap-2.5 text-xs text-gray-600 hover:text-gray-900 transition-colors py-1">
                    <link.icon size={14} className="text-gray-400" />
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </Card>

        </div>
      </div>
    </div>
  );
}