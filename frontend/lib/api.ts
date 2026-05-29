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

// Trigger is called client-side with the shared-secret token.
export const ADMIN_BASE = BASE;
