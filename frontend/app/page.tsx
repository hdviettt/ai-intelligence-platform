import { Suspense } from "react";
import { SearchBar } from "./components/SearchBar";
import { TrendingRail } from "./components/TrendingRail";
import { CorpusStrip } from "./components/CorpusStrip";
import { Wordmark } from "./components/Wordmark";

const EXAMPLES = [
  "What did OpenAI release recently?",
  "Latest LLM agent benchmarks",
  "Open-source model releases",
  "AI governance and safety",
];

export default function Home() {
  return (
    <div className="relative min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark />
        <a
          href="/admin"
          className="text-sm text-muted-2 transition-colors hover:text-foreground"
        >
          Control panel
        </a>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        <section className="relative flex flex-col items-center pt-16 pb-12 text-center sm:pt-24">
          <div className="hero-glow" />

          <span className="fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Live engine for the AI beat
          </span>

          <h1 className="fade-up fade-up-1 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            Search what <span className="text-gradient">actually matters</span>
            <br className="hidden sm:block" /> in AI
          </h1>
          <p className="fade-up fade-up-2 mt-4 max-w-xl text-base leading-relaxed text-muted">
            Ask anything about the AI beat. Get a cited synthesis, results
            organized by theme, and a live read on what&rsquo;s moving — across
            papers, releases, news, and discussion.
          </p>

          <div className="fade-up fade-up-2 mt-9 w-full max-w-2xl">
            <SearchBar autoFocus size="lg" />
          </div>

          <div className="fade-up fade-up-3 mt-4 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <a
                key={ex}
                href={`/search?q=${encodeURIComponent(ex)}`}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted shadow-sm transition-all hover:-translate-y-px hover:border-accent/40 hover:text-accent cursor-pointer"
              >
                {ex}
              </a>
            ))}
          </div>

          <div className="fade-up fade-up-3 mt-10 w-full border-t border-border pt-8">
            <Suspense fallback={null}>
              <CorpusStrip />
            </Suspense>
          </div>
        </section>

        <section className="mx-auto max-w-xl pb-24">
          <Suspense fallback={null}>
            <TrendingRail />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
