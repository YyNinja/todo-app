"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");

  const { data, isLoading, refetch } = trpc.integrations.list.useQuery();
  const disconnect = trpc.integrations.disconnect.useMutation({
    onSuccess: () => refetch(),
  });
  const updateChannel = trpc.integrations.updateSlackChannel.useMutation();

  const [slackChannel, setSlackChannel] = useState("");
  const [channelSaved, setChannelSaved] = useState(false);

  const integrations = data?.integrations ?? [];
  const isPro = data?.isPro ?? false;

  const slackIntegration = integrations.find((i) => i.provider === "slack");
  const gcalIntegration = integrations.find((i) => i.provider === "google_calendar");

  const slackMeta = slackIntegration?.metadata as
    | { teamName?: string; digestChannelName?: string }
    | null
    | undefined;
  const gcalMeta = gcalIntegration?.metadata as Record<string, unknown> | null | undefined;

  async function handleSaveChannel() {
    if (!slackChannel.trim()) return;
    await updateChannel.mutateAsync({ channel: slackChannel.trim() });
    setChannelSaved(true);
    setTimeout(() => setChannelSaved(false), 2000);
    setSlackChannel("");
    await refetch();
  }

  const successMessage: Record<string, string> = {
    slack_connected: "Slack connected successfully.",
    gcal_connected: "Google Calendar connected successfully.",
  };

  const errorMessage: Record<string, string> = {
    pro_required: "A Pro plan is required to use integrations.",
    slack_denied: "Slack authorization was denied.",
    gcal_denied: "Google Calendar authorization was denied.",
    slack_token_failed: "Failed to retrieve Slack token. Please try again.",
    gcal_token_failed: "Failed to retrieve Google Calendar token. Please try again.",
    not_configured: "This integration is not configured on the server.",
    invalid_state: "Invalid OAuth state. Please try again.",
  };

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
            <Link href="/settings/notifications" className="text-gray-500 hover:text-gray-900">
              Notifications
            </Link>
            <Link href="/billing" className="text-gray-500 hover:text-gray-900">
              Billing
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-12">
        {successParam && successMessage[successParam] && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            {successMessage[successParam]}
          </div>
        )}
        {errorParam && errorMessage[errorParam] && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {errorMessage[errorParam]}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect TodoAI to the tools you already use.
          </p>
        </div>

        {!isPro && !isLoading && (
          <div className="mb-6 rounded-xl bg-indigo-50 border border-indigo-200 px-5 py-4">
            <p className="text-sm font-medium text-indigo-900">Pro plan required</p>
            <p className="mt-1 text-sm text-indigo-700">
              Integrations are available on the Pro plan.{" "}
              <Link href="/billing" className="underline font-medium">
                Upgrade now
              </Link>
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Slack */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center flex-shrink-0">
                  <SlackIcon />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Slack</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Create todos from messages · Daily digest to a channel
                  </p>
                </div>
              </div>
              {slackIntegration ? (
                <button
                  onClick={() =>
                    disconnect.mutate({ provider: "slack" })
                  }
                  disabled={disconnect.isPending}
                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : (
                <a
                  href={isPro ? "/api/integrations/slack/connect" : undefined}
                  onClick={!isPro ? (e) => e.preventDefault() : undefined}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isPro
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Connect
                </a>
              )}
            </div>

            {slackIntegration && (
              <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                <div className="text-sm text-gray-600">
                  Connected to workspace:{" "}
                  <span className="font-medium text-gray-900">
                    {slackMeta?.teamName ?? "Unknown"}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">
                    Digest channel
                  </p>
                  {slackMeta?.digestChannelName ? (
                    <p className="text-sm text-gray-600">
                      Currently posting to{" "}
                      <span className="font-mono text-indigo-700">
                        #{slackMeta.digestChannelName}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">No channel configured.</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Channel ID (e.g. C0123456)"
                      value={slackChannel}
                      onChange={(e) => setSlackChannel(e.target.value)}
                      className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleSaveChannel}
                      disabled={updateChannel.isPending || !slackChannel.trim()}
                      className="text-sm font-medium px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {channelSaved ? "Saved!" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Google Calendar */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <GoogleCalIcon />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Google Calendar</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sync todos with due dates as calendar events
                  </p>
                </div>
              </div>
              {gcalIntegration ? (
                <button
                  onClick={() =>
                    disconnect.mutate({ provider: "google_calendar" })
                  }
                  disabled={disconnect.isPending}
                  className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                >
                  Disconnect
                </button>
              ) : (
                <a
                  href={isPro ? "/api/integrations/gcal/connect" : undefined}
                  onClick={!isPro ? (e) => e.preventDefault() : undefined}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isPro
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Connect
                </a>
              )}
            </div>

            {gcalIntegration && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-sm text-green-700 font-medium">
                  Connected · Todos with due dates sync automatically.
                </p>
                {gcalMeta && (
                  <p className="text-xs text-gray-400 mt-1">
                    {Object.keys(gcalMeta).filter((k) => k.startsWith("gcal_event_")).length} event(s) synced
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SlackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.2 14.8C6.2 15.96 5.26 16.9 4.1 16.9S2 15.96 2 14.8 2.94 12.7 4.1 12.7H6.2V14.8ZM7.25 14.8C7.25 13.64 8.19 12.7 9.35 12.7S11.45 13.64 11.45 14.8V19.9C11.45 21.06 10.51 22 9.35 22S7.25 21.06 7.25 19.9V14.8Z"
        fill="#E01E5A"
      />
      <path
        d="M9.35 6.2C8.19 6.2 7.25 5.26 7.25 4.1S8.19 2 9.35 2 11.45 2.94 11.45 4.1V6.2H9.35ZM9.35 7.25C10.51 7.25 11.45 8.19 11.45 9.35S10.51 11.45 9.35 11.45H4.1C2.94 11.45 2 10.51 2 9.35S2.94 7.25 4.1 7.25H9.35Z"
        fill="#36C5F0"
      />
      <path
        d="M17.8 9.35C17.8 8.19 18.74 7.25 19.9 7.25S22 8.19 22 9.35 21.06 11.45 19.9 11.45H17.8V9.35ZM16.75 9.35C16.75 10.51 15.81 11.45 14.65 11.45S12.55 10.51 12.55 9.35V4.1C12.55 2.94 13.49 2 14.65 2S16.75 2.94 16.75 4.1V9.35Z"
        fill="#2EB67D"
      />
      <path
        d="M14.65 17.8C15.81 17.8 16.75 18.74 16.75 19.9S15.81 22 14.65 22 12.55 21.06 12.55 19.9V17.8H14.65ZM14.65 16.75C13.49 16.75 12.55 15.81 12.55 14.65S13.49 12.55 14.65 12.55H19.9C21.06 12.55 22 13.49 22 14.65S21.06 16.75 19.9 16.75H14.65Z"
        fill="#ECB22E"
      />
    </svg>
  );
}

function GoogleCalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="#4285F4" strokeWidth="1.5" />
      <path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5" />
      <path d="M8 2v4M16 2v4" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" />
      <text x="12" y="17" textAnchor="middle" fill="#4285F4" fontSize="7" fontWeight="bold">
        {new Date().getDate()}
      </text>
    </svg>
  );
}
