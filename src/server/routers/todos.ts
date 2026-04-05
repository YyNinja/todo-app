import { z } from "zod";
import { protectedProcedure, router } from "../trpc/trpc";
import { parseTodoFromNaturalLanguage, prioritizeTodos } from "@/lib/ai";
import { invalidateCache, getCache, setCache } from "@/lib/redis";
import { TRPCError } from "@trpc/server";

const todoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).default([]),
  listId: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
});

export const todosRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        listId: z.string().optional(),
        completed: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const cacheKey = `todos:${ctx.userId}:${JSON.stringify(input)}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached;

      const todos = await ctx.db.todo.findMany({
        where: {
          userId: ctx.userId,
          ...(input.listId ? { listId: input.listId } : {}),
          ...(input.completed !== undefined
            ? { completed: input.completed }
            : {}),
          ...(input.cursor ? { id: { lt: input.cursor } } : {}),
        },
        take: input.limit + 1,
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        include: {
          comments: { take: 3, orderBy: { createdAt: "desc" } },
        },
      });

      const hasMore = todos.length > input.limit;
      const items = hasMore ? todos.slice(0, -1) : todos;
      const result = {
        items,
        nextCursor: hasMore ? items[items.length - 1].id : null,
      };

      await setCache(cacheKey, result, 60);
      return result;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const todo = await ctx.db.todo.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: { comments: { include: { user: true }, orderBy: { createdAt: "asc" } } },
      });
      if (!todo) throw new TRPCError({ code: "NOT_FOUND" });
      return todo;
    }),

  create: protectedProcedure
    .input(todoSchema)
    .mutation(async ({ ctx, input }) => {
      const todo = await ctx.db.todo.create({
        data: {
          ...input,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          userId: ctx.userId,
        },
      });
      await invalidateCache(`todos:${ctx.userId}:*`);
      return todo;
    }),

  createFromNaturalLanguage: protectedProcedure
    .input(z.object({ text: z.string().min(1), listId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const parsed = await parseTodoFromNaturalLanguage(input.text);
      const todo = await ctx.db.todo.create({
        data: {
          title: parsed.title,
          description: parsed.description ?? null,
          priority: parsed.priority,
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
          tags: parsed.tags,
          listId: input.listId ?? null,
          userId: ctx.userId,
          aiSuggested: true,
          aiContext: { originalInput: input.text },
        },
      });
      await invalidateCache(`todos:${ctx.userId}:*`);
      return todo;
    }),

  update: protectedProcedure
    .input(todoSchema.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.db.todo.findFirst({
        where: { id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const todo = await ctx.db.todo.update({
        where: { id },
        data: {
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate,
        },
      });
      await invalidateCache(`todos:${ctx.userId}:*`);
      return todo;
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.todo.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const todo = await ctx.db.todo.update({
        where: { id: input.id },
        data: { completed: input.completed },
      });
      await invalidateCache(`todos:${ctx.userId}:*`);
      return todo;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.todo.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db.todo.delete({ where: { id: input.id } });
      await invalidateCache(`todos:${ctx.userId}:*`);
      return { success: true };
    }),

  getTopThree: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = `todos:top3:${ctx.userId}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const todos = await ctx.db.todo.findMany({
      where: { userId: ctx.userId, completed: false },
      take: 20,
      orderBy: { createdAt: "desc" },
    });

    if (todos.length === 0) return [];

    const prioritized = await prioritizeTodos(todos);
    const top3Ids = prioritized
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((p) => p.todoId);

    const top3 = todos.filter((t) => top3Ids.includes(t.id));
    await setCache(cacheKey, top3, 300);
    return top3;
  }),
});
