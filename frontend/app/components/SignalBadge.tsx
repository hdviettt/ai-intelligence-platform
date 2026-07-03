import { Icon } from "./Icon";

// The signal badge — the visible point of view, and the product's core
// differentiator: it tells you how much an item actually matters. Material
// scale runs high = Google green (filled -> tonal container) down to
// low = neutral grey, so the eye reads "importance" the same way it reads
// a battery meter. Hype/buried-signal call-outs are a separate axis
// (attention vs. substance) and get their own hues so they never get
// mistaken for the signal score itself.

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
      cls: "bg-md-surface-container text-md-on-surface-variant ring-1 ring-inset ring-md-outline-variant",
      dotCls: "bg-md-on-surface-variant",
    };
  return {
    label: "Low signal",
    cls: "bg-md-surface-container-low text-md-on-surface-variant/70 ring-1 ring-inset ring-md-outline-variant",
    dotCls: "bg-md-outline",
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
  // hype_gap > ~3 = much more attention than substance -> hype.
  // hype_gap < ~-3 = real substance, little attention -> buried signal.
  const hype = hypeGap !== null && hypeGap >= 3;
  const buried = hypeGap !== null && hypeGap <= -3;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 md-label-small ${t.cls}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${t.dotCls}`} aria-hidden />
        {t.label}
      </span>
      <span
        className="rounded-full bg-md-surface-container px-1.5 py-0.5 md-label-small font-medium tabular-nums text-md-on-surface ring-1 ring-inset ring-md-outline-variant"
        title="Signal score"
      >
        {signal.toFixed(1)}
      </span>
      {hype && (
        <span
          className="flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 md-label-small text-amber-800 ring-1 ring-amber-200 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25"
          title="Getting more attention than its substance warrants"
        >
          <Icon name="local_fire_department" size={12} />
          hype
        </span>
      )}
      {buried && (
        <span
          className="flex items-center gap-1 rounded-full bg-md-primary-container px-1.5 py-0.5 md-label-small text-md-on-primary-container ring-1 ring-md-outline-variant"
          title="Substantive but under the radar"
        >
          <Icon name="visibility" size={12} />
          underrated
        </span>
      )}
    </div>
  );
}
