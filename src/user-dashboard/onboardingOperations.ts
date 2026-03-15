import { HttpError } from "wasp/server";
import type { GetOnboardingStatus, DismissOnboarding } from "wasp/server/operations";

export type OnboardingStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

type OnboardingResult = {
  dismissed: boolean;
  steps: OnboardingStep[];
  [key: string]: any;
};

export const getOnboardingStatus: GetOnboardingStatus<void, OnboardingResult> = async (
  _args,
  context,
) => {
  if (!context.user) throw new HttpError(401);
  const userId = context.user.id;

  // Check if dismissed
  const dismissKey = `user.${userId}.onboarding_dismissed`;
  const dismissed = await context.entities.Setting.findUnique({
    where: { key: dismissKey },
  });
  if (dismissed?.value === "true") {
    return { dismissed: true, steps: [] };
  }

  // Check each onboarding step in parallel
  const [hasExtension, hasSocialAccount, hasPost] = await Promise.all([
    context.entities.UserExtension.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    }),
    context.entities.SocialAccount.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    }),
    Promise.all([
      context.entities.SocialMediaAgentPost.findFirst({
        where: { userId },
        select: { id: true },
      }),
      context.entities.SeoAgentPost.findFirst({
        where: { userId },
        select: { id: true },
      }),
    ]).then(([social, seo]) => !!social || !!seo),
  ]);

  const steps: OnboardingStep[] = [
    { id: "social-connect", label: "Connect a social account", href: "/social-connect", done: !!hasSocialAccount },
    { id: "extension", label: "Install your first extension", href: "/marketplace", done: !!hasExtension },
    { id: "post", label: "Create your first post", href: "/post-hub", done: !!hasPost },
  ];

  return { dismissed: false, steps };
};

export const dismissOnboarding: DismissOnboarding<void, void> = async (_args, context) => {
  if (!context.user) throw new HttpError(401);
  const dismissKey = `user.${context.user.id}.onboarding_dismissed`;

  await context.entities.Setting.upsert({
    where: { key: dismissKey },
    create: { key: dismissKey, value: "true" },
    update: { value: "true" },
  });
};
