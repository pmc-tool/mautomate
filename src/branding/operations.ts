import { HttpError } from "wasp/server";
import { z } from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation.js";
import {
  getAllBranding,
  invalidateCache,
} from "./brandingService.js";
import type {
  GetBrandingSettings,
  SaveBrandingSettings,
} from "wasp/server/operations";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertAdmin(context: any) {
  if (!context.user) throw new HttpError(401, "Not authenticated");
  if (!context.user.isAdmin) throw new HttpError(403, "Admin access required");
}

/**
 * Resolve S3 keys to proxy URLs (/api/branding/logo, etc.) so <img> tags
 * load through our server. Direct S3 signed URLs fail when Cloudflare
 * hotlink protection blocks requests with a Referer header.
 */
async function resolveAssetUrls(
  settings: Record<string, string>,
): Promise<Record<string, string>> {
  const keyMap: [string, string, string][] = [
    ["branding.logo_s3key", "branding.logo_url", "/api/branding/logo"],
    ["branding.favicon_s3key", "branding.favicon_url", "/api/branding/favicon"],
    ["branding.og_image_s3key", "branding.og_image_url", "/api/branding/og-image"],
  ];

  for (const [s3keyField, urlField, proxyPath] of keyMap) {
    const s3Key = settings[s3keyField];
    if (s3Key) {
      // Use server-side proxy endpoint instead of direct S3 signed URL
      settings[urlField] = proxyPath;
    }
  }

  return settings;
}

// ---------------------------------------------------------------------------
// Public query — no auth required (needed by landing, auth, OG crawlers)
// ---------------------------------------------------------------------------

export const getBrandingSettings: GetBrandingSettings<
  void,
  Record<string, string>
> = async (_args, _context) => {
  const settings = await getAllBranding();
  // Return a copy with resolved S3 URLs (don't mutate cache)
  return resolveAssetUrls({ ...settings });
};

// ---------------------------------------------------------------------------
// Admin action — save branding settings
// ---------------------------------------------------------------------------

const saveBrandingSettingsSchema = z.object({
  settings: z.record(z.string(), z.string()),
});

export const saveBrandingSettings: SaveBrandingSettings<
  { settings: Record<string, string> },
  { saved: number }
> = async (rawArgs, context) => {
  assertAdmin(context);

  const { settings } = ensureArgsSchemaOrThrowHttpError(
    saveBrandingSettingsSchema,
    rawArgs,
  );

  let saved = 0;

  for (const [key, value] of Object.entries(settings)) {
    if (!key.startsWith("branding.")) continue;
    // Allow any branding.* key (including new ones not in defaults)
    await context.entities.Setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    saved++;
  }

  invalidateCache();

  return { saved };
};
