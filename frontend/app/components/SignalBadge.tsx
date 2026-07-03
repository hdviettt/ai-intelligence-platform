// The signal badge — the visible point of view, and the product's core
// differentiator: it tells you how much an item actually matters. Material
// scale runs high = Google green (filled → tonal) down to low = neutral
// grey, so the eye reads "importance" the same way it reads a battery meter.
// Hype/buried-signal call-outs are a separate axis (attention vs. substance)
// and get their own hues so they never get mistaken for the signal score.

function tier(signal: number): { label: string; cls: string; dotCls: string } {
  if (signal >= 6)
    return {
      label: "Must-know",
      cls: "bg-green-700 text-white dark:bg-green-400 dark:text-green-950",
      dotCls: "bg-white/80 dark:bg-green-950/70",
    };
  if (signal >= 4)
    return {
      label: "High signal",
      cls: "bg-green-50 text-green-800 ring-1 ring-inset ring-green-200 dark:bg-green-400/15 dark:text-green-300 dark:ring-green-400/25",
      dotCls: "bg-green-600 dark:bg-green-400",
    };
  if (signal >= 2)
    return {
      label: "Worth noting",
      cls: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/20",
      dotCls: "bg-slate-400 dark:bg-slate-400",
    };
  return {
    label: "Low signal",
    cls: "bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200 dark:bg-slate-500/10 dark:text-slate-500 dark:ring-slate-500/20",
    dotCls: "bg-slate-300 dark:bg-slate-600",
  };
}

export function SignalBadge({
  signal,
  hypeGap,
}: {
  signal: number;
  hypeGap: number | null;
}) {
  const t = tier(signal);
  // hype_gap > ~3 = much more attention than substance → hype.
  // hype_gap < ~-3 = real substance, little attention → buried signal.
  const hype = hypeGap !== null && hypeGap >= 3;
  const buried = hypeGap !== null && hypeGap <= -3;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${t.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${t.dotCls}`} aria-hidden />
        {t.label}
      </span>
      <span
        className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-foreground ring-1 ring-inset ring-border"
        title="Signal score"
      >
        {signal.toFixed(1)}
      </span>
      {hype && (
        <span
          className="flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25"
          title="Getting more attention than its substance warrants"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2c1 3 4 4 4 8a4 4 0 1 1-8 0c0-2 1-3 2-4 0 2 2 2 2 4" strokeLinejoin="round" />
          </svg>
          hype
        </span>
      )}
      {buried && (
        <span
          className="flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 ring-1 ring-blue-200 dark:bg-blue-400/15 dark:text-blue-300 dark:ring-blue-400/25"
          title="Substantive but under the radar"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3h12l-2 7 2 11-6-4-6 4 2-11z" strokeLinejoin="round" />
          </svg>
          underrated
        </span>
      )}
    </div>
  );
}
