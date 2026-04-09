import { z } from "zod";
import { protectedProcedure, router } from "../trpc/trpc";
import { TRPCError } from "@trpc/server";
import { FREE_TIER_LIST_LIMIT, isPro } from "@/lib/billing";

export const listsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.list.findMany({
      where: {
        OR: [
          { ownerId: ctx.userId },
          { members: { some: { userId: ctx.userId } } },
        ],
      },
      include: {
        _count: { select: { todos: true } },
        members: { include: { user: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
        select: { billingStatus: true },
      });
      if (user && !isPro(user)) {
        const count = await ctx.db.list.count({ where: { ownerId: ctx.userId } });
        if (count >= FREE_TIER_LIST_LIMIT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "FREE_TIER_LIMIT_REACHED",
          });
        }
      }
      return ctx.db.list.create({
        data: {
          ...input,
          ownerId: ctx.userId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const list = await ctx.db.list.findFirst({
        where: { id, ownerId: ctx.userId },
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.list.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.db.list.findFirst({
        where: { id: input.id, ownerId: ctx.userId },
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.list.delete({ where: { id: input.id } });
      return { success: true };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const list = await ctx.db.list.findFirst({
        where: {
          id: input.id,
          OR: [
            { ownerId: ctx.userId },
            { members: { some: { userId: ctx.userId } } },
          ],
        },
        include: {
          owner: { select: { id: true, name: true, email: true, image: true } },
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
          _count: { select: { todos: true } },
        },
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND" });
      return list;
    }),

  removeMember: protectedProcedure
    .input(z.object({ listId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.db.list.findFirst({
        where: { id: input.listId, ownerId: ctx.userId },
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.listMember.deleteMany({
        where: { listId: input.listId, userId: input.userId },
      });
      return { success: true };
    }),

  leave: protectedProcedure
    .input(z.object({ listId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.listMember.deleteMany({
        where: { listId: input.listId, userId: ctx.userId },
      });
      return { success: true };
    }),

  invite: protectedProcedure
    .input(
      z.object({
        listId: z.string(),
        email: z.string().email(),
        role: z.enum(["member", "viewer"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const list = await ctx.db.list.findFirst({
        where: { id: input.listId, ownerId: ctx.userId },
      });
      if (!list) throw new TRPCError({ code: "NOT_FOUND" });

      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      return ctx.db.listMember.upsert({
        where: { listId_userId: { listId: input.listId, userId: user.id } },
        create: { listId: input.listId, userId: user.id, role: input.role },
        update: { role: input.role },
      });
    }),
});
