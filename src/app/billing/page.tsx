"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

function Toast({ message, type }: { message: string; type: "success" | "info" }) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
        type === "success" ? "bg-green-600" : "bg-gray-700"
      }`}
    >
      {message}
    </div>
  );
}

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);

  const { data: billing, isLoading } = trpc.billing.status.useQuery();

  useEffect(() => {
    if (searchParams.get("success")) {
      setToast({ message: "Welcome to Pro! Your subscription is active.", type: "success" });
      setTimeout(() => setToast(null), 5000);
    } else if (searchParams.get("cancelled")) {
      setToast({ message: "Checkout cancelled. No charge was made.", type: "info" });
      setTimeout(() => setToast(null), 4000);
    }
  }, [searchParams]);

  async function handleUpgrade() {
    setLoading("checkout");
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) router.push(data.url);
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) router.push(data.url);
    } finally {
      setLoading(null);
    }
  }

  const isPro = billing?.billingStatus === "pro";
  const isCancelled = billing?.billingStatus === "cancelled";

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Billing</h1>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-24" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-1">
                  Current plan
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {isPro ? "Pro" : "Free"}
                  </span>
                  {isPro && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                  {isCancelled && (
                    <span className="text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>

              {isPro && billing?.stripeCurrentPeriodEnd && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1">Renews on</p>
                  <p className="text-sm font-medium text-gray-700">
                    {new Date(billing.stripeCurrentPeriodEnd).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-6">
              {isPro ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    You have access to all Pro features including unlimited lists, AI briefings, and more.
                  </p>
                  <button
                    onClick={handleManage}
                    disabled={loading !== null}
                    className="text-sm px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
                  >
                    {loading === "portal" ? "Loading…" : "Manage subscription"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {isCancelled
                      ? "Your Pro subscription was cancelled. Upgrade again to restore access."
                      : "You're on the free plan. Upgrade to Pro to unlock unlimited lists and all AI features."}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleUpgrade}
                      disabled={loading !== null}
                      className="text-sm px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-semibold"
                    >
                      {loading === "checkout" ? "Loading…" : "Upgrade to Pro — $9/mo"}
                    </button>
                    <Link
                      href="/pricing"
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      View pricing →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/dashboard" className="text-base font-semibold text-indigo-600">
            TodoAI
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to dashboard
          </Link>
        </div>
      </header>

      <Suspense fallback={null}>
        <BillingContent />
      </Suspense>
    </div>
  );
}
