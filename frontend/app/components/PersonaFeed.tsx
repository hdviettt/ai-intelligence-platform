import { getFeed } from "@/lib/api";
import { hostOf, timeAgo } from "@/lib/format";
import { SignalBadge } from "./SignalBadge";
import { SourceIcon } from "./SourceIcon";

export async function PersonaFeed({ persona }: { persona: string }) {
  let feed;
  try {
    feed = await getFeed(persona, 24);
  } catch {
    return (
      <p className="rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-6 text-center md-body-medium text-md-on-surface-variant">
        Couldn’t load the feed.
      </p>
    );
  }

  const pct = feed.coverage.total
    ? Math.round((feed.coverage.scored / feed.coverage.total) * 100)
    : 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="md-title-large text-md-on-surface">The full stream</h2>
        <span className="md-label-small text-md-on-surface-variant/70">
          everything ranked by signal · {feed.coverage.scored.toLocaleString()} of{" "}
          {feed.coverage.total.toLocaleString()} scored ({pct}%)
        </span>
      </div>

      {feed.items.length === 0 ? (
        <p className="rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-8 text-center md-body-medium text-md-on-surface-variant">
          No scored items for this persona yet — scoring is still rolling out
          across the corpus.
        </p>
      ) : (
        <div className="stagger-list space-y-4">
          {feed.items.map((it, i) => (
            <a
              key={it.id}
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-5 transition-all duration-200 ease-md-standard hover:border-md-outline hover:shadow-md-1 cursor-pointer sm:p-6"
            >
              <div className="flex items-start gap-4">
                <span className="mt-0.5 hidden w-6 shrink-0 text-lg font-normal tabular-nums text-md-on-surface-variant/50 sm:block">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <SignalBadge signal={it.signal} hypeGap={it.hype_gap} />
                    <span className="md-label-small text-md-on-surface-variant/40">·</span>
                    <span className="md-label-small text-md-on-surface-variant/70">
                      {it.theme}
                    </span>
                  </div>

                  <h3 className="text-base font-medium leading-snug text-md-on-surface transition-colors duration-200 ease-md-standard group-hover:text-md-primary sm:text-[17px]">
                    {it.title}
                  </h3>

                  {it.angle && (
                    <p className="mt-2 flex gap-1.5 md-body-medium text-md-on-surface-variant">
                      <span className="mt-px shrink-0 font-medium text-md-on-surface">
                        Why it matters:
                      </span>
                      <span>{it.angle}</span>
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2 md-label-small text-md-on-surface-variant/70">
                    <SourceIcon url={it.url} size={14} />
                    <span className="font-medium text-md-on-surface-variant">
                      {hostOf(it.url)}
                    </span>
                    {it.published_at && <span>· {timeAgo(it.published_at)}</span>}
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
