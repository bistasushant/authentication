import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/_server/_app";
import superjson from "superjson";

function getBaseUrl() {
  // Production: use the server-side host env var
  if (process.env.SERVER_SIDE_TRPC_HOST) return process.env.SERVER_SIDE_TRPC_HOST;
  // Vercel deployment
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  // Custom production URL
  if (process.env.NEXT_PUBLIC_WEBSITE_URL) return process.env.NEXT_PUBLIC_WEBSITE_URL;
  // Local dev
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const trpcServerClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});