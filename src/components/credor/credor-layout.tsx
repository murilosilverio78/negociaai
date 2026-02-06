"use client";

import { usePathname } from "next/navigation";
import { CredorSidebar } from "./credor-sidebar";
import { CredorHeader } from "./credor-header";

const authPages = ["/credor/login", "/credor/registro"];

export function CredorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Auth pages don't get the sidebar layout
  if (authPages.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r bg-white">
        <CredorSidebar />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <CredorHeader />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
