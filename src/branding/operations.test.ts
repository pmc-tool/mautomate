import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("./brandingService.js", () => ({
  getAllBranding: vi.fn(),
  invalidateCache: vi.fn(),
}));

vi.mock("../file-upload/s3Utils.js", () => ({
  getDownloadFileSignedURLFromS3: vi.fn(),
}));

import { getAllBranding, invalidateCache } from "./brandingService.js";
import { getDownloadFileSignedURLFromS3 } from "../file-upload/s3Utils.js";
import { getBrandingSettings, saveBrandingSettings } from "./operations";

const mockGetAllBranding = getAllBranding as ReturnType<typeof vi.fn>;
const mockGetSignedURL = getDownloadFileSignedURLFromS3 as ReturnType<typeof vi.fn>;
const mockInvalidateCache = invalidateCache as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBrandingSettings", () => {
  it("returns branding settings with defaults", async () => {
    mockGetAllBranding.mockResolvedValue({
      "branding.app_name": "mAutomate",
      "branding.logo_s3key": "",
      "branding.logo_url": "",
      "branding.og_image_s3key": "",
      "branding.og_image_url": "",
      "branding.favicon_s3key": "",
      "branding.favicon_url": "",
    });

    const result = await getBrandingSettings(undefined as any, {} as any);

    expect(result["branding.app_name"]).toBe("mAutomate");
    expect(mockGetSignedURL).not.toHaveBeenCalled();
  });

  it("resolves S3 keys to signed URLs when s3key exists and no direct URL", async () => {
    mockGetAllBranding.mockResolvedValue({
      "branding.logo_s3key": "user123/logo.png",
      "branding.logo_url": "",
      "branding.og_image_s3key": "user123/og.png",
      "branding.og_image_url": "",
      "branding.favicon_s3key": "",
      "branding.favicon_url": "",
    });

    mockGetSignedURL.mockResolvedValue("https://s3.example.com/signed-logo-url");

    const result = await getBrandingSettings(undefined as any, {} as any);

    expect(mockGetSignedURL).toHaveBeenCalledTimes(2);
    expect(result["branding.logo_url"]).toBe("https://s3.example.com/signed-logo-url");
    expect(result["branding.og_image_url"]).toBe("https://s3.example.com/signed-logo-url");
  });

  it("does NOT resolve S3 when direct URL is already set", async () => {
    mockGetAllBranding.mockResolvedValue({
      "branding.logo_s3key": "user123/logo.png",
      "branding.logo_url": "https://custom.com/logo.png",
      "branding.og_image_s3key": "",
      "branding.og_image_url": "",
      "branding.favicon_s3key": "",
      "branding.favicon_url": "",
    });

    const result = await getBrandingSettings(undefined as any, {} as any);

    expect(mockGetSignedURL).not.toHaveBeenCalled();
    expect(result["branding.logo_url"]).toBe("https://custom.com/logo.png");
  });

  it("handles S3 errors gracefully — leaves URL empty", async () => {
    mockGetAllBranding.mockResolvedValue({
      "branding.logo_s3key": "broken/key.png",
      "branding.logo_url": "",
      "branding.og_image_s3key": "",
      "branding.og_image_url": "",
      "branding.favicon_s3key": "",
      "branding.favicon_url": "",
    });

    mockGetSignedURL.mockRejectedValue(new Error("S3 error"));

    const result = await getBrandingSettings(undefined as any, {} as any);

    expect(result["branding.logo_url"]).toBe("");
  });

  it("does not mutate the cached branding object", async () => {
    const cachedObj = {
      "branding.logo_s3key": "user/logo.png",
      "branding.logo_url": "",
      "branding.og_image_s3key": "",
      "branding.og_image_url": "",
      "branding.favicon_s3key": "",
      "branding.favicon_url": "",
    };
    mockGetAllBranding.mockResolvedValue(cachedObj);
    mockGetSignedURL.mockResolvedValue("https://signed.url");

    await getBrandingSettings(undefined as any, {} as any);

    // Original object should NOT be mutated (we spread it)
    expect(cachedObj["branding.logo_url"]).toBe("");
  });
});

describe("saveBrandingSettings", () => {
  it("rejects non-admin users", async () => {
    const context = { user: { id: "1", isAdmin: false }, entities: {} } as any;

    await expect(
      saveBrandingSettings({ settings: { "branding.app_name": "Test" } }, context)
    ).rejects.toThrow("Admin access required");
  });

  it("rejects unauthenticated requests", async () => {
    const context = { user: null, entities: {} } as any;

    await expect(
      saveBrandingSettings({ settings: { "branding.app_name": "Test" } }, context)
    ).rejects.toThrow("Not authenticated");
  });

  it("saves branding settings and invalidates cache", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    const context = {
      user: { id: "1", isAdmin: true },
      entities: { Setting: { upsert: mockUpsert } },
    } as any;

    const result = await saveBrandingSettings(
      { settings: { "branding.app_name": "NewName", "branding.domain": "new.com" } },
      context
    );

    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockInvalidateCache).toHaveBeenCalled();
    expect(result.saved).toBe(2);
  });

  it("ignores non-branding keys", async () => {
    const mockUpsert = vi.fn().mockResolvedValue({});
    const context = {
      user: { id: "1", isAdmin: true },
      entities: { Setting: { upsert: mockUpsert } },
    } as any;

    const result = await saveBrandingSettings(
      { settings: { "other.key": "value", "branding.app_name": "Test" } },
      context
    );

    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(result.saved).toBe(1);
  });
});
