"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

// Light/dark switch for the header. The actual class is applied before
// paint by the inline script in app/layout.tsx — this just mirrors that
// state into the icon and lets the user flip it, persisting to localStorage.
// Uses the same light_mode / dark_mode Material Symbols Google's own
// products use for this exact control.
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
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-md-on-surface-variant transition-colors duration-200 ease-md-standard hover:bg-md-surface-container hover:text-md-on-surface active:bg-md-surface-container-high cursor-pointer"
    >
      <Icon
        name="light_mode"
        size={20}
        suppressHydrationWarning
        className={`absolute transition-all duration-300 ease-md-emphasized ${
          mounted && dark ? "scale-50 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
      />
      <Icon
        name="dark_mode"
        size={20}
        suppressHydrationWarning
        className={`absolute transition-all duration-300 ease-md-emphasized ${
          mounted && dark ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-90 opacity-0"
        }`}
      />
    </button>
  );
}
