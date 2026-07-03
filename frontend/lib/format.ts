export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Google's favicon service — gives every source a real logo, cheap visual texture.
export function faviconOf(url: string): string {
  const host = hostOf(url);
  return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, (Date.now() - then) / 1000);
  const d = Math.floor(s / 86400);
  if (d > 0) return d === 1 ? "1d ago" : d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
  const h = Math.floor(s / 3600);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ago`;
  return "just now";
}

// Theme → a restrained, monochrome visual kit. Content themes read as quiet
// text labels, NOT colour-coded chips — the page stays neutral (ink on paper)
// and the single blue accent is reserved for interaction and the top signal
// tier. `hex` is a neutral grey ramp so charts read as one calm family, not a
// rainbow. Every class token already adapts to dark mode via M3 roles.
const NEUTRAL = {
  dot: "bg-md-outline",
  label: "text-md-on-surface-variant",
  chip: "text-md-on-surface-variant/70",
  rail: "bg-md-outline-variant",
} as const;

export const THEME_STYLES: Record<
  string,
  { dot: string; label: string; chip: string; rail: string; hex: string }
> = {
  Research: { ...NEUTRAL, hex: "#3c4043" },
  Releases: { ...NEUTRAL, hex: "#5f6368" },
  News: { ...NEUTRAL, hex: "#80868b" },
  Discussion: { ...NEUTRAL, hex: "#9aa0a6" },
  Other: { ...NEUTRAL, hex: "#bdc1c6" },
};
