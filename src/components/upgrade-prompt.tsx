"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UpgradePrompt({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        router.push(data.url);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Upgrade to Pro
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          You&apos;ve reached the free tier limit of <strong>3 lists</strong>.
          Upgrade to Pro for unlimited lists and all AI features.
        </p>

        <ul className="space-y-2 mb-5">
          {[
            "Unlimited shared lists",
            "AI daily briefings",
            "Smart task breakdown",
            "Semantic search",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
              <svg className="h-4 w-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Maybe later
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? "Loading…" : "Upgrade — $9/mo"}
          </button>
        </div>
      </div>
    </div>
  );
}
