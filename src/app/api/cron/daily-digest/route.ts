import { db } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import DailyDigestEmail from "@/emails/daily-digest";
import * as React from "react";

const priorityOrder = ["urgent", "high", "medium", "low"] as const;

async function sendSlackDigest(
  accessToken: string,
  channel: string,
  userName: string,
  todos: { title: string; priority: string; dueDate: Date | null }[]
): Promise<void> {
  const lines = todos.map((t, i) => {
    const due = t.dueDate ? ` — due ${t.dueDate.toLocaleDateString()}` : "";
    const emoji =
      t.priority === "urgent" ? "🔴" : t.priority === "high" ? "🟠" : t.priority === "medium" ? "🟡" : "🟢";
    return `${i + 1}. ${emoji} *${t.title}*${due}`;
  });

  const text = `📋 *Daily digest for ${userName}*\n\nYour top ${todos.length} task${todos.length === 1 ? "" : "s"} for today:\n\n${lines.join("\n")}`;

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel, text }),
  });
}

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

  // Also fetch users with Slack integration (they might not have emailDigest on)
  const slackIntegrations = await db.integration.findMany({
    where: {
      provider: "slack",
      metadata: { path: ["digestChannel"], not: null },
    },
    select: { userId: true, accessToken: true, metadata: true },
  });
  const slackByUserId = new Map(slackIntegrations.map((i) => [i.userId, i]));

  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  let sent = 0;
  const userIds: string[] = [];

  // Users who need email digests
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

      // Also send Slack digest if connected
      const slack = slackByUserId.get(user.id);
      if (slack) {
        const meta = slack.metadata as Record<string, string> | null;
        const channel = meta?.digestChannel;
        if (channel) {
          try {
            await sendSlackDigest(
              slack.accessToken,
              channel,
              user.name ?? user.email,
              sorted
            );
          } catch {
            // Don't fail the whole cron if Slack fails
          }
        }
      }
    })
  );

  // Users who only have Slack (emailDigest disabled)
  const emailUserIds = new Set(users.map((u) => u.id));
  const slackOnlyUsers = slackIntegrations.filter(
    (i) => !emailUserIds.has(i.userId)
  );

  await Promise.all(
    slackOnlyUsers.map(async (integration) => {
      const meta = integration.metadata as Record<string, string> | null;
      const channel = meta?.digestChannel;
      if (!channel) return;

      const user = await db.user.findUnique({
        where: { id: integration.userId },
        select: { name: true, email: true },
      });
      if (!user) return;

      const todos = await db.todo.findMany({
        where: {
          userId: integration.userId,
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
        await sendSlackDigest(
          integration.accessToken,
          channel,
          user.name ?? user.email,
          sorted
        );
      } catch {
        // continue
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
