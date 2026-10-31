import { router, protectedProcedure } from "@/_server/_trpc/trpc";
import { UserService } from "./user.service";

export const userRouter = router({
  /** GET — current authenticated user's profile */
  me: protectedProcedure.query(async ({ ctx }) => {
    return UserService.getById(ctx.user.id);
  }),
});
