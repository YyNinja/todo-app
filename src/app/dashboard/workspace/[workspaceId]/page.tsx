"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: workspace, isLoading } = trpc.workspaces.getById.useQuery({
    id: workspaceId,
  });
  const { data: stats } = trpc.workspaces.getStats.useQuery({ id: workspaceId });

  if (isLoading) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <p className="text-gray-500">Workspace not found.</p>
      </div>
    );
  }

  const myRole = workspace.members[0]?.role;
  const isAdmin = myRole === "owner" || myRole === "admin";

  return (
    <div className="px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {workspace._count.members} member{workspace._count.members !== 1 ? "s" : ""}
            {" · "}
            {workspace.billingStatus === "pro" ? (
              <span className="text-indigo-600 font-medium">Team Pro</span>
            ) : (
              <span className="text-gray-400">Free</span>
            )}
          </p>
        </div>
        {isAdmin && (
          <Link
            href={`/dashboard/workspace/${workspaceId}/admin`}
            className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Admin Dashboard
          </Link>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Members" value={stats.memberCount} />
          <StatCard label="Lists" value={stats.listCount} />
          <StatCard label="Tasks" value={stats.todoCount} />
          <StatCard label="Completion" value={`${stats.completionRate}%`} />
        </div>
      )}

      {/* Lists */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Workspace Lists
        </h2>
        {workspace.lists.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No lists yet. Create a list and assign it to this workspace.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspace.lists.map((list) => (
              <li key={list.id}>
                <Link
                  href={`/dashboard/lists/${list.id}`}
                  className="block p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: list.color ?? "#6366f1" }}
                    />
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {list.name}
                    </span>
                    <span className="ml-auto text-xs text-gray-400 shrink-0">
                      {list._count.todos} tasks
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Members */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Members
        </h2>
        <ul className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {workspace.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-medium shrink-0">
                {(m.user.name ?? m.user.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {m.user.name ?? m.user.email}
                </p>
                <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
              </div>
              <span className="ml-auto text-xs text-gray-500 capitalize shrink-0">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
