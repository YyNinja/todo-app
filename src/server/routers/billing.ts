import { protectedProcedure, router } from "../trpc/trpc";

export const billingRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: {
        billingStatus: true,
        stripeCurrentPeriodEnd: true,
      },
    });
    return {
      billingStatus: user?.billingStatus ?? "free",
      stripeCurrentPeriodEnd: user?.stripeCurrentPeriodEnd ?? null,
    };
  }),
});
