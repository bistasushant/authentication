import { cookies } from "next/headers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ClipSidebar } from "@/components/clip-sidebar";
import { ClipWorkspace } from "@/components/clip-workspace";
import { AuthModal } from "@/components/auth/auth-modal";
import { verifyToken } from "@/_server/_features/_auth/_jwt/jwt.service";
import { COOKIE_NAME } from "@/_server/_features/_auth/_constants/auth.constants";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  // Determine auth state server-side so the sidebar can render correctly
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;
  const isAuthenticated = !!payload;

  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <ClipSidebar isAuthenticated={isAuthenticated} />
      <SidebarInset className="min-h-svh">
        <ClipWorkspace isAuthenticated={isAuthenticated} />
      </SidebarInset>
      <AuthModal />
    </SidebarProvider>
  );
}
