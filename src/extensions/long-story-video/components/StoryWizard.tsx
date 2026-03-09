import { ReactNode } from "react";
import { Check } from "lucide-react";

interface StoryWizardProps {
  currentStep: number;
  steps: string[];
  children: ReactNode;
}

export function StoryWizard({ currentStep, steps, children }: StoryWizardProps) {
  const progress = currentStep / steps.length;

  return (
    <div className="space-y-0">
      {/* Slide-in animation */}
      <style>{`
        @keyframes wizardSlideIn {
          from { opacity: 0; transform: translateY(8px); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0);   filter: blur(0);   }
        }
      `}</style>

      {/* Top bar: step pills + progress */}
      <div className="mb-2">
        {/* Step pills */}
        <div className="flex items-center justify-between">
          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;

            return (
              <div key={label} className="flex items-center">
                <div
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isCompleted
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted-foreground/15 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3" /> : stepNum}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`mx-1.5 h-px w-6 sm:mx-3 sm:w-12 transition-colors ${
                      isCompleted ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${Math.max(5, progress * 100)}%` }}
          />
        </div>
      </div>

      {/* Step content with slide animation */}
      <div
        key={currentStep}
        className="pt-6"
        style={{ animation: "wizardSlideIn 300ms ease-out both" }}
      >
        {children}
      </div>
    </div>
  );
}
