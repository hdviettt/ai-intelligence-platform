import type { TopSource } from "@/lib/api";
import { THEME_STYLES } from "@/lib/format";

// Horizontal bars of the biggest sources. Shows where the corpus volume lives.
export function TopSources({ sources }: { sources: TopSource[] }) {
  if (!sources.length) return null;
  const max = Math.max(...sources.map((s) => s.count));

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <span className="text-sm font-semibold text-foreground">Top sources</span>
      <div className="mt-3 space-y-2">
        {sources.map((s) => {
          const style = THEME_STYLES[s.theme] ?? THEME_STYLES.Other;
          const pct = (s.count / max) * 100;
          return (
            <div key={s.source} className="flex items-center gap-2 text-sm">
              <span className="w-28 shrink-0 truncate text-muted" title={s.source}>
                {s.source}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ease-[var(--ease-emphasized)] ${style.dot}`}
                  style={{ width: `${Math.max(2, pct)}%`, opacity: 0.85 }}
                />
              </div>
              <span className="w-12 text-right tabular-nums text-foreground">
                {s.count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
