import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { verifyToken } from "@/_server/_features/_auth/_jwt/jwt.service";
import { COOKIE_NAME } from "@/_server/_features/_auth/_constants/auth.constants";
import { AuthForm } from "@/components/auth/auth-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In — Clipper",
};

export default async function LoginPage() {
  // Already authenticated → go straight to workspace
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) redirect("/");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <AuthForm />
    </div>
  );
}
