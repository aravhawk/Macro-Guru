"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { AppSidebar } from "@/components/sidebar/sidebar";
import { Header } from "@/components/header";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsHydrated } from "@/hooks/use-hydrated";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const hydrated = useIsHydrated();

  if (hydrated && !isPending && !session) {
    router.push("/sign-in");
  }

  if (!hydrated || isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
