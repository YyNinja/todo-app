"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { UpgradePrompt } from "@/components/upgrade-prompt";

interface SemanticSearchBarProps {
  onResults: (todoIds: string[] | null) => void;
}

export function SemanticSearchBar({ onResults }: SemanticSearchBarProps) {
  const [enabled, setEnabled] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce 500ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const { data, error } = trpc.ai.semanticSearch.useQuery(
    { query: debouncedQuery },
    {
      enabled: enabled && debouncedQuery.trim().length > 0,
      retry: false,
    }
  );

  // Adjust state during render when a FORBIDDEN error is received.
  const [prevError, setPrevError] = useState(error);
  if (prevError !== error && error?.data?.code === "FORBIDDEN") {
    setPrevError(error);
    setEnabled(false);
    setShowUpgrade(true);
  }

  useEffect(() => {
    if (!enabled || !debouncedQuery.trim()) {
      onResults(null);
      return;
    }
    if (data) {
      onResults(data);
    }
  }, [data, enabled, debouncedQuery, onResults]);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    if (!next) {
      setQuery("");
      setDebouncedQuery("");
      onResults(null);
    }
  }

  return (
    <>
      {showUpgrade && <UpgradePrompt onClose={() => setShowUpgrade(false)} />}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={enabled ? "Search semantically…" : "Search tasks…"}
            disabled={!enabled && false}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pl-8 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder-gray-400"
          />
          <svg
            className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          onClick={handleToggle}
          title={enabled ? "Disable AI semantic search" : "Enable AI semantic search (Pro)"}
          className={`shrink-0 flex items-center gap-1 text-xs px-2.5 py-2 rounded-lg border transition-colors font-medium ${
            enabled
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"
          }`}
        >
          <span>✦</span>
          <span className="hidden sm:inline">AI</span>
        </button>
      </div>
    </>
  );
}
