import Sidebar from "@/components/Sidebar";
export default function ConfigureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">

      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <h1 className="text-3xl font-bold">Setup Your Interview</h1>
          <p className="text-slate-500">
            Customize the AI agent to match your career goals.
          </p>
        </header>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}