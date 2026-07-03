"use client";

import { useEffect, useState } from "react";

// Light/dark switch for the header. The actual class is applied before
// paint by the inline script in app/layout.tsx — this just mirrors that
// state into the icon and lets the user flip it, persisting to localStorage.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    const root = document.documentElement;
    root.classList.toggle("dark", next);
    root.style.colorScheme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={mounted && dark ? "Switch to light theme" : "Switch to dark theme"}
      title={mounted && dark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-200 ease-[var(--ease-standard)] hover:bg-surface-2 hover:text-foreground active:bg-surface-3 cursor-pointer"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        suppressHydrationWarning
        className={`absolute h-5 w-5 transition-all duration-300 ease-[var(--ease-emphasized)] ${
          mounted && dark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        suppressHydrationWarning
        className={`absolute h-5 w-5 transition-all duration-300 ease-[var(--ease-emphasized)] ${
          mounted && dark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0"
        }`}
      >
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
      </svg>
    </button>
  );
}
