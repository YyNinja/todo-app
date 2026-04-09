import type { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type Stripe from "stripe";

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  // In the 2026-03-25.dahlia API, current_period_end is on the SubscriptionItem
  const firstItem = subscription.items.data[0];
  if (firstItem?.current_period_end) {
    return new Date(firstItem.current_period_end * 1000);
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const userId = session.metadata?.userId;
      if (!userId) break;

      const subscriptionId = session.subscription as string;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items"],
      });
      const periodEnd = getSubscriptionPeriodEnd(subscription);

      await db.user.update({
        where: { id: userId },
        data: {
          billingStatus: "pro",
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          stripeCurrentPeriodEnd: periodEnd,
        },
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      // In 2026-03-25.dahlia API, subscription is in invoice.parent.subscription_details.subscription
      const parent = invoice.parent;
      const subscriptionId =
        parent?.type === "subscription_details"
          ? (parent.subscription_details?.subscription as string | undefined)
          : null;
      if (!subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items"],
      });
      const periodEnd = getSubscriptionPeriodEnd(subscription);

      await db.user.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { stripeCurrentPeriodEnd: periodEnd },
      });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const periodEnd = getSubscriptionPeriodEnd(subscription);
      const status =
        subscription.status === "active" ? "pro" : "cancelled";

      await db.user.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          billingStatus: status,
          stripeCurrentPeriodEnd: periodEnd,
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      await db.user.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          billingStatus: "cancelled",
          stripeCurrentPeriodEnd: null,
        },
      });
      break;
    }
  }

  return new Response("ok", { status: 200 });
}
