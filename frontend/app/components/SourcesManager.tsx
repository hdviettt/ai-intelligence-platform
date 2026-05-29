"use client";

import { useEffect, useState } from "react";
import {
  createSource,
  deleteSource,
  getSources,
  updateSource,
  ADMIN_BASE,
  type Source,
} from "@/lib/api";

const CONNECTORS = ["rss", "arxiv", "hackernews"] as const;
const TYPES = ["paper", "release", "news", "discussion"] as const;

type Draft = {
  name: string;
  connector: Source["connector"];
  source_type: Source["source_type"];
  configText: string;
  max_results: number;
};

const BLANK: Draft = {
  name: "",
  connector: "rss",
  source_type: "news",
  configText: '{\n  "feed_url": "",\n  "base_url": ""\n}',
  max_results: 30,
};

export function SourcesManager() {
  const [token, setToken] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [editId, setEditId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("admin_token");
    if (t) setToken(t);
    refresh();
  }, []);

  function saveToken(t: string) {
    setToken(t);
    localStorage.setItem("admin_token", t);
  }

  async function refresh() {
    try {
      setSources(await getSources());
    } catch {
      setMsg("Couldn’t load sources.");
    }
  }

  async function handle(res: Response, okMsg: string) {
    if (res.ok) {
      setMsg(okMsg);
      await refresh();
      return true;
    }
    const code = res.status;
    setMsg(
      code === 503
        ? "Writes disabled — ADMIN_TOKEN not set on the server."
        : code === 401
          ? "Invalid token."
          : code === 409
            ? "Name already exists."
            : code === 422
              ? "Invalid connector/type or config."
              : `Error ${code}`
    );
    return false;
  }

  async function submitDraft() {
    setBusy(true);
    setMsg(null);
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(draft.configText || "{}");
    } catch {
      setMsg("Config is not valid JSON.");
      setBusy(false);
      return;
    }
    const body = {
      name: draft.name.trim(),
      connector: draft.connector,
      source_type: draft.source_type,
      config,
      max_results: draft.max_results,
      enabled: true,
    };
    const res = editId
      ? await updateSource(token, editId, body)
      : await createSource(token, body as Omit<Source, "id">);
    const ok = await handle(res, editId ? "Source updated." : "Source added.");
    if (ok) {
      setDraft(BLANK);
      setEditId(null);
    }
    setBusy(false);
  }

  function startEdit(s: Source) {
    setEditId(s.id);
    setDraft({
      name: s.name,
      connector: s.connector,
      source_type: s.source_type,
      configText: JSON.stringify(s.config, null, 2),
      max_results: s.max_results,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  async function toggle(s: Source) {
    setBusy(true);
    await handle(
      await updateSource(token, s.id, { enabled: !s.enabled }),
      `${s.name} ${s.enabled ? "disabled" : "enabled"}.`
    );
    setBusy(false);
  }

  async function remove(s: Source) {
    if (!confirm(`Delete source “${s.name}”? Existing articles stay.`)) return;
    setBusy(true);
    await handle(await deleteSource(token, s.id), `${s.name} deleted.`);
    setBusy(false);
  }

  async function runIngest(only?: string) {
    setBusy(true);
    setMsg(only ? `Ingesting ${only}…` : "Ingesting all enabled…");
    try {
      const res = await fetch(`${ADMIN_BASE}/admin/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify(only ? { sources: [only] } : {}),
      });
      const b = await res.json();
      if (!res.ok) {
        await handle(res, "");
      } else {
        const ins = (b.sources ?? []).reduce(
          (a: number, x: { inserted: number }) => a + (x.inserted || 0),
          0
        );
        setMsg(`Done — ${ins} new, ${b.embedded} embedded.`);
        await refresh();
      }
    } catch {
      setMsg("Request failed.");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => saveToken(e.target.value)}
          placeholder="Admin token"
          aria-label="Admin token"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
        <button
          onClick={() => runIngest()}
          disabled={busy || token.length < 4}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Ingest all
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-xs text-muted">
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Connector</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Max</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${s.enabled ? "bg-emerald-500" : "bg-slate-300"}`}
                    />
                    {s.name}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted">{s.connector}</td>
                <td className="px-3 py-2 text-muted">{s.source_type}</td>
                <td className="px-3 py-2 text-right tabular-nums">{s.max_results}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => runIngest(s.name)} disabled={busy}
                      className="text-accent hover:underline cursor-pointer disabled:opacity-40">run</button>
                    <button onClick={() => toggle(s)} disabled={busy}
                      className="text-muted hover:text-foreground cursor-pointer disabled:opacity-40">
                      {s.enabled ? "disable" : "enable"}</button>
                    <button onClick={() => startEdit(s)} disabled={busy}
                      className="text-muted hover:text-foreground cursor-pointer disabled:opacity-40">edit</button>
                    <button onClick={() => remove(s)} disabled={busy}
                      className="text-red-600 hover:underline cursor-pointer disabled:opacity-40">del</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {editId ? "Edit source" : "Add source"}
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            Max results
            <input
              type="number"
              value={draft.max_results}
              onChange={(e) => setDraft({ ...draft, max_results: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-muted">
            Connector
            <select
              value={draft.connector}
              onChange={(e) => setDraft({ ...draft, connector: e.target.value as Source["connector"] })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent cursor-pointer"
            >
              {CONNECTORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted">
            Theme / type
            <select
              value={draft.source_type}
              onChange={(e) => setDraft({ ...draft, source_type: e.target.value as Source["source_type"] })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent cursor-pointer"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs text-muted">
          Config (JSON) — rss: {`{feed_url, base_url}`} · arxiv: {`{categories:[…]}`} · hackernews: {`{query, min_points}`}
          <textarea
            value={draft.configText}
            onChange={(e) => setDraft({ ...draft, configText: e.target.value })}
            rows={4}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-accent"
          />
        </label>
        <div className="mt-3 flex gap-2">
          <button
            onClick={submitDraft}
            disabled={busy || token.length < 4 || draft.name.trim().length < 2}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {editId ? "Save changes" : "Add source"}
          </button>
          {editId && (
            <button
              onClick={() => { setEditId(null); setDraft(BLANK); }}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
