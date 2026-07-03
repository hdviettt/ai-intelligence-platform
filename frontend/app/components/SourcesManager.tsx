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
import { Icon } from "./Icon";

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
          className="md-field-dense flex-1"
        />
        <button
          onClick={() => runIngest()}
          disabled={busy || token.length < 4}
          className="md-btn md-btn-filled md-btn-pill md-btn-sm"
        >
          <Icon name="play_arrow" size={16} />
          Ingest all
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-md-outline-variant">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-md-outline-variant bg-md-surface-container md-label-small text-md-on-surface-variant">
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Connector</th>
              <th className="px-3 py-2 text-left font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Max</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-b border-md-outline-variant bg-md-surface last:border-0">
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${s.enabled ? "bg-green-600 dark:bg-green-400" : "bg-md-outline"}`}
                    />
                    <span className="text-md-on-surface">{s.name}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-md-on-surface-variant">{s.connector}</td>
                <td className="px-3 py-2 text-md-on-surface-variant">{s.source_type}</td>
                <td className="px-3 py-2 text-right tabular-nums text-md-on-surface">{s.max_results}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-3 text-xs">
                    <button onClick={() => runIngest(s.name)} disabled={busy}
                      className="inline-flex items-center gap-1 text-md-primary hover:underline cursor-pointer disabled:opacity-40">
                      <Icon name="play_arrow" size={14} />run
                    </button>
                    <button onClick={() => toggle(s)} disabled={busy}
                      className="inline-flex items-center gap-1 text-md-on-surface-variant hover:text-md-on-surface cursor-pointer disabled:opacity-40">
                      <Icon name={s.enabled ? "toggle_on" : "toggle_off"} size={14} filled={s.enabled} />
                      {s.enabled ? "disable" : "enable"}
                    </button>
                    <button onClick={() => startEdit(s)} disabled={busy}
                      className="inline-flex items-center gap-1 text-md-on-surface-variant hover:text-md-on-surface cursor-pointer disabled:opacity-40">
                      <Icon name="edit" size={14} />edit
                    </button>
                    <button onClick={() => remove(s)} disabled={busy}
                      className="inline-flex items-center gap-1 text-red-600 hover:underline cursor-pointer disabled:opacity-40 dark:text-red-400">
                      <Icon name="delete" size={14} />del
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-md-outline-variant bg-md-surface-container-low p-5">
        <h3 className="md-title-small text-md-on-surface">
          {editId ? "Edit source" : "Add source"}
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="md-label-small text-md-on-surface-variant">
            Name
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="md-field-dense mt-1 w-full"
            />
          </label>
          <label className="md-label-small text-md-on-surface-variant">
            Max results
            <input
              type="number"
              value={draft.max_results}
              onChange={(e) => setDraft({ ...draft, max_results: Number(e.target.value) })}
              className="md-field-dense mt-1 w-full"
            />
          </label>
          <label className="md-label-small text-md-on-surface-variant">
            Connector
            <select
              value={draft.connector}
              onChange={(e) => setDraft({ ...draft, connector: e.target.value as Source["connector"] })}
              className="md-field-dense mt-1 w-full cursor-pointer"
            >
              {CONNECTORS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="md-label-small text-md-on-surface-variant">
            Theme / type
            <select
              value={draft.source_type}
              onChange={(e) => setDraft({ ...draft, source_type: e.target.value as Source["source_type"] })}
              className="md-field-dense mt-1 w-full cursor-pointer"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-3 block md-label-small text-md-on-surface-variant">
          Config (JSON) — rss: {`{feed_url, base_url}`} · arxiv: {`{categories:[…]}`} · hackernews: {`{query, min_points}`}
          <textarea
            value={draft.configText}
            onChange={(e) => setDraft({ ...draft, configText: e.target.value })}
            rows={4}
            className="md-field-dense mt-1 w-full font-mono text-xs"
          />
        </label>
        <div className="mt-3 flex gap-2">
          <button
            onClick={submitDraft}
            disabled={busy || token.length < 4 || draft.name.trim().length < 2}
            className="md-btn md-btn-filled md-btn-pill md-btn-sm"
          >
            {editId ? "Save changes" : "Add source"}
          </button>
          {editId && (
            <button
              onClick={() => { setEditId(null); setDraft(BLANK); }}
              className="md-btn md-btn-outlined md-btn-pill md-btn-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {msg && <p className="md-label-small text-md-on-surface-variant">{msg}</p>}
    </div>
  );
}
