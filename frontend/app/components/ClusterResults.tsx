"use client";

import { useState } from "react";
import type { BriefingCitation } from "@/lib/api";
import { hostOf, timeAgo } from "@/lib/format";
import { Icon } from "./Icon";
import { SourceIcon } from "./SourceIcon";

// One source, as a compact reference link belonging to the cluster's summary above:
// a small site row, a small blue linked title (clamped so long headlines don't
// dominate), and a two-line snippet.
function Result({ c }: { c: BriefingCitation }) {
  return (
    <li className="border-t border-md-outline-variant/50 first:border-t-0">
      <a
        href={c.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block py-3 cursor-pointer"
      >
        <div className="flex items-center gap-1.5 text-[12px] text-md-on-surface-variant">
          <SourceIcon url={c.url} size={13} />
          <span>{hostOf(c.url)}</span>
          {c.published_at && (
            <span className="text-md-on-surface-variant/70">· {timeAgo(c.published_at)}</span>
          )}
        </div>
        <h4 className="mt-0.5 text-[13px] font-medium leading-snug text-md-primary underline-offset-2 line-clamp-2 group-hover:underline">
          {c.title}
        </h4>
        {c.snippet && (
          <p className="mt-0.5 text-[12px] leading-[1.45] text-md-on-surface-variant line-clamp-2">
            {c.snippet}
          </p>
        )}
      </a>
    </li>
  );
}

// The results under a cluster: show `initial` (default 3), then a centered "More"
// pill that reveals the rest inline and removes itself — the Web Guide behaviour.
export function ClusterResults({
  items,
  initial = 3,
}: {
  items: BriefingCitation[];
  initial?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, initial);
  return (
    <>
      <ol className="mt-4">
        {shown.map((c) => (
          <Result key={c.n} c={c} />
        ))}
      </ol>
      {items.length > initial && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mx-auto mt-3 flex w-fit cursor-pointer items-center gap-1 rounded-full border border-md-outline-variant px-4 py-1.5 text-[13px] font-medium text-md-on-surface-variant transition-colors duration-200 ease-md-standard hover:bg-md-surface-container hover:text-md-on-surface"
        >
          {expanded ? "Less" : `More (${items.length - initial})`}
          <Icon name={expanded ? "expand_less" : "expand_more"} size={16} />
        </button>
      )}
    </>
  );
}
