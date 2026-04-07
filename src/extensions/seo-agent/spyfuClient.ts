/**
 * SpyFu API v2 client for SEO keyword research, competitor analysis, and domain stats.
 * Docs: https://developer.spyfu.com
 * Auth: HTTP Basic (base64 API key) or query param
 */

// ---------------------------------------------------------------------------
// Base config
// ---------------------------------------------------------------------------

const BASE_URL = "https://api.spyfu.com/apis";

/**
 * Build auth for SpyFu v2.
 * The stored API key may be:
 *   (a) A base64-encoded "USER_ID:SECRET_KEY" string (for Basic auth)
 *   (b) A raw secret key string
 * We detect format and apply appropriate auth.
 */
function applyAuth(url: URL, headers: Record<string, string>, apiKey: string): void {
  // The stored API key is already base64-encoded "USER:SECRET" for Basic auth.
  // Check if it looks like valid base64 by trying to decode it.
  let isBase64 = false;
  try {
    const decoded = Buffer.from(apiKey, "base64").toString("utf8");
    if (decoded.includes(":") && decoded.split(":").length === 2) {
      isBase64 = true;
    }
  } catch {
    // Not base64
  }

  if (isBase64) {
    // Pass the ORIGINAL base64 string directly — do NOT decode and re-encode
    // Re-encoding can change padding and break auth
    headers["Authorization"] = `Basic ${apiKey}`;
  } else if (apiKey.includes(":")) {
    // Raw USER:SECRET — encode it
    headers["Authorization"] = `Basic ${Buffer.from(apiKey).toString("base64")}`;
  } else {
    // Standalone secret key — use query param
    url.searchParams.set("api_key", apiKey);
  }
}

