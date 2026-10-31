import { router } from "./_trpc/trpc";
import { authRouter } from "./_features/_auth/auth.router";
import { userRouter } from "./_features/_user/user.router";

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
