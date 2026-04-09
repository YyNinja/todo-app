import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !stateParam) {
    return redirect("/settings/integrations?error=slack_denied");
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    userId = decoded.userId;
    if (!userId) throw new Error("Missing userId");
  } catch {
    return redirect("/settings/integrations?error=invalid_state");
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirect("/settings/integrations?error=not_configured");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/slack/callback`;

  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    ok: boolean;
    access_token?: string;
    team?: { id: string; name: string };
    incoming_webhook?: { channel: string; channel_id: string; url: string };
    error?: string;
  };

  if (!tokenData.ok || !tokenData.access_token) {
    return redirect("/settings/integrations?error=slack_token_failed");
  }

  await db.integration.upsert({
    where: { userId_provider: { userId, provider: "slack" } },
    update: {
      accessToken: tokenData.access_token,
      metadata: {
        teamId: tokenData.team?.id,
        teamName: tokenData.team?.name,
        digestChannel: tokenData.incoming_webhook?.channel_id ?? null,
        digestChannelName: tokenData.incoming_webhook?.channel ?? null,
      },
    },
    create: {
      userId,
      provider: "slack",
      accessToken: tokenData.access_token,
      metadata: {
        teamId: tokenData.team?.id,
        teamName: tokenData.team?.name,
        digestChannel: tokenData.incoming_webhook?.channel_id ?? null,
        digestChannelName: tokenData.incoming_webhook?.channel ?? null,
      },
    },
  });

  return redirect("/settings/integrations?success=slack_connected");
}
