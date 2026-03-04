import { CheckCircle, Coins, Sparkles, Star } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "wasp/client/auth";
import {
  generateCheckoutSession,
  getCustomerPortalUrl,
  useQuery,
} from "wasp/client/operations";
import { Alert, AlertDescription } from "../client/components/ui/alert";
import { Button } from "../client/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "../client/components/ui/card";
import { Badge } from "../client/components/ui/badge";
import { cn } from "../client/utils";
import {
  PaymentPlanId,
  paymentPlans,
  prettyPaymentPlanName,
  SubscriptionStatus,
  getSubscriptionPaymentPlanIds,
  getTopUpPaymentPlanIds,
} from "./plans";

const bestDealPaymentPlanId: PaymentPlanId = PaymentPlanId.Pro;

interface PlanCard {
  name: string;
  price: string;
  monthlyCredits: string;
  description: string;
  features: string[];
}

const subscriptionCards: Record<string, PlanCard> = {
  [PaymentPlanId.Starter]: {
    name: "Starter",
    price: "$39",
    monthlyCredits: "3,000",
    description: "Perfect for solo marketers",
    features: [
      "3,000 credits/month",
      "Social media agent",
      "SEO agent",
      "All AI features",
      "Email support",
    ],
  },
  [PaymentPlanId.Growth]: {
    name: "Growth",
    price: "$79",
    monthlyCredits: "8,000",
    description: "For growing teams",
    features: [
      "8,000 credits/month",
      "Everything in Starter",
      "Batch generation",
      "Content calendar",
      "Priority support",
    ],
  },
  [PaymentPlanId.Pro]: {
    name: "Pro",
    price: "$149",
    monthlyCredits: "20,000",
    description: "Our most popular plan",
    features: [
      "20,000 credits/month",
      "Everything in Growth",
      "Advanced SEO scoring",
      "WordPress publishing",
      "Dedicated support",
    ],
  },
  [PaymentPlanId.Agency]: {
    name: "Agency",
    price: "$299",
    monthlyCredits: "50,000",
    description: "For agencies and enterprises",
    features: [
      "50,000 credits/month",
      "Everything in Pro",
      "Unlimited agents",
      "White-label options",
      "Account manager",
    ],
  },
};

interface TopUpCard {
  credits: string;
  price: string;
}

const topUpCards: Record<string, TopUpCard> = {
  [PaymentPlanId.TopUp500]: { credits: "500", price: "$9" },
  [PaymentPlanId.TopUp2000]: { credits: "2,000", price: "$29" },
  [PaymentPlanId.TopUp5000]: { credits: "5,000", price: "$59" },
};

