// app/configure/layout.tsx
import Sidebar from "@/components/Sidebar";

export default function ConfigureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex w-full">
      {/* Sidebar on the left */}
      <Sidebar />

      {/* Main content on the right */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold text-slate-900">
              Setup Your Interview
            </h1>
            <p className="text-slate-500 mt-2">
              Customize the AI agent to match your career goals.
            </p>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}