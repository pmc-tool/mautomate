import { useState, useEffect, useCallback } from "react";
import { type AuthUser } from "wasp/auth";
import {
  useQuery,
  getSystemSocialApps,
  saveSystemSocialApp,
} from "wasp/client/operations";
import DefaultLayout from "../../admin/layout/DefaultLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../client/components/ui/card";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Switch } from "../../client/components/ui/switch";
import { Separator } from "../../client/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../../client/components/ui/alert";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Music,
  Youtube,
  Clapperboard,
  Copy,
  Check,
  Loader2,
  Save,
  AlertCircle,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "../../client/hooks/use-toast";
import { PLATFORMS, PLATFORM_KEYS, type PlatformKey } from "../platforms";

const PLATFORM_ICONS: Record<PlatformKey, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  x: Twitter,
  tiktok: Music,
  youtube: Youtube,
  youtube_shorts: Clapperboard,
};

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function AdminSocialConnectPage({
  user,
}: {
  user: AuthUser;
}) {
  const {
    data: systemApps,
    isLoading,
    error: loadError,
  } = useQuery(getSystemSocialApps);

  return (
    <DefaultLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-primary" />
            Social Connect Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure system-level OAuth apps so users can connect with a
            single click. Each platform requires its own OAuth application
            credentials.
          </p>
        </div>

        {/* Error state */}
        {loadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load settings</AlertTitle>
            <AlertDescription>
              {(loadError as any)?.message ??
                "Could not load social app settings. Please refresh the page."}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoading && !loadError && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Platform cards */}
        {!isLoading && !loadError && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {PLATFORM_KEYS.map((platform) => {
              const existing = (systemApps as Record<string, any> | undefined)?.[platform];
              return (
                <PlatformSettingCard
                  key={platform}
                  platform={platform}
                  initialEnabled={existing?.enabled ?? false}
                  initialClientId={existing?.clientId ?? ""}
                  initialRedirectUri={existing?.redirectUri ?? ""}
                />
              );
            })}
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual platform setting card                                   */
/* ------------------------------------------------------------------ */

interface PlatformSettingCardProps {
  platform: PlatformKey;
  initialEnabled: boolean;
  initialClientId: string;
  initialRedirectUri: string;
}

function PlatformSettingCard({
  platform,
  initialEnabled,
  initialClientId,
  initialRedirectUri,
}: PlatformSettingCardProps) {
  const hasExistingConfig = !!initialClientId;
  const config = PLATFORMS[platform];
  const Icon = PLATFORM_ICONS[platform];

  const [enabled, setEnabled] = useState(initialEnabled);
  const [clientId, setClientId] = useState(initialClientId);
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // Sync from server data when it changes (e.g. after refetch)
  useEffect(() => {
    setEnabled(initialEnabled);
    setClientId(initialClientId);
    setClientSecret("");
  }, [initialEnabled, initialClientId]);

  // Callback hits the server directly (port 3001 in dev), not the client
  const apiUrl = import.meta.env.REACT_APP_API_URL || 'http://localhost:3001';
  const redirectUri = `${apiUrl}/api/social-connect/callback/${platform}`;

  const handleCopyRedirectUri = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = redirectUri;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  }, [redirectUri]);

  async function handleSave() {
    if (enabled && !clientId.trim()) {
      toast({
        title: "Validation error",
        description: "Client ID is required when the platform is enabled.",
        variant: "destructive",
      });
      return;
    }

    if (enabled && !hasExistingConfig && !clientSecret.trim()) {
      toast({
        title: "Validation error",
        description:
          "Client Secret is required when enabling a platform for the first time.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      await saveSystemSocialApp({
        platform,
        enabled,
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim() || undefined,
        redirectUri,
      });

      toast({
        title: "Settings saved",
        description: `${config.name} settings have been updated.`,
      });

      // Clear secret field after successful save
      setClientSecret("");
    } catch (err: any) {
      toast({
        title: "Save failed",
        description:
          err?.message ?? "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">{config.name}</CardTitle>
            <CardDescription className="mt-0.5">
              {enabled ? "Enabled for all users" : "Disabled"}
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor={`switch-${platform}`} className="text-xs text-muted-foreground">
            {enabled ? "On" : "Off"}
          </Label>
          <Switch
            id={`switch-${platform}`}
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-4 pt-4">
        {/* Client ID */}
        <div className="space-y-2">
          <Label htmlFor={`client-id-${platform}`}>Client ID</Label>
          <Input
            id={`client-id-${platform}`}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={`Enter ${config.name} Client ID`}
            autoComplete="off"
          />
        </div>

        {/* Client Secret */}
        <div className="space-y-2">
          <Label htmlFor={`client-secret-${platform}`}>Client Secret</Label>
          <Input
            id={`client-secret-${platform}`}
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={
              hasExistingConfig
                ? "Leave blank to keep existing secret"
                : `Enter ${config.name} Client Secret`
            }
            autoComplete="off"
          />
          {hasExistingConfig && (
            <p className="text-xs text-muted-foreground">
              A secret is already stored. Leave blank to keep it unchanged.
            </p>
          )}
        </div>

        {/* Redirect URI */}
        <div className="space-y-2">
          <Label htmlFor={`redirect-uri-${platform}`}>Redirect URI</Label>
          <div className="flex gap-2">
            <Input
              id={`redirect-uri-${platform}`}
              value={redirectUri}
              readOnly
              className="bg-muted text-muted-foreground"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopyRedirectUri}
              className="shrink-0"
            >
              {copiedUri ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Register this as an authorized redirect URI in your{" "}
            {config.name} developer app.
          </p>
        </div>

        <Separator />

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save {config.name} Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
