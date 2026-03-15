import { HttpError } from "wasp/server";
import { config } from "wasp/server";
import type {
  GetAdminSettings,
  UpsertSetting,
  GetUserExtensions,
  ToggleExtension,
  GetExtensionPrices,
  PurchaseExtension,
} from "wasp/server/operations";
import type { Setting, UserExtension } from "wasp/entities";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { getExtensionById, getEnabledExtensions, EXTENSION_REGISTRY } from "./registry";
import { ensureStripeCustomer, createStripeCheckoutSession } from "../payment/stripe/checkoutUtils";
import { updateUserPaymentProcessorUserId } from "../payment/user";
import { isSensitiveKey, setSecureSetting } from "../server/settingEncryption";
import { logAudit } from "../server/auditLog";

//#region Admin Operations

const getAdminSettingsInputSchema = z
  .object({
    prefix: z.string().optional(),
  })
  .optional();

type GetAdminSettingsInput = z.infer<typeof getAdminSettingsInputSchema>;

export const getAdminSettings: GetAdminSettings<
  GetAdminSettingsInput,
  Setting[]
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  if (!context.user.isAdmin) {
    throw new HttpError(403, "Admin access required");
  }

  const args = ensureArgsSchemaOrThrowHttpError(
    getAdminSettingsInputSchema,
    rawArgs
  );

  const where = args?.prefix ? { key: { startsWith: args.prefix } } : {};

  return context.entities.Setting.findMany({ where });
};

const upsertSettingInputSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

type UpsertSettingInput = z.infer<typeof upsertSettingInputSchema>;

export const upsertSetting: UpsertSetting<UpsertSettingInput, Setting> = async (
  rawArgs,
  context
) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  if (!context.user.isAdmin) {
    throw new HttpError(403, "Admin access required");
  }

  const { key, value } = ensureArgsSchemaOrThrowHttpError(
    upsertSettingInputSchema,
    rawArgs
  );

  // Encrypt sensitive API keys before storing
  if (isSensitiveKey(key)) {
    await setSecureSetting(context.entities.Setting, key, value);
    logAudit({ userId: context.user.id, action: "setting.update", resource: `setting:${key}` });
    const result = await context.entities.Setting.findUnique({ where: { key } });
    return result!;
  }

  const result = await context.entities.Setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });

  logAudit({ userId: context.user.id, action: "setting.update", resource: `setting:${key}` });
  return result;
};

//#endregion

//#region User Operations

type UserExtensionResult = { extensionId: string; isActive: boolean; purchasedAt: Date | null };

export const getUserExtensions: GetUserExtensions<
  void,
  UserExtensionResult[]
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const records = await context.entities.UserExtension.findMany({
    where: { userId: context.user.id },
    select: { extensionId: true, isActive: true, purchasedAt: true },
  });

  return records;
};

const toggleExtensionInputSchema = z.object({
  extensionId: z.string().min(1),
  isActive: z.boolean(),
});

type ToggleExtensionInput = z.infer<typeof toggleExtensionInputSchema>;

export const toggleExtension: ToggleExtension<
  ToggleExtensionInput,
  UserExtension
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { extensionId, isActive } = ensureArgsSchemaOrThrowHttpError(
    toggleExtensionInputSchema,
    rawArgs
  );

  const ext = getExtensionById(extensionId);
  if (!ext || !ext.isEnabled) {
    throw new HttpError(404, "Extension not found or not available");
  }

  // For paid extensions, require purchase before toggling
  if (!ext.isFree) {
    const price = await getExtensionPrice(context.entities.Setting, extensionId, ext.defaultPrice);
    if (price > 0) {
      const existing = await context.entities.UserExtension.findUnique({
        where: {
          userId_extensionId: {
            userId: context.user.id,
            extensionId,
          },
        },
      });
      if (!existing?.purchasedAt) {
        throw new HttpError(403, "You must purchase this extension before activating it");
      }
    }
  }

  const result = await context.entities.UserExtension.upsert({
    where: {
      userId_extensionId: {
        userId: context.user.id,
        extensionId,
      },
    },
    create: {
      userId: context.user.id,
      extensionId,
      isActive,
    },
    update: { isActive },
  });

  logAudit({
    userId: context.user.id,
    action: isActive ? "extension.activate" : "extension.deactivate",
    resource: `extension:${extensionId}`,
  });

  return result;
};

