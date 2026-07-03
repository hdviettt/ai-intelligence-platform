import type { PipelineRun } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Icon } from "./Icon";

// Trigger type is minor metadata — a single neutral chip, no categorical hues.
const TRIGGER_STYLE: Record<string, string> = {
  cron: "bg-md-surface-container text-md-on-surface-variant",
  admin: "bg-md-surface-container text-md-on-surface-variant",
  cli: "bg-md-surface-container text-md-on-surface-variant",
  baseline: "bg-md-surface-container text-md-on-surface-variant",
};

// What each trigger changed: net corpus delta + which sources contributed.
export function PipelineRuns({ runs }: { runs: PipelineRun[] }) {
  if (!runs.length) {
    return (
      <p className="rounded-xl border border-md-outline-variant bg-md-surface-container-low p-4 md-body-medium text-md-on-surface-variant">
        No triggers recorded yet.
      </p>
    );
  }

  return (
    <div className="stagger-list space-y-2.5">
      {runs.map((r, i) => {
        const delta = r.total_after - r.total_before;
        const contributors = (r.per_source || [])
          .filter((s) => s.inserted > 0)
          .sort((a, b) => b.inserted - a.inserted);
        const errored = (r.per_source || []).filter((s) => s.error);
        return (
          <div
            key={i}
            className="rounded-xl border border-md-outline-variant bg-md-surface p-3.5"
          >
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                  TRIGGER_STYLE[r.trigger] ?? "bg-md-surface-container text-md-on-surface-variant"
                }`}
              >
                {r.trigger}
              </span>
              <span className="md-label-small text-md-on-surface-variant">{timeAgo(r.finished_at)}</span>
              <span className="ml-auto text-sm font-medium tabular-nums">
                {r.total_before.toLocaleString()} →{" "}
                <span className="text-md-on-surface">
                  {r.total_after.toLocaleString()}
                </span>
                {delta > 0 && (
                  <span className="ml-1.5 text-md-on-surface">
                    +{delta.toLocaleString()}
                  </span>
                )}
                {delta === 0 && (
                  <span className="ml-1.5 text-md-on-surface-variant">no change</span>
                )}
              </span>
            </div>

            {contributors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contributors.map((s) => (
                  <span
                    key={s.source}
                    className="rounded-md bg-md-surface-container px-2 py-0.5 text-xs text-md-on-surface-variant"
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
                    className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-600 dark:bg-red-400/15 dark:text-red-300"
                    title={s.error ?? ""}
                  >
                    <Icon name="warning" size={12} />
                    {s.source}
                  </span>
                ))}
              </div>
            )}

            {r.embedded > 0 && (
              <p className="mt-1.5 md-label-small text-md-on-surface-variant">
                {r.embedded} embedded
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
