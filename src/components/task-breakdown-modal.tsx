"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { UpgradePrompt } from "@/components/upgrade-prompt";

interface TaskBreakdownModalProps {
  todoId: string;
  todoTitle: string;
  onClose: () => void;
  onSubtasksCreated: () => void;
}

export function TaskBreakdownModal({
  todoId,
  todoTitle,
  onClose,
  onSubtasksCreated,
}: TaskBreakdownModalProps) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const utils = trpc.useUtils();

  const breakdown = trpc.ai.breakdownTask.useMutation();
  const createSubtasks = trpc.ai.createSubtasks.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
      onSubtasksCreated();
      onClose();
    },
  });

  const subtasks = breakdown.data ?? [];

  if (breakdown.error?.data?.code === "FORBIDDEN" || showUpgrade) {
    return <UpgradePrompt onClose={onClose} />;
  }

  function handleBreakdown() {
    breakdown.mutate(
      { todoId },
      {
        onSuccess: (data) => {
          setSelected(new Set(data.map((_, i) => i)));
        },
        onError: (err) => {
          if (err.data?.code === "FORBIDDEN") {
            setShowUpgrade(true);
          }
        },
      }
    );
  }

  function toggleItem(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function handleCreate() {
    const titles = subtasks.filter((_, i) => selected.has(i));
    if (titles.length === 0) return;
    createSubtasks.mutate({ parentId: todoId, titles });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-indigo-400">✦</span>
            <h2 className="text-base font-semibold text-gray-900">Break down task</h2>
          </div>
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

        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{todoTitle}</p>

        {subtasks.length === 0 && !breakdown.isPending && (
          <button
            onClick={handleBreakdown}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            ✦ Generate subtasks
          </button>
        )}

        {breakdown.isPending && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {subtasks.length > 0 && (
          <>
            <p className="text-xs text-gray-500 mb-3">
              Select subtasks to create ({selected.size} selected)
            </p>
            <ul className="space-y-2 mb-5 max-h-64 overflow-y-auto">
              {subtasks.map((title, i) => (
                <li key={i}>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleItem(i)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className={`text-sm ${selected.has(i) ? "text-gray-900" : "text-gray-400 line-through"}`}>
                      {title}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 text-sm px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={selected.size === 0 || createSubtasks.isPending}
                className="flex-1 text-sm px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
              >
                {createSubtasks.isPending ? "Creating…" : `Create ${selected.size} subtask${selected.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface BreakdownButtonProps {
  todoId: string;
  todoTitle: string;
  onSubtasksCreated: () => void;
}

export function BreakdownButton({ todoId, todoTitle, onSubtasksCreated }: BreakdownButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 text-gray-300 hover:text-indigo-500 rounded transition-colors"
        aria-label="Break down task"
        title="AI: Break down task"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h6" />
        </svg>
      </button>
      {open && (
        <TaskBreakdownModal
          todoId={todoId}
          todoTitle={todoTitle}
          onClose={() => setOpen(false)}
          onSubtasksCreated={onSubtasksCreated}
        />
      )}
    </>
  );
}
