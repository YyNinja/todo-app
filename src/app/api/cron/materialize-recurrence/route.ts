import { db } from "@/lib/db";
import { nextOccurrenceDate, createNextOccurrence } from "@/lib/recurrence";
import type { RecurrenceRule } from "@/lib/recurrence";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Find only recurring template todos (not instances) that are not completed
  const recurringTodos = await db.todo.findMany({
    where: {
      recurrence: { not: null },
      recurringParentId: null,
      completed: false,
    },
  });

  let materialized = 0;

  await Promise.all(
    recurringTodos.map(async (todo) => {
      // Check if a future open child already exists
      const futureChild = await db.todo.findFirst({
        where: {
          recurringParentId: todo.id,
          completed: false,
          dueDate: { gt: now },
        },
      });
      if (futureChild) return;

      const rule = todo.recurrence as RecurrenceRule;
      const fromDate = todo.dueDate ?? now;
      const nextDate = nextOccurrenceDate(rule, fromDate);
      if (!nextDate) return;
      if (nextDate > sevenDaysOut) return;

      await createNextOccurrence(db, todo as Parameters<typeof createNextOccurrence>[1]);
      materialized++;
    })
  );

  return Response.json({ materialized });
}
