import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "wasp/server";
import {
  getAllBranding,
  getBrandingValue,
  invalidateCache,
  BRANDING_DEFAULTS,
} from "./brandingService";

// The prisma mock comes from vitest alias → src/__tests__/mocks/wasp-server.ts
// We just need to spy on findMany
const mockFindMany = vi.fn();
(prisma.setting as any).findMany = mockFindMany;

beforeEach(() => {
  invalidateCache();
  mockFindMany.mockReset();
});

describe("brandingService", () => {
  describe("BRANDING_DEFAULTS", () => {
    it("has all required branding keys", () => {
      const requiredKeys = [
        "branding.app_name",
        "branding.domain",
        "branding.tagline",
        "branding.logo_url",
        "branding.logo_s3key",
        "branding.favicon_url",
        "branding.favicon_s3key",
        "branding.og_image_url",
        "branding.og_image_s3key",
        "branding.meta_title",
        "branding.meta_description",
        "branding.primary_color",
        "branding.auth_bg_color",
      ];
      for (const key of requiredKeys) {
        expect(BRANDING_DEFAULTS).toHaveProperty(key);
      }
    });

    it("has mAutomate as default app name", () => {
      expect(BRANDING_DEFAULTS["branding.app_name"]).toBe("mAutomate");
    });

    it("has valid default primary color (hex)", () => {
      expect(BRANDING_DEFAULTS["branding.primary_color"]).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe("getAllBranding", () => {
    it("returns defaults when no DB rows exist", async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await getAllBranding();

      expect(result["branding.app_name"]).toBe("mAutomate");
      expect(result["branding.domain"]).toBe("mautomate.ai");
    });

    it("overrides defaults with DB values", async () => {
      mockFindMany.mockResolvedValue([
        { key: "branding.app_name", value: "GenDonkey" },
        { key: "branding.domain", value: "gendonkey.com" },
      ]);

      const result = await getAllBranding();

      expect(result["branding.app_name"]).toBe("GenDonkey");
      expect(result["branding.domain"]).toBe("gendonkey.com");
      expect(result["branding.tagline"]).toBe("Marketing OS");
    });

    it("caches results for subsequent calls", async () => {
      mockFindMany.mockResolvedValue([]);

      await getAllBranding();
      await getAllBranding();
      await getAllBranding();

      expect(mockFindMany).toHaveBeenCalledTimes(1);
    });

    it("refreshes after cache invalidation", async () => {
      mockFindMany.mockResolvedValue([]);

      await getAllBranding();
      invalidateCache();
      await getAllBranding();

      expect(mockFindMany).toHaveBeenCalledTimes(2);
    });
  });

  describe("getBrandingValue", () => {
    it("returns specific key value from DB", async () => {
      mockFindMany.mockResolvedValue([
        { key: "branding.app_name", value: "TestApp" },
      ]);

      const value = await getBrandingValue("branding.app_name");
      expect(value).toBe("TestApp");
    });

    it("returns default for missing key", async () => {
      mockFindMany.mockResolvedValue([]);

      const value = await getBrandingValue("branding.app_name");
      expect(value).toBe("mAutomate");
    });

    it("returns empty string for unknown key", async () => {
      mockFindMany.mockResolvedValue([]);

      const value = await getBrandingValue("branding.nonexistent");
      expect(value).toBe("");
    });
  });
});
