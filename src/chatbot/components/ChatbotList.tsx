import { useState } from "react";
import { deleteChatbot, updateChatbot } from "wasp/client/operations";
import { Card, CardContent } from "../../client/components/ui/card";
import { Badge } from "../../client/components/ui/badge";
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
  GraduationCap,
  MessageCircle,
  MoreVertical,
  Paintbrush,
  Pencil,
  Phone,
  Power,
  Rocket,
  Send,
  Trash2,
} from "lucide-react";
import { useToast } from "../../client/hooks/use-toast";

interface ChatbotListProps {
  chatbots: any[];
  onOpenWizard: (chatbotId: string, step: number) => void;
}

const CHANNEL_ICONS: Record<string, typeof Globe> = {
  website: Globe,
  messenger: MessageCircle,
  whatsapp: Phone,
  telegram: Send,
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

  const statusBadge = (status: string) => {
    switch (status) {
      case "trained":
        return <Badge variant="success">Trained</Badge>;
      case "training":
        return <Badge variant="info">Training</Badge>;
      default:
        return <Badge variant="secondary">Not Trained</Badge>;
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {chatbots.map((chatbot) => (
          <Card key={chatbot.id} className="relative overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: chatbot.color }}
                  >
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{chatbot.title}</h3>
                    <p className="text-muted-foreground text-xs">
                      {new Date(chatbot.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onOpenWizard(chatbot.id, 1)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Configure
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onOpenWizard(chatbot.id, 2)}>
                      <Paintbrush className="mr-2 h-4 w-4" />
                      Customize
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onOpenWizard(chatbot.id, 3)}>
                      <GraduationCap className="mr-2 h-4 w-4" />
                      Train
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onOpenWizard(chatbot.id, 4)}>
                      <Rocket className="mr-2 h-4 w-4" />
                      Deploy
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleToggleActive(chatbot)}>
                      <Power className="mr-2 h-4 w-4" />
                      {chatbot.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(chatbot.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Badge variant={chatbot.isActive ? "success" : "secondary"}>
                  {chatbot.isActive ? "Active" : "Inactive"}
                </Badge>
                {statusBadge(chatbot.status)}
              </div>

              {/* Channel Icons */}
              {chatbot.channels && chatbot.channels.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5">
                  {chatbot.channels.map((ch: any) => {
                    const Icon = CHANNEL_ICONS[ch.channel];
                    if (!Icon) return null;
                    return (
                      <div
                        key={ch.id}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-muted"
                        title={ch.channel.charAt(0).toUpperCase() + ch.channel.slice(1)}
                      >
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
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
