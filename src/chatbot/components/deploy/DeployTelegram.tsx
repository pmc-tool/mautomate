import { useState } from "react";
import { saveChannelCredentials } from "wasp/client/operations";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Label } from "../../../client/components/ui/label";
import { Badge } from "../../../client/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useToast } from "../../../client/hooks/use-toast";

interface DeployTelegramProps {
  chatbotId: string;
  channel: any;
}

export default function DeployTelegram({ chatbotId, channel }: DeployTelegramProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tgBotToken: "",
    tgBotUsername: channel?.tgBotUsername || "",
  });

  const handleSave = async () => {
    if (!channel?.id) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = { id: channel.id };
      if (form.tgBotToken) payload.tgBotToken = form.tgBotToken;
      if (form.tgBotUsername) payload.tgBotUsername = form.tgBotUsername;

      await saveChannelCredentials(payload as any);
      toast({ title: "Telegram credentials saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Telegram Bot</h4>
          <p className="text-muted-foreground text-sm">
            Connect your chatbot to Telegram
          </p>
        </div>
        <Badge variant={channel?.isConfigured ? "success" : "secondary"}>
          {channel?.isConfigured ? "Configured" : "Not Configured"}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tg-bot-token">Bot Token</Label>
          <Input
            id="tg-bot-token"
            type="password"
            value={form.tgBotToken}
            onChange={(e) => setForm((p) => ({ ...p, tgBotToken: e.target.value }))}
            placeholder={channel?.tgBotToken ? "••••••••" : "Bot token from @BotFather"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tg-bot-username">Bot Username</Label>
          <Input
            id="tg-bot-username"
            value={form.tgBotUsername}
            onChange={(e) => setForm((p) => ({ ...p, tgBotUsername: e.target.value }))}
            placeholder="@YourBotUsername"
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Credentials
      </Button>

      {/* Webhook URL */}
      {channel?.isConfigured && (
        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <p className="mb-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">Webhook Active</p>
          <p className="text-xs text-muted-foreground">
            Webhook is automatically registered when you save credentials. Your bot should now receive messages.
          </p>
        </div>
      )}

      {/* Setup Instructions */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="mb-2 text-sm font-medium">Setup Instructions</p>
        <ol className="text-muted-foreground list-inside list-decimal space-y-1 text-xs leading-relaxed">
          <li>
            Open Telegram and search for{" "}
            <code className="bg-muted rounded px-1 py-0.5">@BotFather</code>
          </li>
          <li>
            Send <code className="bg-muted rounded px-1 py-0.5">/newbot</code> and follow the
            prompts
          </li>
          <li>Copy the bot token provided by BotFather</li>
          <li>Enter the bot username (e.g. @YourBotUsername)</li>
          <li>Paste the token above and click Save — webhook will be set up automatically</li>
        </ol>
      </div>
    </div>
  );
}
