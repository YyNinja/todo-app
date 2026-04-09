import Link from "next/link";

const freeFeatures = [
  "Up to 3 shared lists",
  "Natural language task entry",
  "Basic AI parsing",
  "Unlimited personal tasks",
];

const proFeatures = [
  "Unlimited shared lists",
  "Natural language task entry",
  "Advanced AI parsing",
  "Unlimited personal tasks",
  "AI daily briefings",
  "Smart task breakdown",
  "AI-powered scheduling",
  "Semantic search",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <Link href="/" className="text-base font-semibold text-indigo-600">
            TodoAI
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Start for free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 max-w-3xl mx-auto">
          {/* Free tier */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Free</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
              <p className="mt-2 text-sm text-gray-500">Perfect for personal use</p>
            </div>

            <ul className="space-y-3 mb-8">
              {freeFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <svg className="h-4 w-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="block text-center text-sm px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Get started free
            </Link>
          </div>

          {/* Pro tier */}
          <div className="bg-indigo-600 rounded-2xl shadow-lg p-8 relative">
            <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              Popular
            </div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white">Pro</h2>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">$9</span>
                <span className="text-indigo-200 text-sm">/month</span>
              </div>
              <p className="mt-2 text-sm text-indigo-200">For power users and teams</p>
            </div>

            <ul className="space-y-3 mb-8">
              {proFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white">
                  <svg className="h-4 w-4 text-indigo-200 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/billing"
              className="block text-center text-sm px-4 py-2.5 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-semibold"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
