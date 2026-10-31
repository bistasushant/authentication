import mongoose, { InferSchemaType, model, models, Schema } from "mongoose";
import { UserRole } from "../_enum/user-role.enum";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    image: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: ["EMAIL", "GOOGLE"],
      required: true,
      default: "EMAIL",
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index to prevent duplicate emails per provider
UserSchema.index({ email: 1, provider: 1 });

export type UserType = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserModel =
  (models.User as mongoose.Model<UserType>) ||
  model<UserType>("User", UserSchema);
