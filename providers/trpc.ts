"use client";

// Re-export tRPC v11 hooks from the shared lib.
// Import from here OR from @/lib/trpc — same instance.
export { TRPCProvider, useTRPC, useTRPCClient } from "@/lib/trpc";
