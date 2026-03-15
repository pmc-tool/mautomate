import { createContext, useContext, type ReactNode } from "react";
import { useQuery, getBrandingSettings } from "wasp/client/operations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrandingConfig {
  appName: string;
  domain: string;
  tagline: string;
  slogan: string;
  contactEmail: string;
  supportEmail: string;
  noreplyEmail: string;
  logoUrl: string;
  logoS3Key: string;
  faviconUrl: string;
  faviconS3Key: string;
  ogImageUrl: string;
  ogImageS3Key: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  twitterCard: string;
  keywords: string;
  primaryColor: string;
  authBgColor: string;
  copyrightText: string;
  termsUrl: string;
  privacyUrl: string;
  footerCtaTitle: string;
  footerCtaDesc: string;
}

// ---------------------------------------------------------------------------
// Defaults (match current hardcoded values — zero visual change)
// ---------------------------------------------------------------------------

const DEFAULTS: BrandingConfig = {
  appName: "mAutomate",
  domain: "mautomate.ai",
  tagline: "Marketing OS",
  slogan:
    "The complete AI Marketing Operating System. Automate Content, Reels, DMs, and Growth in One Platform.",
  contactEmail: "contact@mautomate.ai",
  supportEmail: "support@mautomate.ai",
  noreplyEmail: "noreply@mautomate.ai",
  logoUrl: "",
  logoS3Key: "",
  faviconUrl: "",
  faviconS3Key: "",
  ogImageUrl: "",
  ogImageS3Key: "",
  metaTitle: "mAutomate",
  metaDescription:
    "mAutomate.ai is an AI marketing automation platform for campaign orchestration, audience segmentation, and revenue attribution.",
  ogTitle: "mAutomate",
  ogDescription:
    "Automate and optimize multi-channel marketing with AI workflows and attribution analytics.",
  ogUrl: "https://mautomate.ai",
  twitterCard: "summary_large_image",
  keywords:
    "marketing automation, AI marketing, campaign orchestration, lead scoring, attribution",
  primaryColor: "#bd711d",
  authBgColor: "#1a1207",
  copyrightText: "",
  termsUrl: "/terms",
  privacyUrl: "/privacy",
  footerCtaTitle: "Smart Campaign Orchestrator",
  footerCtaDesc:
    "AI marketing automation platform for campaign orchestration, audience segmentation, and attribution analytics.",
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const BrandingContext = createContext<BrandingConfig>(DEFAULTS);

export function useBranding(): BrandingConfig {
  return useContext(BrandingContext);
}

// ---------------------------------------------------------------------------
// Provider — server resolves S3 keys to direct signed URLs in the query
// ---------------------------------------------------------------------------

function mapSettingsToConfig(
  settings: Record<string, string> | undefined,
): BrandingConfig {
  if (!settings) return DEFAULTS;

  const g = (key: string, fallback: string) =>
    settings[`branding.${key}`] || fallback;

  return {
    appName: g("app_name", DEFAULTS.appName),
    domain: g("domain", DEFAULTS.domain),
    tagline: g("tagline", DEFAULTS.tagline),
    slogan: g("slogan", DEFAULTS.slogan),
    contactEmail: g("contact_email", DEFAULTS.contactEmail),
    supportEmail: g("support_email", DEFAULTS.supportEmail),
    noreplyEmail: g("noreply_email", DEFAULTS.noreplyEmail),
    logoUrl: g("logo_url", ""),
    logoS3Key: g("logo_s3key", ""),
    faviconUrl: g("favicon_url", ""),
    faviconS3Key: g("favicon_s3key", ""),
    ogImageUrl: g("og_image_url", ""),
    ogImageS3Key: g("og_image_s3key", ""),
    metaTitle: g("meta_title", DEFAULTS.metaTitle),
    metaDescription: g("meta_description", DEFAULTS.metaDescription),
    ogTitle: g("og_title", DEFAULTS.ogTitle),
    ogDescription: g("og_description", DEFAULTS.ogDescription),
    ogUrl: g("og_url", DEFAULTS.ogUrl),
    twitterCard: g("twitter_card", DEFAULTS.twitterCard),
    keywords: g("keywords", DEFAULTS.keywords),
    primaryColor: g("primary_color", DEFAULTS.primaryColor),
    authBgColor: g("auth_bg_color", DEFAULTS.authBgColor),
    copyrightText: g("copyright_text", DEFAULTS.copyrightText),
    termsUrl: g("terms_url", DEFAULTS.termsUrl),
    privacyUrl: g("privacy_url", DEFAULTS.privacyUrl),
    footerCtaTitle: g("footer_cta_title", DEFAULTS.footerCtaTitle),
    footerCtaDesc: g("footer_cta_desc", DEFAULTS.footerCtaDesc),
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery(getBrandingSettings, undefined, {
    refetchInterval: 30 * 60 * 1000, // 30 min — refresh signed URLs before expiry
  });
  const config = mapSettingsToConfig(settings);

  return (
    <BrandingContext.Provider value={config}>
      {children}
    </BrandingContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// BrandedLogo helper component
// ---------------------------------------------------------------------------

export function BrandedLogo({
  className,
  fallbackSrc,
}: {
  className?: string;
  fallbackSrc?: string;
}) {
  const branding = useBranding();
  const src = branding.logoUrl || fallbackSrc || "";

  if (!src) return null;

  return <img src={src} alt={branding.appName} className={className} />;
}
