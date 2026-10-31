import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import ReactQueryProvider from "@/providers/react-query-providers";
import { verifyToken } from "@/_server/_features/_auth/_jwt/jwt.service";
import { COOKIE_NAME } from "@/_server/_features/_auth/_constants/auth.constants";
import type { SessionUser } from "@/_state/user.state";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// This layout reads the session cookie on every request — it must never be
// statically prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clipper — Turn Long Videos Into Short Clips",
  description:
    "AI-powered video clipping platform. Paste a video URL and transform long-form content into engaging short videos for Instagram Reels, YouTube Shorts, and TikTok.",
};

async function getInitialUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    if (!payload) return null;
    return {
      id: payload.id,
      name: payload.id,
      email: payload.email,
      image: null,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getInitialUser();

  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <head>
        {/* Google Identity Services SDK — loaded once for the whole app */}
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextTopLoader
          color="#000000"
          height={2}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        <ReactQueryProvider initialUser={initialUser}>
          {children}
        </ReactQueryProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
      </body>
    </html>
  );
}
