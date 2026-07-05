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

// A source under a thread — a compact chip, not a full card.
function SourceChip({ c }: { c: BriefingCitation }) {
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      title={c.title}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-full border border-md-outline-variant bg-md-surface px-2.5 py-1 md-label-small text-md-on-surface-variant transition-colors duration-200 ease-md-standard hover:border-md-outline hover:text-md-on-surface cursor-pointer"
    >
      <SourceIcon url={c.url} size={13} />
      <span className="truncate">{hostOf(c.url)}</span>
    </a>
  );
}

// One thread, as a self-contained card: bold heading, the substance, a highlighted
// "why it matters", then the sources as chips.
function ThreadCard({ t, byN }: { t: BriefingThread; byN: Map<number, BriefingCitation> }) {
  const cards = t.sources
    .map((n) => byN.get(n))
    .filter((c): c is BriefingCitation => Boolean(c));
  return (
    <div className="rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-5 transition-shadow duration-200 ease-md-standard hover:shadow-md-1 sm:p-6">
      <h3 className="text-lg font-semibold leading-snug tracking-tight text-md-on-surface sm:text-xl">
        {t.title}
      </h3>
      {t.summary && (
        <p className="mt-2 text-[15px] leading-relaxed text-md-on-surface-variant">{t.summary}</p>
      )}
      {t.so_what && (
        <div className="mt-3.5 rounded-lg bg-md-primary/[0.07] px-3.5 py-2.5 text-[15px] leading-relaxed">
          <span className="font-semibold text-md-primary">Why it matters </span>
          <span className="text-md-on-surface">{t.so_what}</span>
        </div>
      )}
      {cards.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-md-outline-variant pt-4">
          {cards.map((c) => (
            <SourceChip key={c.n} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// The auto-generated daily briefing, written through a persona's lens, as a card
// digest: a confident lede, then one card per themed thread. Renders nothing until
// the first briefing exists, so the page is safe before then.
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

  return (
    <section className="fade-up">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-md-primary text-md-on-primary">
          <Icon name="auto_awesome" size={18} filled />
        </span>
        <div className="min-w-0">
          <h2 className="md-title-large leading-tight text-md-on-surface">
            Today&rsquo;s brief{personaName ? " for " : ""}
            {personaName && <span className="text-md-primary">{personaName}</span>}
          </h2>
          <p className="md-label-small text-md-on-surface-variant/70">
            {[fmtDate(briefing.generated_at), `${briefing.article_count} sources`, "auto-synthesized"]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {briefing.lede && (
        <p className="mb-8 text-xl font-normal leading-snug tracking-tight text-md-on-surface sm:text-[26px] sm:leading-[1.32]">
          {briefing.lede}
        </p>
      )}

      <div className="space-y-4">
        {briefing.threads.map((t, i) => (
          <ThreadCard key={i} t={t} byN={byN} />
        ))}
      </div>
    </section>
  );
}

export function BriefingSkeleton() {
  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <span className="h-9 w-9 shrink-0 rounded-full shimmer" />
        <div className="space-y-1.5">
          <div className="h-4 w-40 rounded shimmer" />
          <div className="h-3 w-52 rounded shimmer" />
        </div>
      </div>
      <div className="mb-8 space-y-2">
        <div className="h-6 w-full rounded shimmer" />
        <div className="h-6 w-2/3 rounded shimmer" />
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className="rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-6"
          >
            <div className="mb-3 h-5 w-48 rounded shimmer" />
            <div className="mb-2 h-3.5 w-full rounded shimmer" />
            <div className="mb-4 h-3.5 w-5/6 rounded shimmer" />
            <div className="h-9 w-full rounded-lg shimmer" />
          </div>
        ))}
      </div>
    </section>
  );
}
