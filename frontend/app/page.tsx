import { Suspense } from "react";
import { SearchBar } from "./components/SearchBar";
import { TrendingRail } from "./components/TrendingRail";

const EXAMPLES = [
  "What did OpenAI release recently?",
  "Latest LLM agent benchmarks",
  "Open-source model releases",
  "AI governance and safety",
];

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 sm:px-6">
      <section className="flex flex-col items-center pt-24 pb-10 text-center sm:pt-32">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          AI Search
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
          Ask anything about the AI beat. Get a cited synthesis, results
          organized by theme, and a live read on what actually matters.
        </p>

        <div className="mt-8 w-full max-w-2xl">
          <SearchBar autoFocus />
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <a
              key={ex}
              href={`/search?q=${encodeURIComponent(ex)}`}
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-accent cursor-pointer"
            >
              {ex}
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-md pb-20">
        <Suspense fallback={null}>
          <TrendingRail />
        </Suspense>
      </section>
    </main>
  );
}
