import type { CoveragePoint } from "@/lib/api";

// Bar chart of articles by publication year — the corpus's true time coverage.
export function CoverageChart({ points }: { points: CoveragePoint[] }) {
  if (!points.length) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted">
        No dated articles yet.
      </div>
    );
  }

  const W = 760;
  const H = 220;
  const PAD = { t: 18, r: 16, b: 28, l: 40 };
  const iw = W - PAD.l - PAD.r;
  const ih = H - PAD.t - PAD.b;

  const max = Math.max(...points.map((p) => p.count));
  const n = points.length;
  const gap = 6;
  const bw = (iw - gap * (n - 1)) / n;
  const x = (i: number) => PAD.l + i * (bw + gap);
  const h = (v: number) => (v / max) * ih;

  const total = points.reduce((a, p) => a + p.count, 0);
  const first = points[0].period;
  const last = points[points.length - 1].period;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">
          {total.toLocaleString()} dated articles
        </span>
        <span className="text-xs text-muted">
          spans {n} years · {first}–{last}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Articles by publication year">
        {points.map((p, i) => {
          const bh = Math.max(1, h(p.count));
          const showLabel = n <= 22 && (i % Math.ceil(n / 12) === 0 || i === n - 1);
          return (
            <g key={p.period}>
              <rect
                x={x(i)}
                y={PAD.t + ih - bh}
                width={bw}
                height={bh}
                rx={Math.min(3, bw / 2)}
                className="fill-accent"
              >
                <title>{`${p.period}: ${p.count.toLocaleString()}`}</title>
              </rect>
              {showLabel && (
                <text
                  x={x(i) + bw / 2}
                  y={H - 10}
                  textAnchor="middle"
                  className="fill-muted-2 text-[9px]"
                >
                  {p.period.length > 4 ? p.period.slice(2) : p.period}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
