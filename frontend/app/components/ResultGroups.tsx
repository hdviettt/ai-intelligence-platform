import type { Result } from "@/lib/api";
import { hostOf, THEME_STYLES, timeAgo } from "@/lib/format";

const THEME_ORDER = ["Releases", "Research", "News", "Discussion", "Other"];

function ResultCard({ r }: { r: Result }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent/40 hover:bg-accent-soft/30 cursor-pointer"
    >
      <h4 className="text-[15px] font-medium leading-snug text-foreground group-hover:text-accent transition-colors">
        {r.title}
      </h4>
      {r.summary && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
          {r.summary}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <span className="font-medium">{hostOf(r.url)}</span>
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
    <div className="space-y-6">
      {ordered.map((theme) => {
        const style = THEME_STYLES[theme] ?? THEME_STYLES.Other;
        const items = groups.get(theme)!;
        return (
          <section key={theme}>
            <div className="mb-2.5 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <h3 className={`text-sm font-semibold ${style.label}`}>{theme}</h3>
              <span className="text-xs text-muted">{items.length}</span>
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
