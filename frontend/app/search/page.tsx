import { Suspense } from "react";
import { search } from "@/lib/api";
import { AnswerBlock, AnswerSkeleton } from "../components/AnswerBlock";
import { ResultGroups } from "../components/ResultGroups";
import { SearchBar } from "../components/SearchBar";
import { TrendingRail } from "../components/TrendingRail";
import { Wordmark } from "../components/Wordmark";

export const dynamic = "force-dynamic";

async function Results({ q }: { q: string }) {
  let data;
  try {
    data = await search(q, 12);
  } catch {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Something went wrong reaching the search service. Try again.
      </div>
    );
  }

  if (!data.results.length) {
    return (
      <div className="rounded-2xl card p-8 text-center">
        <p className="text-sm text-muted">
          No indexed sources cover &ldquo;{q}&rdquo; yet. The corpus is still
          growing — try a broader query.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {data.answer && <AnswerBlock data={data} />}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-muted-2" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h12" strokeLinecap="round" />
          </svg>
          Sources, organized by theme
        </h2>
        <ResultGroups results={data.results} />
      </div>
    </div>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6">
          <div className="shrink-0">
            <Wordmark />
          </div>
          <div className="flex-1">
            <SearchBar initial={query} size="md" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {!query ? (
          <p className="py-24 text-center text-muted">Type a question to begin.</p>
        ) : (
          <>
            <div className="border-b border-border py-4">
              <p className="text-sm text-muted-2">
                Results for{" "}
                <span className="font-medium text-foreground">
                  &ldquo;{query}&rdquo;
                </span>
              </p>
            </div>
            <div className="grid gap-8 py-7 lg:grid-cols-[1fr_340px]">
              <Suspense key={query} fallback={<AnswerSkeleton />}>
                <Results q={query} />
              </Suspense>
              <div className="hidden lg:block">
                <div className="sticky top-24">
                  <Suspense fallback={null}>
                    <TrendingRail compact />
                  </Suspense>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
