import { THEME_STYLES } from "@/lib/format";

const ORDER = ["Research", "Releases", "News", "Discussion", "Other"];
const HEX: Record<string, string> = {
  Research: "#8b5cf6",
  Releases: "#10b981",
  News: "#0ea5e9",
  Discussion: "#f59e0b",
  Other: "#94a3b8",
};

// Donut of corpus theme distribution. Diversity at a glance.
export function ThemeDonut({
  themes,
}: {
  themes: { theme: string; count: number }[];
}) {
  const map = new Map(themes.map((t) => [t.theme, t.count]));
  const ordered = ORDER.filter((t) => map.get(t));
  const total = ordered.reduce((a, t) => a + (map.get(t) || 0), 0) || 1;

  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const segments = ordered.map((t) => {
    const v = map.get(t) || 0;
    const frac = v / total;
    const seg = { t, v, frac, dash: frac * C, off: offset };
    offset += frac * C;
    return seg;
  });

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <span className="text-sm font-semibold text-foreground">Theme spread</span>
      <div className="mt-3 flex items-center gap-5">
        <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0">
          <g transform="rotate(-90 70 70)">
            {segments.map((s) => (
              <circle
                key={s.t}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={HEX[s.t] ?? HEX.Other}
                strokeWidth="16"
                strokeDasharray={`${s.dash} ${C - s.dash}`}
                strokeDashoffset={-s.off}
              >
                <title>{`${s.t}: ${s.v.toLocaleString()} (${Math.round(s.frac * 100)}%)`}</title>
              </circle>
            ))}
          </g>
          <text x="70" y="66" textAnchor="middle" className="fill-slate-900 text-lg font-semibold">
            {total.toLocaleString()}
          </text>
          <text x="70" y="82" textAnchor="middle" className="fill-slate-400 text-[9px]">
            articles
          </text>
        </svg>
        <div className="flex-1 space-y-2">
          {segments.map((s) => {
            const style = THEME_STYLES[s.t] ?? THEME_STYLES.Other;
            return (
              <div key={s.t} className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                <span className="text-muted">{s.t}</span>
                <span className="ml-auto tabular-nums text-foreground">
                  {s.v.toLocaleString()}
                </span>
                <span className="w-9 text-right tabular-nums text-xs text-muted">
                  {Math.round(s.frac * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
