import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !stateParam) {
    return redirect("/settings/integrations?error=gcal_denied");
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    userId = decoded.userId;
    if (!userId) throw new Error("Missing userId");
  } catch {
    return redirect("/settings/integrations?error=invalid_state");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirect("/settings/integrations?error=not_configured");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/gcal/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (!tokenData.access_token) {
    return redirect("/settings/integrations?error=gcal_token_failed");
  }

  const expiry = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await db.integration.upsert({
    where: { userId_provider: { userId, provider: "google_calendar" } },
    update: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? undefined,
      tokenExpiry: expiry,
    },
    create: {
      userId,
      provider: "google_calendar",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      tokenExpiry: expiry,
    },
  });

  // Trigger an initial sync
  const syncUrl = `${appUrl}/api/integrations/gcal/sync`;
  fetch(syncUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, _internal: process.env.CRON_SECRET }),
  }).catch(() => {});

  return redirect("/settings/integrations?success=gcal_connected");
}
