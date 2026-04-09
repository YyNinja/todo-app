import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { workspaceId, seats = 1 } = body as {
    workspaceId: string;
    seats?: number;
  };

  if (!workspaceId) {
    return Response.json({ error: "workspaceId required" }, { status: 400 });
  }

  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, ownerId: session.user.id },
    select: { id: true, name: true, stripeCustomerId: true, ownerId: true },
  });
  if (!workspace) {
    return Response.json({ error: "Workspace not found" }, { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: workspace.stripeCustomerId ?? undefined,
    customer_email: workspace.stripeCustomerId ? undefined : user?.email,
    line_items: [
      {
        price: process.env.STRIPE_TEAM_PRICE_ID!,
        quantity: Math.max(1, seats),
      },
    ],
    success_url: `${appUrl}/dashboard/workspace/${workspaceId}/admin?success=1`,
    cancel_url: `${appUrl}/dashboard/workspace/${workspaceId}/admin?cancelled=1`,
    metadata: { workspaceId: workspace.id, userId: session.user.id },
  });

  return Response.json({ url: checkoutSession.url });
}
