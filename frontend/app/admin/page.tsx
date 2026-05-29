import Link from "next/link";
import { getRuns, getStats } from "@/lib/api";
import { AdminTrigger } from "../components/AdminTrigger";
import { THEME_STYLES, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-2xl font-semibold tabular-nums text-foreground">
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

export default async function AdminPage() {
  let stats, runs;
  try {
    [stats, runs] = await Promise.all([getStats(), getRuns(20)]);
  } catch {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm text-muted">Couldn’t reach the backend.</p>
      </main>
    );
  }

  const coverage = stats.total
    ? Math.round((stats.embedded / stats.total) * 100)
    : 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <Link href="/" className="font-semibold text-foreground">
          AI<span className="text-accent">Search</span>
        </Link>
        <span className="text-muted">/</span>
        <h1 className="font-medium text-foreground">Control panel</h1>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Articles" value={stats.total} />
        <StatCard label="Embedded" value={stats.embedded} />
        <StatCard label="Chunks" value={stats.chunks} />
        <StatCard label={`Coverage ${coverage}%`} value={coverage} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2.5 text-sm font-semibold text-foreground">
            By source
          </h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <tbody>
                {stats.by_source.map((s) => {
                  const style = THEME_STYLES[s.theme] ?? THEME_STYLES.Other;
                  return (
                    <tr key={s.source} className="border-b border-border last:border-0">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                          {s.source}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">{s.theme}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">
                        {s.count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <AdminTrigger />
          </div>
        </div>

        <div>
          <h2 className="mb-2.5 text-sm font-semibold text-foreground">
            Recent ingest runs
          </h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-xs text-muted">
                  <th className="px-3 py-2 text-left font-medium">Source</th>
                  <th className="px-3 py-2 text-left font-medium">When</th>
                  <th className="px-3 py-2 text-right font-medium">+New</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className="text-red-600">{r.source} ⚠</span>
                      ) : (
                        r.source
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted">
                      {timeAgo(r.finished_at)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-foreground">
                      {r.inserted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            Auto-refreshes every 6h via the scheduled ingest job.
          </p>
        </div>
      </section>
    </main>
  );
}
