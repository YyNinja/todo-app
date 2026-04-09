import { z } from "zod";
import { router } from "../trpc/trpc";
import { proProcedure } from "../trpc/pro-procedure";
import {
  getDailyBriefing,
  breakdownTask,
  suggestDueDate,
  semanticSearchTodos,
  type DailyBriefing,
} from "@/lib/ai";
import { getCache, setCache } from "@/lib/redis";
import { TRPCError } from "@trpc/server";

export const aiRouter = router({
  getDailyBriefing: proProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `ai:briefing:${ctx.userId}:${today}`;

    const cached = await getCache<DailyBriefing>(cacheKey);
    if (cached) return cached;

    const todos = await ctx.db.todo.findMany({
      where: { userId: ctx.userId },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        completed: true,
        tags: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const briefing = await getDailyBriefing(todos);

    // Cache until midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);
    await setCache(cacheKey, briefing, ttl);

    return briefing;
  }),

  breakdownTask: proProcedure
    .input(z.object({ todoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const todo = await ctx.db.todo.findFirst({
        where: { id: input.todoId, userId: ctx.userId },
        select: { id: true, title: true, description: true },
      });
      if (!todo) throw new TRPCError({ code: "NOT_FOUND" });

      return breakdownTask(todo);
    }),

  createSubtasks: proProcedure
    .input(
      z.object({
        parentId: z.string(),
        titles: z.array(z.string().min(1)).min(1).max(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const parent = await ctx.db.todo.findFirst({
        where: { id: input.parentId, userId: ctx.userId },
        select: { id: true, priority: true, listId: true },
      });
      if (!parent) throw new TRPCError({ code: "NOT_FOUND" });

      const subtasks = await ctx.db.todo.createMany({
        data: input.titles.map((title) => ({
          title,
          userId: ctx.userId,
          parentId: input.parentId,
          priority: parent.priority,
          listId: parent.listId,
          aiSuggested: true,
        })),
      });

      return { count: subtasks.count };
    }),

  suggestDueDate: proProcedure
    .input(z.object({ todoId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const todo = await ctx.db.todo.findFirst({
        where: { id: input.todoId, userId: ctx.userId },
        select: { id: true, title: true, priority: true },
      });
      if (!todo) throw new TRPCError({ code: "NOT_FOUND" });

      const existingTodos = await ctx.db.todo.findMany({
        where: { userId: ctx.userId, completed: false },
        select: { title: true, dueDate: true, priority: true },
        take: 20,
      });

      return suggestDueDate(todo, existingTodos);
    }),

  semanticSearch: proProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const cacheKey = `ai:search:${ctx.userId}:${input.query}`;
      const cached = await getCache<string[]>(cacheKey);
      if (cached) return cached;

      const todos = await ctx.db.todo.findMany({
        where: { userId: ctx.userId, completed: false },
        select: { id: true, title: true, description: true, tags: true },
        take: 100,
      });

      const rankedIds = await semanticSearchTodos(input.query, todos);
      await setCache(cacheKey, rankedIds, 300);

      return rankedIds;
    }),
});
