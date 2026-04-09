import { db } from "@/lib/db";
import { parseTodoFromNaturalLanguage } from "@/lib/ai";
import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

// Slack sends a URL verification challenge on first setup
type SlackUrlVerification = { type: "url_verification"; challenge: string };

type SlackEventCallback = {
  type: "event_callback";
  team_id: string;
  event: {
    type: string;
    text?: string;
    user?: string;
    channel?: string;
    ts?: string;
    bot_id?: string;
  };
};

type SlackPayload = SlackUrlVerification | SlackEventCallback;

function verifySlackSignature(request: NextRequest, body: string): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  const timestamp = request.headers.get("x-slack-request-timestamp");
  const slackSig = request.headers.get("x-slack-signature");
  if (!timestamp || !slackSig) return false;

  // Reject requests older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const sigBase = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", signingSecret).update(sigBase).digest("hex");
  const computed = `v0=${hmac}`;

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(slackSig));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  if (!verifySlackSignature(request, body)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body) as SlackPayload;

  // Handle URL verification challenge
  if (payload.type === "url_verification") {
    return Response.json({ challenge: payload.challenge });
  }

  if (payload.type !== "event_callback") {
    return Response.json({ ok: true });
  }

  const event = payload.event;

  // Only handle app_mention or message events directed at the bot
  if (event.type !== "app_mention" && event.type !== "message") {
    return Response.json({ ok: true });
  }

  // Ignore bot messages to avoid loops
  if (event.bot_id) {
    return Response.json({ ok: true });
  }

  const text = event.text?.trim();
  if (!text) return Response.json({ ok: true });

  // Strip bot mention prefix if present (e.g. "<@BOTID> buy milk")
  const cleanText = text.replace(/^<@[A-Z0-9]+>\s*/i, "").trim();
  if (!cleanText) return Response.json({ ok: true });

  // Find the user who owns this Slack workspace integration
  const integration = await db.integration.findFirst({
    where: {
      provider: "slack",
      metadata: { path: ["teamId"], equals: payload.team_id },
    },
    select: { userId: true, accessToken: true },
  });

  if (!integration) {
    return Response.json({ ok: true });
  }

  // Parse and create the todo
  try {
    const parsed = await parseTodoFromNaturalLanguage(cleanText);
    await db.todo.create({
      data: {
        title: parsed.title,
        description: parsed.description ?? null,
        priority: parsed.priority,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        tags: parsed.tags,
        userId: integration.userId,
        aiSuggested: true,
        aiContext: { source: "slack", originalText: cleanText, channel: event.channel },
      },
    });

    // Send confirmation to Slack
    const botToken = integration.accessToken;
    if (event.channel && botToken) {
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: event.channel,
          text: `✅ Todo created: *${parsed.title}*`,
          thread_ts: event.ts,
        }),
      });
    }
  } catch {
    // Graceful degradation — don't fail the Slack webhook
  }

  return Response.json({ ok: true });
}
