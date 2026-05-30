// The signal badge — the visible point of view. Shows how strongly an item
// matters to the persona, and (where engagement exists) whether it's hype or
// buried signal.

function tier(signal: number): { label: string; cls: string } {
  if (signal >= 6) return { label: "Must-know", cls: "bg-violet-600 text-white" };
  if (signal >= 4) return { label: "High signal", cls: "bg-violet-100 text-violet-700 ring-1 ring-violet-200" };
  if (signal >= 2) return { label: "Worth noting", cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" };
  return { label: "Low signal", cls: "bg-slate-50 text-slate-400 ring-1 ring-slate-200" };
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
    <div className="flex items-center gap-1.5">
      <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${t.cls}`}>
        {t.label}
      </span>
      <span className="text-[11px] font-medium tabular-nums text-muted-2">
        {signal.toFixed(1)}
      </span>
      {hype && (
        <span
          className="flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200"
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
          className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200"
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
