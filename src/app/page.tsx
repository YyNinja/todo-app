import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="max-w-2xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          Now in beta
        </div>

        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Your tasks,{" "}
          <span className="text-indigo-600">prioritized by AI</span>
        </h1>

        <p className="mt-6 text-lg text-gray-600 leading-relaxed">
          Stop managing your task manager. TodoAI captures tasks from natural
          language, auto-prioritizes your day, and surfaces the right task at
          the right moment.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
          >
            Sign in →
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          {[
            {
              title: "Natural language capture",
              desc: "Type tasks the way you think. AI parses them into structured todos instantly.",
            },
            {
              title: "AI daily top 3",
              desc: "Every morning, AI surfaces the 3 tasks that matter most based on deadlines and context.",
            },
            {
              title: "Shared lists",
              desc: "Collaborate with your team. Assign tasks, leave comments, ship together.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <h3 className="font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
