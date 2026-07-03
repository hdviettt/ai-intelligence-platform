import { getBriefing } from "@/lib/api";
import { CitationList, renderAnswer } from "./Citations";
import { Icon } from "./Icon";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// The auto-generated daily briefing — one flowing story of what's new + what it
// means, cited. The reason to open the app each day. Renders nothing until the
// first briefing has been generated, so the page is safe before then.
export async function DailyBriefing() {
  let briefing;
  try {
    briefing = await getBriefing("daily");
  } catch {
    return null;
  }
  if (!briefing || !briefing.narrative) return null;

  return (
    <section className="fade-up">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-md-primary text-md-on-primary">
          <Icon name="auto_awesome" size={18} filled />
        </span>
        <div className="min-w-0">
          <h2 className="md-title-large leading-tight text-md-on-surface">The daily brief</h2>
          <p className="md-label-small text-md-on-surface-variant/70">
            {[fmtDate(briefing.generated_at), `${briefing.article_count} sources`, "auto-synthesized"]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-6 sm:p-8">
        <div className="whitespace-pre-wrap text-[17px] leading-8 text-md-on-surface">
          {renderAnswer(briefing.narrative, briefing.citations)}
        </div>
        <CitationList citations={briefing.citations} />
      </div>
    </section>
  );
}

export function BriefingSkeleton() {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <span className="h-9 w-9 shrink-0 rounded-full shimmer" />
        <div className="space-y-1.5">
          <div className="h-4 w-32 rounded shimmer" />
          <div className="h-3 w-48 rounded shimmer" />
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-6 sm:p-8">
        {[100, 96, 98, 92, 70].map((w, i) => (
          <div key={i} className="h-3.5 rounded shimmer" style={{ width: `${w}%` }} />
        ))}
      </div>
    </section>
  );
}
