import { Suspense } from "react";
import { getBriefing, getPersonas, type Briefing, type Persona } from "@/lib/api";
import { SearchBar } from "./components/SearchBar";
import { CorpusStrip } from "./components/CorpusStrip";
import { Wordmark } from "./components/Wordmark";
import { PersonaSwitcher } from "./components/PersonaSwitcher";
import { DailyBriefing } from "./components/DailyBriefing";
import { SinceYouLastLooked } from "./components/SinceYouLastLooked";
import { ThemeToggle } from "./components/ThemeToggle";

export const dynamic = "force-dynamic";

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
  const activeName = personas.find((p) => p.key === active)?.name;

  // One fetch drives both the brief and the ranked list below it, so the list is
  // provably the pool the brief summarises — never a disconnected second feed.
  let briefing: Briefing | null = null;
  try {
    briefing = await getBriefing("daily", active);
  } catch {
    briefing = null;
  }

  return (
    <div className="min-h-screen">
      {/* Slim, sticky header. Search is a persistent field here — always reachable,
          never the gate. The brief is the front door. */}
      <header className="sticky top-0 z-20 border-b border-md-outline-variant bg-md-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[860px] items-center gap-4 px-4 py-3 sm:px-6">
          <Wordmark />
          <div className="hidden flex-1 justify-center px-4 sm:flex">
            <div className="w-full max-w-sm">
              <SearchBar size="md" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <a href="/admin" className="md-btn md-btn-text">
              Control panel
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[860px] px-4 pb-24 sm:px-6">
        {/* The returning-habit hook: what changed since you last looked. */}
        <div className="py-5">
          <SinceYouLastLooked briefDate={briefing?.generated_at} />
        </div>

        <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-[168px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <nav className="flex flex-col items-start gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-md-on-surface-variant/60">
                  On this page
                </span>
                <a href="#brief" className="text-[13px] text-md-on-surface-variant transition-colors duration-200 hover:text-md-on-surface">
                  Today&rsquo;s brief
                </a>
                <a href="#more" className="text-[13px] text-md-on-surface-variant transition-colors duration-200 hover:text-md-on-surface">
                  More today
                </a>
              </nav>
              <div className="space-y-2.5 border-t border-md-outline-variant pt-5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-md-on-surface-variant/60">
                  Lens
                </span>
                <PersonaSwitcher personas={personas} active={active} layout="rail" />
              </div>
            </div>
          </aside>

          <div id="brief" className="min-w-0 scroll-mt-24">
            <DailyBriefing briefing={briefing} personaName={activeName} />
          </div>
        </div>

        {/* Corpus scale — quiet proof this is a real engine, at the foot. */}
        <footer className="mt-20 border-t border-md-outline-variant pt-8">
          <Suspense fallback={null}>
            <CorpusStrip />
          </Suspense>
        </footer>
      </main>
    </div>
  );
}