//#endregion

//#region Extension Prices & Purchase

async function getExtensionPrice(
  settingEntity: any,
  extensionId: string,
  defaultPrice: number
): Promise<number> {
  const setting = await settingEntity.findUnique({
    where: { key: `ext.${extensionId}.price` },
  });
  if (setting) {
    const parsed = parseFloat(setting.value);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultPrice;
}

type ExtensionPricesResult = Record<string, number>;

export const getExtensionPrices: GetExtensionPrices<
  void,
  ExtensionPricesResult
> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const priceSettings = await context.entities.Setting.findMany({
    where: {
      key: { startsWith: "ext.", endsWith: ".price" },
    },
  });

  const settingsMap: Record<string, string> = {};
  for (const s of priceSettings) {
    settingsMap[s.key] = s.value;
  }

  const prices: ExtensionPricesResult = {};
  for (const ext of EXTENSION_REGISTRY) {
    const settingKey = `ext.${ext.id}.price`;
    const settingValue = settingsMap[settingKey];
    if (settingValue !== undefined) {
      const parsed = parseFloat(settingValue);
      prices[ext.id] = isNaN(parsed) ? ext.defaultPrice : parsed;
    } else {
      prices[ext.id] = ext.defaultPrice;
    }
  }

  return prices;
};

const purchaseExtensionInputSchema = z.object({
  extensionId: z.string().min(1),
});

type PurchaseExtensionInput = z.infer<typeof purchaseExtensionInputSchema>;

type PurchaseExtensionResult = {
  sessionUrl: string | null;
  sessionId: string;
};

export const purchaseExtension: PurchaseExtension<
  PurchaseExtensionInput,
  PurchaseExtensionResult
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { extensionId } = ensureArgsSchemaOrThrowHttpError(
    purchaseExtensionInputSchema,
    rawArgs
  );

  const ext = getExtensionById(extensionId);
  if (!ext || !ext.isEnabled) {
    throw new HttpError(404, "Extension not found or not available");
  }

  const price = await getExtensionPrice(context.entities.Setting, extensionId, ext.defaultPrice);
  if (price <= 0) {
    throw new HttpError(400, "This extension is free and does not require purchase");
  }

  // Check if already purchased
  const existing = await context.entities.UserExtension.findUnique({
    where: {
      userId_extensionId: {
        userId: context.user.id,
        extensionId,
      },
    },
  });

  if (existing?.purchasedAt) {
    throw new HttpError(400, "You have already purchased this extension");
  }

  // Require email for Stripe checkout
  const userEmail = context.user.email;
  if (!userEmail) {
    throw new HttpError(403, "User needs an email to make a payment.");
  }

  // Look up Stripe Price ID from settings
  const stripePriceIdSetting = await context.entities.Setting.findUnique({
    where: { key: `ext.${extensionId}.stripe_price_id` },
  });

  // If Stripe isn't configured, activate the extension directly (dev/free mode)
  if (!stripePriceIdSetting?.value) {
    await context.entities.UserExtension.upsert({
      where: {
        userId_extensionId: {
          userId: context.user.id,
          extensionId,
        },
      },
      create: {
        userId: context.user.id,
        extensionId,
        isActive: true,
        purchasedAt: new Date(),
      },
      update: {
        isActive: true,
        purchasedAt: new Date(),
      },
    });

    return {
      sessionUrl: null,
      sessionId: "direct-activation",
    };
  }

  // Ensure Stripe customer exists and save to user
  const customer = await ensureStripeCustomer(userEmail);
  await updateUserPaymentProcessorUserId(
    { userId: context.user.id, paymentProcessorUserId: customer.id },
    context.entities.User,
  );

  // Create Stripe Checkout Session
  const checkoutSession = await createStripeCheckoutSession({
    priceId: stripePriceIdSetting.value,
    customerId: customer.id,
    mode: "payment",
    metadata: {
      extensionId,
      userId: String(context.user.id),
    },
    successUrl: `${config.frontendUrl}/checkout?status=success&ext=${extensionId}`,
    cancelUrl: `${config.frontendUrl}/checkout?status=canceled`,
  });

  return {
    sessionUrl: checkoutSession.url,
    sessionId: checkoutSession.id,
  };
};

//#endregion
