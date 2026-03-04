import { useState } from "react";
import { saveChannelCredentials } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Badge } from "../../../client/components/ui/badge";
import { Check, Copy, Loader2 } from "lucide-react";
import { useToast } from "../../../client/hooks/use-toast";

interface DeployMessengerProps {
  chatbotId: string;
  channel: any;
}

export default function DeployMessenger({ chatbotId, channel }: DeployMessengerProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    fbAppId: channel?.fbAppId || "",
    fbAppSecret: "",
    fbPageName: channel?.fbPageName || "",
    fbAccessToken: "",
    fbVerifyToken: channel?.fbVerifyToken || "",
  });

  const webhookUrl = `${window.location.origin}/api/chatbot/webhook/messenger/${chatbotId}`;

  const handleSave = async () => {
    if (!channel?.id) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { id: channel.id };
      if (form.fbAppId) payload.fbAppId = form.fbAppId;
      if (form.fbAppSecret) payload.fbAppSecret = form.fbAppSecret;
      if (form.fbPageName) payload.fbPageName = form.fbPageName;
      if (form.fbAccessToken) payload.fbAccessToken = form.fbAccessToken;
      if (form.fbVerifyToken) payload.fbVerifyToken = form.fbVerifyToken;

      await saveChannelCredentials(payload as any);
      toast({ title: "Messenger credentials saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast({ title: "Webhook URL copied" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Facebook Messenger</h4>
          <p className="text-muted-foreground text-sm">
            Connect your chatbot to Facebook Messenger
          </p>
        </div>
        <Badge variant={channel?.isConfigured ? "success" : "secondary"}>
          {channel?.isConfigured ? "Configured" : "Not Configured"}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fb-app-id">App ID</Label>
          <Input
            id="fb-app-id"
            value={form.fbAppId}
            onChange={(e) => setForm((p) => ({ ...p, fbAppId: e.target.value }))}
            placeholder="Your Facebook App ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fb-app-secret">App Secret</Label>
          <Input
            id="fb-app-secret"
            type="password"
            value={form.fbAppSecret}
            onChange={(e) => setForm((p) => ({ ...p, fbAppSecret: e.target.value }))}
            placeholder={channel?.fbAppSecret ? "••••••••" : "Your Facebook App Secret"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fb-page-name">Page Name</Label>
          <Input
            id="fb-page-name"
            value={form.fbPageName}
            onChange={(e) => setForm((p) => ({ ...p, fbPageName: e.target.value }))}
            placeholder="Your Facebook Page name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fb-access-token">Access Token</Label>
          <Input
            id="fb-access-token"
            type="password"
            value={form.fbAccessToken}
            onChange={(e) => setForm((p) => ({ ...p, fbAccessToken: e.target.value }))}
            placeholder={channel?.fbAccessToken ? "••••••••" : "Page Access Token"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fb-verify-token">Verify Token</Label>
          <Input
            id="fb-verify-token"
            value={form.fbVerifyToken}
            onChange={(e) => setForm((p) => ({ ...p, fbVerifyToken: e.target.value }))}
            placeholder="Webhook verify token"
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Credentials
      </Button>

      {/* Webhook URL */}
      <div className="space-y-2">
        <Label>Webhook URL</Label>
        <div className="flex items-center gap-2">
          <Input value={webhookUrl} readOnly className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={handleCopyWebhook}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Paste this URL in your Facebook App's webhook configuration
        </p>
      </div>
    </div>
  );
}
