import type { Result } from "@/lib/api";
import { hostOf, THEME_STYLES, timeAgo } from "@/lib/format";
import { SourceIcon } from "./SourceIcon";

const THEME_ORDER = ["Releases", "Research", "News", "Discussion", "Other"];

function ResultCard({ r }: { r: Result }) {
  const style = THEME_STYLES[r.theme] ?? THEME_STYLES.Other;
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-xl border border-border bg-surface pl-4 pr-4 py-3.5 transition-all hover:border-border-strong hover:shadow-[var(--shadow-md)] cursor-pointer"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${style.rail} opacity-70 transition-opacity group-hover:opacity-100`} />
      <h4 className="pl-2 text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-accent">
        {r.title}
      </h4>
      {r.summary && (
        <p className="mt-1.5 pl-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {r.summary}
        </p>
      )}
      <div className="mt-2.5 flex items-center gap-2 pl-2 text-xs text-muted-2">
        <SourceIcon url={r.url} size={14} />
        <span className="font-medium text-muted">{hostOf(r.url)}</span>
        {r.published_at && <span>· {timeAgo(r.published_at)}</span>}
      </div>
    </a>
  );
}

export function ResultGroups({ results }: { results: Result[] }) {
  const groups = new Map<string, Result[]>();
  for (const r of results) {
    const t = r.theme || "Other";
    if (!groups.has(t)) groups.set(t, []);
    groups.get(t)!.push(r);
  }
  const ordered = THEME_ORDER.filter((t) => groups.has(t));

  return (
    <div className="space-y-7">
      {ordered.map((theme, gi) => {
        const style = THEME_STYLES[theme] ?? THEME_STYLES.Other;
        const items = groups.get(theme)!;
        return (
          <section key={theme} className={`fade-up fade-up-${Math.min(gi + 1, 3)}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
              <h3 className={`text-sm font-semibold ${style.label}`}>{theme}</h3>
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted-2">
                {items.length}
              </span>
            </div>
            <div className="grid gap-2.5">
              {items.map((r) => (
                <ResultCard key={r.id} r={r} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
