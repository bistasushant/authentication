import { z } from "zod";

const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address")
  .transform((e) => e.toLowerCase().trim().slice(0, 254));

const otpCodeSchema = z
  .string()
  .length(6, "The code must be exactly 6 digits")
  .regex(/^\d{6}$/, "The code must contain only digits");

/** Step 1 — request an OTP (creates account automatically if needed) */
export const sendOtpSchema = z.object({
  email: emailSchema,
});

/** Step 2 — verify the OTP and complete authentication */
export const verifyOtpSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});

/** Google sign-in: frontend sends the ID token from the Google SDK */
export const googleSignInSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
