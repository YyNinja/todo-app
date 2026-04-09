"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { UpgradePrompt } from "@/components/upgrade-prompt";

interface SmartScheduleButtonProps {
  todoId: string;
  onApply: (date: string) => void;
}

export function SmartScheduleButton({ todoId, onApply }: SmartScheduleButtonProps) {
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const suggest = trpc.ai.suggestDueDate.useMutation();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    if (!suggest.data && !suggest.isPending) {
      suggest.mutate(
        { todoId },
        {
          onError: (err) => {
            if (err.data?.code === "FORBIDDEN") {
              setOpen(false);
              setShowUpgrade(true);
            }
          },
        }
      );
    }
  }

  return (
    <>
      {showUpgrade && <UpgradePrompt onClose={() => setShowUpgrade(false)} />}
      <div className="relative" ref={popoverRef}>
        <button
          onClick={handleOpen}
          className="p-1.5 text-gray-300 hover:text-indigo-500 rounded transition-colors"
          aria-label="AI: Suggest due date"
          title="AI: Suggest due date"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-64 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-indigo-400 text-xs">✦</span>
              <span className="text-xs font-semibold text-gray-700">Smart Schedule</span>
            </div>

            {suggest.isPending && (
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
              </div>
            )}

            {suggest.data && (
              <>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {new Date(suggest.data.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-gray-500 mb-3">{suggest.data.reasoning}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 text-xs px-2 py-1.5 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      onApply(suggest.data!.date);
                      setOpen(false);
                    }}
                    className="flex-1 text-xs px-2 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                  >
                    Apply
                  </button>
                </div>
              </>
            )}

            {suggest.error && suggest.error.data?.code !== "FORBIDDEN" && (
              <p className="text-xs text-red-500">Failed to get suggestion.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
