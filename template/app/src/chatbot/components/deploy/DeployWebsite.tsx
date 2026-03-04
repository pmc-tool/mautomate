import { useState } from "react";
import { Button } from "../../../client/components/ui/button";
import { Label } from "../../../client/components/ui/label";
import { Slider } from "../../../client/components/ui/slider";
import { Badge } from "../../../client/components/ui/badge";
import { Check, Copy } from "lucide-react";
import { useToast } from "../../../client/hooks/use-toast";

interface DeployWebsiteProps {
  chatbotId: string;
  channel: any;
  draft: Record<string, any>;
  onUpdate: (updates: Record<string, any>) => void;
}

export default function DeployWebsite({ chatbotId, channel, draft, onUpdate }: DeployWebsiteProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const width = draft.embedWidth || 420;
  const height = draft.embedHeight || 745;

  const embedCode = `<script
  src="${window.location.origin}/api/inbox/widget-script"
  data-chatbot-id="${chatbotId}"
  defer>
</script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Website Embed</h4>
          <p className="text-muted-foreground text-sm">
            Add this code to your website to display the chatbot
          </p>
        </div>
        <Badge variant="success">Ready</Badge>
      </div>

      {/* Embed Code */}
      <div className="space-y-3">
        <Label>Embed Code</Label>
        <div className="rounded-xl border bg-muted p-5">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">
            {embedCode}
          </pre>
        </div>
        <Button onClick={handleCopy} variant="outline" className="w-full">
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </div>

      {/* Width Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Width</Label>
          <span className="text-muted-foreground text-sm">{width}px</span>
        </div>
        <Slider
          value={[width]}
          onValueChange={([val]) => onUpdate({ embedWidth: val })}
          min={100}
          max={1000}
          step={50}
        />
      </div>

      {/* Height Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Height</Label>
          <span className="text-muted-foreground text-sm">{height}px</span>
        </div>
        <Slider
          value={[height]}
          onValueChange={([val]) => onUpdate({ embedHeight: val })}
          min={100}
          max={1000}
          step={50}
        />
      </div>

      {/* Help Text */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-muted-foreground text-xs leading-relaxed">
          Paste this code snippet into your website's HTML, just before the closing{" "}
          <code className="bg-muted rounded px-1 py-0.5">&lt;/body&gt;</code> tag.
          The chatbot widget will automatically appear on your page.
        </p>
      </div>
    </div>
  );
}
