import { useState } from "react";
import { type AuthUser } from "wasp/auth";
import { useQuery } from "wasp/client/operations";
import { getChatbots, createChatbot } from "wasp/client/operations";
import UserDashboardLayout from "../user-dashboard/layout/UserDashboardLayout";
import ChatbotList from "./components/ChatbotList";
import ChatbotWizard from "./components/ChatbotWizard";
import { Loader2, Plus, Bot, ChevronRight, MessageSquare, Users } from "lucide-react";
import { Button } from "../client/components/ui/button";
import { useToast } from "../client/hooks/use-toast";
import { Link } from "react-router";
import chatbotCreateImg from "../client/static/chatbot/chatbot-create.png";
import chatbotHistoryImg from "../client/static/chatbot/chatbot-history.png";

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

  const activeBots = chatbots?.filter((c: any) => c.isActive) || [];
  const totalBots = chatbots?.length || 0;

  return (
    <UserDashboardLayout user={user}>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <Link
            to="/dashboard"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor" className="rtl:-scale-x-100">
              <path d="M4.45536 9.45539C4.52679 9.45539 4.60714 9.41968 4.66071 9.36611L5.10714 8.91968C5.16071 8.86611 5.19643 8.78575 5.19643 8.71432C5.19643 8.64289 5.16071 8.56254 5.10714 8.50896L1.59821 5.00004L5.10714 1.49111C5.16071 1.43753 5.19643 1.35718 5.19643 1.28575C5.19643 1.20539 5.16071 1.13396 5.10714 1.08039L4.66071 0.633963C4.60714 0.580392 4.52679 0.544678 4.45536 0.544678C4.38393 0.544678 4.30357 0.580392 4.25 0.633963L0.0892856 4.79468C0.0357141 4.84825 0 4.92861 0 5.00004C0 5.07146 0.0357141 5.15182 0.0892856 5.20539L4.25 9.36611C4.30357 9.41968 4.38393 9.45539 4.45536 9.45539Z" />
            </svg>
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">ChatBot</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage ChatBot</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Card — "What's New" */}
            <div className="rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-wrap items-center gap-y-5 px-5 py-6 lg:px-10 lg:py-8">
                <div className="w-full shrink lg:w-1/3">
                  <p className="text-xl font-semibold text-foreground">What's New.</p>
                </div>
                <div className="w-full lg:w-2/3">
                  <div className="flex flex-col gap-y-4 md:flex-row">
                    <div className="group flex grow flex-col gap-1 border-b pb-4 text-foreground md:border-b-0 md:border-r md:pb-0 md:pr-3 xl:px-10">
                      <span className="text-sm group-hover:text-primary transition-colors">
                        Active Chatbots
                      </span>
                      <span className="text-[23px] font-semibold leading-none">
                        {activeBots.length}
                      </span>
                    </div>
                    <div className="group flex grow flex-col gap-1 border-b pb-4 text-foreground md:border-b-0 md:border-r md:px-3 md:pb-0 xl:px-10">
                      <span className="text-sm group-hover:text-primary transition-colors">
                        Total Chatbots
                      </span>
                      <span className="text-[23px] font-semibold leading-none">
                        {totalBots}
                      </span>
                    </div>
                    <div className="group flex grow flex-col gap-1 pb-4 text-foreground md:px-3 md:pb-0 xl:px-10">
                      <span className="text-sm group-hover:text-primary transition-colors">
                        Channels Connected
                      </span>
                      <span className="text-[23px] font-semibold leading-none">
                        {chatbots?.reduce((acc: number, c: any) => acc + (c.channels?.length || 0), 0) || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two Large Action Cards */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
              {/* Add New Chatbot Card */}
              <div className="rounded-2xl border bg-card shadow-sm text-center">
                <div className="p-9 lg:p-16">
                  <figure className="mx-auto mb-6 inline-grid h-40 w-40 place-items-center rounded-full bg-foreground/[0.03] dark:bg-foreground/[0.06]">
                    <img
                      src={chatbotCreateImg}
                      alt="Add New Chatbot"
                      className="h-24 w-24 object-contain"
                    />
                  </figure>
                  <p className="mx-auto mb-6 max-w-[370px] text-xl font-semibold leading-[1.3em] text-foreground">
                    Create and configure a chatbot that interacts with your users.
                  </p>
                  <Button
                    onClick={handleAddNew}
                    variant="outline"
                    className="gap-2 rounded-xl border-2 px-6 py-2.5 shadow-sm hover:shadow-md transition-all"
                  >
                    <Plus size={16} />
                    Add New Chatbot
                  </Button>
                </div>
              </div>

              {/* View History Card */}
              <div className="rounded-2xl border bg-card shadow-sm text-center">
                <div className="p-9 lg:p-16">
                  <figure className="mx-auto mb-6 inline-grid h-40 w-40 place-items-center rounded-full bg-foreground/[0.03] dark:bg-foreground/[0.06]">
                    <img
                      src={chatbotHistoryImg}
                      alt="View Chat History"
                      className="h-24 w-24 object-contain"
                    />
                  </figure>
                  <p className="mx-auto mb-6 max-w-[370px] text-xl font-semibold leading-[1.3em] text-foreground">
                    Explore recent conversations from your users.
                  </p>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
                    <Link to="/inbox">
                      <Button
                        variant="outline"
                        className="gap-2 rounded-xl border-2 px-6 py-2.5 shadow-sm hover:shadow-md transition-all"
                      >
                        <Bot size={16} />
                        AI Bot Messages
                      </Button>
                    </Link>
                    <Link to="/inbox">
                      <Button
                        variant="outline"
                        className="gap-2 rounded-xl border-2 px-6 py-2.5 shadow-sm hover:shadow-md transition-all"
                      >
                        <Users size={16} />
                        Agent Messages
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Chatbots Section */}
            {chatbots && chatbots.length > 0 && (
              <div className="pt-6">
                <h2 className="mb-6 text-xl font-semibold">Active Chatbots</h2>
                <ChatbotList
                  chatbots={chatbots}
                  onOpenWizard={handleOpenWizard}
                />
              </div>
            )}
          </>
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
