// The signal indicator — the product's point of view, kept deliberately quiet.
// A single score + one-word tier, nothing more. Only the top tier ("Must-know")
// earns the blue accent; everything below stays neutral so the page reads calm.
// The hype / underrated call-outs are a separate axis (attention vs. substance)
// and render as small muted text, never as coloured pills.

function tier(signal: number): { label: string; top: boolean } {
  if (signal >= 6) return { label: "Must-know", top: true };
  if (signal >= 4) return { label: "High signal", top: false };
  if (signal >= 2) return { label: "Worth noting", top: false };
  return { label: "Low signal", top: false };
}

export function SignalBadge({
  signal,
  hypeGap,
}: {
  signal: number;
  hypeGap: number | null;
}) {
  const t = tier(signal);
  // hype_gap > ~3 = far more attention than substance -> hype.
  // hype_gap < ~-3 = real substance, little attention -> buried signal.
  const hype = hypeGap !== null && hypeGap >= 3;
  const buried = hypeGap !== null && hypeGap <= -3;
  const tone = t.top ? "text-md-primary" : "text-md-on-surface-variant";

  return (
    <span className="inline-flex items-center gap-1.5 md-label-small">
      <span className={`inline-flex items-center gap-1 font-medium tabular-nums ${tone}`}>
        <span
          className={`h-1.5 w-1.5 rounded-full ${t.top ? "bg-md-primary" : "bg-md-outline"}`}
          aria-hidden
        />
        {signal.toFixed(1)}
      </span>
      <span className={tone}>{t.label}</span>
      {hype && <span className="text-md-on-surface-variant/60">· hype</span>}
      {buried && <span className="text-md-on-surface-variant/60">· underrated</span>}
    </span>
  );
}
