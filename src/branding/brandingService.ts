import { prisma } from "wasp/server";

// ---------------------------------------------------------------------------
// Branding defaults — all keys use the "branding." prefix in the Setting table
// ---------------------------------------------------------------------------

export const BRANDING_DEFAULTS: Record<string, string> = {
  "branding.app_name": "mAutomate",
  "branding.domain": "mautomate.ai",
  "branding.tagline": "Marketing OS",
  "branding.slogan":
    "The complete AI Marketing Operating System. Automate Content, Reels, DMs, and Growth in One Platform.",
  "branding.contact_email": "contact@mautomate.ai",
  "branding.support_email": "support@mautomate.ai",
  "branding.noreply_email": "noreply@mautomate.ai",
  "branding.logo_url": "",
  "branding.logo_s3key": "",
  "branding.favicon_url": "",
  "branding.favicon_s3key": "",
  "branding.og_image_url": "",
  "branding.og_image_s3key": "",
  "branding.meta_title": "mAutomate",
  "branding.meta_description":
    "mAutomate.ai is an AI marketing automation platform for campaign orchestration, audience segmentation, and revenue attribution.",
  "branding.og_title": "mAutomate",
  "branding.og_description":
    "Automate and optimize multi-channel marketing with AI workflows and attribution analytics.",
  "branding.og_url": "https://mautomate.ai",
  "branding.twitter_card": "summary_large_image",
  "branding.keywords":
    "marketing automation, AI marketing, campaign orchestration, lead scoring, attribution",
  "branding.primary_color": "#bd711d",
  "branding.auth_bg_color": "#1a1207",
  "branding.copyright_text": "",
  "branding.terms_url": "/terms",
  "branding.privacy_url": "/privacy",
  "branding.footer_cta_title": "Smart Campaign Orchestrator",
  "branding.footer_cta_desc":
    "AI marketing automation platform for campaign orchestration, audience segmentation, and attribution analytics.",
};

// ---------------------------------------------------------------------------
// In-memory cache (60s TTL)
// ---------------------------------------------------------------------------

let cache: Map<string, string> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

export function invalidateCache() {
  cache = null;
  cacheExpiry = 0;
}

export async function getAllBranding(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now < cacheExpiry) {
    return Object.fromEntries(cache);
  }

  // Load all branding.* keys from Setting table
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: "branding." } },
  });

  const merged = new Map<string, string>();
  // Start with defaults
  for (const [k, v] of Object.entries(BRANDING_DEFAULTS)) {
    merged.set(k, v);
  }
  // Override with DB values
  for (const row of rows) {
    merged.set(row.key, row.value);
  }

  cache = merged;
  cacheExpiry = now + CACHE_TTL_MS;

  return Object.fromEntries(merged);
}

export async function getBrandingValue(key: string): Promise<string> {
  const all = await getAllBranding();
  return all[key] ?? BRANDING_DEFAULTS[key] ?? "";
}
