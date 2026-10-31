import { TRPCError } from "@trpc/server";
import { db } from "@/_server/_utils/db-connect";
import { UserModel } from "@/_server/_features/_user/_schema/user.schema";
import { UserRole } from "@/_server/_features/_user/_enum/user-role.enum";
import { signToken } from "@/_server/_features/_auth/_jwt/jwt.service";
import type { SendOtpInput, VerifyOtpInput } from "./_validation/auth.validation";
import { sendOtp as generateAndStoreOtp } from "@/_server/_features/_otp/otp.service";
import { OTP_ACTIONS } from "@/_server/_features/_otp/_enum/otp-action.enum";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
};

type AuthResult = {
  token: string;
  user: SessionUser;
};

function toSessionUser(user: {
  _id: unknown;
  name: string;
  email: string;
  image?: string | null;
  role: string;
}): SessionUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    role: user.role as UserRole,
  };
}

export const AuthService = {
  /**
   * Step 1 — Generate and store an OTP for the given email.
   * No distinction between sign-in and sign-up — the account is created
   * automatically on first OTP verification if it doesn't exist yet.
   */
  async sendOtp(input: SendOtpInput) {
    await db();
    return generateAndStoreOtp({
      email: input.email,
      action: OTP_ACTIONS.LOGIN,
    });
  },

  /**
   * Step 2 — Verify the OTP then find or create the user.
   * If the account doesn't exist it is created here — no separate sign-up step.
   */
  async verifyOtp(input: VerifyOtpInput): Promise<AuthResult> {
    await db();

    const { verifyOtp: verifyOtpCode } = await import(
      "@/_server/_features/_otp/otp.service"
    );

    await verifyOtpCode({
      email: input.email,
      code: input.code,
      action: OTP_ACTIONS.LOGIN,
    });

    // Find or create — OTP proves ownership of the email either way
    let user = await UserModel.findOne({ email: input.email });

    if (!user) {
      user = await UserModel.create({
        name: input.email.split("@")[0] ?? "User",
        email: input.email,
        provider: "EMAIL",
        emailVerified: true,
        role: UserRole.USER,
      });
    } else if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    const token = await signToken({
      id: String(user._id),
      email: user.email,
      role: user.role as UserRole,
    });

    return { token, user: toSessionUser(user) };
  },

  /**
   * Google sign-in — always find or create, no mode needed.
   */
  async googleAuth(googleUser: {
    googleId: string;
    email: string;
    name: string;
    image?: string;
  }): Promise<AuthResult> {
    await db();

    let user = await UserModel.findOne({ googleId: googleUser.googleId });

    if (!user) {
      const emailUser = await UserModel.findOne({ email: googleUser.email });

      if (emailUser) {
        emailUser.googleId = googleUser.googleId;
        emailUser.emailVerified = true;
        if (googleUser.image && !emailUser.image) {
          emailUser.image = googleUser.image;
        }
        await emailUser.save();
        user = emailUser;
      } else {
        user = await UserModel.create({
          name: googleUser.name,
          email: googleUser.email,
          image: googleUser.image ?? null,
          provider: "GOOGLE",
          googleId: googleUser.googleId,
          emailVerified: true,
          role: UserRole.USER,
        });
      }
    }

    const token = await signToken({
      id: String(user._id),
      email: user.email,
      role: user.role as UserRole,
    });

    return { token, user: toSessionUser(user) };
  },

  async me(userId: string): Promise<SessionUser> {
    await db();
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Session expired. Please sign in again.",
      });
    }
    return toSessionUser(user);
  },
};
