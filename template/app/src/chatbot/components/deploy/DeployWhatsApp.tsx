import { useState } from "react";
import { saveChannelCredentials } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Badge } from "../../../client/components/ui/badge";
import { Check, Copy, Loader2 } from "lucide-react";
import { useToast } from "../../../client/hooks/use-toast";

interface DeployWhatsAppProps {
  chatbotId: string;
  channel: any;
}

export default function DeployWhatsApp({ chatbotId, channel }: DeployWhatsAppProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    waPhoneNumberId: channel?.waPhoneNumberId || "",
    waBusinessId: channel?.waBusinessId || "",
    waAccessToken: "",
    waVerifyToken: channel?.waVerifyToken || "",
  });

  const webhookUrl = `${window.location.origin}/api/chatbot/webhook/whatsapp/${chatbotId}`;

  const handleSave = async () => {
    if (!channel?.id) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { id: channel.id };
      if (form.waPhoneNumberId) payload.waPhoneNumberId = form.waPhoneNumberId;
      if (form.waBusinessId) payload.waBusinessId = form.waBusinessId;
      if (form.waAccessToken) payload.waAccessToken = form.waAccessToken;
      if (form.waVerifyToken) payload.waVerifyToken = form.waVerifyToken;

      await saveChannelCredentials(payload as any);
      toast({ title: "WhatsApp credentials saved" });
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
          <h4 className="font-semibold">WhatsApp Business</h4>
          <p className="text-muted-foreground text-sm">
            Connect your chatbot to WhatsApp Business
          </p>
        </div>
        <Badge variant={channel?.isConfigured ? "success" : "secondary"}>
          {channel?.isConfigured ? "Configured" : "Not Configured"}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wa-phone-id">Phone Number ID</Label>
          <Input
            id="wa-phone-id"
            value={form.waPhoneNumberId}
            onChange={(e) => setForm((p) => ({ ...p, waPhoneNumberId: e.target.value }))}
            placeholder="WhatsApp Phone Number ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa-business-id">Business Account ID</Label>
          <Input
            id="wa-business-id"
            value={form.waBusinessId}
            onChange={(e) => setForm((p) => ({ ...p, waBusinessId: e.target.value }))}
            placeholder="WhatsApp Business Account ID"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa-access-token">Access Token</Label>
          <Input
            id="wa-access-token"
            type="password"
            value={form.waAccessToken}
            onChange={(e) => setForm((p) => ({ ...p, waAccessToken: e.target.value }))}
            placeholder={channel?.waAccessToken ? "••••••••" : "Permanent Access Token"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa-verify-token">Verify Token</Label>
          <Input
            id="wa-verify-token"
            value={form.waVerifyToken}
            onChange={(e) => setForm((p) => ({ ...p, waVerifyToken: e.target.value }))}
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
          Paste this URL in your WhatsApp Business webhook configuration
        </p>
      </div>
    </div>
  );
}
