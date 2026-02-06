"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CredorSidebar } from "./credor-sidebar";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";

export function CredorHeader() {
  const { credor, signOut } = useAuth();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push("/credor/login");
  }

  const initials = credor?.nome
    ? credor.nome
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "CR";

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-white px-4 lg:px-6">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <CredorSidebar onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-medium">
              {credor?.nome ?? "Credor"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
