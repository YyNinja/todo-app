"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

export default function AnalyticsPage() {
  const { data: stats, isLoading } = trpc.analytics.getPersonalStats.useQuery();
  const { data: insight } = trpc.analytics.getLatestInsight.useQuery();
  const { data: billing } = trpc.billing.status.useQuery();
  const exportCsv = trpc.analytics.exportCsv.useQuery(undefined, { enabled: false });

  const isPro = billing?.billingStatus === "pro";

  const [streakCopied, setStreakCopied] = useState(false);

  const handleDownloadCsv = useCallback(async () => {
    const result = await exportCsv.refetch();
    if (!result.data) return;
    const blob = new Blob([result.data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `todoai-tasks-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportCsv]);

  const handleShareStreak = useCallback(() => {
    const text = `I'm on a ${stats?.streak ?? 0}-day task completion streak on TodoAI! 🔥 My completion rate is ${stats?.completionRate ?? 0}%. Check it out at ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setStreakCopied(true);
        setTimeout(() => setStreakCopied(false), 2000);
      });
    }
  }, [stats]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-lg font-semibold text-indigo-600">
            TodoAI
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/analytics" className="text-gray-900 font-medium">
              Personal
            </Link>
            {isPro && (
              <Link href="/analytics/team" className="text-gray-500 hover:text-gray-900">
                Team
              </Link>
            )}
            <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track your productivity and see your progress over time.
            </p>
          </div>
          {isPro && (
            <button
              onClick={handleDownloadCsv}
              disabled={exportCsv.isFetching}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <DownloadIcon />
              {exportCsv.isFetching ? "Exporting…" : "Export CSV"}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Completed this week" value={stats.completedThisWeek} color="indigo" />
              <StatCard label="Total completed" value={stats.totalCompleted} color="emerald" />
              <StatCard label="Completion rate" value={`${stats.completionRate}%`} color="amber" />
              <StatCard label="Active tasks" value={stats.totalActive} color="rose" />
            </div>

            {/* Streak card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-200">Current Streak</p>
                  <p className="text-5xl font-bold mt-1">
                    {stats.streak}
                    <span className="text-3xl ml-2">🔥</span>
                  </p>
                  <p className="text-sm text-indigo-200 mt-1">
                    {stats.streak === 0
                      ? "Complete a task today to start your streak!"
                      : stats.streak === 1
                      ? "1 day — keep going!"
                      : `${stats.streak} consecutive days`}
                  </p>
                  {stats.bestDay && (
                    <p className="text-xs text-indigo-300 mt-2">
                      Most productive on {stats.bestDay}s
                    </p>
                  )}
                </div>
                <button
                  onClick={handleShareStreak}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  <ShareIcon />
                  {streakCopied ? "Copied!" : "Share"}
                </button>
              </div>
            </div>

            {/* Completion chart */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Completions — Last 28 Days
              </h2>
              <CompletionChart data={stats.completionByDay} />
            </div>

            {/* AI Insight */}
            {insight && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-2">
                  AI Coach · Week of {new Date(insight.weekStart).toLocaleDateString()}
                </p>
                <p className="text-gray-800 leading-relaxed">{insight.insight}</p>
              </div>
            )}

            {/* Tag breakdown */}
            {stats.completionByTag.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                  Completion Rate by Category
                </h2>
                <div className="space-y-3">
                  {stats.completionByTag.map((item) => (
                    <div key={item.tag}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">{item.tag}</span>
                        <span className="text-gray-500">
                          {item.completed}/{item.total} · {item.rate}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overdue callout */}
            {stats.overdueCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-medium text-red-800">
                    {stats.overdueCount} overdue task{stats.overdueCount > 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-red-600 mt-0.5">
                    Head to your{" "}
                    <Link href="/dashboard" className="underline">
                      dashboard
                    </Link>{" "}
                    to review them.
                  </p>
                </div>
              </div>
            )}

            {/* Pro upsell for CSV */}
            {!isPro && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Export your task history</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Download a CSV of all your tasks. Pro feature.
                  </p>
                </div>
                <Link
                  href="/billing"
                  className="text-sm font-medium px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Upgrade
                </Link>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "indigo" | "emerald" | "amber" | "rose";
}) {
  const colorMap = {
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

function CompletionChart({ data }: { data: { date: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d) => {
        const height = Math.max((d.count / max) * 100, d.count > 0 ? 8 : 0);
        const isToday = d.date === new Date().toISOString().split("T")[0];
        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1 group relative"
            title={`${d.date}: ${d.count} completed`}
          >
            <div
              className={`w-full rounded-sm transition-all ${
                d.count === 0
                  ? "bg-gray-100"
                  : isToday
                  ? "bg-indigo-400"
                  : "bg-indigo-500"
              }`}
              style={{ height: `${height}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
