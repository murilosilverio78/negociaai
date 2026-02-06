"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Handshake,
  Settings,
  BarChart3,
} from "lucide-react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/credor/dashboard" },
  { icon: FileText, label: "Dívidas", href: "/credor/dividas" },
  { icon: Upload, label: "Upload", href: "/credor/upload" },
  { icon: Handshake, label: "Acordos", href: "/credor/acordos" },
  { icon: Settings, label: "Configurações", href: "/credor/configuracoes" },
  { icon: BarChart3, label: "Relatórios", href: "/credor/relatorios" },
];

export function CredorSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/credor/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-primary">Negocia</span>
          <span>Aí</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
