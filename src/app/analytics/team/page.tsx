"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

export default function TeamAnalyticsPage() {
  const { data: billing } = trpc.billing.status.useQuery();
  const { data: sharedLists, isLoading: listsLoading } = trpc.analytics.getSharedLists.useQuery();

  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const listId = selectedListId ?? sharedLists?.[0]?.id ?? "";
  const { data: teamStats, isLoading: statsLoading } = trpc.analytics.getTeamStats.useQuery(
    { listId },
    { enabled: !!listId }
  );

  const isPro = billing?.billingStatus === "pro";

  if (!isPro) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Analytics</h1>
          <p className="text-gray-500 mb-6">
            Team dashboards, member activity, and overdue tracking are Pro features.
          </p>
          <Link
            href="/billing"
            className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Upgrade to Pro
          </Link>
        </main>
      </div>
    );
  }

  if (listsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!sharedLists || sharedLists.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No shared lists yet</h1>
          <p className="text-gray-500 mb-6">
            Share a list with teammates to see team analytics.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Member activity, top contributors, and overdue tasks.
            </p>
          </div>

          {/* List selector */}
          {sharedLists.length > 1 && (
            <select
              value={listId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sharedLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {statsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-gray-200 animate-pulse" />
            ))}
          </div>
        ) : teamStats ? (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Total tasks" value={teamStats.totalTodos} color="indigo" />
              <StatCard label="Completed" value={teamStats.completedTotal} color="emerald" />
              <StatCard
                label="Overdue"
                value={teamStats.overdueTodos.length}
                color={teamStats.overdueTodos.length > 0 ? "rose" : "emerald"}
              />
            </div>

            {/* Top contributors */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Top Contributors This Week
              </h2>
              {teamStats.topContributors.length === 0 ? (
                <p className="text-sm text-gray-400">No activity this week yet.</p>
              ) : (
                <div className="space-y-3">
                  {teamStats.topContributors.map((member, i) => (
                    <div key={member.userId} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                      <Avatar name={member.name} image={member.image} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-indigo-600">
                          {member.completedThisWeek} this week
                        </p>
                        <p className="text-xs text-gray-400">
                          {member.totalCompleted} total · {member.completionRate}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All member activity */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Member Activity
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {teamStats.memberStats.map((member) => (
                  <div key={member.userId} className="px-6 py-4 flex items-center gap-3">
                    <Avatar name={member.name} image={member.image} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{member.role}</p>
                    </div>
                    <div className="hidden sm:flex gap-6 text-right">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{member.totalCreated}</p>
                        <p className="text-xs text-gray-400">created</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-emerald-600">{member.totalCompleted}</p>
                        <p className="text-xs text-gray-400">done</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-600">{member.completionRate}%</p>
                        <p className="text-xs text-gray-400">rate</p>
                      </div>
                      {member.overdueCount > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-rose-600">{member.overdueCount}</p>
                          <p className="text-xs text-gray-400">overdue</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overdue tasks */}
            {teamStats.overdueTodos.length > 0 && (
              <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-red-100 bg-red-50">
                  <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wider">
                    Overdue Tasks ({teamStats.overdueTodos.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {teamStats.overdueTodos.map((todo) => (
                    <div key={todo.id} className="px-6 py-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-gray-900 font-medium truncate">{todo.title}</p>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-500">{todo.assigneeName}</span>
                        <span className="text-xs font-medium text-red-600">
                          {todo.dueDate
                            ? `Due ${new Date(todo.dueDate).toLocaleDateString()}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/dashboard" className="text-lg font-semibold text-indigo-600">
          TodoAI
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/analytics" className="text-gray-500 hover:text-gray-900">
            Personal
          </Link>
          <Link href="/analytics/team" className="text-gray-900 font-medium">
            Team
          </Link>
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "indigo" | "emerald" | "rose";
}) {
  const colorMap = {
    indigo: "text-indigo-600",
    emerald: "text-emerald-600",
    rose: "text-rose-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

function Avatar({ name, image }: { name: string; image: string | null | undefined }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="w-8 h-8 rounded-full object-cover bg-gray-200 flex-shrink-0"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-semibold text-indigo-700">{initials}</span>
    </div>
  );
}
