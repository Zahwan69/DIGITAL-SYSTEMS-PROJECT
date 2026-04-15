import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-16 text-center">
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-center gap-2">
          <span className="text-4xl">⚡</span>
          <span className="text-4xl font-bold text-indigo-600">StudyAI</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Practice smarter with AI feedback
        </h1>

        <p className="text-lg text-slate-600">
          Upload Cambridge past papers, let AI extract every question, then
          practise and get instant marking — all while earning XP and streaks.
        </p>

        <div className="grid gap-4 pt-4 sm:grid-cols-3">
          {[
            {
              icon: "📄",
              title: "Upload any past paper",
              body: "PDF upload with AI question extraction in seconds.",
            },
            {
              icon: "🤖",
              title: "AI marking",
              body: "Get scored feedback and model answers for every attempt.",
            },
            {
              icon: "🏆",
              title: "Earn XP & streaks",
              body: "Level up as you study and keep your streak alive.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="text-3xl">{card.icon}</div>
              <h2 className="mt-2 font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{card.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signup"
            className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
          >
            Get started free
          </Link>
          <Link
            href="/auth/login"
            className="rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
