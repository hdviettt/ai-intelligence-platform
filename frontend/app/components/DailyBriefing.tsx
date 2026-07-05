import { getBriefing, type BriefingCitation } from "@/lib/api";
import { hostOf, timeAgo } from "@/lib/format";
import { Icon } from "./Icon";
import { SourceIcon } from "./SourceIcon";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// A source under a thread — Web Guide style: favicon + source + title + snippet + date.
function SourceCard({ c }: { c: BriefingCitation }) {
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-md-outline-variant bg-md-surface-container-low px-4 py-3 transition-all duration-200 ease-md-standard hover:border-md-outline hover:shadow-md-1 cursor-pointer"
    >
      <div className="mb-1.5 flex items-center gap-2 md-label-small text-md-on-surface-variant/70">
        <SourceIcon url={c.url} size={14} />
        <span className="truncate font-medium text-md-on-surface-variant">{hostOf(c.url)}</span>
        {c.published_at && <span className="shrink-0">· {timeAgo(c.published_at)}</span>}
      </div>
      <h4 className="text-[15px] font-medium leading-snug text-md-on-surface transition-colors duration-200 ease-md-standard group-hover:text-md-primary">
        {c.title}
      </h4>
      {c.snippet && (
        <p className="mt-1 line-clamp-2 md-body-medium text-md-on-surface-variant">{c.snippet}</p>
      )}
    </a>
  );
}

// The auto-generated daily briefing — a lede plus themed threads, each with an AI
// description and its source cards (Google Web Guide layout). Renders nothing until
// the first briefing exists, so the page is safe before then.
export async function DailyBriefing() {
  let briefing;
  try {
    briefing = await getBriefing("daily");
  } catch {
    return null;
  }
  if (!briefing || (!briefing.threads.length && !briefing.lede)) return null;

  const byN = new Map(briefing.citations.map((c) => [c.n, c]));

  return (
    <section className="fade-up">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-md-primary text-md-on-primary">
          <Icon name="auto_awesome" size={18} filled />
        </span>
        <div className="min-w-0">
          <h2 className="md-title-large leading-tight text-md-on-surface">The daily brief</h2>
          <p className="md-label-small text-md-on-surface-variant/70">
            {[fmtDate(briefing.generated_at), `${briefing.article_count} sources`, "auto-synthesized"]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {briefing.lede && (
        <p className="mb-9 max-w-2xl text-lg leading-8 text-md-on-surface">{briefing.lede}</p>
      )}

      <div className="space-y-9">
        {briefing.threads.map((t, i) => {
          const cards = t.sources
            .map((n) => byN.get(n))
            .filter((c): c is BriefingCitation => Boolean(c));
          if (!cards.length) return null;
          return (
            <section key={i}>
              <h3 className="md-title-medium font-medium tracking-tight text-md-on-surface">
                {t.title}
              </h3>
              {t.summary && (
                <p className="mt-1.5 max-w-2xl md-body-medium text-md-on-surface-variant">
                  {t.summary}
                </p>
              )}
              <div className="mt-4 grid gap-2.5">
                {cards.map((c) => (
                  <SourceCard key={c.n} c={c} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function BriefingSkeleton() {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <span className="h-9 w-9 shrink-0 rounded-full shimmer" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded shimmer" />
          <div className="h-3 w-48 rounded shimmer" />
        </div>
      </div>
      <div className="mb-9 h-5 w-3/4 rounded shimmer" />
      <div className="space-y-9">
        {[0, 1].map((s) => (
          <div key={s}>
            <div className="mb-2 h-5 w-40 rounded shimmer" />
            <div className="mb-4 h-3.5 w-2/3 rounded shimmer" />
            <div className="grid gap-2.5">
              {[0, 1].map((c) => (
                <div
                  key={c}
                  className="rounded-xl border border-md-outline-variant bg-md-surface-container-low px-4 py-3"
                >
                  <div className="mb-2 h-3 w-28 rounded shimmer" />
                  <div className="mb-1.5 h-4 w-3/4 rounded shimmer" />
                  <div className="h-3.5 w-full rounded shimmer" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
