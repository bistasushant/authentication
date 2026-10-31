import { type NextRequest } from "next/server";
import { verifyToken, type JwtPayload } from "@/_server/_features/_auth/_jwt/jwt.service";
import { COOKIE_NAME } from "@/_server/_features/_auth/_constants/auth.constants";

export type CookieSetter = (name: string, value: string, maxAge: number) => void;
export type CookieDeleter = (name: string) => void;

export type Context = {
  req: NextRequest;
  user: JwtPayload | null;
  /** Queue a Set-Cookie header on the response */
  setCookie: CookieSetter;
  /** Queue a cookie deletion on the response */
  deleteCookie: CookieDeleter;
};

export async function createContext({
  req,
  setCookie = () => {},
  deleteCookie = () => {},
}: {
  req: NextRequest;
  setCookie?: CookieSetter;
  deleteCookie?: CookieDeleter;
}): Promise<Context> {
  const token = req.cookies.get(COOKIE_NAME)?.value ?? null;
  // verifyToken is async with jose — await it
  const user = token ? await verifyToken(token) : null;
  return { req, user, setCookie, deleteCookie };
}
