import { getTrending } from "@/lib/api";
import { hostOf, THEME_STYLES, timeAgo } from "@/lib/format";

export async function TrendingRail() {
  let items;
  try {
    items = await getTrending(10);
  } catch {
    return null;
  }
  if (!items?.length) return null;

  return (
    <aside className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-accent text-white">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="text-sm font-semibold text-foreground">Trending in AI</h2>
      </div>
      <ol className="space-y-3">
        {items.map((t, i) => {
          const style = THEME_STYLES[t.theme] ?? THEME_STYLES.Other;
          return (
            <li key={t.id}>
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 cursor-pointer"
              >
                <span className="mt-0.5 w-4 shrink-0 text-sm font-semibold text-muted">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-snug text-foreground group-hover:text-accent transition-colors line-clamp-2">
                    {t.title}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                    {t.theme} · {hostOf(t.url)}
                    {t.published_at && ` · ${timeAgo(t.published_at)}`}
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
