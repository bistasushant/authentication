import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest, NextResponse } from "next/server";
import { appRouter } from "@/_server/_app";
import { createContext } from "@/_server/_trpc/router/context";
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "@/_server/_features/_auth/_constants/auth.constants";

/**
 * tRPC HTTP handler — handles both GET (queries) and POST (mutations).
 *
 * Cookie management:
 * We collect Set-Cookie / Delete-Cookie instructions during the tRPC
 * execution via the context callbacks, then apply them to the outgoing
 * NextResponse after the handler resolves.
 */
async function handler(req: NextRequest) {
  const cookiesToSet: Array<{ name: string; value: string; maxAge: number }> =
    [];
  const cookiesToDelete: string[] = [];

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createContext({
        req,
        setCookie: (name, value, maxAge) => {
          cookiesToSet.push({ name, value, maxAge });
        },
        deleteCookie: (name) => {
          cookiesToDelete.push(name);
        },
      }),
    onError({ path, error }) {
      // Only log unexpected server errors; auth/validation errors are normal
      if (error.code === "INTERNAL_SERVER_ERROR") {
        console.error(`[tRPC] Error on ${path ?? "unknown"}:`, error);
      }
    },
  });

  // If no cookies need to be written, return the response as-is
  if (cookiesToSet.length === 0 && cookiesToDelete.length === 0) {
    return response;
  }

  // Clone and mutate the response to apply cookies
  const mutated = new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });

  for (const { name, value, maxAge } of cookiesToSet) {
    mutated.cookies.set({
      name,
      value,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge,
      secure: process.env.NODE_ENV === "production",
    });
  }

  for (const name of cookiesToDelete) {
    mutated.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      secure: process.env.NODE_ENV === "production",
    });
  }

  return mutated;
}

export { handler as GET, handler as POST };
