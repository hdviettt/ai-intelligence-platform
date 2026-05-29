export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const s = Math.max(0, (Date.now() - then) / 1000);
  const d = Math.floor(s / 86400);
  if (d > 0) return d === 1 ? "1 day ago" : `${d} days ago`;
  const h = Math.floor(s / 3600);
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(s / 60);
  if (m > 0) return `${m}m ago`;
  return "just now";
}

// Theme -> accent classes (Web Guide style grouping).
export const THEME_STYLES: Record<string, { dot: string; label: string }> = {
  Research: { dot: "bg-violet-500", label: "text-violet-700" },
  Releases: { dot: "bg-emerald-500", label: "text-emerald-700" },
  News: { dot: "bg-sky-500", label: "text-sky-700" },
  Discussion: { dot: "bg-amber-500", label: "text-amber-700" },
  Other: { dot: "bg-slate-400", label: "text-slate-600" },
};
