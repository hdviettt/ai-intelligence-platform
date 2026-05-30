import type { PipelineRun } from "@/lib/api";
import { timeAgo } from "@/lib/format";

const TRIGGER_STYLE: Record<string, string> = {
  cron: "bg-sky-100 text-sky-700",
  admin: "bg-violet-100 text-violet-700",
  cli: "bg-slate-100 text-slate-600",
  baseline: "bg-amber-100 text-amber-700",
};

// What each trigger changed: net corpus delta + which sources contributed.
export function PipelineRuns({ runs }: { runs: PipelineRun[] }) {
  if (!runs.length) {
    return (
      <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        No triggers recorded yet.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {runs.map((r, i) => {
        const delta = r.total_after - r.total_before;
        const contributors = (r.per_source || [])
          .filter((s) => s.inserted > 0)
          .sort((a, b) => b.inserted - a.inserted);
        const errored = (r.per_source || []).filter((s) => s.error);
        return (
          <div
            key={i}
            className="rounded-xl border border-border bg-background p-3.5"
          >
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                  TRIGGER_STYLE[r.trigger] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {r.trigger}
              </span>
              <span className="text-xs text-muted">{timeAgo(r.finished_at)}</span>
              <span className="ml-auto text-sm font-medium tabular-nums">
                {r.total_before.toLocaleString()} →{" "}
                <span className="text-foreground">
                  {r.total_after.toLocaleString()}
                </span>
                {delta > 0 && (
                  <span className="ml-1.5 text-emerald-600">
                    +{delta.toLocaleString()}
                  </span>
                )}
                {delta === 0 && (
                  <span className="ml-1.5 text-muted">no change</span>
                )}
              </span>
            </div>

            {contributors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contributors.map((s) => (
                  <span
                    key={s.source}
                    className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                  >
                    {s.source} +{s.inserted}
                  </span>
                ))}
              </div>
            )}

            {errored.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {errored.map((s) => (
                  <span
                    key={s.source}
                    className="rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-600"
                    title={s.error ?? ""}
                  >
                    {s.source} ⚠
                  </span>
                ))}
              </div>
            )}

            {r.embedded > 0 && (
              <p className="mt-1.5 text-xs text-muted">
                {r.embedded} embedded
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
