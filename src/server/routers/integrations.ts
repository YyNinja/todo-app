import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc/trpc";

export const integrationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: { billingStatus: true },
    });
    if (user?.billingStatus !== "pro") {
      return { integrations: [], isPro: false };
    }

    const integrations = await ctx.db.integration.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        provider: true,
        metadata: true,
        createdAt: true,
      },
    });

    return { integrations, isPro: true };
  }),

  disconnect: protectedProcedure
    .input(z.object({ provider: z.enum(["slack", "google_calendar"]) }))
    .mutation(async ({ ctx, input }) => {
      const integration = await ctx.db.integration.findUnique({
        where: { userId_provider: { userId: ctx.userId, provider: input.provider } },
      });
      if (!integration) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.integration.delete({
        where: { userId_provider: { userId: ctx.userId, provider: input.provider } },
      });

      return { success: true };
    }),

  updateSlackChannel: protectedProcedure
    .input(z.object({ channel: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
        select: { billingStatus: true },
      });
      if (user?.billingStatus !== "pro") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Pro plan required" });
      }

      const integration = await ctx.db.integration.findUnique({
        where: { userId_provider: { userId: ctx.userId, provider: "slack" } },
      });
      if (!integration) throw new TRPCError({ code: "NOT_FOUND", message: "Slack not connected" });

      const existingMeta = (integration.metadata as Record<string, unknown>) ?? {};
      await ctx.db.integration.update({
        where: { userId_provider: { userId: ctx.userId, provider: "slack" } },
        data: { metadata: { ...existingMeta, digestChannel: input.channel } },
      });

      return { success: true };
    }),
});
