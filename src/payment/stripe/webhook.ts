import { type PrismaClient } from "@prisma/client";
import express from "express";
import type { Stripe } from "stripe";
import { type MiddlewareConfigFn } from "wasp/server";
import { type PaymentsWebhook } from "wasp/server/api";
import { emailSender } from "wasp/server/email";
import { requireNodeEnvVar } from "../../server/utils";
import { assertUnreachable } from "../../shared/utils";
import { UnhandledWebhookEventError } from "../errors";
import {
  getPaymentPlanIdByPaymentProcessorPlanId,
  PaymentPlanId,
  paymentPlans,
  SubscriptionStatus,
} from "../plans";
import {
  updateUserSubscription,
  refreshPlanCredits,
  addTopUpCredits,
} from "../user";
import { stripeClient } from "./stripeClient";
import { processAffiliateCommission } from "../../affiliate/affiliateService";

/**
 * Stripe requires a raw request to construct events successfully.
 */
export const stripeMiddlewareConfigFn: MiddlewareConfigFn = (
  middlewareConfig,
) => {
  middlewareConfig.delete("express.json");
  middlewareConfig.set(
    "express.raw",
    express.raw({ type: "application/json" }),
  );
  return middlewareConfig;
};

export const stripeWebhook: PaymentsWebhook = async (
  request,
  response,
  context,
) => {
  const prismaUserDelegate = context.entities.User;
  try {
    const event = constructStripeEvent(request);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event, context);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event, prismaUserDelegate);
        break;
      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(event, prismaUserDelegate);
        break;
      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(event, prismaUserDelegate);
        break;
      default:
        throw new UnhandledWebhookEventError(event.type);
    }
    return response.status(204).send();
  } catch (error) {
    if (error instanceof UnhandledWebhookEventError) {
      if (process.env.NODE_ENV === "development") {
        console.info("Unhandled Stripe webhook event in development: ", error);
      } else if (process.env.NODE_ENV === "production") {
        console.error("Unhandled Stripe webhook event in production: ", error);
      }
      return response.status(204).send();
    }

    console.error("Stripe webhook error:", error);
    if (error instanceof Error) {
      return response.status(400).json({ error: error.message });
    } else {
      return response
        .status(500)
        .json({ error: "Error processing Stripe webhook event" });
    }
  }
};

function constructStripeEvent(request: express.Request): Stripe.Event {
  const stripeWebhookSecret = requireNodeEnvVar("STRIPE_WEBHOOK_SECRET");
  const stripeSignature = request.headers["stripe-signature"];
  if (!stripeSignature) {
    throw new Error("Stripe webhook signature not provided");
  }

  return stripeClient.webhooks.constructEvent(
    request.body,
    stripeSignature,
    stripeWebhookSecret,
  );
}

