"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { UpgradePrompt } from "@/components/upgrade-prompt";

export function DailyBriefing() {
  const [collapsed, setCollapsed] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data, isLoading, error } = trpc.ai.getDailyBriefing.useQuery(undefined, {
    retry: false,
  });

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <>
        {showUpgrade && <UpgradePrompt onClose={() => setShowUpgrade(false)} />}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400">✦</span>
            <span className="text-sm font-medium text-indigo-700">AI Daily Briefing</span>
            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Pro</span>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Upgrade →
          </button>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-4 py-4 animate-pulse">
        <div className="h-4 bg-indigo-100 rounded w-32 mb-3" />
        <div className="space-y-2">
          <div className="h-3 bg-indigo-100 rounded w-full" />
          <div className="h-3 bg-indigo-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-4 py-4">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">✦</span>
          <span className="text-sm font-semibold text-indigo-700">AI Daily Briefing</span>
        </div>
        <svg
          className={`h-4 w-4 text-indigo-400 transition-transform ${collapsed ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-gray-700">{data.summary}</p>

          {data.topPriorities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1.5">
                Focus on today
              </p>
              <ol className="space-y-1">
                {data.topPriorities.map((priority, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="shrink-0 text-xs font-bold text-indigo-400 mt-0.5">{i + 1}.</span>
                    {priority}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="text-xs text-indigo-600 italic">{data.insights}</p>
        </div>
      )}
    </div>
  );
}
