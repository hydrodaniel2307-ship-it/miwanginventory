"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppBreadcrumb } from "./app-breadcrumb";
import { CommandPaletteButton } from "./command-palette-button";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <AppBreadcrumb />
      <div className="ml-auto flex items-center gap-1">
        <CommandPaletteButton />
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
