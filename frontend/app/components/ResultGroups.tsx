import type { Result } from "@/lib/api";
import { hostOf, timeAgo } from "@/lib/format";
import { SourceIcon } from "./SourceIcon";

const THEME_ORDER = ["Releases", "Research", "News", "Discussion", "Other"];

function ResultCard({ r }: { r: Result }) {
  return (
    <a
      href={r.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border border-md-outline-variant bg-md-surface-container-low px-4 py-3.5 transition-all duration-200 ease-md-standard hover:border-md-outline hover:shadow-md-1 cursor-pointer"
    >
      <h4 className="text-[15px] font-medium leading-snug text-md-on-surface transition-colors duration-200 ease-md-standard group-hover:text-md-primary">
        {r.title}
      </h4>
      {r.summary && (
        <p className="mt-1.5 line-clamp-2 md-body-medium text-md-on-surface-variant">
          {r.summary}
        </p>
      )}
      <div className="mt-2.5 flex items-center gap-2 md-label-small text-md-on-surface-variant/70">
        <SourceIcon url={r.url} size={14} />
        <span className="font-medium text-md-on-surface-variant">{hostOf(r.url)}</span>
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
    <div className="space-y-10">
      {ordered.map((theme, gi) => {
        const items = groups.get(theme)!;
        return (
          <section key={theme} className={`fade-up fade-up-${Math.min(gi + 1, 3)}`}>
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="md-title-small text-md-on-surface">{theme}</h3>
              <span className="md-label-small text-md-on-surface-variant/70">
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
