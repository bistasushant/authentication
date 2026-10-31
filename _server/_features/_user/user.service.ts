import { TRPCError } from "@trpc/server";
import { db } from "@/_server/_utils/db-connect";
import { UserModel } from "./_schema/user.schema";
import type { SessionUser } from "@/_server/_features/_auth/auth.service";

export const UserService = {
  async getById(id: string): Promise<SessionUser> {
    await db();
    const user = await UserModel.findById(id).lean();
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    }
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      role: user.role,
    };
  },
};
