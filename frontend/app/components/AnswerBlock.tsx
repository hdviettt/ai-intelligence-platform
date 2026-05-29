import type { SearchResponse } from "@/lib/api";
import { CitationList, renderAnswer } from "./Citations";

export function AnswerBlock({ data }: { data: SearchResponse }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m13.5-6.5-2 2m-7 7-2 2m11 0-2-2m-7-7-2-2" strokeLinecap="round" />
          </svg>
        </span>
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
          AI Overview
        </h2>
        <span className="ml-auto text-xs text-muted">
          synthesized · {data.provider}
        </span>
      </div>
      <div className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
        {renderAnswer(data.answer, data.citations)}
      </div>
      <CitationList citations={data.citations} />
    </section>
  );
}

export function AnswerSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/40" />
        <span className="text-sm font-semibold text-muted">Thinking</span>
        <span className="flex gap-1">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full animate-pulse rounded bg-border" />
        <div className="h-3.5 w-[92%] animate-pulse rounded bg-border" />
        <div className="h-3.5 w-[78%] animate-pulse rounded bg-border" />
      </div>
    </section>
  );
}
