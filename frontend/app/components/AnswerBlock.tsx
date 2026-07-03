import type { SearchResponse } from "@/lib/api";
import { CitationList, renderAnswer } from "./Citations";

export function AnswerBlock({ data }: { data: SearchResponse }) {
  return (
    <section className="fade-up overflow-hidden rounded-2xl card">
      <div className="flex items-center gap-2.5 border-b border-border bg-accent-soft/40 px-5 py-3.5 sm:px-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-on-accent">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z" strokeLinejoin="round" />
            <path d="M18 14l.9 2.3L21 17l-2.1.7L18 20l-.9-2.3L15 17l2.1-.7z" strokeLinejoin="round" />
          </svg>
        </span>
        <h2 className="text-sm font-semibold text-foreground">AI Overview</h2>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-xs text-muted ring-1 ring-border">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400" />
          synthesized · {data.provider}
        </span>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="text-[15px] leading-7 text-foreground whitespace-pre-wrap">
          {renderAnswer(data.answer, data.citations)}
        </div>
        <CitationList citations={data.citations} />
      </div>
    </section>
  );
}

export function AnswerSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl card">
      <div className="flex items-center gap-2.5 border-b border-border px-6 py-3.5">
        <span className="h-7 w-7 rounded-full shimmer" />
        <span className="text-sm font-semibold text-muted">Thinking</span>
        <span className="flex gap-1">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
      </div>
      <div className="space-y-2.5 px-6 py-5">
        <div className="h-3.5 w-full rounded shimmer" />
        <div className="h-3.5 w-[94%] rounded shimmer" />
        <div className="h-3.5 w-[88%] rounded shimmer" />
        <div className="h-3.5 w-[70%] rounded shimmer" />
      </div>
    </section>
  );
}
