"use client";

import { trpc } from "@/lib/trpc";

type Priority = "low" | "medium" | "high" | "urgent";

const PRIORITY_BADGE: Record<Priority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export function TopThreeWidget() {
  const { data, isLoading, error } = trpc.todos.getTopThree.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min — matches server-side Redis TTL
  });

  if (isLoading) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-indigo-400 text-lg">✦</span>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
            AI Daily Top 3
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-4 h-28 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error || !data || data.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-indigo-500 text-lg">✦</span>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          AI Daily Top 3
        </h2>
        <span className="text-xs text-gray-400 ml-auto">refreshes every 5 min</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(data as { todo: { id: string; title: string; priority: string; dueDate: Date | null; tags: string[] }; reasoning: string | null }[]).map(({ todo, reasoning }, idx) => (
          <div
            key={todo.id}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-gray-300">#{idx + 1}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  PRIORITY_BADGE[todo.priority as Priority] ?? PRIORITY_BADGE.medium
                }`}
              >
                {todo.priority}
              </span>
            </div>

            <p className="mt-2 text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
              {todo.title}
            </p>

            {todo.dueDate && (
              <p className="mt-1 text-xs text-gray-400">
                Due{" "}
                {new Date(todo.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}

            {reasoning && (
              <p className="mt-2 text-xs text-indigo-600 italic leading-relaxed border-t border-gray-100 pt-2 line-clamp-3">
                {reasoning}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
