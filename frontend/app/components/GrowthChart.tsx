import type { GrowthPoint } from "@/lib/api";

// Inline SVG area chart — no chart lib. Shows corpus size over recorded triggers.
export function GrowthChart({ points }: { points: GrowthPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        Not enough history yet — the chart fills in as triggers run.
      </div>
    );
  }

  const W = 720;
  const H = 200;
  const PAD = { t: 16, r: 16, b: 24, l: 44 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  const totals = points.map((p) => p.total);
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  const span = Math.max(1, max - min);
  // headroom so the line isn't glued to the top/bottom
  const yMax = max + Math.ceil(span * 0.1);
  const yMin = Math.max(0, min - Math.ceil(span * 0.1));
  const ySpan = Math.max(1, yMax - yMin);

  const x = (i: number) => PAD.l + (i / (points.length - 1)) * iw;
  const y = (v: number) => PAD.t + ih - ((v - yMin) / ySpan) * ih;

  const line = points.map((p, i) => `${x(i)},${y(p.total)}`).join(" ");
  const area =
    `${PAD.l},${PAD.t + ih} ` +
    points.map((p, i) => `${x(i)},${y(p.total)}`).join(" ") +
    ` ${PAD.l + iw},${PAD.t + ih}`;

  const ticks = [yMin, Math.round((yMin + yMax) / 2), yMax];
  const latest = points[points.length - 1];
  const first = points[0];
  const grew = latest.total - first.total;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">
          {latest.total.toLocaleString()} articles
        </span>
        <span className="text-xs text-muted">
          {grew >= 0 ? "+" : ""}
          {grew.toLocaleString()} over {points.length} runs
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Corpus size over time"
      >
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              y1={y(t)}
              x2={PAD.l + iw}
              y2={y(t)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-slate-400 text-[10px]">
              {t.toLocaleString()}
            </text>
          </g>
        ))}
        <polygon points={area} fill="url(#growthFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#4f46e5"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.total)} r="2.5" fill="#4f46e5" />
        ))}
      </svg>
    </div>
  );
}
