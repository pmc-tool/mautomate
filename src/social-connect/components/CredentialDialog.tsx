import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import { Button } from "../../client/components/ui/button";
import { Input } from "../../client/components/ui/input";
import { Label } from "../../client/components/ui/label";
import { Alert, AlertDescription } from "../../client/components/ui/alert";
import { Separator } from "../../client/components/ui/separator";
import {
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { saveSocialAppCredential } from "wasp/client/operations";
import { toast } from "../../client/hooks/use-toast";
import { PLATFORMS, type PlatformKey } from "../platforms";

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: PlatformKey | null;
  existingCredential?: { clientId: string; redirectUri: string } | null;
}

export default function CredentialDialog({
  open,
  onOpenChange,
  platform,
  existingCredential,
}: CredentialDialogProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = platform ? PLATFORMS[platform] : null;

  // Callback hits the server directly (port 3001 in dev), not the client
  const apiUrl = import.meta.env.REACT_APP_API_URL || 'http://localhost:3001';
  const redirectUri = platform
    ? `${apiUrl}/api/social-connect/callback/${platform}`
    : "";

  // Reset form when dialog opens or platform changes
  useEffect(() => {
    if (open && platform) {
      setClientId(existingCredential?.clientId ?? "");
      setClientSecret("");
      setError(null);
      setCopiedRedirectUri(false);
    }
  }, [open, platform, existingCredential]);

  const handleCopyRedirectUri = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopiedRedirectUri(true);
      setTimeout(() => setCopiedRedirectUri(false), 2000);
    } catch {
      // Fallback for insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = redirectUri;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedRedirectUri(true);
      setTimeout(() => setCopiedRedirectUri(false), 2000);
    }
  }, [redirectUri]);

  async function handleSave() {
    if (!platform) return;

    if (!clientId.trim()) {
      setError("Client ID is required.");
      return;
    }

    // When creating new credentials, secret is required.
    // When editing, secret can be blank (unchanged).
    if (!existingCredential && !clientSecret.trim()) {
      setError("Client Secret is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveSocialAppCredential({
        platform,
        clientId: clientId.trim(),
        ...(clientSecret.trim()
          ? { clientSecret: clientSecret.trim() }
          : {}),
        redirectUri,
      });

      toast({
        title: "Credentials saved",
        description: `Your ${config?.name} app credentials have been saved.`,
      });

      onOpenChange(false);
    } catch (err: any) {
      const message =
        err?.message ?? "Failed to save credentials. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  if (!platform || !config) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {config.name} App</DialogTitle>
          <DialogDescription>
            Enter your OAuth app credentials for {config.name}. These are stored
            securely and used only to connect your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="credential-client-id">Client ID</Label>
            <Input
              id="credential-client-id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Enter your app's Client ID"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential-client-secret">Client Secret</Label>
            <Input
              id="credential-client-secret"
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={
                existingCredential
                  ? "Leave blank to keep existing secret"
                  : "Enter your app's Client Secret"
              }
              autoComplete="off"
            />
            {existingCredential && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Existing secret is stored securely. Leave blank to keep it.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="credential-redirect-uri">Redirect URI</Label>
            <div className="flex gap-2">
              <Input
                id="credential-redirect-uri"
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
                {copiedRedirectUri ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add this URL as an authorized redirect URI in your app settings.
            </p>
          </div>

          <Separator />

          <a
            href={getInstructionsUrl(platform)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {config.instructions}
          </a>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {existingCredential ? "Update Credentials" : "Save Credentials"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const INSTRUCTIONS_URLS: Record<PlatformKey, string> = {
  facebook: "https://developers.facebook.com/apps/",
  instagram: "https://developers.facebook.com/apps/",
  linkedin: "https://www.linkedin.com/developers/apps",
  x: "https://developer.x.com/en/portal/dashboard",
  tiktok: "https://developers.tiktok.com/apps/",
  youtube: "https://console.cloud.google.com/apis/credentials",
  youtube_shorts: "https://console.cloud.google.com/apis/credentials",
};

function getInstructionsUrl(platform: PlatformKey): string {
  return INSTRUCTIONS_URLS[platform];
}
