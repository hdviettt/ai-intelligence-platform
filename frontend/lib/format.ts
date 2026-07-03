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

// Theme → a full visual kit. Used for dots, labels, tinted chips, left rails.
// Palette leans on Google's own four brand hues (blue / green / yellow) plus
// one neutral cyan and grey — true red is kept out so it stays reserved for
// error states only. Every entry ships a dark-mode variant.
export const THEME_STYLES: Record<
  string,
  { dot: string; label: string; chip: string; rail: string; hex: string }
> = {
  Research: {
    dot: "bg-blue-600 dark:bg-blue-400",
    label: "text-blue-700 dark:text-blue-300",
    chip: "bg-blue-50 text-blue-700 ring-blue-200/70 dark:bg-blue-400/15 dark:text-blue-300 dark:ring-blue-400/25",
    rail: "bg-blue-500 dark:bg-blue-400",
    hex: "#4285F4",
  },
  Releases: {
    dot: "bg-green-600 dark:bg-green-400",
    label: "text-green-700 dark:text-green-300",
    chip: "bg-green-50 text-green-700 ring-green-200/70 dark:bg-green-400/15 dark:text-green-300 dark:ring-green-400/25",
    rail: "bg-green-500 dark:bg-green-400",
    hex: "#34A853",
  },
  News: {
    dot: "bg-amber-500 dark:bg-amber-400",
    label: "text-amber-800 dark:text-amber-300",
    chip: "bg-amber-50 text-amber-800 ring-amber-200/70 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/25",
    rail: "bg-amber-400 dark:bg-amber-400",
    hex: "#F9AB00",
  },
  Discussion: {
    dot: "bg-cyan-600 dark:bg-cyan-400",
    label: "text-cyan-700 dark:text-cyan-300",
    chip: "bg-cyan-50 text-cyan-700 ring-cyan-200/70 dark:bg-cyan-400/15 dark:text-cyan-300 dark:ring-cyan-400/25",
    rail: "bg-cyan-500 dark:bg-cyan-400",
    hex: "#12959E",
  },
  Other: {
    dot: "bg-slate-400 dark:bg-slate-500",
    label: "text-slate-600 dark:text-slate-300",
    chip: "bg-slate-100 text-slate-600 ring-slate-200/70 dark:bg-slate-400/15 dark:text-slate-300 dark:ring-slate-400/25",
    rail: "bg-slate-300 dark:bg-slate-500",
    hex: "#94a3b8",
  },
};
