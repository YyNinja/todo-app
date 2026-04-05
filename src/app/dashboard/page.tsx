import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { QuickAddModal } from "@/components/quick-add-modal";
import { TopThreeWidget } from "@/components/top-three-widget";
import { TodoList } from "@/components/todo-list";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <span className="text-lg font-semibold text-indigo-600">TodoAI</span>
          <div className="flex items-center gap-4">
            <QuickAddModal />
            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? "Avatar"}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-medium">
                  {(user.name ?? user.email)[0].toUpperCase()}
                </div>
              )}
              <span className="hidden sm:block">{user.name ?? user.email}</span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good{getGreeting()},{" "}
            {user.name?.split(" ")[0] ?? "there"}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here&apos;s what needs your attention today.
          </p>
        </div>

        <TopThreeWidget />

        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
            All Tasks
          </h2>
          <TodoList />
        </section>
      </main>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return " morning";
  if (h < 17) return " afternoon";
  return " evening";
}
