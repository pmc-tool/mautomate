import { useState, useEffect } from "react";
import { type AuthUser } from "wasp/auth";
import {
  getBrandingSettings,
  saveBrandingSettings,
  uploadFile,
  getDownloadFileSignedURL,
  useQuery,
} from "wasp/client/operations";
import {
  Palette,
  Image,
  Globe,
  FileText,
  Save,
  Upload,
  X,
  ExternalLink,
} from "lucide-react";
import Breadcrumb from "../../layout/Breadcrumb";
import DefaultLayout from "../../layout/DefaultLayout";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Card, CardContent } from "../../../client/components/ui/card";
import { toast } from "../../../client/hooks/use-toast";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

const TABS = [
  { id: "identity", label: "Identity", icon: Globe },
  { id: "visual", label: "Visual Assets", icon: Image },
  { id: "seo", label: "SEO / Meta Tags", icon: FileText },
  { id: "footer", label: "Footer / Legal", icon: ExternalLink },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminBrandingPage({ user }: { user: AuthUser }) {
  const { data: settings, isLoading, refetch } = useQuery(getBrandingSettings);
  const [activeTab, setActiveTab] = useState<TabId>("identity");
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState("");
  const [faviconPreview, setFaviconPreview] = useState("");
  const [ogPreview, setOgPreview] = useState("");

  // Sync form from settings
  // IMPORTANT: When an S3 key is present, clear the corresponding _url field
  // in the form so we don't accidentally persist server-resolved signed URLs
  // (which expire after 1 hour and would break the image permanently).
  useEffect(() => {
    if (settings) {
      const formCopy = { ...settings };
      const s3UrlPairs: [string, string][] = [
        ["branding.logo_s3key", "branding.logo_url"],
        ["branding.favicon_s3key", "branding.favicon_url"],
        ["branding.og_image_s3key", "branding.og_image_url"],
      ];
      for (const [s3keyField, urlField] of s3UrlPairs) {
        if (formCopy[s3keyField]) {
          // The _url value is a server-resolved signed URL — don't save it back
          formCopy[urlField] = "";
        }
      }
      setForm(formCopy);
    }
  }, [settings]);

  // Set preview URLs from query response (server resolves S3 keys to direct signed URLs)
  useEffect(() => {
    if (!settings) return;
    setLogoPreview(settings["branding.logo_url"] || "");
    setFaviconPreview(settings["branding.favicon_url"] || "");
    setOgPreview(settings["branding.og_image_url"] || "");
  }, [settings]);

  const g = (key: string) => form[`branding.${key}`] ?? "";
  const s = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [`branding.${key}`]: value }));

  const handleSave = async (keys: string[]) => {
    setSaving(true);
    try {
      const toSave: Record<string, string> = {};
      for (const k of keys) {
        toSave[`branding.${k}`] = form[`branding.${k}`] ?? "";
      }
      await saveBrandingSettings({ settings: toSave });
      toast({ title: "Branding saved" });
      await refetch();
    } catch (err: any) {
      toast({
        title: "Error saving",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (
    accept: string,
    s3keyField: string,
    urlSettingKey: string,
    setPreview: (url: string) => void,
  ) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(",")[1];
            const result = await uploadFile({
              data: base64,
              fileName: file.name,
              fileType: file.type,
            });

            // Store the s3Key in form state
            s(s3keyField, result.s3Key);

            // Clear the direct URL field — s3key takes precedence
            s(urlSettingKey, "");

            // Get a signed URL for preview display
            const signedUrl = await getDownloadFileSignedURL({
              s3Key: result.s3Key,
            });
            setPreview(signedUrl);

            toast({ title: "File uploaded — click Save to apply" });
          } catch (err: any) {
            toast({
              title: "Upload failed",
              description: err?.message,
              variant: "destructive",
            });
          }
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        toast({
          title: "Upload failed",
          description: err?.message,
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <DefaultLayout user={user}>
        <Breadcrumb pageName="Branding" />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Loading...
        </div>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout user={user}>
      <Breadcrumb pageName="Branding" />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border bg-muted p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "identity" && (
        <IdentityTab g={g} s={s} saving={saving} onSave={() =>
          handleSave([
            "app_name", "domain", "tagline", "slogan",
            "contact_email", "support_email", "noreply_email",
          ])
        } />
      )}

      {activeTab === "visual" && (
        <VisualTab
          g={g}
          s={s}
          saving={saving}
          logoPreview={logoPreview}
          faviconPreview={faviconPreview}
          ogPreview={ogPreview}
          onUploadLogo={() =>
            handleFileUpload("image/*", "logo_s3key", "logo_url", setLogoPreview)
          }
          onUploadFavicon={() =>
            handleFileUpload("image/*", "favicon_s3key", "favicon_url", setFaviconPreview)
          }
          onUploadOg={() =>
            handleFileUpload("image/*", "og_image_s3key", "og_image_url", setOgPreview)
          }
          onClearLogo={() => setLogoPreview("")}
          onClearFavicon={() => setFaviconPreview("")}
          onClearOg={() => setOgPreview("")}
          onSave={() =>
            handleSave([
              "logo_url", "logo_s3key",
              "favicon_url", "favicon_s3key",
              "og_image_url", "og_image_s3key",
              "primary_color", "auth_bg_color",
            ])
          }
        />
      )}

      {activeTab === "seo" && (
        <SeoTab g={g} s={s} saving={saving} ogPreview={ogPreview} onSave={() =>
          handleSave([
            "meta_title", "meta_description",
            "og_title", "og_description", "og_url",
            "twitter_card", "keywords",
          ])
        } />
      )}

      {activeTab === "footer" && (
        <FooterTab g={g} s={s} saving={saving} onSave={() =>
          handleSave([
            "copyright_text", "footer_cta_title", "footer_cta_desc",
            "terms_url", "privacy_url",
          ])
        } />
      )}
    </DefaultLayout>
  );
}

// ---------------------------------------------------------------------------
// Tab: Identity
// ---------------------------------------------------------------------------

function IdentityTab({
  g,
  s,
  saving,
  onSave,
}: {
  g: (k: string) => string;
  s: (k: string, v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <Label>App Name</Label>
          <Input
            value={g("app_name")}
            onChange={(e) => s("app_name", e.target.value)}
            placeholder="mAutomate"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Displayed in navbar, footer, auth pages, and emails
          </p>
        </div>

        <div>
          <Label>Domain</Label>
          <Input
            value={g("domain")}
            onChange={(e) => s("domain", e.target.value)}
            placeholder="mautomate.ai"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Tagline</Label>
          <Input
            value={g("tagline")}
            onChange={(e) => s("tagline", e.target.value)}
            placeholder="Marketing OS"
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Short phrase shown in hero and auth page (e.g. "Marketing OS")
          </p>
        </div>

        <div>
          <Label>Slogan</Label>
          <textarea
            value={g("slogan")}
            onChange={(e) => s("slogan", e.target.value)}
            placeholder="The complete AI Marketing Operating System..."
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Contact Email</Label>
            <Input
              value={g("contact_email")}
              onChange={(e) => s("contact_email", e.target.value)}
              placeholder="contact@mautomate.ai"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Support Email</Label>
            <Input
              value={g("support_email")}
              onChange={(e) => s("support_email", e.target.value)}
              placeholder="support@mautomate.ai"
              className="mt-1"
            />
          </div>
          <div>
            <Label>No-Reply Email</Label>
            <Input
              value={g("noreply_email")}
              onChange={(e) => s("noreply_email", e.target.value)}
              placeholder="noreply@mautomate.ai"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Identity"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: Visual Assets
// ---------------------------------------------------------------------------

function VisualTab({
  g,
  s,
  saving,
  logoPreview,
  faviconPreview,
  ogPreview,
  onUploadLogo,
  onUploadFavicon,
  onUploadOg,
  onClearLogo,
  onClearFavicon,
  onClearOg,
  onSave,
}: {
  g: (k: string) => string;
  s: (k: string, v: string) => void;
  saving: boolean;
  logoPreview: string;
  faviconPreview: string;
  ogPreview: string;
  onUploadLogo: () => void;
  onUploadFavicon: () => void;
  onUploadOg: () => void;
  onClearLogo: () => void;
  onClearFavicon: () => void;
  onClearOg: () => void;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        {/* Logo */}
        <div>
          <Label>Logo</Label>
          <div className="mt-2 flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-12 w-auto rounded border bg-muted p-1"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <button
                  onClick={() => {
                    s("logo_s3key", "");
                    s("logo_url", "");
                    onClearLogo();
                  }}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-12 w-24 items-center justify-center rounded border border-dashed text-muted-foreground">
                No logo
              </div>
            )}
            <Button variant="outline" size="sm" onClick={onUploadLogo} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Logo
            </Button>
          </div>
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">Or paste URL directly:</Label>
            <Input
              value={g("logo_url")}
              onChange={(e) => s("logo_url", e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        </div>

        {/* Favicon */}
        <div>
          <Label>Favicon</Label>
          <div className="mt-2 flex items-center gap-4">
            {faviconPreview ? (
              <div className="relative">
                <img
                  src={faviconPreview}
                  alt="Favicon preview"
                  className="h-8 w-8 rounded border bg-muted p-0.5"
                />
                <button
                  onClick={() => {
                    s("favicon_s3key", "");
                    s("favicon_url", "");
                    onClearFavicon();
                  }}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded border border-dashed text-muted-foreground text-xs">
                ICO
              </div>
            )}
            <Button variant="outline" size="sm" onClick={onUploadFavicon} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Favicon
            </Button>
          </div>
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">Or paste URL directly:</Label>
            <Input
              value={g("favicon_url")}
              onChange={(e) => s("favicon_url", e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        </div>

        {/* OG Banner Image */}
        <div>
          <Label>OG Banner Image</Label>
          <p className="text-xs text-muted-foreground">
            Recommended: 1200 x 630px. Shown when sharing links on social media.
          </p>
          <div className="mt-2 flex items-start gap-4">
            {ogPreview ? (
              <div className="relative">
                <img
                  src={ogPreview}
                  alt="OG preview"
                  className="h-20 w-auto rounded border bg-muted"
                />
                <button
                  onClick={() => {
                    s("og_image_s3key", "");
                    s("og_image_url", "");
                    onClearOg();
                  }}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-20 w-36 items-center justify-center rounded border border-dashed text-muted-foreground text-xs">
                1200x630
              </div>
            )}
            <Button variant="outline" size="sm" onClick={onUploadOg} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload OG Image
            </Button>
          </div>
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">Or paste URL directly:</Label>
            <Input
              value={g("og_image_url")}
              onChange={(e) => s("og_image_url", e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Primary Accent Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={g("primary_color") || "#bd711d"}
                onChange={(e) => s("primary_color", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <Input
                value={g("primary_color")}
                onChange={(e) => s("primary_color", e.target.value)}
                placeholder="#bd711d"
                className="flex-1"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Used in auth page, hero headline, and CTA buttons
            </p>
          </div>
          <div>
            <Label>Auth Dark Background</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={g("auth_bg_color") || "#1a1207"}
                onChange={(e) => s("auth_bg_color", e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              <Input
                value={g("auth_bg_color")}
                onChange={(e) => s("auth_bg_color", e.target.value)}
                placeholder="#1a1207"
                className="flex-1"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Left panel background on login/signup pages
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Visual Assets"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: SEO / Meta Tags
// ---------------------------------------------------------------------------

function SeoTab({
  g,
  s,
  saving,
  ogPreview,
  onSave,
}: {
  g: (k: string) => string;
  s: (k: string, v: string) => void;
  saving: boolean;
  ogPreview: string;
  onSave: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <Label>Meta Title</Label>
          <Input
            value={g("meta_title")}
            onChange={(e) => s("meta_title", e.target.value)}
            placeholder="mAutomate"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Meta Description</Label>
          <textarea
            value={g("meta_description")}
            onChange={(e) => s("meta_description", e.target.value)}
            placeholder="mAutomate.ai is an AI marketing automation platform..."
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>OG Title</Label>
            <Input
              value={g("og_title")}
              onChange={(e) => s("og_title", e.target.value)}
              placeholder="mAutomate"
              className="mt-1"
            />
          </div>
          <div>
            <Label>OG URL</Label>
            <Input
              value={g("og_url")}
              onChange={(e) => s("og_url", e.target.value)}
              placeholder="https://mautomate.ai"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label>OG Description</Label>
          <textarea
            value={g("og_description")}
            onChange={(e) => s("og_description", e.target.value)}
            placeholder="Automate and optimize multi-channel marketing..."
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
          />
        </div>

        <div>
          <Label>Twitter Card Type</Label>
          <select
            value={g("twitter_card") || "summary_large_image"}
            onChange={(e) => s("twitter_card", e.target.value)}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="summary">summary</option>
            <option value="summary_large_image">summary_large_image</option>
          </select>
        </div>

        <div>
          <Label>Keywords</Label>
          <textarea
            value={g("keywords")}
            onChange={(e) => s("keywords", e.target.value)}
            placeholder="marketing automation, AI marketing..."
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
          />
        </div>

        {/* Live OG Preview Card */}
        <div>
          <Label className="mb-2">OG Preview (Social Share)</Label>
          <div className="mt-2 overflow-hidden rounded-lg border bg-muted">
            {ogPreview && (
              <img
                src={ogPreview}
                alt="OG preview"
                className="h-40 w-full object-cover"
              />
            )}
            {!ogPreview && (
              <div className="flex h-40 items-center justify-center bg-muted text-muted-foreground text-sm">
                No OG image set
              </div>
            )}
            <div className="p-3">
              <p className="text-xs text-muted-foreground uppercase">
                {g("og_url") || "mautomate.ai"}
              </p>
              <p className="mt-1 text-sm font-semibold line-clamp-1">
                {g("og_title") || "mAutomate"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                {g("og_description") || "Automate and optimize multi-channel marketing..."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save SEO Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab: Footer / Legal
// ---------------------------------------------------------------------------

function FooterTab({
  g,
  s,
  saving,
  onSave,
}: {
  g: (k: string) => string;
  s: (k: string, v: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const appName = g("app_name") || "mAutomate";

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <Label>Copyright Text</Label>
          <Input
            value={g("copyright_text")}
            onChange={(e) => s("copyright_text", e.target.value)}
            placeholder={`${new Date().getFullYear()} ${appName}.ai. All rights reserved.`}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Leave empty to auto-generate from app name
          </p>
        </div>

        <div>
          <Label>Footer CTA Title</Label>
          <Input
            value={g("footer_cta_title")}
            onChange={(e) => s("footer_cta_title", e.target.value)}
            placeholder="Smart Campaign Orchestrator"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Footer CTA Description</Label>
          <textarea
            value={g("footer_cta_desc")}
            onChange={(e) => s("footer_cta_desc", e.target.value)}
            placeholder="AI marketing automation platform..."
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Terms of Service URL</Label>
            <Input
              value={g("terms_url")}
              onChange={(e) => s("terms_url", e.target.value)}
              placeholder="/terms"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Privacy Policy URL</Label>
            <Input
              value={g("privacy_url")}
              onChange={(e) => s("privacy_url", e.target.value)}
              placeholder="/privacy"
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Footer Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
