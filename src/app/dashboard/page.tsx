import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { TopThreeWidget } from "@/components/top-three-widget";
import { TodoList } from "@/components/todo-list";
import { DailyBriefing } from "@/components/daily-briefing";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;

  return (
    <div className="px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good{getGreeting()},{" "}
          {user?.name?.split(" ")[0] ?? "there"}!
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      <DailyBriefing />

      <TopThreeWidget />

      <section>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          All Tasks
        </h2>
        <TodoList />
      </section>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return " morning";
  if (h < 17) return " afternoon";
  return " evening";
}
