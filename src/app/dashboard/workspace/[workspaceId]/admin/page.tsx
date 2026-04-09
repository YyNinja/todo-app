"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export default function WorkspaceAdminPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const searchParams = useSearchParams();
  const successMsg = searchParams.get("success")
    ? "Subscription activated! Your workspace is now on Team Pro."
    : null;

  const utils = trpc.useUtils();
  const { data: workspace, isLoading } = trpc.workspaces.getById.useQuery({
    id: workspaceId,
  });
  const { data: stats } = trpc.workspaces.getStats.useQuery({ id: workspaceId });

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviteError, setInviteError] = useState("");

  const invite = trpc.workspaces.invite.useMutation({
    onSuccess: () => {
      utils.workspaces.getById.invalidate({ id: workspaceId });
      setInviteEmail("");
      setInviteError("");
    },
    onError: (e) => setInviteError(e.message),
  });

  const removeMember = trpc.workspaces.removeMember.useMutation({
    onSuccess: () => utils.workspaces.getById.invalidate({ id: workspaceId }),
  });

  const updateRole = trpc.workspaces.updateMemberRole.useMutation({
    onSuccess: () => utils.workspaces.getById.invalidate({ id: workspaceId }),
  });

  const [upgradeLoading, setUpgradeLoading] = useState(false);

  async function handleUpgrade() {
    setUpgradeLoading(true);
    const res = await fetch("/api/stripe/team-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        seats: workspace?.members.length ?? 1,
      }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setUpgradeLoading(false);
  }

  if (isLoading) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <p className="text-gray-500">Workspace not found or you don&apos;t have admin access.</p>
      </div>
    );
  }

  const isPro = workspace.billingStatus === "pro";

  return (
    <div className="px-6 lg:px-8 py-8 space-y-8 max-w-3xl">
      {/* Back */}
      <Link
        href={`/dashboard/workspace/${workspaceId}`}
        className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to {workspace.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">{workspace.name}</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          {successMsg}
        </div>
      )}

      {/* Billing */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Billing</h2>
        {isPro ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Team Pro
            </span>
            <span className="text-sm text-gray-600">
              {workspace.seatCount} seat{workspace.seatCount !== 1 ? "s" : ""}
              {workspace.stripeCurrentPeriodEnd && (
                <> · renews {new Date(workspace.stripeCurrentPeriodEnd).toLocaleDateString()}</>
              )}
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Upgrade to <strong>Team Pro</strong> for $10/seat/month — unlock AI features,
              recurring tasks, and unlimited lists for your whole team.
            </p>
            <button
              onClick={handleUpgrade}
              disabled={upgradeLoading}
              className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {upgradeLoading ? "Redirecting…" : "Upgrade to Team Pro"}
            </button>
          </div>
        )}
      </section>

      {/* Stats */}
      {stats && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Members" value={stats.memberCount} />
          <StatCard label="Lists" value={stats.listCount} />
          <StatCard label="Tasks" value={stats.todoCount} />
          <StatCard label="Completion" value={`${stats.completionRate}%`} />
        </section>
      )}

      {/* Invite */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Invite Member</h2>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
            className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={() => invite.mutate({ workspaceId, email: inviteEmail, role: inviteRole })}
            disabled={!inviteEmail || invite.isPending}
            className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {invite.isPending ? "Inviting…" : "Invite"}
          </button>
        </div>
        {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
      </section>

      {/* Members */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Members ({workspace._count.members})
          </h2>
        </div>
        <ul className="divide-y divide-gray-100">
          {workspace.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-6 py-3">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-medium shrink-0">
                {(m.user.name ?? m.user.email)[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {m.user.name ?? m.user.email}
                </p>
                <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
              </div>
              {m.role === "owner" ? (
                <span className="text-xs text-gray-400 shrink-0">Owner</span>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={m.role}
                    onChange={(e) =>
                      updateRole.mutate({
                        workspaceId,
                        userId: m.user.id,
                        role: e.target.value as "admin" | "member",
                      })
                    }
                    className="text-xs border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() =>
                      removeMember.mutate({ workspaceId, userId: m.user.id })
                    }
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
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
