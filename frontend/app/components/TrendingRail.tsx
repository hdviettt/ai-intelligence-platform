import { getTrending } from "@/lib/api";
import { hostOf, THEME_STYLES, timeAgo } from "@/lib/format";
import { SourceIcon } from "./SourceIcon";

export async function TrendingRail({ compact = false }: { compact?: boolean }) {
  let items;
  try {
    items = await getTrending(compact ? 8 : 10);
  } catch {
    return null;
  }
  if (!items?.length) return null;

  return (
    <aside className="overflow-hidden rounded-2xl card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 7v5h-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="text-sm font-semibold text-foreground">Trending in AI</h2>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600 dark:bg-green-400" />
          live
        </span>
      </div>

      <ol className="divide-y divide-border">
        {items.map((t, i) => {
          const style = THEME_STYLES[t.theme] ?? THEME_STYLES.Other;
          return (
            <li key={t.id}>
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 px-5 py-3 transition-colors hover:bg-surface-2 cursor-pointer"
              >
                <span
                  className={`mt-0.5 w-5 shrink-0 text-center text-sm font-bold tabular-nums ${
                    i < 3 ? "text-accent" : "text-muted-2"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-accent line-clamp-2">
                    {t.title}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-2">
                    <SourceIcon url={t.url} size={14} />
                    <span className="truncate">{hostOf(t.url)}</span>
                    <span
                      className={`ml-0.5 rounded px-1.5 py-px text-[10px] font-medium ring-1 ring-inset ${style.chip}`}
                    >
                      {t.theme}
                    </span>
                    {t.published_at && (
                      <span className="ml-auto shrink-0">{timeAgo(t.published_at)}</span>
                    )}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
