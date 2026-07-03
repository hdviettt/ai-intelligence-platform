import { Suspense } from "react";
import { getPersonas, type Persona } from "@/lib/api";
import { SearchBar } from "./components/SearchBar";
import { TrendingRail } from "./components/TrendingRail";
import { CorpusStrip } from "./components/CorpusStrip";
import { Wordmark } from "./components/Wordmark";
import { PersonaSwitcher } from "./components/PersonaSwitcher";
import { PersonaFeed } from "./components/PersonaFeed";
import { ThemeToggle } from "./components/ThemeToggle";

export const dynamic = "force-dynamic";

const EXAMPLES = [
  "What did OpenAI release recently?",
  "Latest LLM agent benchmarks",
  "Open-source model releases",
  "AI governance and safety",
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const { persona = "ceo" } = await searchParams;
  let personas: Persona[] = [];
  try {
    personas = await getPersonas();
  } catch {
    personas = [];
  }
  const active = personas.some((p) => p.key === persona)
    ? persona
    : personas[0]?.key ?? "ceo";

  return (
    <div className="relative min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-1">
          <a
            href="/admin"
            className="rounded-full px-3 py-2 text-sm text-muted-2 transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
          >
            Control panel
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="relative flex flex-col items-center pt-12 pb-10 text-center sm:pt-16">
          <span className="fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-[var(--shadow-xs)]">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400" />
            Live engine for the AI beat
          </span>

          <h1 className="fade-up fade-up-1 text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
            What <span className="text-accent">actually matters</span> in AI,
            <br className="hidden sm:block" /> tailored to you
          </h1>
          <p className="fade-up fade-up-2 mt-4 max-w-xl text-base leading-relaxed text-muted">
            Not a firehose. A curated read on the AI beat, scored and ranked for
            who you are — with the &ldquo;so what&rdquo; spelled out. Ask anything,
            or scan today&rsquo;s signal below.
          </p>

          <div className="fade-up fade-up-2 mt-8 w-full max-w-2xl">
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

          <div className="fade-up fade-up-3 mt-8 w-full border-t border-border pt-6">
            <Suspense fallback={null}>
              <CorpusStrip />
            </Suspense>
          </div>
        </section>

        <section className="pb-6">
          <div className="mb-6 flex flex-col items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              Choose your lens
            </span>
            <PersonaSwitcher personas={personas} active={active} />
          </div>
        </section>

        <section className="grid gap-8 pb-24 lg:grid-cols-[1fr_340px]">
          <Suspense key={active} fallback={<FeedSkeleton />}>
            <PersonaFeed persona={active} />
          </Suspense>
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <Suspense fallback={null}>
                <TrendingRail compact />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl card p-5">
          <div className="mb-3 h-4 w-24 rounded shimmer" />
          <div className="mb-2 h-4 w-3/4 rounded shimmer" />
          <div className="h-3.5 w-full rounded shimmer" />
        </div>
      ))}
    </div>
  );
}
