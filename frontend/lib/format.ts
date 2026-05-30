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
export const THEME_STYLES: Record<
  string,
  { dot: string; label: string; chip: string; rail: string; hex: string }
> = {
  Research: {
    dot: "bg-violet-500", label: "text-violet-700",
    chip: "bg-violet-50 text-violet-700 ring-violet-200/60",
    rail: "bg-violet-400", hex: "#8b5cf6",
  },
  Releases: {
    dot: "bg-emerald-500", label: "text-emerald-700",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    rail: "bg-emerald-400", hex: "#10b981",
  },
  News: {
    dot: "bg-sky-500", label: "text-sky-700",
    chip: "bg-sky-50 text-sky-700 ring-sky-200/60",
    rail: "bg-sky-400", hex: "#0ea5e9",
  },
  Discussion: {
    dot: "bg-amber-500", label: "text-amber-700",
    chip: "bg-amber-50 text-amber-700 ring-amber-200/60",
    rail: "bg-amber-400", hex: "#f59e0b",
  },
  Other: {
    dot: "bg-slate-400", label: "text-slate-600",
    chip: "bg-slate-100 text-slate-600 ring-slate-200/60",
    rail: "bg-slate-300", hex: "#94a3b8",
  },
};
