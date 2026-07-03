import { Suspense } from "react";
import { getPersonas, type Persona } from "@/lib/api";
import { SearchBar } from "./components/SearchBar";
import { TrendingRail } from "./components/TrendingRail";
import { CorpusStrip } from "./components/CorpusStrip";
import { Wordmark } from "./components/Wordmark";
import { PersonaSwitcher } from "./components/PersonaSwitcher";
import { PersonaFeed } from "./components/PersonaFeed";
import { DailyBriefing, BriefingSkeleton } from "./components/DailyBriefing";
import { ThemeToggle } from "./components/ThemeToggle";

export const dynamic = "force-dynamic";

const EXAMPLES = [
  "What did OpenAI release recently?",
  "Latest LLM agent benchmarks",
  "Open-source model releases",
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
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark />
        <div className="flex items-center gap-1">
          <a href="/admin" className="md-btn md-btn-text">
            Control panel
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Hero — a single quiet column: headline, one line of intent, the
            search field, and a plain-text row of example queries. */}
        <section className="flex flex-col items-center pt-16 pb-14 text-center sm:pt-24 sm:pb-20">
          <h1 className="fade-up text-4xl font-normal leading-tight tracking-tight text-md-on-surface sm:text-5xl">
            What <span className="text-md-primary">actually matters</span> in AI
          </h1>
          <p className="fade-up fade-up-1 mt-5 max-w-lg md-body-large text-md-on-surface-variant">
            A curated, ranked read on the AI beat — tailored to who you are, with
            the “so what” spelled out. Ask anything, or scan today’s signal.
          </p>

          <div className="fade-up fade-up-2 mt-9 w-full max-w-2xl">
            <SearchBar autoFocus size="lg" />
          </div>

          <div className="fade-up fade-up-2 mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 md-label-medium text-md-on-surface-variant/70">
            <span>Try</span>
            {EXAMPLES.map((ex) => (
              <a
                key={ex}
                href={`/search?q=${encodeURIComponent(ex)}`}
                className="text-md-on-surface-variant underline-offset-4 transition-colors duration-200 hover:text-md-primary hover:underline cursor-pointer"
              >
                {ex}
              </a>
            ))}
          </div>
        </section>

        {/* The daily brief — auto-generated "what's new + so what". Renders only
            once a briefing exists, so it's safe before the first run. */}
        <Suspense fallback={<BriefingSkeleton />}>
          <DailyBriefing />
        </Suspense>

        {/* Corpus scale — quiet proof this is a real engine. */}
        <section className="border-t border-md-outline-variant py-10">
          <Suspense fallback={null}>
            <CorpusStrip />
          </Suspense>
        </section>

        {/* Persona-tailored signal feed — the substance. */}
        <section className="border-t border-md-outline-variant py-14 sm:py-16">
          <div className="mb-8 flex justify-center">
            <PersonaSwitcher personas={personas} active={active} />
          </div>
          <Suspense key={active} fallback={<FeedSkeleton />}>
            <PersonaFeed persona={active} />
          </Suspense>
        </section>

        {/* Trending — at the foot, quiet and condensed. */}
        <section className="border-t border-md-outline-variant py-14 pb-24">
          <Suspense fallback={null}>
            <TrendingRail />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-6"
        >
          <div className="mb-3 h-4 w-24 rounded shimmer" />
          <div className="mb-2 h-4 w-3/4 rounded shimmer" />
          <div className="h-3.5 w-full rounded shimmer" />
        </div>
      ))}
    </div>
  );
}
