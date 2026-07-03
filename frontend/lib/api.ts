// Typed client for the ai-search-experience backend.

const BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  "https://ai-search-experience-production.up.railway.app";

export type Result = {
  id: number;
  url: string;
  title: string;
  summary: string | null;
  source: string;
  source_type: string;
  theme: string;
  published_at: string | null;
  score: number;
};

export type Citation = {
  n: number;
  title: string;
  url: string;
  source: string;
};

export type SearchResponse = {
  query: string;
  answer: string;
  citations: Citation[];
  provider: string;
  results: Result[];
};

export type Trending = {
  id: number;
  title: string;
  url: string;
  source: string;
  source_type: string;
  theme: string;
  published_at: string | null;
  heat: number;
};

export async function search(q: string, limit = 12): Promise<SearchResponse> {
  const res = await fetch(
    `${BASE}/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return res.json();
}

export async function getTrending(limit = 10): Promise<Trending[]> {
  const res = await fetch(`${BASE}/trending?limit=${limit}`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`trending failed: ${res.status}`);
  return res.json();
}

// --- Daily / weekly briefing (the auto-generated "what's new + so what") ---

export type Briefing = {
  kind: string;
  narrative: string;
  citations: Citation[];
  window_start: string | null;
  window_end: string | null;
  article_count: number;
  provider: string;
  generated_at: string | null;
};

export async function getBriefing(kind = "daily"): Promise<Briefing | null> {
  const res = await fetch(`${BASE}/briefing?kind=${kind}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`briefing failed: ${res.status}`);
  return res.json(); // null when none has been generated yet
}

// --- Personas & feed (the signal layer) ---

export type Persona = {
  key: string;
  name: string;
  tagline: string | null;
};

export type FeedItem = {
  id: number;
  url: string;
  title: string;
  summary: string | null;
  source: string;
  theme: string;
  published_at: string | null;
  signal: number;
  relevance: number;
  substance: number | null;
  hype_gap: number | null;
  angle: string | null;
};

export type Feed = {
  persona: string;
  persona_name: string;
  items: FeedItem[];
  coverage: { scored: number; total: number; relevant: number };
};

export async function getPersonas(): Promise<Persona[]> {
  const res = await fetch(`${BASE}/personas`, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`personas failed: ${res.status}`);
  return res.json();
}

export async function getFeed(persona = "ceo", limit = 24): Promise<Feed> {
  const res = await fetch(`${BASE}/feed?persona=${persona}&limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`feed failed: ${res.status}`);
  return res.json();
}

// --- Admin / control panel ---

export type CorpusStats = {
  total: number;
  embedded: number;
  chunks: number;
  by_source: { source: string; type: string; theme: string; count: number }[];
  by_theme: { theme: string; count: number }[];
};

export type RunRow = {
  source: string;
  finished_at: string | null;
  fetched: number;
  inserted: number;
  updated: number;
  error: string | null;
};

export async function getStats(): Promise<CorpusStats> {
  const res = await fetch(`${BASE}/admin/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error(`stats failed: ${res.status}`);
  return res.json();
}

export async function getRuns(limit = 20): Promise<RunRow[]> {
  const res = await fetch(`${BASE}/admin/runs?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`runs failed: ${res.status}`);
  return res.json();
}

export type GrowthPoint = {
  finished_at: string;
  total: number;
  chunks: number;
  distinct_sources: number;
  themes: Record<string, number>;
};

export async function getGrowth(limit = 60): Promise<GrowthPoint[]> {
  const res = await fetch(`${BASE}/admin/growth?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`growth failed: ${res.status}`);
  return res.json();
}

export type PerSource = {
  source: string;
  fetched: number;
  inserted: number;
  updated: number;
  error: string | null;
};

export type PipelineRun = {
  trigger: string;
  finished_at: string | null;
  total_before: number;
  total_after: number;
  inserted: number;
  updated: number;
  embedded: number;
  per_source: PerSource[];
};

export async function getPipelineRuns(limit = 20): Promise<PipelineRun[]> {
  const res = await fetch(`${BASE}/admin/pipeline-runs?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`pipeline-runs failed: ${res.status}`);
  return res.json();
}

export type CoveragePoint = { period: string; count: number };

export async function getCoverage(by: "year" | "month" = "year"): Promise<CoveragePoint[]> {
  const res = await fetch(`${BASE}/admin/coverage?by=${by}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`coverage failed: ${res.status}`);
  return res.json();
}

export type TopSource = { source: string; theme: string; count: number };

export async function getTopSources(limit = 12): Promise<TopSource[]> {
  const res = await fetch(`${BASE}/admin/top-sources?limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`top-sources failed: ${res.status}`);
  return res.json();
}

// Trigger and source CRUD are called client-side with the shared-secret token.
export const ADMIN_BASE = BASE;

export type Source = {
  id: number;
  name: string;
  connector: "rss" | "arxiv" | "hackernews";
  source_type: "paper" | "release" | "news" | "discussion";
  config: Record<string, unknown>;
  max_results: number;
  enabled: boolean;
};

export async function getSources(): Promise<Source[]> {
  const res = await fetch(`${BASE}/admin/sources`, { cache: "no-store" });
  if (!res.ok) throw new Error(`sources failed: ${res.status}`);
  return res.json();
}

function authHeaders(token: string): HeadersInit {
  return { "Content-Type": "application/json", "X-Admin-Token": token };
}

export async function createSource(
  token: string,
  body: Omit<Source, "id">
): Promise<Response> {
  return fetch(`${BASE}/admin/sources`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export async function updateSource(
  token: string,
  id: number,
  patch: Partial<Omit<Source, "id">>
): Promise<Response> {
  return fetch(`${BASE}/admin/sources/${id}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
}

export async function deleteSource(token: string, id: number): Promise<Response> {
  return fetch(`${BASE}/admin/sources/${id}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function triggerBriefing(token: string, kind = "daily"): Promise<Response> {
  return fetch(`${BASE}/admin/briefing`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ kind }),
  });
}