// ---------------------------------------------------------------------------
// checkout.session.completed — handles extension purchases + top-ups
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(
  event: Stripe.CheckoutSessionCompletedEvent,
  context: Parameters<PaymentsWebhook>[2],
): Promise<void> {
  const session = event.data.object;

  // Extension purchase
  const extensionId = session.metadata?.extensionId;
  const userId = session.metadata?.userId;

  if (extensionId && userId) {
    await context.entities.UserExtension.upsert({
      where: {
        userId_extensionId: { userId, extensionId },
      },
      create: {
        userId,
        extensionId,
        isActive: true,
        purchasedAt: new Date(),
      },
      update: {
        isActive: true,
        purchasedAt: new Date(),
      },
    });

    // Affiliate commission for extension purchase
    const amountPaid = (session.amount_total ?? 0) / 100;
    if (amountPaid > 0) {
      await processAffiliateCommission(userId, "extension", amountPaid);
    }
    return;
  }

  // Top-up purchase
  const topUpPlanId = session.metadata?.topUpPlanId;
  const customerId = getCustomerId(session.customer);

  if (topUpPlanId && customerId) {
    try {
      const paymentPlanId = topUpPlanId as PaymentPlanId;
      await addTopUpCredits(customerId, paymentPlanId);
    } catch (err) {
      console.error("[Webhook] Failed to add top-up credits:", err);
    }

    // Affiliate commission for top-up
    const topUpAmount = (session.amount_total ?? 0) / 100;
    if (topUpAmount > 0) {
      const topUpUser = await context.entities.User.findUnique({ where: { paymentProcessorUserId: customerId } });
      if (topUpUser) {
        await processAffiliateCommission(topUpUser.id, "topup", topUpAmount);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// invoice.paid — subscription refresh + credit allotment
// ---------------------------------------------------------------------------

async function handleInvoicePaid(
  event: Stripe.InvoicePaidEvent,
  prismaUserDelegate: PrismaClient["user"],
): Promise<void> {
  const invoice = event.data.object;
  const customerId = getCustomerId(invoice.customer);
  const invoicePaidAtDate = getInvoicePaidAtDate(invoice);
  const paymentPlanId = getPaymentPlanIdByPaymentProcessorPlanId(
    getInvoicePriceId(invoice),
  );

  const plan = paymentPlans[paymentPlanId];

  if (plan.effect.kind === "subscription") {
    // Update subscription status
    await updateUserSubscription(
      {
        paymentProcessorUserId: customerId,
        datePaid: invoicePaidAtDate,
        paymentPlanId,
        subscriptionStatus: SubscriptionStatus.Active,
      },
      prismaUserDelegate,
    );

    // Refresh plan credits
    await refreshPlanCredits(customerId, paymentPlanId);

    // Affiliate commission for subscription payment
    const subAmount = (invoice.amount_paid ?? 0) / 100;
    if (subAmount > 0) {
      const subUser = await prismaUserDelegate.findUnique({ where: { paymentProcessorUserId: customerId } });
      if (subUser) {
        await processAffiliateCommission(subUser.id, "subscription", subAmount);
      }
    }
  } else if (plan.effect.kind === "topup") {
    // Top-up via invoice (one-time product)
    await addTopUpCredits(customerId, paymentPlanId);
  }
}

function getInvoicePriceId(invoice: Stripe.Invoice): Stripe.Price["id"] {
  const invoiceLineItems = invoice.lines.data;
  if (invoiceLineItems.length !== 1) {
    throw new Error("There should be exactly one line item in Stripe invoice");
  }

  const priceId = invoiceLineItems[0].pricing?.price_details?.price;
  if (!priceId) {
    throw new Error("Unable to extract price id from items");
  }

  return priceId;
}

async function handleCustomerSubscriptionUpdated(
  event: Stripe.CustomerSubscriptionUpdatedEvent,
  prismaUserDelegate: PrismaClient["user"],
): Promise<void> {
  const subscription = event.data.object;

  const subscriptionStatus = getOpenSaasSubscriptionStatus(subscription);
  if (!subscriptionStatus) {
    return;
  }

  const customerId = getCustomerId(subscription.customer);
  const paymentPlanId = getPaymentPlanIdByPaymentProcessorPlanId(
    getSubscriptionPriceId(subscription),
  );

  const user = await updateUserSubscription(
    { paymentProcessorUserId: customerId, paymentPlanId, subscriptionStatus },
    prismaUserDelegate,
  );

  if (subscription.cancel_at_period_end && user.email) {
    await emailSender.send({
      to: user.email,
      subject: "We hate to see you go :(",
      text: "We hate to see you go. Here is a sweet offer...",
      html: "We hate to see you go. Here is a sweet offer...",
    });
  }
}

function getOpenSaasSubscriptionStatus(
  subscription: Stripe.Subscription,
): SubscriptionStatus | undefined {
  const stripeToOpenSaasSubscriptionStatus: Record<
    Stripe.Subscription.Status,
    SubscriptionStatus | undefined
  > = {
    trialing: SubscriptionStatus.Active,
    active: SubscriptionStatus.Active,
    past_due: SubscriptionStatus.PastDue,
    canceled: SubscriptionStatus.Deleted,
    unpaid: SubscriptionStatus.Deleted,
    incomplete_expired: SubscriptionStatus.Deleted,
    paused: undefined,
    incomplete: undefined,
  };

  const subscriptionStatus =
    stripeToOpenSaasSubscriptionStatus[subscription.status];

  if (
    subscriptionStatus === SubscriptionStatus.Active &&
    subscription.cancel_at_period_end
  ) {
    return SubscriptionStatus.CancelAtPeriodEnd;
  }

  return subscriptionStatus;
}

function getSubscriptionPriceId(
  subscription: Stripe.Subscription,
): Stripe.Price["id"] {
  const subscriptionItems = subscription.items.data;
  if (subscriptionItems.length !== 1) {
    throw new Error(
      "There should be exactly one subscription item in Stripe subscription",
    );
  }

  return subscriptionItems[0].price.id;
}

async function handleCustomerSubscriptionDeleted(
  event: Stripe.CustomerSubscriptionDeletedEvent,
  prismaUserDelegate: PrismaClient["user"],
): Promise<void> {
  const subscription = event.data.object;
  const customerId = getCustomerId(subscription.customer);

  await updateUserSubscription(
    {
      paymentProcessorUserId: customerId,
      subscriptionStatus: SubscriptionStatus.Deleted,
    },
    prismaUserDelegate,
  );
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Stripe.Customer["id"] {
  if (!customer) {
    throw new Error("Customer is missing");
  } else if (typeof customer === "string") {
    return customer;
  } else {
    return customer.id;
  }
}

function getInvoicePaidAtDate(invoice: Stripe.Invoice): Date {
  if (!invoice.status_transitions.paid_at) {
    throw new Error("Invoice has not been paid yet");
  }

  return new Date(invoice.status_transitions.paid_at * 1000);
}
