"use client";

import { useState } from "react";
import { ADMIN_BASE } from "@/lib/api";

export function AdminTrigger() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/ingest?max_results=40`, {
        method: "POST",
        headers: { "X-Admin-Token": token },
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg(
          res.status === 503
            ? "Trigger is disabled (ADMIN_TOKEN not set on the server)."
            : res.status === 401
              ? "Invalid token."
              : `Error ${res.status}`
        );
      } else {
        const ins = (body.sources ?? []).reduce(
          (a: number, s: { inserted: number }) => a + (s.inserted || 0),
          0
        );
        setMsg(`Done — ${ins} new article(s), ${body.embedded} embedded.`);
      }
    } catch {
      setMsg("Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold text-foreground">Trigger ingest</h3>
      <p className="mt-1 text-xs text-muted">
        Runs all connectors and embeds new articles. Requires the admin token.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Admin token"
          aria-label="Admin token"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
        <button
          onClick={run}
          disabled={busy || token.length < 4}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {busy ? "Running…" : "Run now"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-muted">{msg}</p>}
    </div>
  );
}
