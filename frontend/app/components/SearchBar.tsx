"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

// Google-style pill search bar: rounded-full, outlined at rest, primary
// 2px ring on focus, elevation only appears once engaged. No gradients.
export function SearchBar({
  initial = "",
  autoFocus = false,
  size = "lg",
}: {
  initial?: string;
  autoFocus?: boolean;
  size?: "lg" | "md";
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    if (t.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(t)}`);
  }

  const big = size === "lg";

  return (
    <form
      onSubmit={submit}
      className={`group relative flex w-full items-center rounded-full border bg-md-surface transition-all duration-200 ease-md-standard ${
        focused
          ? "border-2 border-md-primary shadow-md-2"
          : "border border-md-outline hover:shadow-md-1"
      }`}
    >
      <Icon
        name="search"
        size={big ? 20 : 18}
        className={`pointer-events-none shrink-0 text-md-on-surface-variant ${big ? "ml-5" : "ml-4"}`}
      />
      <input
        ref={ref}
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Ask anything about AI…"
        aria-label="Search the AI beat"
        className={`w-full flex-1 bg-transparent text-md-on-surface outline-none placeholder:text-md-on-surface-variant ${
          big ? "py-4 pl-4 pr-2 text-base" : "py-3 pl-3 pr-2 text-[15px]"
        }`}
      />
      <button
        type="submit"
        className={`md-btn md-btn-filled md-btn-pill mr-1.5 shrink-0 ${big ? "" : "md-btn-sm"}`}
      >
        Search
      </button>
    </form>
  );
}
