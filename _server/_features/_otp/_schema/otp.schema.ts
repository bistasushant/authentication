import mongoose, { InferSchemaType, model, models, Schema } from "mongoose";
import { OTP_ACTIONS } from "../_enum/otp-action.enum";

const OtpSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(OTP_ACTIONS),
      required: true,
    },
    /** bcrypt hash of the 6-digit code — never store plain OTP */
    codeHash: {
      type: String,
      required: true,
    },
    /** Hard expiry — also backed by TTL index for automatic cleanup */
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL: auto-delete after expiresAt
    },
    /** Number of failed verification attempts for this OTP */
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    /** Tracks the last time an OTP was sent to enforce resend cooldown */
    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index: one active OTP per email+action at a time
OtpSchema.index({ email: 1, action: 1 });

export type OtpType = InferSchemaType<typeof OtpSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const OtpModel =
  (models.Otp as mongoose.Model<OtpType>) || model<OtpType>("Otp", OtpSchema);
