import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { sendEmail } from "@/lib/resend";
import DueDateReminderEmail from "@/emails/due-date-reminder";
import * as React from "react";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const todos = await db.todo.findMany({
    where: {
      completed: false,
      dueDate: { gte: now, lte: windowEnd },
      user: { emailReminders: true },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });

  // Redis dedup: only send if not already reminded in last 24h
  const byUser = new Map<
    string,
    { email: string; name: string | null; todos: { title: string; dueDate: Date }[] }
  >();

  await Promise.all(
    todos.map(async (todo) => {
      const key = `reminder:${todo.id}`;
      const set = await redis.set(key, "1", "EX", 86400, "NX");
      if (!set) return; // already reminded

      const entry = byUser.get(todo.userId) ?? {
        email: todo.user.email,
        name: todo.user.name,
        todos: [],
      };
      entry.todos.push({ title: todo.title, dueDate: todo.dueDate! });
      byUser.set(todo.userId, entry);
    })
  );

  let sent = 0;

  await Promise.all(
    Array.from(byUser.values()).map(async ({ email, name, todos: userTodos }) => {
      try {
        await sendEmail(
          email,
          "Tasks Due Soon",
          React.createElement(DueDateReminderEmail, {
            userName: name ?? email,
            todos: userTodos,
          })
        );
        sent++;
      } catch {
        // continue on individual send failure
      }
    })
  );

  return Response.json({ sent });
}
