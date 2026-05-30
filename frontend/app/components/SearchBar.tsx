"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
      className={`relative w-full rounded-2xl bg-surface transition-all duration-200 ${
        focused
          ? "shadow-lg ring-2 ring-accent/50"
          : "shadow-md ring-1 ring-border hover:ring-border-strong"
      }`}
      style={{ boxShadow: focused ? "var(--shadow-lg)" : "var(--shadow-md)" }}
    >
      <svg
        viewBox="0 0 24 24"
        className={`pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted-2 ${
          big ? "h-5 w-5" : "h-4.5 w-4.5"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" strokeLinecap="round" />
      </svg>
      <input
        ref={ref}
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Ask anything about AI…"
        aria-label="Search the AI beat"
        className={`w-full rounded-2xl bg-transparent pl-13 text-foreground outline-none placeholder:text-muted-2 ${
          big ? "py-4 pr-32 text-base" : "py-3 pr-28 text-[15px]"
        }`}
        style={{ paddingLeft: big ? "3.25rem" : "3rem" }}
      />
      <button
        type="submit"
        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-xl font-medium text-white transition-all hover:brightness-110 active:scale-95 cursor-pointer ${
          big ? "px-5 py-2.5 text-sm" : "px-4 py-2 text-sm"
        }`}
        style={{ background: "linear-gradient(135deg, #6366f1, #7c5cf0)" }}
      >
        Search
      </button>
    </form>
  );
}
