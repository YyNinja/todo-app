import { z } from "zod";
import { protectedProcedure, router } from "../trpc/trpc";
import { TRPCError } from "@trpc/server";

export const commentsRouter = router({
  list: protectedProcedure
    .input(z.object({ todoId: z.string() }))
    .query(async ({ ctx, input }) => {
      const todo = await ctx.db.todo.findFirst({
        where: {
          id: input.todoId,
          OR: [
            { userId: ctx.userId },
            { list: { OR: [{ ownerId: ctx.userId }, { members: { some: { userId: ctx.userId } } }] } },
          ],
        },
      });
      if (!todo) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.comment.findMany({
        where: { todoId: input.todoId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        todoId: z.string(),
        content: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const todo = await ctx.db.todo.findFirst({
        where: {
          id: input.todoId,
          OR: [
            { userId: ctx.userId },
            { list: { OR: [{ ownerId: ctx.userId }, { members: { some: { userId: ctx.userId } } }] } },
          ],
        },
      });
      if (!todo) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.comment.create({
        data: {
          content: input.content,
          todoId: input.todoId,
          userId: ctx.userId,
        },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.comment.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!comment) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.comment.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
