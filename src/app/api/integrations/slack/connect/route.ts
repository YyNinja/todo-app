import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { billingStatus: true },
  });
  if (user?.billingStatus !== "pro") {
    return redirect("/settings/integrations?error=pro_required");
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    return redirect("/settings/integrations?error=not_configured");
  }

  const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString("base64url");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/integrations/slack/callback`;

  const scopes = [
    "chat:write",
    "channels:read",
    "commands",
  ].join(",");

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return redirect(url.toString());
}
