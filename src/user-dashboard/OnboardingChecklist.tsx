import { Link } from "react-router";
import {
  getOnboardingStatus,
  dismissOnboarding,
  useQuery,
} from "wasp/client/operations";
import { Check, X, ArrowRight, Rocket } from "lucide-react";
import { Card, CardContent } from "../client/components/ui/card";
import { Button } from "../client/components/ui/button";
import { useBranding } from "../branding/BrandingContext";

export default function OnboardingChecklist() {
  const { data, isLoading } = useQuery(getOnboardingStatus);
  const branding = useBranding();

  if (isLoading || !data || data.dismissed) return null;

  const completedCount = data.steps.filter((s) => s.done).length;
  const allDone = completedCount === data.steps.length;

  // Don't show if everything is already done
  if (allDone) return null;

  const progress = Math.round((completedCount / data.steps.length) * 100);

  return (
    <Card className="border-primary/20 bg-primary/5 mb-6 overflow-hidden">
      <CardContent className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Rocket size={20} className="text-primary" />
            <h3 className="text-foreground text-base font-semibold">
              Welcome to {branding.appName}!
            </h3>
          </div>
          <button
            onClick={() => dismissOnboarding()}
            className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 rounded p-1 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-muted mb-4 h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ul className="space-y-2">
          {data.steps.map((step) => (
            <li key={step.id}>
              <Link
                to={step.href}
                className={`hover:bg-accent/50 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  step.done ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {step.done ? (
                  <Check size={16} className="text-green-500 shrink-0" />
                ) : (
                  <div className="border-muted-foreground h-4 w-4 shrink-0 rounded-full border" />
                )}
                <span className={step.done ? "line-through" : ""}>
                  {step.label}
                </span>
                {!step.done && (
                  <ArrowRight size={14} className="text-muted-foreground ml-auto shrink-0" />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground mt-3 text-xs">
          {completedCount} of {data.steps.length} completed
        </p>
      </CardContent>
    </Card>
  );
}
