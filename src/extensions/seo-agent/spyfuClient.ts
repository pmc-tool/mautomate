/**
 * SpyFu API client for keyword research.
 * API docs: https://www.spyfu.com/apis
 * Auth: API key passed as query parameter
 */

const SPYFU_BASE_URL = "https://www.spyfu.com/apis/url_api/organic_kws";
const SPYFU_RELATED_URL = "https://www.spyfu.com/apis/related_keywords_api/related";

interface SpyfuKeywordResult {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  intent?: string;
}

/**
 * Get related keywords for a seed keyword.
 */
export async function getRelatedKeywords(
  apiKey: string,
  keyword: string,
  maxResults: number = 50
): Promise<SpyfuKeywordResult[]> {
  // SpyFu related keywords endpoint
  const url = new URL(SPYFU_RELATED_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", keyword);
  url.searchParams.set("r", String(maxResults));

  const response = await fetch(url.toString());

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu API error (${response.status}): ${text}`);
  }

  const data = await response.json();

  // SpyFu returns results in various formats; normalize them
  // The related keywords API returns an array of result objects
  if (!Array.isArray(data?.results)) {
    return [];
  }

  return data.results.map((item: any) => ({
    keyword: item.keyword || item.term || "",
    searchVolume: item.searchVolume || item.exact_local_monthly_search_volume || 0,
    keywordDifficulty: item.seoKeywordDifficulty || item.keyword_difficulty || 0,
    cpc: item.costPerClick || item.cpc || 0,
    intent: classifyIntent(item.keyword || ""),
  }));
}

/**
 * Get organic keywords for a competitor domain.
 */
export async function getDomainKeywords(
  apiKey: string,
  domain: string,
  maxResults: number = 50
): Promise<SpyfuKeywordResult[]> {
  const url = new URL(SPYFU_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("q", domain);
  url.searchParams.set("r", String(maxResults));

  const response = await fetch(url.toString());
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!Array.isArray(data?.results)) return [];

  return data.results.map((item: any) => ({
    keyword: item.keyword || item.term || "",
    searchVolume: item.searchVolume || item.exact_local_monthly_search_volume || 0,
    keywordDifficulty: item.seoKeywordDifficulty || item.keyword_difficulty || 0,
    cpc: item.costPerClick || item.cpc || 0,
    intent: classifyIntent(item.keyword || ""),
  }));
}

/**
 * Simple intent classification based on keyword patterns.
 */
function classifyIntent(keyword: string): string {
  const kw = keyword.toLowerCase();
  if (/buy|price|cheap|deal|discount|coupon|order|purchase|shop/.test(kw)) return "transactional";
  if (/best|top|review|vs|compare|alternative/.test(kw)) return "commercial";
  if (/how|what|why|when|where|guide|tutorial|tips|learn/.test(kw)) return "informational";
  return "navigational";
}

/**
 * Calculate opportunity score (0-100) based on search volume, difficulty, and CPC.
 * High volume + low difficulty + decent CPC = high opportunity.
 */
export function calculateOpportunityScore(
  searchVolume: number,
  difficulty: number,
  cpc: number
): number {
  // Normalize components to 0-100 scale
  const volumeScore = Math.min(searchVolume / 100, 100); // 10k+ gets max
  const difficultyScore = Math.max(0, 100 - difficulty);  // lower difficulty = higher score
  const cpcScore = Math.min(cpc * 20, 100);               // $5+ CPC gets max

  // Weighted average: volume 40%, difficulty 40%, CPC 20%
  return Math.round(volumeScore * 0.4 + difficultyScore * 0.4 + cpcScore * 0.2);
}
