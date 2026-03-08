import { ReactNode } from "react";
import { Check } from "lucide-react";

interface StoryWizardProps {
  currentStep: number;
  steps: string[];
  children: ReactNode;
}

export function StoryWizard({ currentStep, steps, children }: StoryWizardProps) {
  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <nav aria-label="Progress">
        <ol className="flex items-center justify-center gap-2 sm:gap-4">
          {steps.map((label, idx) => {
            const stepNum = idx + 1;
            const isCompleted = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;

            return (
              <li key={label} className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      isCompleted
                        ? "bg-green-600 text-white"
                        : isCurrent
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                  </div>
                  <span
                    className={`hidden text-sm font-medium sm:inline ${
                      isCurrent
                        ? "text-white"
                        : isCompleted
                        ? "text-green-400"
                        : "text-gray-500"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 w-8 sm:w-16 ${
                      isCompleted ? "bg-green-600" : "bg-gray-700"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Step content */}
      <div>{children}</div>
    </div>
  );
}
