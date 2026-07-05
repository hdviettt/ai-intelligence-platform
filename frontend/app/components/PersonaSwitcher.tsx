"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Persona } from "@/lib/api";
import { Icon } from "./Icon";

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
  layout = "center",
}: {
  personas: Persona[];
  active: string;
  layout?: "center" | "rail";
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

  // Rail: a quiet left-aligned control for the brief sidebar. Live lenses as small
  // text buttons; the coming-soon set collapses to a single muted line (no dead pills).
  if (layout === "rail") {
    return (
      <div className="flex flex-col items-start gap-1.5">
        {personas.map((p) => {
          const on = p.key === active;
          return (
            <button
              key={p.key}
              onClick={() => pick(p.key)}
              className={`inline-flex items-center gap-1.5 text-[13px] transition-colors duration-200 ease-md-standard cursor-pointer ${
                on
                  ? "font-semibold text-md-on-surface"
                  : "text-md-on-surface-variant hover:text-md-on-surface"
              }`}
            >
              {on && <span className="h-1.5 w-1.5 rounded-full bg-md-primary" aria-hidden />}
              {p.name}
            </button>
          );
        })}
        {soon.length > 0 && (
          <span className="mt-0.5 text-[12px] leading-relaxed text-md-on-surface-variant/55">
            {soon.map((s) => s.name).join(", ")} — soon
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {personas.map((p) => {
        const on = p.key === active;
        return (
          <button
            key={p.key}
            onClick={() => pick(p.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 md-label-large transition-all duration-200 ease-md-standard cursor-pointer ${
              on
                ? "bg-md-primary text-md-on-primary shadow-md-1"
                : "bg-md-surface text-md-on-surface-variant ring-1 ring-md-outline-variant hover:bg-md-surface-container hover:text-md-on-surface hover:ring-md-outline"
            }`}
          >
            {on && <Icon name="check" size={16} />}
            {p.name}
          </button>
        );
      })}
      {soon.map((s) => (
        <span
          key={s.key}
          className="cursor-not-allowed rounded-full bg-md-surface px-4 py-2 md-label-large text-md-on-surface-variant/70 ring-1 ring-dashed ring-md-outline-variant"
          title="Coming soon"
        >
          {s.name}
          <span className="ml-1.5 md-label-small uppercase text-md-on-surface-variant/70">
            soon
          </span>
        </span>
      ))}
    </div>
  );
}
