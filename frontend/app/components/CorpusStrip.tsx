import { getStats } from "@/lib/api";

// A quiet "this is a real engine" signal under the hero: live corpus scale.
export async function CorpusStrip() {
  let stats;
  try {
    stats = await getStats();
  } catch {
    return null;
  }
  const sources = new Set(stats.by_source.map((s) => s.source)).size;
  const items = [
    { value: stats.total.toLocaleString(), label: "articles indexed" },
    { value: String(sources), label: "sources" },
    { value: stats.chunks.toLocaleString(), label: "searchable chunks" },
    { value: "hourly", label: "refresh" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-8">
          <div>
            <div className="text-lg font-medium tabular-nums tracking-tight text-md-on-surface">
              {it.value}
            </div>
            <div className="md-label-small text-md-on-surface-variant">{it.label}</div>
          </div>
          {i < items.length - 1 && (
            <span className="hidden h-8 w-px bg-md-outline-variant sm:block" />
          )}
        </div>
      ))}
    </div>
  );
}
