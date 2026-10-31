"use client";

import React, { useState, useRef } from "react";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import { TRPCProvider } from "./trpc";
import { toast } from "sonner";
import { SessionProvider } from "./session-provider";
import { useUserState, type SessionUser } from "@/_state/user.state";
import type { AppRouter } from "@/_server/_app";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.SERVER_SIDE_TRPC_HOST) return process.env.SERVER_SIDE_TRPC_HOST;
  if (process.env.NEXT_PUBLIC_WEBSITE_URL) return process.env.NEXT_PUBLIC_WEBSITE_URL;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

function errorCode(error: unknown): string | undefined {
  return error instanceof TRPCClientError ? error.data?.code : undefined;
}

function toastError(error: unknown) {
  const message =
    error instanceof TRPCClientError ? error.message : "Something went wrong";
  toast.error(message);
}

function onQueryError(error: unknown) {
  const code = errorCode(error);
  if (code === "UNAUTHORIZED" || code === "FORBIDDEN") return;
  toastError(error);
}

function onMutationError(error: unknown) {
  if (errorCode(error) === "UNAUTHORIZED") return;
  toastError(error);
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: onQueryError }),
    mutationCache: new MutationCache({ onError: onMutationError }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof TRPCClientError) {
            const code = error.data?.code;
            if (code === "UNAUTHORIZED" || code === "FORBIDDEN") return false;
          }
          return failureCount < 2;
        },
        refetchOnMount: true,
        refetchOnReconnect: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
      },
      mutations: { retry: false },
    },
  });
}

// Singleton QueryClient on the browser — avoids re-creating on every render
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export default function ReactQueryProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionUser | null;
}) {
  const queryClient = getQueryClient();

  // Seed Zustand with the server-resolved user before any child renders.
  // useRef guards against re-seeding on subsequent renders.
  const seeded = useRef(false);
  if (!seeded.current) {
    seeded.current = true;
    useUserState.setState({ user: initialUser });
  }

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider initialUser={initialUser}>{children}</SessionProvider>
      </QueryClientProvider>
    </TRPCProvider>
  );
}
