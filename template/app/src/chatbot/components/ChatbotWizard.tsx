import { useState, useEffect } from "react";
import { useQuery } from "wasp/client/operations";
import { getChatbot, updateChatbot } from "wasp/client/operations";
import { Button } from "../../client/components/ui/button";
import { cn } from "../../client/utils";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
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

const STEP_LABELS = ["Configure", "Customize", "Train", "Deploy"];

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
      // Don't send `channels` to updateChatbot — channels are managed separately
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
    // Allow navigating to any step (save current first)
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
      {/* Sticky Header */}
      <div className="bg-background/60 sticky top-0 z-10 border-b backdrop-blur-lg">
        <div className="flex h-16 items-center justify-between px-6">
          <Button variant="ghost" onClick={onClose} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Close
          </Button>

          <h2 className="text-lg font-semibold">{draft.title || chatbot.title}</h2>

          {/* Step Navigation */}
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isCompleted = step > stepNum;
              return (
                <button
                  key={label}
                  onClick={() => handleStepClick(stepNum)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isCompleted && "bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "bg-muted text-muted-foreground"
                  )}
                  title={label}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-muted">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${step * 25}%` }}
          />
        </div>
      </div>

      {/* Content: Two columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Step Form */}
        <div className="w-[430px] shrink-0 overflow-y-auto border-r p-6">
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
        </div>

        {/* Right: Live Preview */}
        <div className="flex flex-1 items-center justify-center bg-muted/30 p-8">
          <div className="rounded-3xl bg-muted p-5">
            <ChatbotPreview draft={draft} channels={draft.channels || ["website"]} chatbotId={chatbotId} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t px-6 py-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span className="text-muted-foreground text-sm">
              Step {step} of 4: {STEP_LABELS[step - 1]}
            </span>
          </div>
          {step < 4 ? (
            <Button onClick={handleNext} disabled={saving}>
              Next
            </Button>
          ) : (
            <Button onClick={async () => { await handleSaveStep(); onClose(); }} disabled={saving}>
              Finish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
