import type { Briefing, BriefingCitation, BriefingThread } from "@/lib/api";
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

// One source article — title + description — presented as a link (the item style
// from the ranked list: source, time, headline, snippet).
function Item({ c }: { c: BriefingCitation }) {
  return (
    <li className="border-t border-md-outline-variant/50 first:border-t-0">
      <a
        href={c.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block py-3.5 cursor-pointer"
      >
        <div className="flex items-center gap-1.5 text-[12.5px] text-md-on-surface-variant">
          <SourceIcon url={c.url} size={14} />
          <span>{hostOf(c.url)}</span>
          {c.published_at && (
            <span className="text-md-on-surface-variant/70">· {timeAgo(c.published_at)}</span>
          )}
        </div>
        <h4 className="mt-1 text-[16px] font-medium leading-snug text-md-primary underline-offset-2 group-hover:underline">
          {c.title}
        </h4>
        {c.snippet && (
          <p className="mt-1 text-[13px] leading-[1.5] text-md-on-surface-variant line-clamp-2">
            {c.snippet}
          </p>
        )}
      </a>
    </li>
  );
}

// A themed cluster (Web Guide group): the theme heading, a one-line "why it matters",
// then the source items grouped under it.
function Cluster({ t, byN }: { t: BriefingThread; byN: Map<number, BriefingCitation> }) {
  const items = t.sources
    .map((n) => byN.get(n))
    .filter((c): c is BriefingCitation => Boolean(c));
  if (!items.length) return null;
  return (
    <section className="mt-9 border-t border-md-outline-variant pt-7 first:mt-7">
      <h3 className="text-[19px] font-medium leading-snug tracking-[-0.01em] text-md-on-surface">
        {t.title}
      </h3>
      {t.summary && (
        <p className="mt-2 text-[14px] leading-[1.6] text-md-on-surface-variant">{t.summary}</p>
      )}
      {t.so_what && (
        <p className="mt-2 text-[13px] leading-[1.5] text-md-on-surface-variant">
          <span className="font-medium text-md-on-surface">Why it matters.</span> {t.so_what}
        </p>
      )}
      <ol className="mt-4">
        {items.map((c) => (
          <Item key={c.n} c={c} />
        ))}
      </ol>
    </section>
  );
}

// The daily briefing as a Web Guide: a synthesised overview, then the day's sources
// organised into themed clusters, with the items that don't group into a theme
// collected under "More today" at the foot.
export function DailyBriefing({
  briefing,
  personaName,
}: {
  briefing: Briefing | null;
  personaName?: string;
}) {
  if (!briefing || (!briefing.threads.length && !briefing.lede)) return null;

  const byN = new Map(briefing.citations.map((c) => [c.n, c]));
  const cited = new Set<number>();
  briefing.threads.forEach((t) => t.sources.forEach((n) => cited.add(n)));
  const loners = briefing.citations.filter((c) => !cited.has(c.n));
  const meta = [fmtDate(briefing.generated_at), `${briefing.article_count} sources`]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <section className="fade-up">
      <div className="flex items-center gap-2">
        <Icon name="auto_awesome" size={14} className="text-md-on-surface-variant" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.11em] text-md-on-surface-variant">
          Today&rsquo;s brief{personaName ? ` · ${personaName}` : ""}
        </span>
      </div>
      {meta && <p className="mt-1.5 text-[13px] text-md-on-surface-variant/70">{meta}</p>}

      {briefing.lede && (
        <p className="mt-3.5 text-[15px] font-normal leading-[1.65] text-md-on-surface">
          {briefing.lede}
        </p>
      )}

      {briefing.threads.map((t, i) => (
        <Cluster key={i} t={t} byN={byN} />
      ))}

      {loners.length > 0 && (
        <section id="more" className="mt-11 scroll-mt-24 border-t border-md-outline-variant pt-6">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-md-on-surface-variant">
            More today
          </h3>
          <p className="mt-1 text-[12px] text-md-on-surface-variant/70">
            Ranked items that didn&rsquo;t group into a theme.
          </p>
          <ol className="mt-3">
            {loners.map((c) => (
              <Item key={c.n} c={c} />
            ))}
          </ol>
        </section>
      )}
    </section>
  );
}

export function BriefingSkeleton() {
  return (
    <section>
      <div className="flex items-center gap-2.5">
        <span className="h-7 w-7 shrink-0 rounded-full shimmer" />
        <div className="h-3 w-40 rounded shimmer" />
      </div>
      <div className="mt-6 space-y-2.5">
        <div className="h-5 w-full rounded shimmer" />
        <div className="h-5 w-5/6 rounded shimmer" />
        <div className="h-5 w-2/3 rounded shimmer" />
      </div>
      <div className="mt-10 space-y-8">
        {[0, 1, 2].map((s) => (
          <div key={s} className="space-y-3">
            <div className="h-5 w-52 rounded shimmer" />
            <div className="ml-4 h-8 w-2/3 rounded shimmer" />
            <div className="h-4 w-full rounded shimmer" />
            <div className="h-4 w-5/6 rounded shimmer" />
          </div>
        ))}
      </div>
    </section>
  );
}
