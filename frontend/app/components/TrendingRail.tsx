import { getTrending } from "@/lib/api";
import { hostOf, timeAgo } from "@/lib/format";
import { Icon } from "./Icon";
import { SourceIcon } from "./SourceIcon";

export async function TrendingRail({
  variant = "card",
}: {
  variant?: "card" | "rail";
}) {
  let items;
  try {
    items = await getTrending(variant === "rail" ? 7 : 10);
  } catch {
    return null;
  }
  if (!items?.length) return null;

  // Sidebar variant: borderless, quiet, a hairline-separated stack that sits in
  // the right rail beside the brief — "also moving right now".
  if (variant === "rail") {
    return (
      <aside>
        <div className="mb-4 flex items-center gap-2">
          <Icon name="trending_up" size={16} className="text-md-on-surface-variant" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.09em] text-md-on-surface-variant">
            Trending now
          </h2>
        </div>
        <ol className="space-y-4">
          {items.map((t, i) => (
            <li key={t.id}>
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-2.5 cursor-pointer"
              >
                <span className="w-4 shrink-0 pt-0.5 font-mono text-[12px] tabular-nums text-md-on-surface-variant/40">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] leading-snug text-md-on-surface transition-colors duration-200 ease-md-standard group-hover:text-md-primary line-clamp-3">
                    {t.title}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] text-md-on-surface-variant/70">
                    <SourceIcon url={t.url} size={12} />
                    <span className="truncate">{hostOf(t.url)}</span>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      </aside>
    );
  }

  // Default card variant (retained for other surfaces).
  return (
    <aside className="overflow-hidden rounded-2xl border border-md-outline-variant bg-md-surface-container-low">
      <div className="flex items-center gap-2 border-b border-md-outline-variant px-5 py-3.5">
        <Icon name="trending_up" size={18} className="text-md-on-surface-variant" />
        <h2 className="md-title-medium text-md-on-surface">Trending in AI</h2>
        <span className="ml-auto flex items-center gap-1.5 md-label-small text-md-on-surface-variant/70">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-md-outline" />
          live
        </span>
      </div>

      <ol className="stagger-list divide-y divide-md-outline-variant">
        {items.map((t, i) => (
          <li key={t.id}>
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-3 px-5 py-3.5 transition-colors duration-200 ease-md-standard hover:bg-md-surface-container cursor-pointer"
            >
              <span className="mt-0.5 w-5 shrink-0 text-center text-sm font-normal tabular-nums text-md-on-surface-variant/60">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-snug text-md-on-surface transition-colors duration-200 ease-md-standard group-hover:text-md-primary line-clamp-2">
                  {t.title}
                </span>
                <span className="mt-1.5 flex items-center gap-1.5 md-label-small text-md-on-surface-variant/70">
                  <SourceIcon url={t.url} size={14} />
                  <span className="truncate">{hostOf(t.url)}</span>
                  <span className="ml-0.5 text-md-on-surface-variant/60">· {t.theme}</span>
                  {t.published_at && (
                    <span className="ml-auto shrink-0">{timeAgo(t.published_at)}</span>
                  )}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ol>
    </aside>
  );
}
