import {
  getCoverage,
  getPipelineRuns,
  getStats,
  getTopSources,
} from "@/lib/api";
import { CoverageChart } from "../components/CoverageChart";
import { PipelineRuns } from "../components/PipelineRuns";
import { SourcesManager } from "../components/SourcesManager";
import { StatCards } from "../components/StatCards";
import { ThemeDonut } from "../components/ThemeDonut";
import { ThemeToggle } from "../components/ThemeToggle";
import { TopSources } from "../components/TopSources";
import { Wordmark } from "../components/Wordmark";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let stats, coverage, topSources, pipelineRuns;
  try {
    [stats, coverage, topSources, pipelineRuns] = await Promise.all([
      getStats(),
      getCoverage("year"),
      getTopSources(12),
      getPipelineRuns(12),
    ]);
  } catch {
    return (
      <main className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm text-muted">Couldn’t reach the backend.</p>
      </main>
    );
  }

  const distinctSources = new Set(stats.by_source.map((s) => s.source)).size;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Wordmark />
        <span className="text-muted">/</span>
        <h1 className="font-medium text-foreground">Control panel</h1>
        <span className="ml-auto rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-400/15 dark:text-green-300">
          live
        </span>
        <ThemeToggle />
      </header>

      <StatCards
        total={stats.total}
        embedded={stats.embedded}
        chunks={stats.chunks}
        sources={distinctSources}
      />

      <section className="mt-6">
        <h2 className="mb-2.5 text-sm font-semibold text-foreground">
          Content coverage over time
        </h2>
        <CoverageChart points={coverage} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <ThemeDonut themes={stats.by_theme} />
        <TopSources sources={topSources} />
      </section>

      <section className="mt-8">
        <h2 className="mb-2.5 text-sm font-semibold text-foreground">Sources</h2>
        <SourcesManager />
      </section>

      <section className="mt-8">
        <h2 className="mb-2.5 text-sm font-semibold text-foreground">
          What each trigger changed
        </h2>
        <PipelineRuns runs={pipelineRuns} />
      </section>
    </main>
  );
}
