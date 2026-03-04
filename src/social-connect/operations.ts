import { HttpError } from "wasp/server";
import type {
  SaveSystemSocialApp,
  GetSystemSocialApps,
  SaveSocialAppCredential,
  DeleteSocialAppCredential,
  GetSocialAppCredentials,
  GetSocialAccounts,
  GetSocialAccountsByPlatform,
  DisconnectSocialAccount,
  InitiateSocialOAuth,
} from "wasp/server/operations";
import type {
  Setting,
  SocialAppCredential,
  SocialAccount,
  OAuthState,
} from "wasp/entities";
import * as z from "zod";
import crypto from "crypto";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { encrypt, decrypt } from "./encryption";
import { PLATFORMS, isPlatformKey, type PlatformKey } from "./platforms";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const platformSchema = z.string().refine(isPlatformKey, {
  message: "Invalid platform. Must be one of: facebook, instagram, linkedin, x, tiktok, youtube",
});

const saveSystemSocialAppSchema = z.object({
  platform: platformSchema,
  clientId: z.string().min(1, "clientId is required"),
  clientSecret: z.string().optional(),
  redirectUri: z.string().min(1, "redirectUri is required"),
  enabled: z.boolean(),
});

type SaveSystemSocialAppInput = z.infer<typeof saveSystemSocialAppSchema>;

const saveSocialAppCredentialSchema = z.object({
  platform: platformSchema,
  clientId: z.string().min(1, "clientId is required"),
  clientSecret: z.string().optional(),
  redirectUri: z.string().min(1, "redirectUri is required"),
});

type SaveSocialAppCredentialInput = z.infer<typeof saveSocialAppCredentialSchema>;

const deleteSocialAppCredentialSchema = z.object({
  platform: platformSchema,
});

type DeleteSocialAppCredentialInput = z.infer<typeof deleteSocialAppCredentialSchema>;

const disconnectSocialAccountSchema = z.object({
  id: z.string().min(1, "id is required"),
});

type DisconnectSocialAccountInput = z.infer<typeof disconnectSocialAccountSchema>;

const initiateSocialOAuthSchema = z.object({
  platform: platformSchema,
  useSystemApp: z.boolean(),
});

type InitiateSocialOAuthInput = z.infer<typeof initiateSocialOAuthSchema>;

// ---------------------------------------------------------------------------
// Helper: ensure the user is authenticated
// ---------------------------------------------------------------------------

function ensureAuthenticated(context: { user?: { id: string } | null }): asserts context is {
  user: { id: string; isAdmin: boolean; email: string | null };
} {
  if (!context.user) {
    throw new HttpError(401, "Only authenticated users are allowed to perform this operation");
  }
}

// ---------------------------------------------------------------------------
// Helper: ensure the user is an admin
// ---------------------------------------------------------------------------

function ensureAdmin(context: { user?: { id: string; isAdmin: boolean } | null }): void {
  ensureAuthenticated(context);
  if (!context.user.isAdmin) {
    throw new HttpError(403, "Only admins are allowed to perform this operation");
  }
}

// ---------------------------------------------------------------------------
// Setting key helpers
// ---------------------------------------------------------------------------

const SETTING_PREFIX = "social_connect_";

function settingKey(platform: string, suffix: string): string {
  return `${SETTING_PREFIX}${platform}_${suffix}`;
}

function parsePlatformFromKey(key: string): string | null {
  if (!key.startsWith(SETTING_PREFIX)) return null;
  const rest = key.slice(SETTING_PREFIX.length);
  // The remainder is "{platform}_{suffix}". The suffix is the last part after
  // the last underscore that matches one of the known suffixes.
  const knownSuffixes = ["client_id", "client_secret", "redirect_uri", "enabled"];
  for (const suffix of knownSuffixes) {
    if (rest.endsWith(`_${suffix}`)) {
      return rest.slice(0, rest.length - suffix.length - 1);
    }
  }
  return null;
}

