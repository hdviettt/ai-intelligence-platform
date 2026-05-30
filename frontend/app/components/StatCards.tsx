type Stat = {
  label: string;
  value: number;
  hint?: string;
  accent: string;
  icon: React.ReactNode;
  progress?: number; // 0-100, draws a bar
};

function Card({ s }: { s: Stat }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {s.value.toLocaleString()}
          </div>
          <div className="mt-0.5 text-xs text-muted">{s.label}</div>
        </div>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `${s.accent}1a`, color: s.accent }}
        >
          {s.icon}
        </span>
      </div>
      {s.hint && <div className="mt-2 text-xs text-muted">{s.hint}</div>}
      {typeof s.progress === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full"
            style={{ width: `${s.progress}%`, background: s.accent }}
          />
        </div>
      )}
    </div>
  );
}

const I = {
  doc: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 3h7l5 5v13H7z" strokeLinejoin="round" />
      <path d="M14 3v5h5" strokeLinejoin="round" />
    </svg>
  ),
  vector: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
      <path d="M8 8l8 8" strokeLinecap="round" />
    </svg>
  ),
  chunk: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  ),
  source: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
    </svg>
  ),
};

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
  const stats: Stat[] = [
    { label: "Articles", value: total, accent: "#6366f1", icon: I.doc },
    {
      label: "Embedded",
      value: embedded,
      accent: "#10b981",
      icon: I.vector,
      hint: `${coverage}% coverage`,
      progress: coverage,
    },
    { label: "Chunks", value: chunks, accent: "#0ea5e9", icon: I.chunk },
    { label: "Sources", value: sources, accent: "#f59e0b", icon: I.source },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} s={s} />
      ))}
    </section>
  );
}
