import { getBriefing, type BriefingCitation, type BriefingThread } from "@/lib/api";
import { hostOf } from "@/lib/format";
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

// Sources under a thread — one quiet inline line of links, not a row of pills.
function SourceLine({ cites }: { cites: BriefingCitation[] }) {
  if (!cites.length) return null;
  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-md-on-surface-variant">
      <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-md-on-surface-variant/55">
        Sources
      </span>
      {cites.map((c) => (
        <a
          key={c.n}
          href={c.url}
          target="_blank"
          rel="noopener noreferrer"
          title={c.title}
          className="inline-flex items-center gap-1.5 underline-offset-4 transition-colors duration-200 ease-md-standard hover:text-md-on-surface hover:underline cursor-pointer"
        >
          <SourceIcon url={c.url} size={13} />
          <span className="max-w-[180px] truncate">{hostOf(c.url)}</span>
        </a>
      ))}
    </p>
  );
}

// One thread as a typographic block — heading, substance, a blue left-ruled
// "why it matters" (a border keeps full chroma in dark, where a tint dies), and
// a quiet source line. Blocks are divided by a hairline, never boxed.
function Thread({ t, byN }: { t: BriefingThread; byN: Map<number, BriefingCitation> }) {
  const cites = t.sources
    .map((n) => byN.get(n))
    .filter((c): c is BriefingCitation => Boolean(c));
  return (
    <li className="border-t border-md-outline-variant/50 py-9 first:border-t-0 first:pt-0">
      <h3 className="text-[19px] font-semibold leading-[1.35] tracking-[-0.01em] text-md-on-surface">
        {t.title}
      </h3>
      {t.summary && (
        <p className="mt-2.5 text-[16px] leading-[1.62] text-md-on-surface/85">{t.summary}</p>
      )}
      {t.so_what && (
        <div className="mt-4 border-l-2 border-md-primary pl-4">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.09em] text-md-primary">
            Why it matters
          </span>
          <p className="mt-1 text-[15px] leading-[1.55] text-md-on-surface">{t.so_what}</p>
        </div>
      )}
      <SourceLine cites={cites} />
    </li>
  );
}

// The auto-generated daily briefing, written through a persona's lens, rendered as
// a broadsheet: an eyebrow, a dominant lede, then a hairline-separated column of
// themed threads. Renders nothing until the first briefing exists.
export async function DailyBriefing({
  persona = "ceo",
  personaName,
}: {
  persona?: string;
  personaName?: string;
}) {
  let briefing;
  try {
    briefing = await getBriefing("daily", persona);
  } catch {
    return null;
  }
  if (!briefing || (!briefing.threads.length && !briefing.lede)) return null;

  const byN = new Map(briefing.citations.map((c) => [c.n, c]));
  const meta = [fmtDate(briefing.generated_at), `${briefing.article_count} sources`]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <section className="fade-up">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-md-primary text-md-on-primary">
          <Icon name="auto_awesome" size={15} filled />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.11em] text-md-on-surface-variant">
          Today&rsquo;s brief{personaName ? ` · ${personaName}` : ""}
        </span>
      </div>
      {meta && <p className="mt-2 text-[13px] text-md-on-surface-variant/70">{meta}</p>}

      {briefing.lede && (
        <p className="mt-5 text-[26px] font-normal leading-[1.28] tracking-[-0.02em] text-md-on-surface sm:text-[30px]">
          {briefing.lede}
        </p>
      )}

      <ol className="mt-8">
        {briefing.threads.map((t, i) => (
          <Thread key={i} t={t} byN={byN} />
        ))}
      </ol>
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
        <div className="h-7 w-full rounded shimmer" />
        <div className="h-7 w-3/4 rounded shimmer" />
      </div>
      <div className="mt-10 space-y-8">
        {[0, 1, 2].map((s) => (
          <div key={s} className="space-y-3">
            <div className="h-5 w-52 rounded shimmer" />
            <div className="h-4 w-full rounded shimmer" />
            <div className="h-4 w-5/6 rounded shimmer" />
            <div className="ml-4 h-9 w-2/3 rounded shimmer" />
          </div>
        ))}
      </div>
    </section>
  );
}