const PricingPage = () => {
  const [isPaymentLoading, setIsPaymentLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: user } = useAuth();
  const isUserSubscribed =
    !!user &&
    !!user.subscriptionStatus &&
    user.subscriptionStatus !== SubscriptionStatus.Deleted;

  const {
    data: customerPortalUrl,
    isLoading: isCustomerPortalUrlLoading,
    error: customerPortalUrlError,
  } = useQuery(getCustomerPortalUrl, { enabled: isUserSubscribed });

  const navigate = useNavigate();

  async function handleBuyNowClick(paymentPlanId: PaymentPlanId) {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      setIsPaymentLoading(true);
      setErrorMessage(null);

      const checkoutResults = await generateCheckoutSession(paymentPlanId);

      if (checkoutResults?.sessionUrl) {
        window.open(checkoutResults.sessionUrl, "_self");
      } else {
        throw new Error("Error generating checkout session URL");
      }
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Error processing payment. Please try again later.");
      }
      setIsPaymentLoading(false);
    }
  }

  const handleCustomerPortalClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (customerPortalUrlError) {
      setErrorMessage("Error fetching Customer Portal URL");
      return;
    }

    if (!customerPortalUrl) {
      setErrorMessage(`Customer Portal does not exist for user ${user.id}`);
      return;
    }

    window.open(customerPortalUrl, "_blank");
  };

  const subscriptionPlanIds = getSubscriptionPaymentPlanIds();
  const topUpPlanIds = getTopUpPaymentPlanIds();

  return (
    <div className="py-10 lg:mt-10">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-foreground mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent <span className="text-primary">pricing</span>
          </h2>
        </div>
        <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-lg leading-8">
          Every AI action uses unified credits. Pick a plan that fits your usage,
          and top up anytime you need more.
        </p>

        {/* Free tier banner */}
        {!isUserSubscribed && (
          <div className="mx-auto mt-8 max-w-xl rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">
                Start with 100 free credits — no card required
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="mt-8">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Subscription plans */}
        <div className="isolate mx-auto mt-12 grid max-w-md grid-cols-1 gap-y-8 sm:mt-16 lg:mx-0 lg:max-w-none lg:grid-cols-4 lg:gap-x-6">
          {subscriptionPlanIds.map((planId) => {
            const card = subscriptionCards[planId];
            if (!card) return null;
            const isBestDeal = planId === bestDealPaymentPlanId;

            return (
              <Card
                key={planId}
                className={cn(
                  "relative flex grow flex-col justify-between overflow-hidden transition-all duration-300 hover:shadow-lg",
                  isBestDeal
                    ? "ring-primary bg-transparent! ring-2"
                    : "ring-border ring-1",
                )}
              >
                {isBestDeal && (
                  <>
                    <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                      <Star className="mr-1 h-3 w-3" />
                      Popular
                    </Badge>
                    <div
                      className="absolute top-0 right-0 -z-10 h-full w-full transform-gpu blur-3xl"
                      aria-hidden="true"
                    >
                      <div
                        className="from-primary/40 via-primary/20 to-primary/10 absolute h-full w-full bg-linear-to-br opacity-30"
                        style={{ clipPath: "circle(670% at 50% 50%)" }}
                      />
                    </div>
                  </>
                )}
                <CardContent className="h-full justify-between p-6 xl:p-8">
                  <div>
                    <CardTitle className="text-foreground text-lg leading-8 font-semibold">
                      {card.name}
                    </CardTitle>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {card.description}
                    </p>
                    <p className="mt-4 flex items-baseline gap-x-1">
                      <span className="text-foreground text-4xl font-bold tracking-tight">
                        {card.price}
                      </span>
                      <span className="text-muted-foreground text-sm leading-6 font-semibold">
                        /month
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-primary font-medium">
                      {card.monthlyCredits} credits/month
                    </p>
                  </div>
                  <ul
                    role="list"
                    className="text-muted-foreground mt-6 space-y-3 text-sm leading-6"
                  >
                    {card.features.map((feature) => (
                      <li key={feature} className="flex gap-x-3">
                        <CheckCircle
                          className="text-primary h-5 w-5 flex-none"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="p-6 pt-0">
                  {isUserSubscribed ? (
                    <Button
                      onClick={handleCustomerPortalClick}
                      disabled={isCustomerPortalUrlLoading}
                      variant={isBestDeal ? "default" : "outline"}
                      className="w-full"
                    >
                      Manage Subscription
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleBuyNowClick(planId)}
                      variant={isBestDeal ? "default" : "outline"}
                      className="w-full"
                      disabled={isPaymentLoading}
                    >
                      {!!user ? "Get Started" : "Log in to subscribe"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Top-up section */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="text-center">
            <h3 className="text-foreground text-2xl font-bold">
              Need more credits?
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              Active subscribers can purchase top-up packs. Credits never expire.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {topUpPlanIds.map((planId) => {
              const card = topUpCards[planId];
              if (!card) return null;

              return (
                <Card
                  key={planId}
                  className="flex flex-col items-center p-6 text-center transition-all hover:shadow-md"
                >
                  <Coins className="mb-3 h-8 w-8 text-primary" />
                  <p className="text-2xl font-bold">{card.credits}</p>
                  <p className="text-muted-foreground text-sm">credits</p>
                  <p className="mt-2 text-xl font-semibold">{card.price}</p>
                  <Button
                    onClick={() => handleBuyNowClick(planId)}
                    variant="outline"
                    className="mt-4 w-full"
                    disabled={isPaymentLoading || !isUserSubscribed}
                  >
                    {isUserSubscribed ? "Buy Credits" : "Subscribe first"}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
