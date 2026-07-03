import { getFeed } from "@/lib/api";
import { hostOf, THEME_STYLES, timeAgo } from "@/lib/format";
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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="md-title-large text-md-on-surface">
          Today for <span className="text-md-primary">{feed.persona_name}</span>
        </h2>
        <span className="md-label-small text-md-on-surface-variant/70">
          ranked by signal · {feed.coverage.scored.toLocaleString()} of{" "}
          {feed.coverage.total.toLocaleString()} scored ({pct}%)
        </span>
      </div>

      {feed.items.length === 0 ? (
        <p className="rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-8 text-center md-body-medium text-md-on-surface-variant">
          No scored items for this persona yet — scoring is still rolling out
          across the corpus.
        </p>
      ) : (
        <div className="stagger-list space-y-3">
          {feed.items.map((it, i) => {
            const style = THEME_STYLES[it.theme] ?? THEME_STYLES.Other;
            return (
              <a
                key={it.id}
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-4 pl-5 transition-all duration-200 ease-md-standard hover:shadow-md-2 cursor-pointer sm:p-5 sm:pl-6"
              >
                <span className={`absolute inset-y-0 left-0 w-1.5 ${style.rail}`} />
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 hidden w-6 shrink-0 text-lg font-medium tabular-nums text-md-on-surface-variant/70 sm:block">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <SignalBadge signal={it.signal} hypeGap={it.hype_gap} />
                      <span
                        className={`rounded-full px-1.5 py-0.5 md-label-small ring-1 ring-inset ${style.chip}`}
                      >
                        {it.theme}
                      </span>
                    </div>

                    <h3 className="text-[15px] font-medium leading-snug text-md-on-surface transition-colors duration-200 ease-md-standard group-hover:text-md-primary sm:text-base">
                      {it.title}
                    </h3>

                    {it.angle && (
                      <p className="mt-1.5 flex gap-1.5 md-body-medium text-md-on-surface-variant">
                        <span className="mt-0.5 shrink-0 font-medium text-md-primary">
                          Why it matters:
                        </span>
                        <span>{it.angle}</span>
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center gap-2 md-label-small text-md-on-surface-variant/70">
                      <SourceIcon url={it.url} size={14} />
                      <span className="font-medium text-md-on-surface-variant">
                        {hostOf(it.url)}
                      </span>
                      {it.published_at && <span>· {timeAgo(it.published_at)}</span>}
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
