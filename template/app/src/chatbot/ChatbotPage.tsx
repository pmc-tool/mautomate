import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getChatbots, createChatbot } from "wasp/client/operations";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";
import ChatbotList from "./components/ChatbotList";
import ChatbotWizard from "./components/ChatbotWizard";
import { Loader2, Plus } from "lucide-react";
import { Button } from "../client/components/ui/button";
import { useToast } from "../client/hooks/use-toast";

export default function ChatbotPage({ user }: { user: AuthUser }) {
  const { data: chatbots, isLoading } = useQuery(getChatbots);
  const { toast } = useToast();

  const [wizardChatbotId, setWizardChatbotId] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState<number>(1);

  const handleAddNew = async () => {
    try {
      const newChatbot = await createChatbot({ title: "Untitled Chatbot" });
      setWizardChatbotId(newChatbot.id);
      setWizardStep(1);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create chatbot", variant: "destructive" });
    }
  };

  const handleOpenWizard = (chatbotId: string, step: number) => {
    setWizardChatbotId(chatbotId);
    setWizardStep(step);
  };

  const handleCloseWizard = () => {
    setWizardChatbotId(null);
    setWizardStep(1);
  };

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chatbots</h1>
            <p className="text-muted-foreground text-sm">
              Create and manage AI chatbots for your website
            </p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Chatbot
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : !chatbots || chatbots.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20">
            <div className="bg-muted mb-4 rounded-full p-4">
              <Plus className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">No chatbots yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Create your first AI chatbot to embed on your website
            </p>
            <Button onClick={handleAddNew}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Chatbot
            </Button>
          </div>
        ) : (
          <ChatbotList
            chatbots={chatbots}
            onOpenWizard={handleOpenWizard}
          />
        )}
      </div>

      {/* Wizard Overlay */}
      {wizardChatbotId && (
        <ChatbotWizard
          chatbotId={wizardChatbotId}
          initialStep={wizardStep}
          onClose={handleCloseWizard}
        />
      )}
    </UserDashboardLayout>
  );
}
