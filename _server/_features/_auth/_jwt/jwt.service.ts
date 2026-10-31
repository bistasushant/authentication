import { SignJWT, jwtVerify } from "jose";
import { UserRole } from "@/_server/_features/_user/_enum/user-role.enum";

// Encode lazily — process.env is populated by the time these functions are
// called, but may be undefined at module evaluation during the build phase.
function getEncodedSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing in environment variables.");
  }
  return new TextEncoder().encode(secret);
}

export type JwtPayload = {
  id: string;
  email: string;
  role: UserRole;
};

/** Sign a JWT that expires in 7 days */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setSubject(payload.id)
    .setExpirationTime("7d")
    .sign(getEncodedSecret());
}

/** Verify a JWT and return the payload, or null if invalid/expired */
export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedSecret(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
