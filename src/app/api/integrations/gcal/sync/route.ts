import { db } from "@/lib/db";
import { syncTodosToCalendar } from "@/lib/gcal";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { userId?: string; _internal?: string };

  // Allow either CRON_SECRET (for cron/internal) or a valid user session
  const isInternal = body._internal === process.env.CRON_SECRET;
  if (!isInternal) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (body.userId) {
    // Sync a single user
    await syncTodosToCalendar(body.userId);
    return Response.json({ synced: 1 });
  }

  // Sync all users with Google Calendar integration
  const integrations = await db.integration.findMany({
    where: { provider: "google_calendar" },
    select: { userId: true },
  });

  await Promise.allSettled(
    integrations.map((i) => syncTodosToCalendar(i.userId))
  );

  return Response.json({ synced: integrations.length });
}
