import type { SearchResponse } from "@/lib/api";
import { CitationList, renderAnswer } from "./Citations";
import { Icon } from "./Icon";

export function AnswerBlock({ data }: { data: SearchResponse }) {
  return (
    <section className="fade-up overflow-hidden rounded-2xl border border-md-outline-variant bg-md-surface-container-low shadow-md-1">
      <div className="flex items-center gap-2.5 border-b border-md-outline-variant bg-md-primary-container/30 px-5 py-3.5 sm:px-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-md-primary text-md-on-primary">
          <Icon name="auto_awesome" size={16} filled />
        </span>
        <h2 className="md-title-medium text-md-on-surface">AI Overview</h2>
        <span className="ml-auto flex items-center gap-1.5 rounded-full bg-md-surface px-2.5 py-1 md-label-small text-md-on-surface-variant ring-1 ring-md-outline-variant">
          <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400" />
          synthesized · {data.provider}
        </span>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="md-body-large text-md-on-surface whitespace-pre-wrap">
          {renderAnswer(data.answer, data.citations)}
        </div>
        <CitationList citations={data.citations} />
      </div>
    </section>
  );
}

export function AnswerSkeleton() {
  return (
    <section className="overflow-hidden rounded-2xl border border-md-outline-variant bg-md-surface-container-low">
      <div className="flex items-center gap-2.5 border-b border-md-outline-variant px-6 py-3.5">
        <span className="h-7 w-7 rounded-full shimmer" />
        <span className="md-title-medium text-md-on-surface-variant">Thinking</span>
        <span className="flex gap-1">
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-md-primary" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-md-primary" />
          <span className="typing-dot h-1.5 w-1.5 rounded-full bg-md-primary" />
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
