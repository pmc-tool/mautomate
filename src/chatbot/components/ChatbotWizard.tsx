import { useState, useEffect } from "react";
import { useQuery } from "wasp/client/operations";
import { getChatbot, updateChatbot } from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { ChevronLeft, Check, Loader2, Settings, Paintbrush, GraduationCap, Code2 } from "lucide-react";
import { useToast } from "../../client/hooks/use-toast";
import WizardStepConfigure from "./WizardStepConfigure";
import WizardStepCustomize from "./WizardStepCustomize";
import WizardStepTrain from "./WizardStepTrain";
import WizardStepDeploy from "./WizardStepDeploy";
import ChatbotPreview from "./ChatbotPreview";

interface ChatbotWizardProps {
  chatbotId: string;
  initialStep: number;
  onClose: () => void;
}

const STEPS = [
  { num: 1, label: "Configure", icon: Settings },
  { num: 2, label: "Customize", icon: Paintbrush },
  { num: 3, label: "Train", icon: GraduationCap },
  { num: 4, label: "Test & Embed", icon: Code2 },
];

export default function ChatbotWizard({ chatbotId, initialStep, onClose }: ChatbotWizardProps) {
  const { data: chatbot, isLoading } = useQuery(getChatbot, { id: chatbotId });
  const { toast } = useToast();
  const [step, setStep] = useState(initialStep);
  const [saving, setSaving] = useState(false);

  // Local draft state for live preview
  const [draft, setDraft] = useState<Record<string, any>>({});

  // Sync draft when chatbot loads
  useEffect(() => {
    if (chatbot) {
      setDraft({
        title: chatbot.title,
        bubbleMessage: chatbot.bubbleMessage || "",
        welcomeMessage: chatbot.welcomeMessage || "",
        instructions: chatbot.instructions || "",
        dontGoBeyond: chatbot.dontGoBeyond,
        language: chatbot.language || "",
        avatar: chatbot.avatar || "",
        color: chatbot.color,
        position: chatbot.position,
        showLogo: chatbot.showLogo,
        showDateTime: chatbot.showDateTime,
        isEmailCollect: chatbot.isEmailCollect,
        isContact: chatbot.isContact,
        isAttachment: chatbot.isAttachment,
        isEmoji: chatbot.isEmoji,
        embedWidth: chatbot.embedWidth,
        embedHeight: chatbot.embedHeight,
        channels: chatbot.channels?.map((ch: any) => ch.channel) || ["website"],
      });
    }
  }, [chatbot]);

  const updateDraft = (updates: Record<string, any>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  };

  const handleSaveStep = async () => {
    setSaving(true);
    try {
      const { channels, ...chatbotFields } = draft;
      await updateChatbot({ id: chatbotId, ...chatbotFields });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    await handleSaveStep();
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleStepClick = (targetStep: number) => {
    handleSaveStep();
    setStep(targetStep);
  };

  if (isLoading || !chatbot) {
    return (
      <div className="bg-background fixed inset-0 z-[99999] flex items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background fixed inset-0 z-[99999] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left: Close */}
          <Button variant="ghost" onClick={onClose} className="gap-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </Button>

          {/* Center: Step Navigation */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const isActive = step === s.num;
              const isCompleted = step > s.num;
              const Icon = s.icon;
              return (
                <button
                  key={s.num}
                  onClick={() => handleStepClick(s.num)}
                  disabled={saving}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    isActive && "bg-primary/10 text-primary",
                    isCompleted && "text-primary",
                    !isActive && !isCompleted && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold border transition-colors",
                    isActive && "bg-primary text-white border-primary",
                    isCompleted && "bg-primary text-white border-primary",
                    !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                  )}>
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </span>
                  <span className="hidden lg:inline">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Save indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[80px] justify-end">
            {saving && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs">Saving...</span>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-[3px] w-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
            style={{ width: `${step * 25}%` }}
          />
        </div>
      </div>

      {/* Content: Two columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Step Form */}
        <div className="w-[460px] shrink-0 overflow-y-auto border-r p-7">
          {step === 1 && (
            <WizardStepConfigure
              draft={draft}
              onUpdate={updateDraft}
              chatbotId={chatbotId}
              channelRecords={chatbot.channels || []}
            />
          )}
          {step === 2 && (
            <WizardStepCustomize draft={draft} onUpdate={updateDraft} />
          )}
          {step === 3 && (
            <WizardStepTrain chatbotId={chatbotId} chatbot={chatbot} />
          )}
          {step === 4 && (
            <WizardStepDeploy
              chatbotId={chatbotId}
              channels={draft.channels || ["website"]}
              draft={draft}
              onUpdate={updateDraft}
            />
          )}

          {/* Step Navigation Buttons */}
          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1 h-11 rounded-xl"
              >
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button
                onClick={handleNext}
                disabled={saving}
                className="flex-1 h-11 rounded-xl"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Next
              </Button>
            ) : (
              <Button
                onClick={async () => { await handleSaveStep(); onClose(); }}
                disabled={saving}
                className="flex-1 h-11 rounded-xl"
              >
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Finish
              </Button>
            )}
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="flex flex-1 items-center justify-center bg-foreground/[0.03] dark:bg-foreground/[0.02] p-8">
          <div className="sticky bottom-8 rounded-3xl bg-foreground/[0.05] dark:bg-foreground/[0.04] p-5 backdrop-blur-sm lg:p-10">
            <ChatbotPreview draft={draft} channels={draft.channels || ["website"]} chatbotId={chatbotId} />
          </div>
        </div>
      </div>
    </div>
  );
}
