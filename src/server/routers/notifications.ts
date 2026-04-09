import { z } from "zod";
import { protectedProcedure, router } from "../trpc/trpc";

export const notificationsRouter = router({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: { emailDigest: true, emailReminders: true },
    });
    return {
      emailDigest: user?.emailDigest ?? true,
      emailReminders: user?.emailReminders ?? true,
    };
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailDigest: z.boolean().optional(),
        emailReminders: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.userId },
        data: input,
      });
      return { ok: true };
    }),
});
