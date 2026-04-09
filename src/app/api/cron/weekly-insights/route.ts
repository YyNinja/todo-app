import { db } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import { generateProductivityInsight } from "@/lib/ai";
import { invalidateCache } from "@/lib/redis";
import WeeklyInsightsEmail from "@/emails/weekly-insights";
import * as React from "react";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Start of this week (Monday)
  const weekDay = now.getUTCDay();
  const diffToMon = weekDay === 0 ? -6 : 1 - weekDay;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diffToMon);
  weekStart.setUTCHours(0, 0, 0, 0);

  const weekAgo = new Date(weekStart);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  // Get all users who have email digest enabled
  const users = await db.user.findMany({
    where: { emailDigest: true },
    select: { id: true, email: true, name: true, billingStatus: true },
  });

  let processed = 0;

  await Promise.all(
    users.map(async (user) => {
      try {
        // Check if we already generated an insight this week
        const existing = await db.userInsight.findUnique({
          where: { userId_weekStart: { userId: user.id, weekStart } },
        });
        if (existing) return;

        // Compute stats
        const allTodos = await db.todo.findMany({
          where: { userId: user.id, parentId: null },
          select: {
            completed: true,
            completedAt: true,
            updatedAt: true,
            tags: true,
            dueDate: true,
            createdAt: true,
          },
        });

        const completionDate = (t: { completedAt: Date | null; updatedAt: Date }) =>
          t.completedAt ?? t.updatedAt;

        const completedTodos = allTodos.filter((t) => t.completed);
        const completedThisWeek = completedTodos.filter(
          (t) => completionDate(t) >= weekAgo && completionDate(t) < weekStart
        ).length;

        // Streak
        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);
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
            break;
          }
        }

        // Top tags
        const tagCount = new Map<string, number>();
        for (const todo of completedTodos) {
          for (const tag of todo.tags) {
            tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
          }
        }
        const topTags = Array.from(tagCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([tag]) => tag);

        // Best day
        const byDayOfWeek = Array.from({ length: 7 }, () => 0);
        for (const todo of completedTodos) {
          byDayOfWeek[completionDate(todo).getUTCDay()]++;
        }
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const bestDayIndex = byDayOfWeek.indexOf(Math.max(...byDayOfWeek));
        const bestDay = byDayOfWeek[bestDayIndex] > 0 ? dayNames[bestDayIndex] : undefined;

        const totalActive = allTodos.filter((t) => !t.completed).length;
        const completionRatePercent =
          allTodos.length > 0
            ? Math.round((completedTodos.length / allTodos.length) * 100)
            : 0;

        const stats = {
          weekStart: weekAgo.toISOString().split("T")[0],
          completedThisWeek,
          totalActive,
          streak,
          topTags,
          completionRatePercent,
          bestDay,
        };

        // Generate AI insight
        const insightText = await generateProductivityInsight(stats);

        // Store in DB
        await db.userInsight.upsert({
          where: { userId_weekStart: { userId: user.id, weekStart } },
          create: { userId: user.id, weekStart, insight: insightText, stats },
          update: { insight: insightText, stats },
        });

        // Invalidate analytics cache
        await invalidateCache(`analytics:personal:${user.id}`);

        // Send weekly insights email
        await sendEmail(
          user.email,
          "Your Weekly Productivity Insights",
          React.createElement(WeeklyInsightsEmail, {
            userName: user.name ?? user.email,
            weekOf: weekAgo.toISOString().split("T")[0],
            completedThisWeek,
            streak,
            topTags,
            completionRatePercent,
            insight: insightText,
          })
        );

        processed++;
      } catch {
        // continue on individual user failure
      }
    })
  );

  return Response.json({ processed });
}
