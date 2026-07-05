"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

const KEY = "ase:lastVisit";

function ago(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  const d = Math.floor(s / 86400);
  if (d >= 1) return d === 1 ? "yesterday" : `${d} days ago`;
  const h = Math.floor(s / 3600);
  if (h >= 1) return `${h}h ago`;
  const m = Math.floor(s / 60);
  if (m >= 5) return `${m}m ago`;
  return "just now";
}

// The returning-habit hook: on each visit, tell the reader when they were last
// here, then stamp "now". Pure client + localStorage — first visit shows a plain
// welcome. (v2, once the backend tracks it: the real delta — "3 new threads since
// your last visit".) `briefDate` lets us honestly flag a refresh since last time.
export function SinceYouLastLooked({ briefDate }: { briefDate?: string | null }) {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let last: number | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      last = raw ? Number(raw) : null;
    } catch {
      last = null;
    }

    if (!last || Number.isNaN(last)) {
      setMsg("Welcome — here’s today’s AI brief.");
    } else {
      const refreshed =
        briefDate && new Date(briefDate).getTime() > last
          ? " · brief refreshed since"
          : "";
      setMsg(`Welcome back — you last looked ${ago(last)}${refreshed}.`);
    }

    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, [briefDate]);

  if (!msg) return null;

  return (
    <div className="flex items-center gap-2 text-[13px] text-md-on-surface-variant">
      <Icon name="schedule" size={15} className="text-md-on-surface-variant/70" />
      <span>{msg}</span>
    </div>
  );
}
