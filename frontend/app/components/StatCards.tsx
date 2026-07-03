import { Icon } from "./Icon";

type Stat = {
  label: string;
  value: number;
  hint?: string;
  accent: string;
  icon: string;
  progress?: number; // 0-100, draws a bar
};

function Card({ s }: { s: Stat }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-md-outline-variant bg-md-surface-container-low p-5 transition-shadow duration-200 ease-md-standard hover:shadow-md-1">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-medium tabular-nums tracking-tight text-md-on-surface">
            {s.value.toLocaleString()}
          </div>
          <div className="mt-0.5 md-label-small text-md-on-surface-variant">{s.label}</div>
        </div>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: `${s.accent}1f`, color: s.accent }}
        >
          <Icon name={s.icon} size={18} />
        </span>
      </div>
      {s.hint && <div className="mt-2 md-label-small text-md-on-surface-variant">{s.hint}</div>}
      {typeof s.progress === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-md-surface-container">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-md-emphasized"
            style={{ width: `${s.progress}%`, background: s.accent }}
          />
        </div>
      )}
    </div>
  );
}

export function StatCards({
  total,
  embedded,
  chunks,
  sources,
}: {
  total: number;
  embedded: number;
  chunks: number;
  sources: number;
}) {
  const coverage = total ? Math.round((embedded / total) * 100) : 0;
  // Monochrome: one neutral ink for every stat icon and bar — the numbers
  // carry the weight, not a categorical rainbow.
  const accent = "#5f6368";
  const stats: Stat[] = [
    { label: "Articles", value: total, accent, icon: "article" },
    {
      label: "Embedded",
      value: embedded,
      accent,
      icon: "hub",
      hint: `${coverage}% coverage`,
      progress: coverage,
    },
    { label: "Chunks", value: chunks, accent, icon: "view_module" },
    { label: "Sources", value: sources, accent, icon: "dns" },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} s={s} />
      ))}
    </section>
  );
}
