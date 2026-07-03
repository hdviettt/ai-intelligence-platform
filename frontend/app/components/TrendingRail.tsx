import { getTrending } from "@/lib/api";
import { hostOf, THEME_STYLES, timeAgo } from "@/lib/format";
import { Icon } from "./Icon";
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
    <aside className="overflow-hidden rounded-2xl border border-md-outline-variant bg-md-surface-container-low shadow-md-1">
      <div className="flex items-center gap-2 border-b border-md-outline-variant px-5 py-3.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
          <Icon name="trending_up" size={14} weight={600} />
        </span>
        <h2 className="md-title-medium text-md-on-surface">Trending in AI</h2>
        <span className="ml-auto flex items-center gap-1.5 md-label-small text-md-on-surface-variant/70">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600 dark:bg-green-400" />
          live
        </span>
      </div>

      <ol className="stagger-list divide-y divide-md-outline-variant">
        {items.map((t, i) => {
          const style = THEME_STYLES[t.theme] ?? THEME_STYLES.Other;
          return (
            <li key={t.id}>
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 px-5 py-3 transition-colors duration-200 ease-md-standard hover:bg-md-surface-container cursor-pointer"
              >
                <span
                  className={`mt-0.5 w-5 shrink-0 text-center text-sm font-medium tabular-nums ${
                    i < 3 ? "text-md-primary" : "text-md-on-surface-variant/70"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-snug text-md-on-surface transition-colors duration-200 ease-md-standard group-hover:text-md-primary line-clamp-2">
                    {t.title}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5 md-label-small text-md-on-surface-variant/70">
                    <SourceIcon url={t.url} size={14} />
                    <span className="truncate">{hostOf(t.url)}</span>
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-px text-[10px] font-medium ring-1 ring-inset ${style.chip}`}
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
