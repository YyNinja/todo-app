"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import type { ParsedTodo } from "@/lib/ai";

type Step = "input" | "preview";

const PRIORITY_STYLES: Record<ParsedTodo["priority"], string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export function QuickAddModal() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [parsed, setParsed] = useState<ParsedTodo | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();

  const parseMutation = trpc.todos.parseNaturalLanguage.useMutation({
    onSuccess: (data) => {
      setParsed(data);
      setStep("preview");
    },
  });

  const createMutation = trpc.todos.create.useMutation({
    onSuccess: () => {
      utils.todos.list.invalidate();
      utils.todos.getTopThree.invalidate();
      handleClose();
    },
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        handleClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => {
    if (open && step === "input") {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  }, [open, step]);

  function handleClose() {
    setOpen(false);
    setText("");
    setParsed(null);
    setStep("input");
    parseMutation.reset();
    createMutation.reset();
  }

  function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || parseMutation.isPending) return;
    parseMutation.mutate({ text: text.trim() });
  }

  function handleConfirm() {
    if (!parsed || createMutation.isPending) return;
    createMutation.mutate({
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      dueDate: parsed.dueDate ?? null,
      tags: parsed.tags,
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <span>Quick Add</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-500 text-xs font-mono">
          ⌘K
        </kbd>
      </button>
    );
  }

  const parseError = parseMutation.error?.message;
  const createError = createMutation.error?.message;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {step === "input" ? "AI Task Capture" : "Review & Confirm"}
          </p>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Input step */}
        {step === "input" && (
          <form onSubmit={handleParse} className="p-5">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={'Try: "Submit quarterly report by Friday, high priority"'}
              rows={3}
              className="w-full resize-none text-gray-900 text-base placeholder-gray-400 outline-none leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleParse(e as unknown as React.FormEvent);
                }
              }}
            />
            {parseError && (
              <p className="mt-2 text-sm text-red-500">
                {parseError.includes("fetch") ? "Could not reach AI — try again." : parseError}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Press{" "}
                <kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-xs">
                  Enter
                </kbd>{" "}
                to parse
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!text.trim() || parseMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  {parseMutation.isPending ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Parsing…
                    </span>
                  ) : (
                    "Parse with AI →"
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Preview step */}
        {step === "preview" && parsed && (
          <div className="p-5">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                  Title
                </p>
                <p className="text-gray-900 font-semibold">{parsed.title}</p>
              </div>

              {parsed.description && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                    Description
                  </p>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {parsed.description}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_STYLES[parsed.priority]}`}
                >
                  {parsed.priority.charAt(0).toUpperCase() + parsed.priority.slice(1)} priority
                </span>

                {parsed.dueDate && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                    Due{" "}
                    {new Date(parsed.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}

                {parsed.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {createError && (
              <p className="mt-3 text-sm text-red-500">
                Failed to save — please try again.
              </p>
            )}

            <div className="mt-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep("input");
                  parseMutation.reset();
                  createMutation.reset();
                }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Edit
              </button>
              <button
                onClick={handleConfirm}
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Saving…
                  </span>
                ) : (
                  "Add Todo"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
