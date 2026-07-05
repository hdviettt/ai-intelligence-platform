import { getFeed } from "@/lib/api";
import { hostOf, timeAgo } from "@/lib/format";
import { Icon } from "./Icon";
import { SignalBadge } from "./SignalBadge";
import { SourceIcon } from "./SourceIcon";

// The full ranked stream — depth for when the brief isn't enough. Collapsed by
// default (native <details>) so it never dilutes the brief, and de-chromed into a
// hairline list: rank in a mono gutter, one quiet meta line, no cards.
export async function PersonaFeed({ persona }: { persona: string }) {
  let feed;
  try {
    feed = await getFeed(persona, 24);
  } catch {
    return null;
  }
  if (!feed.items.length) return null;

  return (
    <details className="group mt-14 border-t border-md-outline-variant pt-6">
      <summary className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-md-on-surface-variant transition-colors duration-200 ease-md-standard hover:text-md-on-surface">
        <Icon name="expand_more" size={18} className="details-chevron text-md-on-surface-variant/70" />
        The full stream — {feed.items.length} more, ranked by signal
      </summary>

      <ol className="stagger-list mt-4">
        {feed.items.map((it, i) => (
          <li key={it.id} className="border-t border-md-outline-variant/50 first:border-t-0">
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/item flex gap-4 py-5 cursor-pointer"
            >
              <span className="w-6 shrink-0 pt-1 font-mono text-[13px] tabular-nums text-md-on-surface-variant/40">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <SignalBadge signal={it.signal} hypeGap={it.hype_gap} />
                  <span className="text-[12px] text-md-on-surface-variant/70">
                    · {it.theme} · {hostOf(it.url)}
                    {it.published_at ? ` · ${timeAgo(it.published_at)}` : ""}
                  </span>
                </span>
                <span className="mt-1 block text-[16px] font-medium leading-snug text-md-on-surface transition-colors duration-200 ease-md-standard group-hover/item:text-md-primary">
                  {it.title}
                </span>
                {it.angle && (
                  <span className="mt-1 block text-[14px] leading-[1.55] text-md-on-surface-variant">
                    {it.angle}
                  </span>
                )}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}
