"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { CommentThread } from "@/components/comment-thread";
import { authClient } from "@/lib/auth-client";

type Priority = "low" | "medium" | "high" | "urgent";

interface TodoUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  dueDate: Date | null;
  tags: string[];
  aiSuggested: boolean;
  assigneeId: string | null;
  userId: string;
  user: TodoUser;
}

interface ListMember {
  id: string;
  userId: string;
  role: string;
  user: TodoUser;
}

const PRIORITY_BADGE: Record<Priority, string> = {
  low: "bg-gray-100 text-gray-500",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const PRIORITY_DOT: Record<Priority, string> = {
  low: "bg-gray-300",
  medium: "bg-blue-400",
  high: "bg-orange-400",
  urgent: "bg-red-500",
};

// ── Invite modal ──────────────────────────────────────────────────────────────

function InviteModal({ listId, onClose }: { listId: string; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const utils = trpc.useUtils();

  const invite = trpc.lists.invite.useMutation({
    onSuccess: () => {
      utils.lists.getById.invalidate({ id: listId });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Invite to list</h2>
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            autoFocus
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "member" | "viewer")}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="member">Member (can add & complete tasks)</option>
            <option value="viewer">Viewer (read-only)</option>
          </select>
          {invite.error && (
            <p className="text-xs text-red-600">
              {invite.error.message.includes("not found")
                ? "No account found with that email."
                : "Something went wrong. Try again."}
            </p>
          )}
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={() => invite.mutate({ listId, email: email.trim(), role })}
            disabled={!email.trim() || invite.isPending}
            className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {invite.isPending ? "Inviting…" : "Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Inline todo create form ───────────────────────────────────────────────────

function InlineCreateForm({
  listId,
  members,
  onCreated,
}: {
  listId: string;
  members: ListMember[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [expanded, setExpanded] = useState(false);
  const utils = trpc.useUtils();

  const create = trpc.todos.create.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate({ listId });
      utils.lists.list.invalidate();
      setTitle("");
      setPriority("medium");
      setAssigneeId("");
      setExpanded(false);
      onCreated();
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        create.mutate({
          title: title.trim(),
          priority,
          listId,
          assigneeId: assigneeId || undefined,
        });
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="h-5 w-5 rounded border-2 border-dashed border-gray-300 shrink-0" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setTitle(""); setExpanded(false); }
          }}
          placeholder="Add a task to this list…"
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none"
          autoComplete="off"
        />
        {title.trim() && (
          <button
            type="submit"
            disabled={create.isPending}
            className="shrink-0 text-sm px-3 py-1 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            {create.isPending ? "Adding…" : "Add"}
          </button>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Assign to</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name ?? m.user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

// ── Todo item ────────────────────────────────────────────────────────────────

function ListTodoItem({
  todo,
  members,
  currentUserId,
  isOwner,
  onOptimisticComplete,
  onOptimisticDelete,
}: {
  todo: Todo;
  members: ListMember[];
  currentUserId: string;
  isOwner: boolean;
  onOptimisticComplete: (id: string, completed: boolean) => void;
  onOptimisticDelete: (id: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const utils = trpc.useUtils();
  const listId = members.length > 0 ? undefined : undefined; // resolved by invalidation

  const complete = trpc.todos.complete.useMutation({
    onSettled: () => utils.todos.list.invalidate(),
  });

  const update = trpc.todos.update.useMutation({
    onSuccess: () => utils.todos.list.invalidate(),
  });

  const del = trpc.todos.delete.useMutation({
    onSettled: () => {
      utils.todos.list.invalidate();
      utils.lists.list.invalidate();
    },
  });

  const canEdit = todo.userId === currentUserId || isOwner;
  const overdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date();
  const assignee = members.find((m) => m.userId === todo.assigneeId);

  return (
    <li
      className={`group bg-white border border-gray-200 rounded-xl px-4 py-3.5 shadow-sm transition-opacity ${
        del.isPending ? "opacity-30" : todo.completed ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Complete toggle */}
        <button
          onClick={() => {
            onOptimisticComplete(todo.id, !todo.completed);
            complete.mutate({ id: todo.id, completed: !todo.completed });
          }}
          disabled={complete.isPending}
          className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
            todo.completed
              ? "border-indigo-500 bg-indigo-500"
              : "border-gray-300 hover:border-indigo-400"
          }`}
          aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        >
          {todo.completed && (
            <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[todo.priority]}`} />
            <p className={`text-sm font-medium truncate ${todo.completed ? "line-through text-gray-400" : "text-gray-900"}`}>
              {todo.title}
            </p>
            {todo.aiSuggested && (
              <span className="shrink-0 text-xs text-indigo-400" title="AI captured">✦</span>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[todo.priority]}`}>
              {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
            </span>
            {todo.dueDate && (
              <span className={`text-xs ${overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
                {overdue ? "Overdue · " : "Due "}
                {new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {assignee && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {assignee.user.name ?? assignee.user.email}
              </span>
            )}
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {todo.user.name ?? todo.user.email}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowComments((v) => !v)}
            className="p-1.5 text-gray-300 hover:text-indigo-600 rounded transition-colors"
            aria-label="Comments"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          {canEdit && (
            <>
              <select
                value={todo.assigneeId ?? ""}
                onChange={(e) =>
                  update.mutate({ id: todo.id, assigneeId: e.target.value || null })
                }
                className="text-xs border-0 text-gray-400 hover:text-gray-700 bg-transparent outline-none cursor-pointer"
                aria-label="Assign"
                title="Assign to"
              >
                <option value="">Assign…</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name ?? m.user.email}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  onOptimisticDelete(todo.id);
                  del.mutate({ id: todo.id });
                }}
                disabled={del.isPending}
                className="p-1.5 text-gray-300 hover:text-red-500 rounded transition-colors"
                aria-label="Delete"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {showComments && (
        <CommentThread todoId={todo.id} currentUserId={currentUserId} />
      )}
    </li>
  );
}

// ── Main list detail ──────────────────────────────────────────────────────────

export function ListDetail({ listId }: { listId: string }) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [optimisticItems, setOptimisticItems] = useState<Todo[] | null>(null);
  const utils = trpc.useUtils();

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id ?? "";

  const { data: list, isLoading: listLoading, error: listError } = trpc.lists.getById.useQuery({ id: listId });

  const { data, isLoading: todosLoading } = trpc.todos.list.useQuery(
    { listId, limit: 50 },
    { placeholderData: keepPreviousData }
  );

  const serverItems = (data as { items: Todo[]; nextCursor: string | null } | undefined)?.items;
  const displayItems = optimisticItems ?? serverItems ?? [];

  useEffect(() => {
    setOptimisticItems(null);
  }, [serverItems]);

  const deleteList = trpc.lists.delete.useMutation({
    onSuccess: () => {
      utils.lists.list.invalidate();
      router.push("/dashboard");
    },
  });

  const leaveList = trpc.lists.leave.useMutation({
    onSuccess: () => {
      utils.lists.list.invalidate();
      router.push("/dashboard");
    },
  });

  const removeMember = trpc.lists.removeMember.useMutation({
    onSuccess: () => utils.lists.getById.invalidate({ id: listId }),
  });

  const handleOptimisticComplete = useCallback(
    (id: string, completed: boolean) => {
      const base = serverItems;
      if (!base) return;
      setOptimisticItems(base.map((t) => (t.id === id ? { ...t, completed } : t)));
    },
    [serverItems]
  );

  const handleOptimisticDelete = useCallback(
    (id: string) => {
      const base = optimisticItems ?? serverItems;
      if (!base) return;
      setOptimisticItems(base.filter((t) => t.id !== id));
    },
    [serverItems, optimisticItems]
  );

  if (listLoading) {
    return (
      <div className="px-6 lg:px-8 py-8">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white border border-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (listError || !list) {
    return (
      <div className="px-6 lg:px-8 py-8 text-sm text-red-600">
        List not found or access denied.
      </div>
    );
  }

  const isOwner = list.ownerId === currentUserId;
  const allMembers = [
    { id: "owner", userId: list.ownerId, role: "owner" as const, user: list.owner },
    ...list.members,
  ];

  return (
    <div className="px-6 lg:px-8 py-8">
      {showInvite && (
        <InviteModal listId={listId} onClose={() => setShowInvite(false)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full shrink-0 mt-0.5"
            style={{ backgroundColor: list.color ?? "#6366f1" }}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{list.name}</h1>
            {list.description && (
              <p className="mt-0.5 text-sm text-gray-500">{list.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite
          </button>
          {isOwner ? (
            <button
              onClick={() => {
                if (confirm("Delete this list? Todos will be unlinked.")) {
                  deleteList.mutate({ id: listId });
                }
              }}
              disabled={deleteList.isPending}
              className="text-sm px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete list
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm("Leave this list?")) leaveList.mutate({ listId });
              }}
              disabled={leaveList.isPending}
              className="text-sm px-3 py-1.5 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex -space-x-2">
          {allMembers.slice(0, 5).map((m) => (
            <div
              key={m.userId}
              className="h-7 w-7 rounded-full ring-2 ring-white bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-medium"
              title={`${m.user.name ?? m.user.email} (${m.role})`}
            >
              {m.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.user.image} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                (m.user.name ?? m.user.email)[0].toUpperCase()
              )}
            </div>
          ))}
        </div>
        <span className="text-xs text-gray-500">{allMembers.length} member{allMembers.length !== 1 ? "s" : ""}</span>

        {isOwner && list.members.length > 0 && (
          <details className="ml-2">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">manage</summary>
            <ul className="mt-2 space-y-1 bg-white border border-gray-200 rounded-lg p-2 shadow-sm absolute z-10">
              {list.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-700">{m.user.name ?? m.user.email}</span>
                  <button
                    onClick={() => removeMember.mutate({ listId, userId: m.userId })}
                    disabled={removeMember.isPending}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Todo list */}
      <InlineCreateForm
        listId={listId}
        members={allMembers}
        onCreated={() => setOptimisticItems(null)}
      />

      {todosLoading && (
        <ul className="space-y-2">
          {[1, 2, 3].map((i) => (
            <li key={i} className="bg-white border border-gray-100 rounded-xl h-14 animate-pulse" />
          ))}
        </ul>
      )}

      {!todosLoading && displayItems.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">✓</p>
          <p className="text-sm font-medium text-gray-600">No tasks yet</p>
          <p className="text-xs mt-1">Add one above to get started.</p>
        </div>
      )}

      {!todosLoading && displayItems.length > 0 && (
        <ul className="space-y-2">
          {displayItems.map((todo) => (
            <ListTodoItem
              key={todo.id}
              todo={todo}
              members={allMembers}
              currentUserId={currentUserId}
              isOwner={isOwner}
              onOptimisticComplete={handleOptimisticComplete}
              onOptimisticDelete={handleOptimisticDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
