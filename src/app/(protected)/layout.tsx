import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { AppHeader } from "@/components/app-shell/app-header";
import { CommandPalette } from "@/components/command-palette";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const defaultOpen =
    cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar user={session} />
      <SidebarInset>
        <AppHeader />
        <div className="flex-1 px-4 py-6 md:px-6">{children}</div>
      </SidebarInset>
      <CommandPalette />
    </SidebarProvider>
  );
}
