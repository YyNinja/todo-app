import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link href="/dashboard" className="text-lg font-semibold text-indigo-600">
            TodoAI
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-8">Your profile</h1>

          <div className="flex flex-col items-center gap-4 mb-8">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name ?? "Avatar"}
                className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-100"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-3xl font-semibold">
                {(user.name ?? user.email)[0].toUpperCase()}
              </div>
            )}
          </div>

          <dl className="space-y-4">
            {user.name && (
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="text-sm text-gray-900">{user.name}</dd>
              </div>
            )}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="text-sm text-gray-900">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-500">Email verified</dt>
              <dd className="text-sm text-gray-900">
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-green-700">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="text-amber-600">Not verified</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm font-medium text-gray-500">Member since</dt>
              <dd className="text-sm text-gray-900">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </dd>
            </div>
          </dl>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3">
            <Link
              href="/settings/notifications"
              className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              Notification preferences
            </Link>
            <SignOutButton className="w-full" />
          </div>
        </div>
      </main>
    </div>
  );
}
