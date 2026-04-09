import { db } from "./db";

type GCalEvent = {
  id?: string;
  summary: string;
  description?: string;
  start: { date?: string; dateTime?: string; timeZone?: string };
  end: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

async function getAccessToken(integration: {
  accessToken: string;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  userId: string;
}): Promise<string> {
  // If token is still valid (with 5 min buffer), return it
  if (
    integration.tokenExpiry &&
    integration.tokenExpiry.getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return integration.accessToken;
  }

  // Refresh the token
  if (!integration.refreshToken) return integration.accessToken;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: integration.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) return integration.accessToken;

  const expiry = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : null;

  await db.integration.update({
    where: { userId_provider: { userId: integration.userId, provider: "google_calendar" } },
    data: { accessToken: data.access_token, tokenExpiry: expiry },
  });

  return data.access_token;
}

export async function syncTodosToCalendar(userId: string): Promise<void> {
  const integration = await db.integration.findUnique({
    where: { userId_provider: { userId, provider: "google_calendar" } },
  });
  if (!integration) return;

  const accessToken = await getAccessToken({
    ...integration,
    userId,
  });

  // Get todos with due dates
  const todos = await db.todo.findMany({
    where: { userId, completed: false, dueDate: { not: null } },
    select: { id: true, title: true, description: true, dueDate: true },
  });

  const existingMeta = (integration.metadata as Record<string, string>) ?? {};

  for (const todo of todos) {
    if (!todo.dueDate) continue;

    const dueDate = todo.dueDate;
    const dateStr = dueDate.toISOString().split("T")[0]; // YYYY-MM-DD

    const event: GCalEvent = {
      summary: todo.title,
      description: todo.description ?? undefined,
      start: { date: dateStr },
      end: { date: dateStr },
      extendedProperties: {
        private: { todoId: todo.id, source: "todoai" },
      },
    };

    const existingEventId = existingMeta[`gcal_event_${todo.id}`];

    if (existingEventId) {
      // Update existing event
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEventId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );
    } else {
      // Create new event
      const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );
      const created = (await res.json()) as { id?: string };
      if (created.id) {
        existingMeta[`gcal_event_${todo.id}`] = created.id;
      }
    }
  }

  // Persist updated event ID map
  await db.integration.update({
    where: { userId_provider: { userId, provider: "google_calendar" } },
    data: { metadata: existingMeta },
  });
}

export async function deleteCalendarEvent(
  userId: string,
  todoId: string
): Promise<void> {
  const integration = await db.integration.findUnique({
    where: { userId_provider: { userId, provider: "google_calendar" } },
  });
  if (!integration) return;

  const existingMeta = (integration.metadata as Record<string, string>) ?? {};
  const eventId = existingMeta[`gcal_event_${todoId}`];
  if (!eventId) return;

  const accessToken = await getAccessToken({ ...integration, userId });

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  delete existingMeta[`gcal_event_${todoId}`];
  await db.integration.update({
    where: { userId_provider: { userId, provider: "google_calendar" } },
    data: { metadata: existingMeta },
  });
}
