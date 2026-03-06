import { useState } from "react";
import { Button } from "../../../client/components/ui/button";
import { Label } from "../../../client/components/ui/label";
import { Badge } from "../../../client/components/ui/badge";
import { Check, Copy, Code2, HelpCircle } from "lucide-react";
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
  data-iframe-width="${width}"
  data-iframe-height="${height}"
  data-language="${draft.language || "en"}"
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
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Code2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Website Embed</h4>
            <p className="text-muted-foreground text-[11px]">
              Add this code to your website
            </p>
          </div>
        </div>
        <Badge variant="success" className="text-[10px]">Ready</Badge>
      </div>

      {/* Embed Code — dark box like MagicAI */}
      <div className="space-y-3">
        <Label className="text-xs font-medium">Embed Code</Label>
        <div className="rounded-xl bg-slate-900 dark:bg-slate-950 p-5 relative group">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-300">
            {embedCode}
          </pre>
        </div>
        <Button
          onClick={handleCopy}
          variant="outline"
          className="w-full h-10 rounded-xl gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-500" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </div>

      {/* Width & Height Adjusters */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Width</Label>
            <span className="text-xs font-mono text-muted-foreground">{width}px</span>
          </div>
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={width}
            onChange={(e) => onUpdate({ embedWidth: parseInt(e.target.value) })}
            className="w-full accent-primary h-1.5 rounded-full appearance-none bg-muted cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Height</Label>
            <span className="text-xs font-mono text-muted-foreground">{height}px</span>
          </div>
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={height}
            onChange={(e) => onUpdate({ embedHeight: parseInt(e.target.value) })}
            className="w-full accent-primary h-1.5 rounded-full appearance-none bg-muted cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      </div>

      {/* Help Section */}
      <div className="flex gap-3 rounded-xl border bg-muted/30 p-4">
        <HelpCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-foreground mb-1">Need help?</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Paste this code snippet into your website's HTML, just before the closing{" "}
            <code className="bg-muted rounded px-1 py-0.5 font-mono text-[10px]">&lt;/body&gt;</code> tag.
            The chatbot widget will automatically appear on your page.
          </p>
        </div>
      </div>
    </div>
  );
}
