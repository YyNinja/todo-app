import { z } from "zod";
import { protectedProcedure, router } from "../trpc/trpc";
import { proProcedure } from "../trpc/pro-procedure";
import { getCache, setCache } from "@/lib/redis";

// Helper: get start-of-day in UTC
function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

// Helper: ISO date string YYYY-MM-DD
function isoDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Helper: start of the current week (Monday)
function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export const analyticsRouter = router({
  // ── Personal Stats ─────────────────────────────────────────────────────────
  getPersonalStats: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = `analytics:personal:${ctx.userId}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached as Awaited<ReturnType<typeof computePersonalStats>>;
    const result = await computePersonalStats(ctx.userId, ctx.db);
    await setCache(cacheKey, result, 3600); // 1h TTL
    return result;
  }),

  // ── Latest AI Insight ──────────────────────────────────────────────────────
  getLatestInsight: protectedProcedure.query(async ({ ctx }) => {
    const insight = await ctx.db.userInsight.findFirst({
      where: { userId: ctx.userId },
      orderBy: { weekStart: "desc" },
    });
    return insight ?? null;
  }),

  // ── Team Stats (Pro) ───────────────────────────────────────────────────────
  getTeamStats: proProcedure
    .input(z.object({ listId: z.string() }))
    .query(async ({ ctx, input }) => {
      const cacheKey = `analytics:team:${input.listId}`;
      const cached = await getCache(cacheKey);
      if (cached) return cached as Awaited<ReturnType<typeof computeTeamStats>>;

      // Verify user has access to this list
      const list = await ctx.db.list.findFirst({
        where: {
          id: input.listId,
          OR: [
            { ownerId: ctx.userId },
            { members: { some: { userId: ctx.userId } } },
          ],
        },
        include: { members: { include: { user: true } } },
      });
      if (!list) {
        return null;
      }

      const result = await computeTeamStats(input.listId, ctx.db);
      await setCache(cacheKey, result, 3600);
      return result;
    }),

  // ── Shared Lists (for team dashboard selector) ─────────────────────────────
  getSharedLists: protectedProcedure.query(async ({ ctx }) => {
    const lists = await ctx.db.list.findMany({
      where: {
        OR: [
          { ownerId: ctx.userId },
          { members: { some: { userId: ctx.userId } } },
        ],
        members: { some: {} }, // only lists with at least one member besides owner
      },
      select: { id: true, name: true, color: true },
    });
    return lists;
  }),

  // ── CSV Export (Pro) ───────────────────────────────────────────────────────
  exportCsv: proProcedure.query(async ({ ctx }) => {
    const todos = await ctx.db.todo.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        completed: true,
        completedAt: true,
        priority: true,
        dueDate: true,
        tags: true,
        createdAt: true,
        list: { select: { name: true } },
      },
    });

    const rows = [
      ["ID", "Title", "Description", "Completed", "Completed At", "Priority", "Due Date", "Tags", "List", "Created At"],
      ...todos.map((t) => [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${(t.description ?? "").replace(/"/g, '""')}"`,
        t.completed ? "Yes" : "No",
        t.completedAt ? isoDate(t.completedAt) : "",
        t.priority,
        t.dueDate ? isoDate(t.dueDate) : "",
        `"${t.tags.join(", ")}"`,
        `"${(t.list?.name ?? "").replace(/"/g, '""')}"`,
        isoDate(t.createdAt),
      ]),
    ];

    return rows.map((r) => r.join(",")).join("\n");
  }),
});

// ── Computation helpers ────────────────────────────────────────────────────────

