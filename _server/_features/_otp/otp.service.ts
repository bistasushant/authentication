import { randomInt, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { OtpModel } from "./_schema/otp.schema";
import { OTP_ACTIONS } from "./_enum/otp-action.enum";

// ── Constants ────────────────────────────────────────────────────────────────

/** OTP validity window in minutes */
const OTP_EXPIRY_MINUTES = 5;

/** Maximum failed verification attempts before the OTP is locked */
const MAX_ATTEMPTS = 5;

/** Minimum seconds between resend requests */
const RESEND_COOLDOWN_SECONDS = 60;

/** bcrypt cost for hashing the OTP */
const OTP_HASH_ROUNDS = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateCode(): string {
  // Produces a zero-padded 6-digit string: "000000" – "999999"
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function getExpiresAt(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + OTP_EXPIRY_MINUTES);
  return d;
}

// ── Public API ───────────────────────────────────────────────────────────────

export type SendOtpResult = {
  /** Expiry timestamp returned to the client for UX countdown */
  expiresAt: Date;
  /**
   * Plain OTP — ALWAYS returned to the service layer so the caller can
   * send it via email. The router is responsible for NEVER including this
   * in the API response when APP_ENV=production.
   */
  plainOtp: string;
  /**
   * Convenience alias — same as plainOtp when APP_ENV=local.
   * Undefined in production so the router can detect the env without
   * re-reading process.env.
   */
  devOtp?: string;
};

/**
 * Generate a new OTP for the given email + action.
 *
 * - Enforces resend cooldown (60 s).
 * - Replaces any existing OTP atomically.
 * - Hashes the code before storage.
 * - In local mode: returns the plain code for dev use only.
 * - In production mode: never returns the plain code.
 */
export async function sendOtp({
  email,
  action,
}: {
  email: string;
  action: OTP_ACTIONS;
}): Promise<SendOtpResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Enforce resend cooldown: check for a recent OTP
  const existing = await OtpModel.findOne({
    email: normalizedEmail,
    action,
  }).lean();

  if (existing?.lastSentAt) {
    const secondsSinceSent =
      (Date.now() - new Date(existing.lastSentAt).getTime()) / 1000;
    if (secondsSinceSent < RESEND_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceSent);
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Please wait ${remaining} seconds before requesting a new code.`,
      });
    }
  }

  // Generate new code and hash it
  const plainOtp = generateCode();
  const codeHash = await bcrypt.hash(plainOtp, OTP_HASH_ROUNDS);
  const expiresAt = getExpiresAt();
  const now = new Date();

  // Atomically replace any existing OTP for this email+action
  await OtpModel.findOneAndReplace(
    { email: normalizedEmail, action },
    {
      email: normalizedEmail,
      action,
      codeHash,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      createdAt: now,
      updatedAt: now,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const appEnv = process.env.APP_ENV;

  // Safety: never expose devOtp alias in production
  if (appEnv === "production") {
    return { expiresAt, plainOtp };
  }

  // Local development: expose devOtp alias and log
  if (appEnv === "local") {
    console.log(`[DEV OTP] ${normalizedEmail} → ${plainOtp}`);
    return { expiresAt, plainOtp, devOtp: plainOtp };
  }

  // Unknown APP_ENV — treat as production (fail safe)
  return { expiresAt, plainOtp };
}

export type VerifyOtpResult = {
  success: true;
};

/**
 * Verify a submitted OTP code.
 *
 * - Validates expiry (belt-and-suspenders beyond TTL index).
 * - Atomically increments the attempt counter.
 * - Locks after MAX_ATTEMPTS failed tries.
 * - Deletes the record on success to prevent reuse.
 * - Uses constant-time comparison via bcrypt to resist timing attacks.
 */
export async function verifyOtp({
  email,
  code,
  action,
}: {
  email: string;
  code: string;
  action: OTP_ACTIONS;
}): Promise<VerifyOtpResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find the OTP record (do not delete yet — atomic ops follow)
  const record = await OtpModel.findOne({
    email: normalizedEmail,
    action,
  });

  if (!record) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired code. Please request a new one.",
    });
  }

  // Belt-and-suspenders expiry check (TTL index may have a short lag)
  if (new Date(record.expiresAt) < new Date()) {
    await OtpModel.deleteOne({ _id: record._id });
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "This code has expired. Please request a new one.",
    });
  }

  // Enforce attempt limit
  if (record.attempts >= MAX_ATTEMPTS) {
    await OtpModel.deleteOne({ _id: record._id });
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many incorrect attempts. Please request a new code.",
    });
  }

  // Constant-time hash comparison (bcrypt is inherently timing-safe)
  const isValid = await bcrypt.compare(code, record.codeHash);

  if (!isValid) {
    // Atomically increment attempts; delete if limit reached
    const updated = await OtpModel.findOneAndUpdate(
      { _id: record._id },
      { $inc: { attempts: 1 } },
      { new: true }
    );
    if (updated && updated.attempts >= MAX_ATTEMPTS) {
      await OtpModel.deleteOne({ _id: record._id });
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Incorrect code. Please try again.",
    });
  }

  // Success — delete the OTP to prevent reuse
  await OtpModel.deleteOne({ _id: record._id });

  return { success: true };
}
