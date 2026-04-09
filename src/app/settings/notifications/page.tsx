"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";

export default function NotificationsSettingsPage() {
  const { data, isLoading } = trpc.notifications.getPreferences.useQuery();
  const updatePrefs = trpc.notifications.updatePreferences.useMutation();

  const [emailDigest, setEmailDigest] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      setEmailDigest(data.emailDigest);
      setEmailReminders(data.emailReminders);
    }
  }, [data]);

  async function handleToggle(field: "emailDigest" | "emailReminders", value: boolean) {
    if (field === "emailDigest") setEmailDigest(value);
    else setEmailReminders(value);

    await updatePrefs.mutateAsync({ [field]: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-lg font-semibold text-indigo-600">
            TodoAI
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/profile" className="text-gray-500 hover:text-gray-900">
              Profile
            </Link>
            <Link href="/billing" className="text-gray-500 hover:text-gray-900">
              Billing
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold text-gray-900">Notification preferences</h1>
            {saved && (
              <span className="text-sm text-green-600 font-medium">Saved</span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <ToggleRow
                label="Daily digest"
                description="Receive a daily email with your top 3 priority tasks."
                checked={emailDigest}
                onChange={(v) => handleToggle("emailDigest", v)}
                disabled={updatePrefs.isPending}
              />
              <ToggleRow
                label="Due date reminders"
                description="Get notified when tasks are due within the next 25 hours."
                checked={emailReminders}
                onChange={(v) => handleToggle("emailReminders", v)}
                disabled={updatePrefs.isPending}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
          checked ? "bg-indigo-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
