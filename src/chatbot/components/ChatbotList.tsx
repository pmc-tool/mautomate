import { useState } from "react";
import { deleteChatbot, updateChatbot } from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../client/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../client/components/ui/dialog";
import {
  Bot,
  Globe,
  MessageCircle,
  Paintbrush,
  Pencil,
  Phone,
  Power,
  Rocket,
  Send,
  Trash2,
  GraduationCap,
  Check,
} from "lucide-react";
import { useToast } from "../../client/hooks/use-toast";
import { cn } from "../../client/utils";
import chatbotDefaultImg from "../../client/static/chatbot/chatbot-default.png";

// Platform icons
import messengerIcon from "../../social-connect/icons/messenger.svg";
import whatsappIcon from "../../social-connect/icons/whatsapp.svg";
import telegramIcon from "../../social-connect/icons/telegram.svg";

interface ChatbotListProps {
  chatbots: any[];
  onOpenWizard: (chatbotId: string, step: number) => void;
}

const CHANNEL_ICONS: Record<string, { img?: string; label: string }> = {
  website: { label: "Website" },
  messenger: { img: messengerIcon, label: "Messenger" },
  whatsapp: { img: whatsappIcon, label: "WhatsApp" },
  telegram: { img: telegramIcon, label: "Telegram" },
};

export default function ChatbotList({ chatbots, onOpenWizard }: ChatbotListProps) {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteChatbot({ id: deleteId });
      toast({ title: "Chatbot deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (chatbot: any) => {
    try {
      await updateChatbot({ id: chatbot.id, isActive: !chatbot.isActive });
      toast({ title: chatbot.isActive ? "Chatbot deactivated" : "Chatbot activated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) {
      const m = Math.floor(diff / 60);
      return m === 1 ? "1 minute ago" : `${m} minutes ago`;
    }
    if (diff < 86400) {
      const h = Math.floor(diff / 3600);
      return h === 1 ? "1 hour ago" : `${h} hours ago`;
    }
    const d = Math.floor(diff / 86400);
    return d === 1 ? "1 day ago" : `${d} days ago`;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {chatbots.map((chatbot) => (
          <div key={chatbot.id} className="rounded-2xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            {/* Card Header — Avatar + Dropdown */}
            <div className="flex items-center justify-between gap-4 px-5 py-[18px]">
              <figure>
                <img
                  className="h-10 w-10 rounded-full object-cover object-center"
                  width={40}
                  height={40}
                  src={chatbot.avatar || chatbotDefaultImg}
                  alt={chatbot.title}
                  onError={(e) => { (e.target as HTMLImageElement).src = chatbotDefaultImg; }}
                />
              </figure>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 transition-colors">
                    <svg width="3" height="13" viewBox="0 0 3 13" fill="currentColor">
                      <path d="M3 11.5C3 12.3 2.3 13 1.5 13C0.7 13 0 12.3 0 11.5C0 10.7 0.7 10 1.5 10C2.3 10 3 10.7 3 11.5ZM3 6.5C3 7.3 2.3 8 1.5 8C0.7 8 0 7.3 0 6.5C0 5.7 0.7 5 1.5 5C2.3 5 3 5.7 3 6.5ZM3 1.5C3 2.3 2.3 3 1.5 3C0.7 3 0 2.3 0 1.5C0 0.7 0.7 0 1.5 0C2.3 0 3 0.7 3 1.5Z" />
                    </svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[170px]">
                  <DropdownMenuItem onClick={() => onOpenWizard(chatbot.id, 1)} className="text-[13px]">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenWizard(chatbot.id, 2)} className="text-[13px]">
                    <Paintbrush className="mr-2 h-4 w-4" />
                    Customize
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenWizard(chatbot.id, 3)} className="text-[13px]">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Train
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenWizard(chatbot.id, 4)} className="text-[13px]">
                    <Rocket className="mr-2 h-4 w-4" />
                    Test & Embed
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleToggleActive(chatbot)} className="text-[13px]">
                    <Power className="mr-2 h-4 w-4" />
                    {chatbot.isActive ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive text-[13px]"
                    onClick={() => setDeleteId(chatbot.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Card Body */}
            <div className="px-5 pb-5">
              <h3 className="mb-2 text-base font-semibold text-foreground">{chatbot.title}</h3>
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Created {timeAgo(chatbot.createdAt)}
              </p>

              {/* Status + Channel Icons Row */}
              <div className="flex items-center justify-between">
                {/* Active/Passive Badge */}
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium leading-none transition-all",
                    chatbot.isActive
                      ? "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800"
                      : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {chatbot.isActive && <Check className="h-3.5 w-3.5" />}
                  {chatbot.isActive ? "Active" : "Passive"}
                </div>

                {/* Channel Icons */}
                <div className="flex items-center gap-1.5">
                  {chatbot.channels && chatbot.channels.length > 0 && (
                    chatbot.channels.map((ch: any) => {
                      const channelInfo = CHANNEL_ICONS[ch.channel];
                      if (!channelInfo) return null;
                      return channelInfo.img ? (
                        <img key={ch.id} src={channelInfo.img} alt={channelInfo.label} title={channelInfo.label} className="h-[18px] w-[18px] object-contain" />
                      ) : (
                        <span key={ch.id} title={channelInfo.label}>
                          <Globe className="h-[18px] w-[18px] text-muted-foreground/70" strokeWidth={1.5} />
                        </span>
                      );
                    })
                  )}
                  <span title="Website">
                    <Globe className="h-[18px] w-[18px] text-muted-foreground/70" strokeWidth={1.5} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Chatbot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chatbot? This action cannot be undone.
              All training data will also be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
