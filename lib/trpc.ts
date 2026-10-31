"use client";

import { createTRPCContext } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@/_server/_app";

/**
 * tRPC v11 context-based client.
 *
 * - TRPCProvider: wrap your app (replaces the old api.Provider)
 * - useTRPC: hook that returns the typed proxy (replaces api.xxx)
 * - useTRPCClient: hook that returns the raw TRPCClient
 */
export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>();
