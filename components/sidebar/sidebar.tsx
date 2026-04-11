"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { signOut, useSession } from "@/lib/auth/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, LogOut, MessageSquare } from "lucide-react";

interface Thread {
  id: string;
  title: string;
  updatedAt: string;
}

export function AppSidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const currentThreadId = params?.threadId as string | undefined;
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    async function loadThreads() {
      try {
        const res = await fetch("/api/threads");
        if (res.ok) {
          const data = await res.json();
          setThreads(data);
        }
      } catch {
        // silently fail
      }
    }
    loadThreads();
    // Refresh threads on window focus
    window.addEventListener("focus", loadThreads);
    return () => window.removeEventListener("focus", loadThreads);
  }, []);

  async function handleNewChat() {
    try {
      const res = await fetch("/api/threads", { method: "POST" });
      if (res.ok) {
        const thread = await res.json();
        router.push(`/${thread.id}`);
      }
    } catch {
      // silently fail
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : session?.user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-heading font-bold text-foreground">
            Macro Guru
          </h1>
          <Button
            onClick={handleNewChat}
            size="icon"
            variant="outline"
            className="h-8 w-8 border-border/50 hover:bg-emerald/10 hover:text-emerald hover:border-emerald/30"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Conversations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {threads.length === 0 && (
                <li className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No conversations yet
                </li>
              )}
              {threads.map((thread) => (
                <SidebarMenuItem key={thread.id}>
                  <SidebarMenuButton
                    isActive={currentThreadId === thread.id}
                    className="hover:bg-emerald/10 hover:text-emerald data-[active=true]:bg-emerald/15 data-[active=true]:text-emerald"
                    onClick={() => router.push(`/${thread.id}`)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="truncate">{thread.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        {session?.user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-emerald/20 text-emerald text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">
                {session.user.name ?? "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session.user.email}
              </p>
            </div>
            <Button
              onClick={handleSignOut}
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
