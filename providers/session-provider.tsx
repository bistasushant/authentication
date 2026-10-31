"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc";
import { useUserState, type SessionUser } from "@/_state/user.state";

type SessionContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}

export function SessionProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: SessionUser | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const { user, setUser, clearUser } = useUserState();

  // Hydrate Zustand from server-provided initialUser on first render
  React.useEffect(() => {
    if (initialUser && !user) {
      setUser(initialUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoutMutation = useMutation(
    trpc.auth.logout.mutationOptions()
  );

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Session cookie is cleared server-side regardless
    } finally {
      clearUser();
      queryClient.clear();
      router.push("/login");
      router.refresh();
    }
  }, [logoutMutation, clearUser, queryClient, router]);

  return (
    <SessionContext.Provider
      value={{ user: user ?? initialUser, isLoading: false, logout }}
    >
      {children}
    </SessionContext.Provider>
  );
}
