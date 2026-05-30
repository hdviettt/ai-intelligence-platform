"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Persona } from "@/lib/api";

// Coming-soon personas — shown as the vision, not yet selectable.
const SOON = [
  { key: "developer", name: "Developer" },
  { key: "marketer", name: "Marketer" },
  { key: "ecommerce", name: "Ecommerce" },
  { key: "creative", name: "Creative" },
];

export function PersonaSwitcher({
  personas,
  active,
}: {
  personas: Persona[];
  active: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function pick(key: string) {
    const p = new URLSearchParams(params.toString());
    p.set("persona", key);
    router.push(`/?${p.toString()}`, { scroll: false });
  }

  const liveKeys = new Set(personas.map((p) => p.key));
  const soon = SOON.filter((s) => !liveKeys.has(s.key));

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {personas.map((p) => {
        const on = p.key === active;
        return (
          <button
            key={p.key}
            onClick={() => pick(p.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all cursor-pointer ${
              on
                ? "text-white shadow-sm"
                : "bg-surface text-muted ring-1 ring-border hover:text-foreground hover:ring-border-strong"
            }`}
            style={on ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" } : undefined}
          >
            {p.name}
          </button>
        );
      })}
      {soon.map((s) => (
        <span
          key={s.key}
          className="cursor-not-allowed rounded-full bg-surface px-4 py-2 text-sm font-medium text-muted-2 ring-1 ring-dashed ring-border"
          title="Coming soon"
        >
          {s.name}
          <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-2">
            soon
          </span>
        </span>
      ))}
    </div>
  );
}
