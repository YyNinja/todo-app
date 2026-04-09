import { db } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import DailyDigestEmail from "@/emails/daily-digest";
import * as React from "react";

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const users = await db.user.findMany({
    where: {
      emailDigest: true,
      OR: [{ lastDigestSentAt: null }, { lastDigestSentAt: { lt: cutoff } }],
    },
    select: { id: true, email: true, name: true },
  });

  const priorityOrder = ["urgent", "high", "medium", "low"] as const;
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  let sent = 0;
  const userIds: string[] = [];

  await Promise.all(
    users.map(async (user) => {
      const todos = await db.todo.findMany({
        where: {
          userId: user.id,
          completed: false,
          OR: [{ dueDate: null }, { dueDate: { lte: todayEnd } }],
        },
        take: 50,
        select: { title: true, priority: true, dueDate: true },
      });

      if (todos.length === 0) return;

      const sorted = todos
        .sort(
          (a, b) =>
            priorityOrder.indexOf(a.priority as (typeof priorityOrder)[number]) -
            priorityOrder.indexOf(b.priority as (typeof priorityOrder)[number])
        )
        .slice(0, 3);

      try {
        await sendEmail(
          user.email,
          "Your Daily Todo Digest",
          React.createElement(DailyDigestEmail, {
            userName: user.name ?? user.email,
            todos: sorted,
          })
        );
        sent++;
        userIds.push(user.id);
      } catch {
        // continue on individual send failure
      }
    })
  );

  if (userIds.length > 0) {
    await db.user.updateMany({
      where: { id: { in: userIds } },
      data: { lastDigestSentAt: new Date() },
    });
  }

  return Response.json({ sent });
}
