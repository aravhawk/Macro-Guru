"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border/50 bg-background/80 backdrop-blur-sm px-4">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
    </header>
  );
}