function fieldFromKey(key: string): string | null {
  const knownSuffixes = ["client_id", "client_secret", "redirect_uri", "enabled"];
  for (const suffix of knownSuffixes) {
    if (key.endsWith(`_${suffix}`)) {
      return suffix;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 1. saveSystemSocialApp (admin action)
// ---------------------------------------------------------------------------

export const saveSystemSocialApp: SaveSystemSocialApp<
  SaveSystemSocialAppInput,
  void
> = async (rawArgs, context) => {
  ensureAdmin(context);

  const { platform, clientId, clientSecret, redirectUri, enabled } =
    ensureArgsSchemaOrThrowHttpError(saveSystemSocialAppSchema, rawArgs);

  const entries: { key: string; value: string }[] = [
    { key: settingKey(platform, "client_id"), value: clientId },
    { key: settingKey(platform, "redirect_uri"), value: redirectUri },
    { key: settingKey(platform, "enabled"), value: String(enabled) },
  ];

  // Only update the secret if a new one was provided
  if (clientSecret) {
    entries.push({
      key: settingKey(platform, "client_secret"),
      value: encrypt(clientSecret),
    });
  }

  for (const entry of entries) {
    await context.entities.Setting.upsert({
      where: { key: entry.key },
      update: { value: entry.value },
      create: { key: entry.key, value: entry.value },
    });
  }
};

// ---------------------------------------------------------------------------
// 2. getSystemSocialApps (admin query)
// ---------------------------------------------------------------------------

type SystemSocialAppInfo = {
  clientId: string;
  redirectUri: string;
  enabled: boolean;
};

type GetSystemSocialAppsOutput = Record<string, SystemSocialAppInfo>;

export const getSystemSocialApps: GetSystemSocialApps<
  void,
  GetSystemSocialAppsOutput
> = async (_args, context) => {
  ensureAuthenticated(context);

  const settings = await context.entities.Setting.findMany({
    where: {
      key: {
        startsWith: SETTING_PREFIX,
      },
    },
  });

  const isAdmin = context.user.isAdmin;
  const result: GetSystemSocialAppsOutput = {};

  for (const setting of settings) {
    const platform = parsePlatformFromKey(setting.key);
    const field = fieldFromKey(setting.key);

    if (!platform || !field) continue;

    // Never return clientSecret to anyone
    if (field === "client_secret") continue;

    if (!result[platform]) {
      result[platform] = { clientId: "", redirectUri: "", enabled: false };
    }

    if (field === "client_id") {
      // Only admins see the actual clientId
      result[platform].clientId = isAdmin ? setting.value : "configured";
    } else if (field === "redirect_uri") {
      result[platform].redirectUri = isAdmin ? setting.value : "";
    } else if (field === "enabled") {
      result[platform].enabled = setting.value === "true";
    }
  }

  return result;
};

// ---------------------------------------------------------------------------
// 3. saveSocialAppCredential (user action)
// ---------------------------------------------------------------------------

export const saveSocialAppCredential: SaveSocialAppCredential<
  SaveSocialAppCredentialInput,
  SocialAppCredential
> = async (rawArgs, context) => {
  ensureAuthenticated(context);

  const { platform, clientId, clientSecret, redirectUri } =
    ensureArgsSchemaOrThrowHttpError(saveSocialAppCredentialSchema, rawArgs);

  const updateData: Record<string, string> = { clientId, redirectUri };
  if (clientSecret) {
    updateData.clientSecret = encrypt(clientSecret);
  }

  // For create, clientSecret is required
  if (!clientSecret) {
    // Check if credential already exists (update case)
    const existing = await context.entities.SocialAppCredential.findUnique({
      where: { userId_platform: { userId: context.user.id, platform } },
    });
    if (!existing) {
      throw new HttpError(400, "Client Secret is required when creating a new credential");
    }
  }

  const createSecret = clientSecret ? encrypt(clientSecret) : "placeholder";

  return context.entities.SocialAppCredential.upsert({
    where: {
      userId_platform: {
        userId: context.user.id,
        platform,
      },
    },
    update: updateData,
    create: {
      userId: context.user.id,
      platform,
      clientId,
      clientSecret: createSecret,
      redirectUri,
    },
  });
};

// ---------------------------------------------------------------------------
// 4. deleteSocialAppCredential (user action)
// ---------------------------------------------------------------------------

export const deleteSocialAppCredential: DeleteSocialAppCredential<
  DeleteSocialAppCredentialInput,
  void
> = async (rawArgs, context) => {
  ensureAuthenticated(context);

  const { platform } = ensureArgsSchemaOrThrowHttpError(
    deleteSocialAppCredentialSchema,
    rawArgs,
  );

  // Associated SocialAccounts cascade-delete via Prisma schema
  await context.entities.SocialAppCredential.delete({
    where: {
      userId_platform: {
        userId: context.user.id,
        platform,
      },
    },
  });
};

// ---------------------------------------------------------------------------
// 5. getSocialAppCredentials (user query)
// ---------------------------------------------------------------------------

type SafeSocialAppCredential = {
  id: string;
  platform: string;
  clientId: string;
  redirectUri: string;
  createdAt: Date;
  updatedAt: Date;
};

export const getSocialAppCredentials: GetSocialAppCredentials<
  void,
  SafeSocialAppCredential[]
> = async (_args, context) => {
  ensureAuthenticated(context);

  const credentials = await context.entities.SocialAppCredential.findMany({
    where: { userId: context.user.id },
    select: {
      id: true,
      platform: true,
      clientId: true,
      redirectUri: true,
      createdAt: true,
      updatedAt: true,
      // NEVER return clientSecret
    },
  });

  return credentials;
};

// ---------------------------------------------------------------------------
// 6. getSocialAccounts (user query)
// ---------------------------------------------------------------------------

type SafeSocialAccount = Omit<SocialAccount, "accessToken" | "refreshToken">;

export const getSocialAccounts: GetSocialAccounts<
  void,
  SafeSocialAccount[]
> = async (_args, context) => {
  ensureAuthenticated(context);

  const accounts = await context.entities.SocialAccount.findMany({
    where: { userId: context.user.id },
    select: {
      id: true,
      platform: true,
      platformUserId: true,
      platformUsername: true,
      displayName: true,
      profileImageUrl: true,
      tokenExpiresAt: true,
      scopes: true,
      isActive: true,
      useSystemApp: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      credentialId: true,
      // NEVER return accessToken or refreshToken
    },
  });

  return accounts as SafeSocialAccount[];
};

// ---------------------------------------------------------------------------
// 7. disconnectSocialAccount (user action)
// ---------------------------------------------------------------------------

export const disconnectSocialAccount: DisconnectSocialAccount<
  DisconnectSocialAccountInput,
  void
> = async (rawArgs, context) => {
  ensureAuthenticated(context);

  const { id } = ensureArgsSchemaOrThrowHttpError(
    disconnectSocialAccountSchema,
    rawArgs,
  );

  // Ensure the account belongs to the current user before deleting
  const account = await context.entities.SocialAccount.findUnique({
    where: { id },
  });

  if (!account) {
    throw new HttpError(404, "Social account not found");
  }

  if (account.userId !== context.user.id) {
    throw new HttpError(403, "You do not have permission to disconnect this account");
  }

  await context.entities.SocialAccount.delete({
    where: { id },
  });
};

// ---------------------------------------------------------------------------
// 8. initiateSocialOAuth (user action)
// ---------------------------------------------------------------------------

type InitiateSocialOAuthOutput = {
  authUrl: string;
};

/**
 * Base64url-encode a buffer (RFC 7636).
 */
function base64url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export const initiateSocialOAuth: InitiateSocialOAuth<
  InitiateSocialOAuthInput,
  InitiateSocialOAuthOutput
> = async (rawArgs, context) => {
  ensureAuthenticated(context);

  const { platform, useSystemApp } = ensureArgsSchemaOrThrowHttpError(
    initiateSocialOAuthSchema,
    rawArgs,
  );

  const platformKey = platform as PlatformKey;
  const platformConfig = PLATFORMS[platformKey];

  // -----------------------------------------------------------------------
  // Resolve credentials (system app or user's custom app)
  // -----------------------------------------------------------------------
  let clientId: string;
  let redirectUri: string;

  if (useSystemApp) {
    // Read from the Setting table (admin-configured system app)
    const clientIdSetting = await context.entities.Setting.findUnique({
      where: { key: settingKey(platform, "client_id") },
    });
    const clientSecretSetting = await context.entities.Setting.findUnique({
      where: { key: settingKey(platform, "client_secret") },
    });
    const redirectUriSetting = await context.entities.Setting.findUnique({
      where: { key: settingKey(platform, "redirect_uri") },
    });
    const enabledSetting = await context.entities.Setting.findUnique({
      where: { key: settingKey(platform, "enabled") },
    });

    if (!clientIdSetting || !clientSecretSetting || !redirectUriSetting) {
      throw new HttpError(
        400,
        `System app for ${platformConfig.name} is not configured. Please ask an administrator to set it up.`,
      );
    }

    if (!enabledSetting || enabledSetting.value !== "true") {
      throw new HttpError(
        400,
        `System app for ${platformConfig.name} is currently disabled.`,
      );
    }

    clientId = clientIdSetting.value;
    redirectUri = redirectUriSetting.value;

    // Decrypt to verify the secret is valid (we don't send it to the client)
    decrypt(clientSecretSetting.value);
  } else {
    // Read from the user's SocialAppCredential
    const credential = await context.entities.SocialAppCredential.findUnique({
      where: {
        userId_platform: {
          userId: context.user.id,
          platform,
        },
      },
    });

    if (!credential) {
      throw new HttpError(
        400,
        `You have not configured a custom app for ${platformConfig.name}. Please add your credentials first.`,
      );
    }

    clientId = credential.clientId;
    redirectUri = credential.redirectUri;

    // Decrypt to verify the secret is valid (we don't send it to the client)
    decrypt(credential.clientSecret);
  }

  // -----------------------------------------------------------------------
  // Generate state and optional PKCE values
  // -----------------------------------------------------------------------
  const state = crypto.randomBytes(32).toString("hex");

  let codeVerifier: string | null = null;
  let codeChallenge: string | null = null;

  if (platformConfig.pkce) {
    codeVerifier = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    codeChallenge = base64url(hash);
  }

  // -----------------------------------------------------------------------
  // Persist OAuthState with 10-minute expiry
  // -----------------------------------------------------------------------
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await context.entities.OAuthState.create({
    data: {
      state,
      platform,
      userId: context.user.id,
      codeVerifier,
      useSystemApp,
      expiresAt,
    },
  });

  // -----------------------------------------------------------------------
  // Build authorization URL
  // -----------------------------------------------------------------------
  const url = new URL(platformConfig.authUrl);

  // TikTok uses `client_key` instead of `client_id`
  if (platformKey === "tiktok") {
    url.searchParams.set("client_key", clientId);
  } else {
    url.searchParams.set("client_id", clientId);
  }

  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", platformConfig.scopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");

  if (platformConfig.pkce && codeChallenge) {
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }

  return { authUrl: url.toString() };
};

// ---------------------------------------------------------------------------
// 9. getSocialAccountsByPlatform (user query)
// ---------------------------------------------------------------------------

const getSocialAccountsByPlatformSchema = z.object({
  platform: z.string().min(1, "platform is required"),
});

type GetSocialAccountsByPlatformInput = z.infer<typeof getSocialAccountsByPlatformSchema>;

type SocialAccountOption = {
  id: string;
  displayName: string | null;
  platformUsername: string | null;
  profileImageUrl: string | null;
  platform: string;
};

export const getSocialAccountsByPlatform: GetSocialAccountsByPlatform<
  GetSocialAccountsByPlatformInput,
  SocialAccountOption[]
> = async (rawArgs, context) => {
  ensureAuthenticated(context);

  const { platform } = ensureArgsSchemaOrThrowHttpError(
    getSocialAccountsByPlatformSchema,
    rawArgs,
  );

  return context.entities.SocialAccount.findMany({
    where: { userId: context.user.id, platform, isActive: true },
    select: {
      id: true,
      displayName: true,
      platformUsername: true,
      profileImageUrl: true,
      platform: true,
    },
    orderBy: { displayName: "asc" },
  });
};
