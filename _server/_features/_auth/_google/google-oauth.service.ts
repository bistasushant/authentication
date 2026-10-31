/**
 * Google OAuth — ID token verification flow.
 *
 * The frontend obtains a Google ID token via the Google Identity Services
 * (GIS) SDK or google-one-tap, then sends it to our backend. We verify
 * the token server-side against Google's public keys — we never trust
 * user data from the client directly.
 *
 * Flow:
 *   1. Frontend calls Google SDK → gets idToken
 *   2. Frontend calls auth.googleSignIn tRPC mutation with { idToken }
 *   3. This service verifies the token against Google's tokeninfo endpoint
 *   4. Extracts verified user data
 *   5. AuthService.googleAuth() finds or creates the user
 *   6. JWT session is issued
 */

type GoogleTokenInfo = {
  /** Google user ID */
  sub: string;
  email: string;
  email_verified: string; // "true" | "false"
  name: string;
  picture?: string;
  /** Audience — must match our client ID */
  aud: string;
};

export type VerifiedGoogleUser = {
  googleId: string;
  email: string;
  name: string;
  image?: string;
};

/**
 * Verify a Google ID token using Google's tokeninfo endpoint.
 *
 * This is the simplest secure approach that doesn't require an additional
 * library — we hit Google's endpoint and validate the `aud` claim ourselves.
 *
 * For high-throughput production use, consider using google-auth-library
 * which verifies tokens locally using cached public keys.
 */
export async function verifyGoogleIdToken(
  idToken: string
): Promise<VerifiedGoogleUser> {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured");
  }

  // Verify the token with Google's tokeninfo endpoint
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[Google OAuth] Token verification failed:", body);
    throw new Error("Google token verification failed. Please try again.");
  }

  const info: GoogleTokenInfo = await response.json();

  // Validate the audience to prevent token injection from other apps
  if (info.aud !== clientId) {
    throw new Error("Google token audience mismatch. Possible token injection.");
  }

  // Validate email is verified by Google
  if (info.email_verified !== "true") {
    throw new Error(
      "Google account email is not verified. Please verify your Google account."
    );
  }

  if (!info.sub || !info.email) {
    throw new Error("Google token is missing required user information.");
  }

  return {
    googleId: info.sub,
    email: info.email.toLowerCase().trim(),
    name: info.name ?? info.email.split("@")[0] ?? "User",
    image: info.picture,
  };
}
