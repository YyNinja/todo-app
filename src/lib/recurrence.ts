import type { PrismaClient } from "@prisma/client";
import { invalidateCache } from "@/lib/redis";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "custom";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
}

export function nextOccurrenceDate(rule: RecurrenceRule, fromDate: Date): Date | null {
  const next = new Date(fromDate);

  switch (rule.frequency) {
    case "daily":
      next.setDate(next.getDate() + rule.interval);
      break;

    case "weekly":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Advance to the next matching day of week
        const sorted = [...rule.daysOfWeek].sort((a, b) => a - b);
        const currentDay = next.getDay();
        // Find next day-of-week after today in the pattern
        const nextDay = sorted.find((d) => d > currentDay) ?? sorted[0];
        let daysToAdd = nextDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        // If we've cycled through the week, also add (interval - 1) * 7 days
        const cycled = nextDay <= currentDay;
        next.setDate(next.getDate() + daysToAdd + (cycled ? (rule.interval - 1) * 7 : 0));
      } else {
        next.setDate(next.getDate() + rule.interval * 7);
      }
      break;

    case "monthly": {
      const day = next.getDate();
      next.setMonth(next.getMonth() + rule.interval);
      // Clamp to last day of month if overflow
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      if (day > lastDay) next.setDate(lastDay);
      break;
    }

    case "custom":
      next.setDate(next.getDate() + rule.interval);
      break;
  }

  if (rule.endDate && next > new Date(rule.endDate)) return null;
  return next;
}

type TodoForRecurrence = {
  id: string;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  tags: string[];
  listId: string | null;
  userId: string;
  dueDate: Date | null;
  recurrence: unknown;
  recurringParentId: string | null;
};

export async function createNextOccurrence(
  db: PrismaClient,
  todo: TodoForRecurrence
): Promise<TodoForRecurrence | null> {
  const rule = todo.recurrence as RecurrenceRule;
  const fromDate = todo.dueDate ?? new Date();
  const nextDate = nextOccurrenceDate(rule, fromDate);
  if (!nextDate) return null;

  const created = await db.todo.create({
    data: {
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      tags: todo.tags,
      listId: todo.listId,
      userId: todo.userId,
      recurrence: rule as object,
      recurringParentId: todo.recurringParentId ?? todo.id,
      dueDate: nextDate,
      completed: false,
    },
  });

  await invalidateCache(`todos:${todo.userId}:*`);
  return created as unknown as TodoForRecurrence;
}
