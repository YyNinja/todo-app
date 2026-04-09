import type { BillingStatus } from "@prisma/client";

export const FREE_TIER_LIST_LIMIT = 3;

export function isPro(user: { billingStatus: BillingStatus }) {
  return user.billingStatus === "pro";
}