async function computePersonalStats(userId: string, db: typeof import("@/lib/db").db) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekAgo = new Date(todayStart);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const monthAgo = new Date(todayStart);
  monthAgo.setUTCDate(monthAgo.getUTCDate() - 28);

  // Fetch all todos for the user
  const allTodos = await db.todo.findMany({
    where: { userId, parentId: null }, // exclude subtasks
    select: {
      id: true,
      completed: true,
      completedAt: true,
      updatedAt: true,
      tags: true,
      dueDate: true,
      createdAt: true,
    },
  });

  const completedTodos = allTodos.filter((t) => t.completed);
  const activeTodos = allTodos.filter((t) => !t.completed);

  // Use completedAt if set, fall back to updatedAt for legacy completed todos
  const completionDate = (t: { completedAt: Date | null; updatedAt: Date }) =>
    t.completedAt ?? t.updatedAt;

  // Completed this week
  const completedThisWeek = completedTodos.filter(
    (t) => completionDate(t) >= weekAgo
  ).length;

  // Completion chart: last 28 days
  const completionByDay: { date: string; count: number }[] = [];
  for (let i = 27; i >= 0; i--) {
    const day = new Date(todayStart);
    day.setUTCDate(day.getUTCDate() - i);
    const nextDay = new Date(day);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const count = completedTodos.filter((t) => {
      const d = completionDate(t);
      return d >= day && d < nextDay;
    }).length;
    completionByDay.push({ date: isoDate(day), count });
  }

  // Current streak: consecutive days (up to and including today) with >= 1 completion
  let streak = 0;
  for (let i = 0; i <= 365; i++) {
    const day = new Date(todayStart);
    day.setUTCDate(day.getUTCDate() - i);
    const nextDay = new Date(day);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const hasCompletion = completedTodos.some((t) => {
      const d = completionDate(t);
      return d >= day && d < nextDay;
    });
    if (hasCompletion) {
      streak++;
    } else if (i > 0) {
      // Gap in streak — stop (allow today to have 0 without breaking yesterday's streak)
      if (i === 0) continue;
      break;
    }
  }

  // Completion rate by tag
  const tagMap = new Map<string, { completed: number; total: number }>();
  for (const todo of allTodos) {
    for (const tag of todo.tags) {
      const existing = tagMap.get(tag) ?? { completed: 0, total: 0 };
      existing.total++;
      if (todo.completed) existing.completed++;
      tagMap.set(tag, existing);
    }
  }
  const completionByTag = Array.from(tagMap.entries())
    .map(([tag, { completed, total }]) => ({
      tag,
      completed,
      total,
      rate: Math.round((completed / total) * 100),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Best day of week (0=Sun..6=Sat) by average completions
  const byDayOfWeek = Array.from({ length: 7 }, () => 0);
  for (const todo of completedTodos) {
    const d = completionDate(todo);
    byDayOfWeek[d.getUTCDay()]++;
  }
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const bestDayIndex = byDayOfWeek.indexOf(Math.max(...byDayOfWeek));
  const bestDay = byDayOfWeek[bestDayIndex] > 0 ? dayNames[bestDayIndex] : null;

  const completionRate =
    allTodos.length > 0
      ? Math.round((completedTodos.length / allTodos.length) * 100)
      : 0;

  return {
    totalTodos: allTodos.length,
    totalCompleted: completedTodos.length,
    totalActive: activeTodos.length,
    completedThisWeek,
    completionRate,
    streak,
    completionByDay,
    completionByTag,
    bestDay,
    overdueCount: activeTodos.filter(
      (t) => t.dueDate && t.dueDate < now
    ).length,
  };
}

async function computeTeamStats(listId: string, db: typeof import("@/lib/db").db) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const list = await db.list.findUnique({
    where: { id: listId },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, image: true } } } },
      owner: { select: { id: true, name: true, email: true, image: true } },
      todos: {
        select: {
          id: true,
          title: true,
          completed: true,
          completedAt: true,
          updatedAt: true,
          dueDate: true,
          assigneeId: true,
          userId: true,
        },
      },
    },
  });

  if (!list) return null;

  const allMembers = [
    { user: list.owner, role: "owner" as const },
    ...list.members.map((m) => ({ user: m.user, role: m.role })),
  ];

  const completionDate = (t: { completedAt: Date | null; updatedAt: Date }) =>
    t.completedAt ?? t.updatedAt;

  // Per-member activity
  const memberStats = allMembers.map(({ user, role }) => {
    // Todos created by this user in this list
    const created = list.todos.filter((t) => t.userId === user.id);
    const completed = created.filter((t) => t.completed);
    const completedThisWeek = completed.filter(
      (t) => completionDate(t) >= weekAgo
    ).length;
    const overdue = created.filter(
      (t) => !t.completed && t.dueDate && t.dueDate < now
    );

    return {
      userId: user.id,
      name: user.name ?? user.email,
      image: user.image,
      role,
      totalCreated: created.length,
      totalCompleted: completed.length,
      completedThisWeek,
      overdueCount: overdue.length,
      completionRate:
        created.length > 0 ? Math.round((completed.length / created.length) * 100) : 0,
    };
  });

  // Top contributors (by completed this week)
  const topContributors = [...memberStats]
    .sort((a, b) => b.completedThisWeek - a.completedThisWeek)
    .slice(0, 5);

  // Overdue tasks with assignee info
  const overdueTodos = list.todos
    .filter((t) => !t.completed && t.dueDate && t.dueDate < now)
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      assigneeName:
        allMembers.find((m) => m.user.id === (t.assigneeId ?? t.userId))?.user
          .name ?? "Unassigned",
    }))
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
    .slice(0, 10);

  return {
    listId,
    listName: list.name,
    totalTodos: list.todos.length,
    completedTotal: list.todos.filter((t) => t.completed).length,
    memberStats,
    topContributors,
    overdueTodos,
  };
}
