"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { BreakdownButton } from "@/components/task-breakdown-modal";
import { SmartScheduleButton } from "@/components/smart-schedule-button";
import { SemanticSearchBar } from "@/components/semantic-search-bar";

type Priority = "low" | "medium" | "high" | "urgent";
type Filter = "all" | "active" | "completed";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: Priority;
  dueDate: Date | null;
  tags: string[];
  aiSuggested: boolean;
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

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

// ── Inline create form ──────────────────────────────────────────────────────

function InlineCreateForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [expanded, setExpanded] = useState(false);

  const utils = trpc.useUtils();
  const create = trpc.todos.create.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
      setTitle("");
      setPriority("medium");
      setDueDate("");
      setTags("");
      setExpanded(false);
      onCreated();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    create.mutate({
      title: title.trim(),
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
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
          placeholder="Add a task…"
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
              <label className="block text-xs text-gray-500 mb-1">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="work, personal"
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>
      )}
    </form>
  );
}

// ── Inline edit form ────────────────────────────────────────────────────────

function EditForm({
  todo,
  onSave,
  onCancel,
}: {
  todo: Todo;
  onSave: (data: { title: string; priority: Priority; dueDate: string; tags: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [dueDate, setDueDate] = useState(
    todo.dueDate ? new Date(todo.dueDate).toISOString().split("T")[0] : ""
  );
  const [tags, setTags] = useState(todo.tags.join(", "));

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        autoFocus
      />
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
          <label className="block text-xs text-gray-500 mb-1">Due date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tags (comma separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="work, personal"
          className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-sm px-3 py-1.5 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave({ title, priority, dueDate, tags })}
          disabled={!title.trim()}
          className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Todo item ───────────────────────────────────────────────────────────────

function TodoItem({
  todo,
  onOptimisticComplete,
  onOptimisticDelete,
}: {
  todo: Todo;
  onOptimisticComplete: (id: string, completed: boolean) => void;
  onOptimisticDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const utils = trpc.useUtils();
  const updateDueDate = trpc.todos.update.useMutation({
    onSuccess: () => utils.todos.list.invalidate(),
  });

  const complete = trpc.todos.complete.useMutation({
    onSettled: () => utils.todos.list.invalidate(),
  });

  const update = trpc.todos.update.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
      setEditing(false);
    },
  });

  const del = trpc.todos.delete.useMutation({
    onSettled: () => utils.todos.list.invalidate(),
  });

  const overdue =
    todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date();

  if (editing) {
    return (
      <li className="bg-white border border-indigo-200 rounded-xl px-4 py-4 shadow-sm">
        <EditForm
          todo={todo}
          onSave={({ title, priority, dueDate, tags }) => {
            update.mutate({
              id: todo.id,
              title: title.trim(),
              priority,
              dueDate: dueDate ? new Date(dueDate).toISOString() : null,
              tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            });
          }}
          onCancel={() => setEditing(false)}
        />
        {update.isPending && (
          <p className="text-xs text-gray-400 mt-2 text-center">Saving…</p>
        )}
      </li>
    );
  }

  return (
    <li
      className={`group bg-white border border-gray-200 rounded-xl px-4 py-3.5 shadow-sm flex items-start gap-3 transition-opacity ${
        del.isPending ? "opacity-30" : todo.completed ? "opacity-60" : ""
      }`}
    >
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
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full shrink-0 ${PRIORITY_DOT[todo.priority]}`}
          />
          <p
            className={`text-sm font-medium truncate ${
              todo.completed ? "line-through text-gray-400" : "text-gray-900"
            }`}
          >
            {todo.title}
          </p>
          {todo.aiSuggested && (
            <span className="shrink-0 text-xs text-indigo-400" title="AI captured">
              ✦
            </span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[todo.priority]}`}>
            {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
          </span>
          {todo.dueDate && (
            <span
              className={`text-xs ${
                overdue ? "text-red-500 font-medium" : "text-gray-400"
              }`}
            >
              {overdue ? "Overdue · " : "Due "}
              {new Date(todo.dueDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {todo.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <BreakdownButton
          todoId={todo.id}
          todoTitle={todo.title}
          onSubtasksCreated={() => utils.todos.list.invalidate()}
        />
        <SmartScheduleButton
          todoId={todo.id}
          onApply={(date) =>
            updateDueDate.mutate({ id: todo.id, dueDate: new Date(date + "T12:00:00").toISOString() })
          }
        />
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 text-gray-300 hover:text-gray-700 rounded transition-colors"
          aria-label="Edit"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
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
      </div>
    </li>
  );
}

// ── Main TodoList ───────────────────────────────────────────────────────────

export function TodoList() {
  const [filter, setFilter] = useState<Filter>("active");
  const [optimisticItems, setOptimisticItems] = useState<Todo[] | null>(null);
  const [prevServerItems, setPrevServerItems] = useState<Todo[] | undefined>(undefined);
  const [semanticResults, setSemanticResults] = useState<string[] | null>(null);

  const queryInput = {
    completed:
      filter === "active" ? false : filter === "completed" ? true : undefined,
    limit: 50,
  };

  const { data, isLoading, error } = trpc.todos.list.useQuery(queryInput, {
    placeholderData: keepPreviousData,
  });

  const serverItems = (data as { items: Todo[]; nextCursor: string | null } | undefined)?.items;
  if (prevServerItems !== serverItems) {
    setPrevServerItems(serverItems);
    setOptimisticItems(null);
  }
  const baseItems = optimisticItems ?? serverItems ?? [];
  const displayItems = semanticResults
    ? baseItems
        .filter((t) => semanticResults.includes(t.id))
        .sort((a, b) => semanticResults.indexOf(a.id) - semanticResults.indexOf(b.id))
    : baseItems;

  const handleOptimisticComplete = useCallback(
    (id: string, completed: boolean) => {
      const base = serverItems;
      if (!base) return;
      const updated = base.map((t) =>
        t.id === id ? { ...t, completed } : t
      );
      setOptimisticItems(
        filter === "all"
          ? updated
          : filter === "active"
          ? updated.filter((t) => !t.completed)
          : updated.filter((t) => t.completed)
      );
    },
    [serverItems, filter]
  );

  const handleOptimisticDelete = useCallback(
    (id: string) => {
      const base = optimisticItems ?? serverItems;
      if (!base) return;
      setOptimisticItems(base.filter((t) => t.id !== id));
    },
    [serverItems, optimisticItems]
  );

  const activeCount = serverItems?.filter((t) => !t.completed).length ?? 0;

  return (
    <div>
      {/* Filter tabs + count */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setOptimisticItems(null);
                setFilter(f.value);
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filter !== "completed" && serverItems && !semanticResults && (
          <span className="text-xs text-gray-400">
            {activeCount} remaining
          </span>
        )}
        {semanticResults && (
          <span className="text-xs text-indigo-500 font-medium">
            {displayItems.length} AI match{displayItems.length !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      {/* Semantic search */}
      <div className="mb-4">
        <SemanticSearchBar onResults={setSemanticResults} />
      </div>

      {/* Inline create form */}
      <InlineCreateForm onCreated={() => setOptimisticItems(null)} />

      {/* Loading skeletons */}
      {isLoading && (
        <ul className="space-y-2">
          {[1, 2, 3].map((i) => (
            <li key={i} className="bg-white border border-gray-100 rounded-xl h-14 animate-pulse" />
          ))}
        </ul>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          Failed to load tasks. Please refresh.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && displayItems.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          {filter === "completed" ? (
            <p className="text-sm">No completed tasks yet.</p>
          ) : filter === "active" ? (
            <div>
              <p className="text-4xl mb-3">✓</p>
              <p className="text-sm font-medium text-gray-600">All caught up!</p>
              <p className="text-xs mt-1 text-gray-400">Add a task above to get started.</p>
            </div>
          ) : (
            <p className="text-sm">No tasks yet. Add one above.</p>
          )}
        </div>
      )}

      {/* Todo items */}
      {!isLoading && displayItems.length > 0 && (
        <ul className="space-y-2">
          {displayItems.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onOptimisticComplete={handleOptimisticComplete}
              onOptimisticDelete={handleOptimisticDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
