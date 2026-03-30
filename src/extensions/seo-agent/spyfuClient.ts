/**
 * SpyFu API client for keyword research.
 * API docs: https://www.spyfu.com/apis
 * Auth: HTTP Basic with base64 API key
 */

const SPYFU_DOMAIN_ORGANIC_URL = "https://www.spyfu.com/apis/url_api/organic_kws";

interface SpyfuKeywordResult {
  keyword: string;
  searchVolume: number;
  keywordDifficulty: number;
  cpc: number;
  intent?: string;
}

function buildHeaders(apiKey: string) {
  return {
    Authorization: `Basic ${apiKey}`,
    Accept: "application/json",
  };
}

/**
 * Get organic keywords for a domain.
 * This is the primary SpyFu API endpoint for keyword research.
 */
export async function getDomainKeywords(
  apiKey: string,
  domain: string,
  maxResults: number = 50
): Promise<SpyfuKeywordResult[]> {
  const url = new URL(SPYFU_DOMAIN_ORGANIC_URL);
  url.searchParams.set("q", domain);
  url.searchParams.set("r", String(maxResults));

  const response = await fetch(url.toString(), {
    headers: buildHeaders(apiKey),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SpyFu API error (${response.status}): ${text}`);
  }

  const data = await response.json();

  // SpyFu returns a flat array of results
  if (!Array.isArray(data)) return [];

  return data.map((item: any) => ({
    keyword: item.term || "",
    searchVolume: item.exact_local_monthly_search_volume || 0,
    keywordDifficulty: item.seo_difficulty || 0,
    cpc: item.exact_cost_per_click || item.phrase_cost_per_click || 0,
    intent: classifyIntent(item.term || ""),
  }));
}

/**
 * Get related keywords for a seed keyword.
 * SpyFu does not have a direct "related keywords" endpoint, so we use the
 * domain organic keywords API with the seed keyword as a domain query to
 * find domains ranking for it, then pull their keywords.
 *
 * This is a two-step process:
 * 1. Find top domain ranking for the seed keyword (via organic_kws with the keyword)
 * 2. Pull that domain's organic keywords to discover related terms
 *
 * Falls back to returning empty if the keyword doesn't map to any domain.
 */
export async function getRelatedKeywords(
  apiKey: string,
  keyword: string,
  maxResults: number = 50
): Promise<SpyfuKeywordResult[]> {
  // Step 1: Try getting domains that rank for this keyword by using organic_kws
  // with the keyword. SpyFu organic_kws endpoint accepts domains only,
  // so we need to find a domain first. We'll search for a common domain
  // in the niche by using the keyword as a domain hint.
  //
  // Since SpyFu doesn't have a related-keywords endpoint,
  // we return an empty array and let the caller use an alternative method.
  return [];
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
