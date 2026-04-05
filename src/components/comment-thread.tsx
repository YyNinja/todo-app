"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface CommentUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  user: CommentUser;
}

function Avatar({ user }: { user: CommentUser }) {
  if (user.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt={user.name ?? user.email} className="h-6 w-6 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-medium shrink-0">
      {(user.name ?? user.email)[0].toUpperCase()}
    </div>
  );
}

export function CommentThread({ todoId, currentUserId }: { todoId: string; currentUserId: string }) {
  const [text, setText] = useState("");
  const utils = trpc.useUtils();

  const { data: comments, isLoading } = trpc.comments.list.useQuery({ todoId });

  const add = trpc.comments.create.useMutation({
    onSuccess: () => {
      utils.comments.list.invalidate({ todoId });
      setText("");
    },
  });

  const del = trpc.comments.delete.useMutation({
    onSuccess: () => utils.comments.list.invalidate({ todoId }),
  });

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      )}

      {comments && comments.length > 0 && (
        <ul className="space-y-2 mb-3">
          {(comments as Comment[]).map((c) => (
            <li key={c.id} className="flex gap-2 items-start">
              <Avatar user={c.user} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium text-gray-700">
                    {c.user.name ?? c.user.email}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(c.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
              </div>
              {c.user.id === currentUserId && (
                <button
                  onClick={() => del.mutate({ id: c.id })}
                  disabled={del.isPending}
                  className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                  aria-label="Delete comment"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          add.mutate({ todoId, content: text.trim() });
        }}
        className="flex gap-2 items-center"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 text-xs border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-gray-50"
        />
        <button
          type="submit"
          disabled={!text.trim() || add.isPending}
          className="text-xs px-2.5 py-1.5 bg-indigo-600 text-white rounded disabled:opacity-40 hover:bg-indigo-700 transition-colors shrink-0"
        >
          {add.isPending ? "…" : "Post"}
        </button>
      </form>
    </div>
  );
}
