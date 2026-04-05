import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { QuickAddModal } from "@/components/quick-add-modal";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { user } = session;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <span className="text-base font-semibold text-indigo-600">TodoAI</span>
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
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-medium">
                  {(user.name ?? user.email)[0].toUpperCase()}
                </div>
              )}
              <span className="hidden sm:block text-sm">{user.name ?? user.email}</span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
