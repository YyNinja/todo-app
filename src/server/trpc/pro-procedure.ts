import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./trpc";

export const proProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.userId },
    select: { billingStatus: true },
  });

  if (user?.billingStatus !== "pro") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Pro subscription required" });
  }

  return next({ ctx });
});
