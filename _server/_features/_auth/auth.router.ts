import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "@/_server/_trpc/trpc";
import { AuthService } from "./auth.service";
import { verifyGoogleIdToken } from "./_google/google-oauth.service";
import {
  sendOtpSchema,
  verifyOtpSchema,
  googleSignInSchema,
} from "./_validation/auth.validation";
import {
  COOKIE_NAME,
  COOKIE_MAX_AGE,
} from "./_constants/auth.constants";

export const authRouter = router({
  /**
   * POST auth.sendOtp
   *
   * Generates an OTP for the email. Creates the account automatically on
   * first verification — no separate sign-up flow.
   *
   * APP_ENV=local      → devOtp returned in response (shown as toast).
   * APP_ENV=production → OTP sent via SMTP, never in response.
   */
  sendOtp: publicProcedure
    .input(sendOtpSchema)
    .mutation(async ({ input }) => {
      const result = await AuthService.sendOtp(input);
      const appEnv = process.env.APP_ENV;

      if (appEnv === "production") {
        try {
          const { sendOtpEmail } = await import(
            "@/_server/_features/_send-mail/send-mail.service"
          );
          await sendOtpEmail({
            to: input.email,
            name: input.email.split("@")[0] ?? "there",
            otp: result.plainOtp,
            action: "signin",
          });
        } catch (err) {
          console.error("[auth.sendOtp] Email delivery failed:", err);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "We couldn't send your verification email. Please try again.",
          });
        }

        return {
          success: true as const,
          message: "Verification code sent. Check your email.",
          expiresAt: result.expiresAt,
        };
      }

      // Local dev — return OTP directly
      return {
        success: true as const,
        message: "OTP generated (local dev).",
        expiresAt: result.expiresAt,
        devOtp: result.plainOtp,
      };
    }),

  /**
   * POST auth.verifyOtp
   * Verifies the OTP and issues a session cookie.
   */
  verifyOtp: publicProcedure
    .input(verifyOtpSchema)
    .mutation(async ({ input, ctx }) => {
      const { token, user } = await AuthService.verifyOtp(input);
      ctx.setCookie(COOKIE_NAME, token, COOKIE_MAX_AGE);
      return { success: true as const, user };
    }),

  /**
   * POST auth.googleSignIn
   * Verifies a Google ID token server-side and issues a session cookie.
   */
  googleSignIn: publicProcedure
    .input(googleSignInSchema)
    .mutation(async ({ input, ctx }) => {
      let googleUser;
      try {
        googleUser = await verifyGoogleIdToken(input.idToken);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Google authentication failed. Please try again.";
        throw new TRPCError({ code: "UNAUTHORIZED", message });
      }

      const { token, user } = await AuthService.googleAuth(googleUser);
      ctx.setCookie(COOKIE_NAME, token, COOKIE_MAX_AGE);
      return { success: true as const, user };
    }),

  /** GET auth.getSession — returns the current user or null */
  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return AuthService.me(ctx.user.id);
  }),

  /** POST auth.logout — clears the session cookie */
  logout: protectedProcedure.mutation(({ ctx }) => {
    ctx.deleteCookie(COOKIE_NAME);
    return { success: true as const };
  }),
});
