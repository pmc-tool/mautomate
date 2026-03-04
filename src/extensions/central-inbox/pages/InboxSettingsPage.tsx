import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery, useAction } from "wasp/client/operations";
import {
  getCannedResponses,
  saveCannedResponse,
  deleteCannedResponse,
  getInboxChannels,
  saveChatbotChannel,
  saveChannelCredentials,
} from "wasp/client/operations";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
  Bot,
  Globe,
  Check,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Send as SendIcon,
  Instagram,
  Loader2,
} from "lucide-react";
import { Link } from "react-router";
import UserDashboardLayout from "../../../user-dashboard/layout/UserDashboardLayout";
import { Button } from "../../../client/components/ui/button";
import { Input } from "../../../client/components/ui/input";
import { Textarea } from "../../../client/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../../../client/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../client/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../client/components/ui/dialog";
import { Label } from "../../../client/components/ui/label";
import { Separator } from "../../../client/components/ui/separator";
import { cn } from "../../../client/utils";

export default function InboxSettingsPage({ user }: { user: AuthUser }) {
  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/inbox">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Inbox Settings</h1>
        </div>

        <Tabs defaultValue="channels">
          <TabsList>
            <TabsTrigger value="channels">
              <Globe size={14} className="mr-1" /> Channels
            </TabsTrigger>
            <TabsTrigger value="canned">
              <MessageSquare size={14} className="mr-1" /> Canned Responses
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Bot size={14} className="mr-1" /> AI Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="channels">
            <ChannelsTab />
          </TabsContent>

          <TabsContent value="canned">
            <CannedResponsesTab />
          </TabsContent>

          <TabsContent value="ai">
            <AiSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </UserDashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Channels Tab — Full credential management
// ---------------------------------------------------------------------------

const CHANNEL_DEFS = [
  {
    id: "messenger",
    label: "Facebook Messenger",
    icon: MessageSquare,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    description: "Connect your Facebook Page to receive and reply to Messenger conversations.",
    docsUrl: "https://developers.facebook.com/docs/messenger-platform",
    fields: [
      { key: "fbAppId", label: "App ID", placeholder: "e.g. 1234567890", secret: false, hasKey: "", type: "text" },
      { key: "fbAppSecret", label: "App Secret", placeholder: "Enter app secret", secret: true, hasKey: "hasFbAppSecret", type: "text" },
      { key: "fbPageName", label: "Page Name", placeholder: "e.g. My Business Page", secret: false, hasKey: "", type: "text" },
      { key: "fbAccessToken", label: "Page Access Token", placeholder: "Enter page access token", secret: true, hasKey: "hasFbAccessToken", type: "text" },
      { key: "fbVerifyToken", label: "Verify Token", placeholder: "A custom string for webhook verification", secret: false, hasKey: "", type: "text" },
    ],
    webhookPath: "/api/inbox/webhook/messenger",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Business",
    icon: MessageCircle,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    description: "Connect via WhatsApp Cloud API to handle customer messages from WhatsApp.",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    fields: [
      { key: "waPhoneNumberId", label: "Phone Number ID", placeholder: "e.g. 123456789012345", secret: false, hasKey: "", type: "text" },
      { key: "waBusinessId", label: "Business Account ID", placeholder: "e.g. 123456789012345", secret: false, hasKey: "", type: "text" },
      { key: "waAccessToken", label: "Access Token", placeholder: "Enter permanent access token", secret: true, hasKey: "hasWaAccessToken", type: "text" },
      { key: "waVerifyToken", label: "Verify Token", placeholder: "A custom string for webhook verification", secret: false, hasKey: "", type: "text" },
    ],
    webhookPath: "/api/inbox/webhook/whatsapp",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: SendIcon,
    color: "text-sky-600",
    bgColor: "bg-sky-50 dark:bg-sky-950/30",
    borderColor: "border-sky-200 dark:border-sky-800",
    description: "Connect a Telegram Bot to handle conversations from Telegram users.",
    docsUrl: "https://core.telegram.org/bots/api",
    fields: [
      { key: "tgBotToken", label: "Bot Token", placeholder: "e.g. 123456:ABC-DEF1234ghIkl-zyx57W2v...", secret: true, hasKey: "hasTgBotToken", type: "text" },
      { key: "tgBotUsername", label: "Bot Username", placeholder: "e.g. @my_support_bot", secret: false, hasKey: "", type: "text" },
    ],
    webhookPath: "/api/inbox/webhook/telegram",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/30",
    borderColor: "border-pink-200 dark:border-pink-800",
    description: "Connect your Instagram Professional account to handle DM conversations.",
    docsUrl: "https://developers.facebook.com/docs/instagram-api",
    fields: [
      { key: "fbAppId", label: "App ID", placeholder: "Same as Messenger App ID", secret: false, hasKey: "", type: "text" },
      { key: "fbAppSecret", label: "App Secret", placeholder: "Same as Messenger App Secret", secret: true, hasKey: "hasFbAppSecret", type: "text" },
      { key: "fbAccessToken", label: "Access Token", placeholder: "Enter Instagram access token", secret: true, hasKey: "hasFbAccessToken", type: "text" },
      { key: "fbVerifyToken", label: "Verify Token", placeholder: "A custom string for webhook verification", secret: false, hasKey: "", type: "text" },
    ],
    webhookPath: "/api/inbox/webhook/instagram",
  },
  {
    id: "website",
    label: "Website Widget",
    icon: Globe,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    description: "Embed a chat widget on your website. Automatically connected via WebSocket.",
    fields: [
      { key: "embedWidth", label: "Widget Width (px)", placeholder: "400", secret: false, hasKey: "", type: "number" },
      { key: "embedHeight", label: "Widget Height (px)", placeholder: "600", secret: false, hasKey: "", type: "number" },
    ],
  },
];

function ChannelsTab() {
  const { data, isLoading, refetch } = useQuery(getInboxChannels);
  const saveChatbotChannelAction = useAction(saveChatbotChannel);
  const saveCredentialsAction = useAction(saveChannelCredentials);
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const chatbots = data?.chatbots || [];
  const channels = data?.channels || [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading channel configuration...</p>
        </CardContent>
      </Card>
    );
  }

  if (chatbots.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bot size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-semibold text-base">No Chatbot Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Create a chatbot first in the Chatbot module, then come back here to configure channels.
          </p>
          <Link to="/chatbot">
            <Button className="mt-4" size="sm">
              Go to Chatbot
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const primaryChatbot = chatbots[0];

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Connected Chatbot</h3>
              <p className="text-muted-foreground text-xs mt-0.5">
                Channels are linked to: <span className="font-medium text-foreground">{primaryChatbot.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {channels.filter((c: any) => c.isConfigured).length} of {CHANNEL_DEFS.length} channels configured
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel cards */}
      {CHANNEL_DEFS.map((def) => {
        const existingChannel = channels.find((c: any) => c.channel === def.id && c.chatbotId === primaryChatbot.id);
        return (
          <ChannelCard
            key={def.id}
            def={def}
            channel={existingChannel}
            chatbotId={primaryChatbot.id}
            isExpanded={expandedChannel === def.id}
            onToggle={() => setExpandedChannel(expandedChannel === def.id ? null : def.id)}
            onCreateChannel={async () => {
              await saveChatbotChannelAction({ chatbotId: primaryChatbot.id, channel: def.id as any });
              refetch();
            }}
            onSaveCredentials={async (channelId: string, creds: any) => {
              await saveCredentialsAction({ id: channelId, ...creds });
              refetch();
            }}
          />
        );
      })}

      {/* Webhook URLs reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ExternalLink size={14} /> Webhook URLs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-xs mb-3">
            Copy these URLs into your platform's webhook settings (Facebook Developer Console, Telegram BotFather, etc.)
          </p>
          <div className="space-y-2">
            {CHANNEL_DEFS.filter((d) => d.webhookPath).map((d) => {
              const fullUrl = typeof window !== "undefined" ? window.location.origin + d.webhookPath : "https://yourdomain.com" + d.webhookPath;
              return (
                <div key={d.id} className="flex items-center gap-2">
                  <d.icon size={14} className={d.color} />
                  <span className="text-xs font-medium w-20">{d.label.split(" ")[0]}</span>
                  <code className="bg-muted px-2 py-1 rounded text-[11px] flex-1 truncate">{fullUrl}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => navigator.clipboard.writeText(fullUrl)}
                  >
                    <Copy size={12} />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual Channel Card
// ---------------------------------------------------------------------------

interface ChannelCardProps {
  def: (typeof CHANNEL_DEFS)[number];
  channel: any;
  chatbotId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onCreateChannel: () => Promise<void>;
  onSaveCredentials: (channelId: string, creds: any) => Promise<void>;
}

function ChannelCard({ def, channel, chatbotId, isExpanded, onToggle, onCreateChannel, onSaveCredentials }: ChannelCardProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const isConfigured = channel?.isConfigured || false;
  const isCreated = !!channel;
  const Icon = def.icon;

  const getFieldValue = (field: any) => {
    if (formData[field.key] !== undefined) return formData[field.key];
    if (field.secret) return "";
    if (channel) return channel[field.key] || "";
    return "";
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      if (!isCreated) {
        await onCreateChannel();
        // After creation, we need the new channel ID — handled by refetch
        setSaveStatus("success");
      } else {
        // Build credential payload — only include changed fields
        const creds: Record<string, any> = {};
        for (const field of def.fields) {
          const val = formData[field.key];
          if (val !== undefined && val !== "") {
            creds[field.key] = field.type === "number" ? parseInt(val, 10) : val;
          }
        }
        if (Object.keys(creds).length > 0) {
          await onSaveCredentials(channel.id, creds);
        }
        setSaveStatus("success");
      }
      setFormData({});
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      console.error("Save failed:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn("transition-all", isExpanded && "ring-1 ring-primary/20")}>
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", def.bgColor)}>
            <Icon size={18} className={def.color} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{def.label}</span>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                  <Check size={10} /> Connected
                </span>
              ) : isCreated ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:text-yellow-400">
                  <AlertCircle size={10} /> Incomplete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  Not configured
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">{def.description}</p>
          </div>
        </div>
        {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <CardContent className="pt-0 pb-4">
          <Separator className="mb-4" />

          {!isCreated && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                This channel hasn't been set up yet. Enable it to start configuring credentials.
              </p>
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                Enable {def.label}
              </Button>
            </div>
          )}

          {isCreated && (
            <div className="space-y-4">
              {/* Credential fields */}
              <div className="grid gap-3">
                {def.fields.map((field) => {
                  const currentValue = getFieldValue(field);
                  const hasExistingSecret = field.secret && field.hasKey && channel?.[field.hasKey];
                  const isShowingSecret = showSecrets[field.key];

                  return (
                    <div key={field.key}>
                      <Label className="text-xs font-medium mb-1 block">
                        {field.label}
                        {field.secret && hasExistingSecret && (
                          <span className="text-green-600 dark:text-green-400 ml-1.5 font-normal">(saved)</span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          type={field.secret && !isShowingSecret ? "password" : field.type || "text"}
                          placeholder={
                            field.secret && hasExistingSecret
                              ? "••••••••  (enter new value to update)"
                              : field.placeholder
                          }
                          className={cn(
                            "text-sm h-9",
                            field.secret && "pr-10",
                            field.secret && hasExistingSecret && !currentValue && "placeholder:text-green-600/50 dark:placeholder:text-green-400/50"
                          )}
                          value={currentValue}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        />
                        {field.secret && (
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !isShowingSecret })}
                          >
                            {isShowingSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Webhook URL for this channel */}
              {def.webhookPath && (
                <div className={cn("rounded-lg p-3", def.bgColor, "border", def.borderColor)}>
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Webhook URL
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded text-[11px] flex-1 truncate border">
                      {typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com"}{def.webhookPath}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] flex-shrink-0"
                      onClick={() => {
                        const url = (typeof window !== "undefined" ? window.location.origin : "") + def.webhookPath;
                        navigator.clipboard.writeText(url);
                      }}
                    >
                      <Copy size={12} className="mr-1" /> Copy
                    </Button>
                  </div>
                </div>
              )}

              {/* Docs link */}
              {def.docsUrl && (
                <a href={def.docsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <ExternalLink size={12} /> View {def.label.split(" ")[0]} API documentation
                </a>
              )}

              {/* Save button */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || Object.keys(formData).length === 0}
                  size="sm"
                >
                  {isSaving ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Check size={14} className="mr-1" />
                  )}
                  Save Credentials
                </Button>
                {saveStatus === "success" && (
                  <span className="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                    <Check size={12} /> Saved successfully
                  </span>
                )}
                {saveStatus === "error" && (
                  <span className="text-destructive text-xs flex items-center gap-1">
                    <AlertCircle size={12} /> Failed to save
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Canned Responses Tab
// ---------------------------------------------------------------------------

function CannedResponsesTab() {
  const { data: responses = [], refetch } = useQuery(getCannedResponses, {});
  const saveAction = useAction(saveCannedResponse);
  const deleteAction = useAction(deleteCannedResponse);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [form, setForm] = useState({ shortcut: "", title: "", content: "", category: "" });

  const handleSave = async () => {
    try {
      await saveAction({
        ...(editingId ? { id: editingId } : {}),
        shortcut: form.shortcut,
        title: form.title,
        content: form.content,
        category: form.category || undefined,
      });
      setIsDialogOpen(false);
      setEditingId(undefined);
      setForm({ shortcut: "", title: "", content: "", category: "" });
      refetch();
    } catch (err) {
      console.error("Save failed:", err);
    }
  };

  const handleEdit = (resp: any) => {
    setEditingId(resp.id);
    setForm({ shortcut: resp.shortcut, title: resp.title, content: resp.content, category: resp.category || "" });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this canned response?")) return;
    try {
      await deleteAction({ id });
      refetch();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Canned Responses</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) { setEditingId(undefined); setForm({ shortcut: "", title: "", content: "", category: "" }); }
        }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={14} className="mr-1" /> Add Response</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "New"} Canned Response</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Shortcut (e.g. /greeting)</Label>
                <Input value={form.shortcut} onChange={(e) => setForm({ ...form, shortcut: e.target.value })} placeholder="/greeting" />
              </div>
              <div>
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Friendly greeting" />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Hi! How can I help you today?" rows={4} />
              </div>
              <div>
                <Label>Category (optional)</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="General" />
              </div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {responses.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No canned responses yet. Create one to speed up your replies.</p>
        ) : (
          <div className="space-y-2">
            {(responses as any[]).map((resp: any) => (
              <div key={resp.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{resp.shortcut}</code>
                    <span className="font-medium text-sm">{resp.title}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-1 truncate max-w-md">{resp.content}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(resp)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(resp.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// AI Settings Tab
// ---------------------------------------------------------------------------

function AiSettingsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Behavior</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          AI behavior is configured per chatbot. Go to the Chatbot module to update instructions, training data, and language settings.
        </p>
        <Separator />
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Handoff Triggers</h4>
          <p className="text-muted-foreground text-xs">
            AI will automatically hand off to a human when:
          </p>
          <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
            <li>Customer says "speak to human", "agent", "real person", etc.</li>
            <li>AI reaches 10 messages without resolution</li>
            <li>AI detects it cannot handle the request</li>
            <li>Customer clicks "Talk to Human" button</li>
          </ul>
        </div>
        <Separator />
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Credits</h4>
          <p className="text-muted-foreground text-xs">
            Each AI reply costs 2 credits. Human replies are free.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
