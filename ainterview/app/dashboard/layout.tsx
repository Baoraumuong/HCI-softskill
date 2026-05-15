import Sidebar from "@/app/dashboard/components/Sidebar"; 

export default function ConfigureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#f7f7f5] font-sans text-gray-900 antialiased">
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-8 md:px-12 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}