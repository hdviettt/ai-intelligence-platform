import type { Citation } from "@/lib/api";
import { hostOf } from "@/lib/format";

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
            className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-accent-soft px-1 align-super text-[10px] font-semibold text-accent no-underline hover:bg-accent hover:text-white transition-colors"
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
    <ol className="mt-4 space-y-1.5 border-t border-border pt-3">
      {citations.map((c) => (
        <li key={c.n} className="flex gap-2 text-sm">
          <span className="mt-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-accent-soft px-1 text-[10px] font-semibold text-accent">
            {c.n}
          </span>
          <a
            href={c.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-accent transition-colors"
          >
            <span className="text-foreground">{c.title}</span>
            <span className="ml-1.5 text-xs text-muted">· {hostOf(c.url)}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
