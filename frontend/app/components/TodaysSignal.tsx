import type { Briefing } from "@/lib/api";
import { hostOf, timeAgo } from "@/lib/format";
import { SourceIcon } from "./SourceIcon";

// The full ranked pool the brief is drawn from — same articles, in ranking order,
// with the ones the brief actually synthesised marked "In brief". This is what makes
// the brief provably the summary of the list, not a disconnected second feed.
export function TodaysSignal({ briefing }: { briefing: Briefing | null }) {
  if (!briefing || !briefing.citations.length) return null;

  const cited = new Set<number>();
  briefing.threads.forEach((t) => t.sources.forEach((n) => cited.add(n)));

  return (
    <section id="signal" className="mt-16 scroll-mt-24 border-t border-md-outline-variant pt-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.11em] text-md-on-surface-variant">
        Today&rsquo;s signal
      </h2>
      <p className="mt-1.5 text-[13px] text-md-on-surface-variant/70">
        Everything today, ranked — your brief above summarises the top of this.
      </p>

      <ol className="mt-5">
        {briefing.citations.map((c, i) => {
          const inBrief = cited.has(c.n);
          return (
            <li key={c.n} className="border-t border-md-outline-variant/50 first:border-t-0">
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-4 py-4 cursor-pointer"
              >
                <span className="w-6 shrink-0 pt-0.5 font-mono text-[13px] tabular-nums text-md-on-surface-variant/40">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {inBrief && (
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-md-primary">
                        In brief
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-[12px] text-md-on-surface-variant/70">
                      <SourceIcon url={c.url} size={12} />
                      {hostOf(c.url)}
                      {c.published_at ? ` · ${timeAgo(c.published_at)}` : ""}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[15px] font-medium leading-snug text-md-on-surface transition-colors duration-200 ease-md-standard group-hover:text-md-primary">
                    {c.title}
                  </span>
                  {c.snippet && (
                    <span className="mt-1 block text-[13px] leading-[1.55] text-md-on-surface-variant line-clamp-2">
                      {c.snippet}
                    </span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
