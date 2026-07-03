import type { Citation } from "@/lib/api";
import { hostOf } from "@/lib/format";
import { SourceIcon } from "./SourceIcon";

export function renderAnswer(answer: string, citations: Citation[]) {
  // Turn [n] markers into superscript links to the matching citation.
  const byN = new Map(citations.map((c) => [c.n, c]));
  const parts = answer.split(/(\[\d+\])/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    if (m) {
      const n = Number(m[1]);
      const c = byN.get(n);
      if (c) {
        return (
          <a
            key={i}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${c.source}: ${c.title}`}
            className="mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-md-primary-container px-1 align-text-top text-[10px] font-medium text-md-primary no-underline transition-colors duration-100 ease-md-standard hover:bg-md-primary hover:text-md-on-primary"
          >
            {n}
          </a>
        );
      }
    }
    return <span key={i}>{part}</span>;
  });
}

export function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations.length) return null;
  return (
    <div className="mt-5 border-t border-md-outline-variant pt-4">
      <div className="mb-2.5 md-label-small text-md-on-surface-variant/70">
        {citations.length} source{citations.length > 1 ? "s" : ""}
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {citations.map((c) => (
          <a
            key={c.n}
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2.5 rounded-lg border border-md-outline-variant bg-md-surface px-3 py-2 transition-colors duration-200 ease-md-standard hover:border-md-primary/40 hover:bg-md-primary-container/40 cursor-pointer"
          >
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-md-primary-container text-[10px] font-medium text-md-primary">
              {c.n}
            </span>
            <SourceIcon url={c.url} size={16} />
            <span className="min-w-0 flex-1">
              <span className="block truncate md-body-medium text-md-on-surface group-hover:text-md-primary">
                {c.title}
              </span>
              <span className="block truncate md-label-small text-md-on-surface-variant/70">
                {hostOf(c.url)}
              </span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
