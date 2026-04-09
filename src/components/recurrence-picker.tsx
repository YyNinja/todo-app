"use client";

import { useState, useEffect } from "react";
import type { RecurrenceRule, RecurrenceFrequency } from "@/lib/recurrence";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface RecurrencePickerProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const [frequency, setFrequency] = useState<RecurrenceFrequency | "none">(
    value?.frequency ?? "none"
  );
  const [interval, setInterval] = useState(value?.interval ?? 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(value?.daysOfWeek ?? []);
  const [endDate, setEndDate] = useState(value?.endDate ?? "");

  // Sync outward whenever our internal state changes
  useEffect(() => {
    if (frequency === "none") {
      onChange(null);
      return;
    }
    const rule: RecurrenceRule = { frequency, interval };
    if (frequency === "weekly" && daysOfWeek.length > 0) rule.daysOfWeek = daysOfWeek;
    if (endDate) rule.endDate = endDate;
    onChange(rule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency, interval, daysOfWeek, endDate]);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-500 mb-1">Repeat</label>
      <select
        value={frequency}
        onChange={(e) => {
          setFrequency(e.target.value as RecurrenceFrequency | "none");
          setInterval(1);
          setDaysOfWeek([]);
        }}
        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="none">None</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="custom">Custom</option>
      </select>

      {frequency !== "none" && (
        <div className="space-y-2 pl-1">
          {frequency !== "weekly" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 shrink-0">Every</label>
              <input
                type="number"
                min={1}
                max={99}
                value={interval}
                onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-xs text-gray-500">
                {frequency === "daily" || frequency === "custom"
                  ? interval === 1 ? "day" : "days"
                  : interval === 1 ? "month" : "months"}
              </span>
            </div>
          )}

          {frequency === "weekly" && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 shrink-0">Every</label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-xs text-gray-500">{interval === 1 ? "week" : "weeks"}</span>
              </div>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      daysOfWeek.includes(idx)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">End date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {endDate && (
              <button
                type="button"
                onClick={() => setEndDate("")}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RecurrenceBadge({ rule }: { rule: RecurrenceRule }) {
  const labels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    custom: `Every ${rule.interval}d`,
  };
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-indigo-500 font-medium">
      ↻ {labels[rule.frequency] ?? rule.frequency}
    </span>
  );
}
