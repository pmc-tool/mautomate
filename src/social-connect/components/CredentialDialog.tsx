import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import { Button } from "../../client/components/ui/button";
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

/**
 * Uncontrolled input that ignores browser autofill.
 * Uses a ref to read the real value on save, so the browser
 * can never silently overwrite React state.
 */
function AntiAutofillInput({
  id,
  defaultValue,
  placeholder,
  inputRef,
}: {
  id: string;
  defaultValue: string;
  placeholder: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <input
      ref={inputRef}
      id={id}
      name={`_no_autofill_${id}_${Date.now()}`}
      type="text"
      defaultValue={defaultValue}
      placeholder={placeholder}
      autoComplete="off"
      data-1p-ignore
      data-lpignore="true"
      data-form-type="other"
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

export default function CredentialDialog({
  open,
  onOpenChange,
  platform,
  existingCredential,
}: CredentialDialogProps) {
  const clientIdRef = useRef<HTMLInputElement | null>(null);
  const clientSecretRef = useRef<HTMLInputElement | null>(null);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Key to force re-mount of inputs when dialog opens
  const [formKey, setFormKey] = useState(0);

  const config = platform ? PLATFORMS[platform] : null;

  const apiUrl = import.meta.env.REACT_APP_API_URL || 'http://localhost:3001';
  const redirectUri = platform
    ? `${apiUrl}/api/social-connect/callback/${platform}`
    : "";

  // Reset form when dialog opens or platform changes
  useEffect(() => {
    if (open && platform) {
      setError(null);
      setCopiedRedirectUri(false);
      // Force re-mount inputs to clear any browser autofill
      setFormKey((k) => k + 1);
    }
  }, [open, platform]);

  const handleCopyRedirectUri = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopiedRedirectUri(true);
      setTimeout(() => setCopiedRedirectUri(false), 2000);
    } catch {
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

    const clientId = clientIdRef.current?.value?.trim() ?? "";
    const clientSecret = clientSecretRef.current?.value?.trim() ?? "";

    if (!clientId) {
      setError("Client ID is required.");
      return;
    }

    if (!existingCredential && !clientSecret) {
      setError("Client Secret is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveSocialAppCredential({
        platform,
        clientId,
        ...(clientSecret ? { clientSecret } : {}),
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

        <form onSubmit={(e) => e.preventDefault()} autoComplete="off" data-form-type="other" key={formKey}>
          <div className="space-y-4 py-2">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="oauth-app-id">Client ID</Label>
              <AntiAutofillInput
                id="oauth-app-id"
                defaultValue={existingCredential?.clientId ?? ""}
                placeholder="Enter your app's Client ID"
                inputRef={clientIdRef}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oauth-app-secret">Client Secret</Label>
              <AntiAutofillInput
                id="oauth-app-secret"
                defaultValue=""
                placeholder={
                  existingCredential
                    ? "Leave blank to keep existing secret"
                    : "Enter your app's Client Secret"
                }
                inputRef={clientSecretRef}
              />
              {existingCredential && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Existing secret is stored securely. Leave blank to keep it.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="oauth-redirect-uri">Redirect URI</Label>
              <div className="flex gap-2">
                <input
                  id="oauth-redirect-uri"
                  value={redirectUri}
                  readOnly
                  className="flex h-9 w-full rounded-md border border-input bg-muted px-3 py-1 text-sm text-muted-foreground shadow-sm"
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
        </form>

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