function buildHeaders(): Record<string, string> {
  return { Accept: "application/json" };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpyfuKeywordResult {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  intent: string;
  // Rich fields from v2
  rankingPosition: number | null;
  rankingPositionChange: number | null;
  rankingUrl: string | null;
  seoClicks: number | null;
  seoClicksChange: number | null;
  totalMonthlyClicks: number | null;
  percentMobileSearches: number | null;
  percentOrganicClicks: number | null;
  percentNotClicked: number | null;
  serpFeatures: string | null;
  serpFirstResult: string | null;
  isQuestion: boolean;
  paidCompetitors: number | null;
  rankingHomepages: number | null;
}

export interface SpyfuDomainStats {
  domain: string;
  strength: number;
  monthlyOrganicClicks: number;
  monthlyOrganicValue: number;
  totalOrganicResults: number;
  averageOrganicRank: number;
  monthlyBudget: number;
  totalAdsPurchased: number;
  monthlyPaidClicks: number;
  searchMonth: number;
  searchYear: number;
}

export interface SpyfuKombatResult {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  totalMonthlyClicks: number | null;
  percentOrganicClicks: number | null;
  serpFeatures: string | null;
  serpFirstResult: string | null;
  isQuestion: boolean;
}

// ---------------------------------------------------------------------------
// Intent classification
// ---------------------------------------------------------------------------

function classifyIntent(keyword: string): string {
  const kw = keyword.toLowerCase();
  if (/buy|price|cheap|deal|discount|coupon|order|purchase|shop|pricing/.test(kw)) return "transactional";
  if (/best|top|review|vs|compare|alternative|comparison/.test(kw)) return "commercial";
  if (/how|what|why|when|where|guide|tutorial|tips|learn|example|template/.test(kw)) return "informational";
  return "navigational";
}

// ---------------------------------------------------------------------------
// Opportunity score (fixed formula)
// ---------------------------------------------------------------------------

export function calculateOpportunityScore(
  searchVolume: number,
  difficulty: number,
  cpc: number,
  seoClicks?: number | null,
): number {
  // Use clicks if available (more actionable), otherwise volume
  const trafficSignal = seoClicks ?? searchVolume;

  // Normalize to 0-100 with proper curve
  const volumeScore = Math.min(100, Math.log10(Math.max(trafficSignal, 1) + 1) * 30);
  const difficultyScore = Math.max(0, 100 - difficulty);
  const cpcScore = Math.min(100, cpc * 15);

  // Weighted: traffic potential 35%, difficulty 40%, commercial value 25%
  return Math.round(volumeScore * 0.35 + difficultyScore * 0.4 + cpcScore * 0.25);
}

// ---------------------------------------------------------------------------
// 1. Domain Keywords (v2 — getMostValuableKeywords)
// ---------------------------------------------------------------------------

export async function getDomainKeywords(
  apiKey: string,
  domain: string,
  maxResults: number = 50,
): Promise<SpyfuKeywordResult[]> {
  const url = new URL(`${BASE_URL}/serp_api/v2/seo/getMostValuableKeywords`);
  url.searchParams.set("query", domain);
  url.searchParams.set("pageSize", String(maxResults));
  url.searchParams.set("sortBy", "SearchVolume");
  url.searchParams.set("sortOrder", "Descending");
  url.searchParams.set("countryCode", "US");

  const headers = buildHeaders();
  applyAuth(url, headers, apiKey);
  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const results = data?.results ?? data;

  if (!Array.isArray(results)) return [];

  return results.map((item: any) => ({
    keyword: item.keyword || item.term || "",
    searchVolume: item.searchVolume ?? item.exact_local_monthly_search_volume ?? 0,
    keywordDifficulty: item.keywordDifficulty ?? item.seo_difficulty ?? 0,
    cpc: item.exactCostPerClick ?? item.exact_cost_per_click ?? item.broadCostPerClick ?? 0,
    intent: classifyIntent(item.keyword || item.term || ""),
    rankingPosition: item.rank ?? null,
    rankingPositionChange: item.rankChange ?? null,
    rankingUrl: item.topRankedUrl ?? null,
    seoClicks: item.seoClicks ?? null,
    seoClicksChange: item.seoClicksChange ?? null,
    totalMonthlyClicks: item.totalMonthlyClicks ?? null,
    percentMobileSearches: item.percentMobileSearches != null ? Math.round(item.percentMobileSearches * 100) : null,
    percentOrganicClicks: item.percentOrganicClicks != null ? Math.round(item.percentOrganicClicks * 100) : null,
    percentNotClicked: item.percentNotClicked != null ? Math.round(item.percentNotClicked * 100) : null,
    serpFeatures: item.serpFeaturesCsv ?? null,
    serpFirstResult: item.serpFirstResult ?? null,
    isQuestion: item.isQuestion ?? false,
    paidCompetitors: item.paidCompetitors ?? null,
    rankingHomepages: item.rankingHomepages ?? null,
  }));
}

// ---------------------------------------------------------------------------
// 2. Related Keywords (v2 — getRelatedKeywords) — REAL DATA, NOT FAKE
// ---------------------------------------------------------------------------

export async function getRelatedKeywords(
  apiKey: string,
  keyword: string,
  maxResults: number = 50,
): Promise<SpyfuKeywordResult[]> {
  const url = new URL(`${BASE_URL}/keyword_api/v2/related/getRelatedKeywords`);
  url.searchParams.set("query", keyword);
  url.searchParams.set("pageSize", String(maxResults));
  url.searchParams.set("sortBy", "SearchVolume");
  url.searchParams.set("sortOrder", "Descending");
  url.searchParams.set("countryCode", "US");

  const headers = buildHeaders();
  applyAuth(url, headers, apiKey);
  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu Related Keywords API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const results = data?.results ?? data;

  if (!Array.isArray(results)) return [];

  return results.map((item: any) => ({
    keyword: item.keyword || "",
    searchVolume: item.searchVolume ?? item.liveSearchVolume ?? 0,
    keywordDifficulty: item.rankingDifficulty ?? 0,
    cpc: item.exactCostPerClick ?? item.broadCostPerClick ?? 0,
    intent: classifyIntent(item.keyword || ""),
    rankingPosition: null, // Related keywords don't have rank for a specific domain
    rankingPositionChange: null,
    rankingUrl: null,
    seoClicks: null,
    seoClicksChange: null,
    totalMonthlyClicks: item.totalMonthlyClicks ?? null,
    percentMobileSearches: item.percentMobileSearches != null ? Math.round(item.percentMobileSearches * 100) : null,
    percentOrganicClicks: item.percentOrganicClicks != null ? Math.round(item.percentOrganicClicks * 100) : null,
    percentNotClicked: item.percentSearchesNotClicked != null ? Math.round(item.percentSearchesNotClicked * 100) : null,
    serpFeatures: item.serpFeaturesCsv ?? null,
    serpFirstResult: item.serpFirstResult ?? null,
    isQuestion: item.isQuestion ?? false,
    paidCompetitors: item.paidCompetitors ?? null,
    rankingHomepages: item.rankingHomepages ?? null,
  }));
}

// ---------------------------------------------------------------------------
// 3. Domain Stats (v2 — getLatestDomainStats)
// ---------------------------------------------------------------------------

export async function getDomainStats(
  apiKey: string,
  domain: string,
): Promise<SpyfuDomainStats | null> {
  const url = new URL(`${BASE_URL}/domain_stats_api/v2/getLatestDomainStats`);
  url.searchParams.set("domain", domain);
  url.searchParams.set("countryCode", "US");

  const headers = buildHeaders();
  applyAuth(url, headers, apiKey);
  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu Domain Stats API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const results = data?.results;

  if (!Array.isArray(results) || results.length === 0) return null;

  // Return latest month's stats
  const latest = results[0];
  return {
    domain: data.domain ?? domain,
    strength: latest.strength ?? 0,
    monthlyOrganicClicks: Math.round(latest.monthlyOrganicClicks ?? 0),
    monthlyOrganicValue: Math.round(latest.monthlyOrganicValue ?? 0),
    totalOrganicResults: latest.totalOrganicResults ?? 0,
    averageOrganicRank: Math.round((latest.averageOrganicRank ?? 0) * 10) / 10,
    monthlyBudget: Math.round(latest.monthlyBudget ?? 0),
    totalAdsPurchased: latest.totalAdsPurchased ?? 0,
    monthlyPaidClicks: Math.round(latest.monthlyPaidClicks ?? 0),
    searchMonth: latest.searchMonth ?? 0,
    searchYear: latest.searchYear ?? 0,
  };
}

// ---------------------------------------------------------------------------
// 4. Keyword Gap / Kombat (v2 — getCompetingSeoKeywords)
// ---------------------------------------------------------------------------

export async function getKeywordGap(
  apiKey: string,
  domains: string[],
  isIntersection: boolean = false,
  maxResults: number = 50,
): Promise<SpyfuKombatResult[]> {
  const url = new URL(`${BASE_URL}/keyword_api/v2/kombat/getCompetingSeoKeywords`);
  url.searchParams.set("includeDomainsCsv", domains.join(","));
  url.searchParams.set("isIntersection", String(isIntersection));
  url.searchParams.set("pageSize", String(maxResults));
  url.searchParams.set("sortBy", "SearchVolume");
  url.searchParams.set("sortOrder", "Descending");
  url.searchParams.set("countryCode", "US");

  const headers = buildHeaders();
  applyAuth(url, headers, apiKey);
  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu Kombat API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const results = data?.results ?? data;

  if (!Array.isArray(results)) return [];

  return results.map((item: any) => ({
    keyword: item.keyword || "",
    searchVolume: item.searchVolume ?? 0,
    keywordDifficulty: item.rankingDifficulty ?? 0,
    cpc: item.exactCostPerClick ?? item.broadCostPerClick ?? 0,
    totalMonthlyClicks: item.totalMonthlyClicks ?? null,
    percentOrganicClicks: item.percentOrganicClicks != null ? Math.round(item.percentOrganicClicks * 100) : null,
    serpFeatures: item.serpFeaturesCsv ?? null,
    serpFirstResult: item.serpFirstResult ?? null,
    isQuestion: item.isQuestion ?? false,
  }));
}
