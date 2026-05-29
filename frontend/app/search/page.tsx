import Link from "next/link";
import { Suspense } from "react";
import { search } from "@/lib/api";
import { AnswerBlock } from "../components/AnswerBlock";
import { ResultGroups } from "../components/ResultGroups";
import { SearchBar } from "../components/SearchBar";
import { TrendingRail } from "../components/TrendingRail";

export const dynamic = "force-dynamic";

async function Results({ q }: { q: string }) {
  let data;
  try {
    data = await search(q, 12);
  } catch {
    return (
      <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        Something went wrong reaching the search service. Try again.
      </p>
    );
  }

  if (!data.results.length) {
    return (
      <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        No indexed sources cover “{q}” yet. The corpus is still growing.
      </p>
    );
  }

  return (
    <div className="space-y-7">
      {data.answer && <AnswerBlock data={data} />}
      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
          Sources, by theme
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
    <main className="mx-auto min-h-screen max-w-5xl px-4 sm:px-6">
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/85 py-4 backdrop-blur">
        <Link href="/" className="shrink-0 font-semibold text-foreground">
          AI<span className="text-accent">Search</span>
        </Link>
        <div className="flex-1">
          <SearchBar initial={query} />
        </div>
      </header>

      {!query ? (
        <p className="py-16 text-center text-muted">Type a question to begin.</p>
      ) : (
        <div className="grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
          <Suspense
            key={query}
            fallback={
              <p className="text-sm text-muted">Searching “{query}”…</p>
            }
          >
            <Results q={query} />
          </Suspense>
          <div className="hidden lg:block">
            <Suspense fallback={null}>
              <TrendingRail />
            </Suspense>
          </div>
        </div>
      )}
    </main>
  );
}
