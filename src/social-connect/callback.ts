import type { SocialOAuthCallback } from "wasp/server/api";
import { config } from "wasp/server";
import { encrypt, decrypt } from './encryption';
import { PLATFORMS, isPlatformKey } from './platforms';
import type { PlatformKey } from './platforms';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REDIRECT_BASE = () => `${config.frontendUrl}/social-connect`;

function redirectWithError(res: Parameters<SocialOAuthCallback>[1], message: string): void {
  res.redirect(`${REDIRECT_BASE()}?error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(res: Parameters<SocialOAuthCallback>[1], platform: string): void {
  res.redirect(`${REDIRECT_BASE()}?success=${encodeURIComponent(platform)}`);
}

// ---------------------------------------------------------------------------
// Retry helper for transient network errors (ETIMEDOUT, ECONNRESET, etc.)
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  delayMs = 1500,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err: any) {
      const isTransient =
        err?.cause?.code === 'ETIMEDOUT' ||
        err?.cause?.code === 'ECONNRESET' ||
        err?.cause?.code === 'ECONNREFUSED' ||
        err?.message?.includes('fetch failed');
      if (!isTransient || attempt === retries) throw err;
      console.warn(`[SocialConnect] Retry ${attempt + 1}/${retries} after ${err?.cause?.code || 'network error'}`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('fetchWithRetry: unreachable');
}

// ---------------------------------------------------------------------------
// Token exchange helpers
// ---------------------------------------------------------------------------

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

interface Credentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * Exchange the authorization code for tokens.
 */
async function exchangeCodeForTokens(
  platform: PlatformKey,
  code: string,
  credentials: Credentials,
  codeVerifier: string | null,
): Promise<TokenResponse> {
  const { tokenUrl } = PLATFORMS[platform];
  const { clientId, clientSecret, redirectUri } = credentials;

  // -- X (Twitter) -----------------------------------------------------------
  if (platform === 'x') {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    });

    const response = await fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`X token exchange failed (${response.status}): ${text}`);
    }

    return (await response.json()) as TokenResponse;
  }

  // -- TikTok ----------------------------------------------------------------
  if (platform === 'tiktok') {
    const payload: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_key: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    };

    const response = await fetchWithRetry(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TikTok token exchange failed (${response.status}): ${text}`);
    }

    return (await response.json()) as TokenResponse;
  }

  // -- Standard (Facebook, Instagram, LinkedIn, YouTube) ----------------------
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetchWithRetry(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${PLATFORMS[platform].name} token exchange failed (${response.status}): ${text}`);
  }

  return (await response.json()) as TokenResponse;
}

// ---------------------------------------------------------------------------
// Profile / account fetching
// ---------------------------------------------------------------------------

interface AccountInfo {
  platformUserId: string;
  platformUsername: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  accessToken: string; // The token to use for this specific account (e.g. page token)
}

/**
 * Facebook: fetch all Pages the user manages, each with its own page access token.
 */
async function fetchFacebookPages(userAccessToken: string): Promise<AccountInfo[]> {
  const url = 'https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture{url}';
  const response = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Facebook pages fetch failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const pages: AccountInfo[] = [];

  for (const page of data.data ?? []) {
    pages.push({
      platformUserId: page.id,
      platformUsername: null,
      displayName: page.name ?? null,
      profileImageUrl: page.picture?.data?.url ?? null,
      accessToken: page.access_token, // Page-specific long-lived token
    });
  }

  return pages;
}

/**
 * Instagram: fetch Pages with linked Instagram Business Accounts.
 * Each Instagram business account becomes a connected account.
 */
async function fetchInstagramAccounts(userAccessToken: string): Promise<AccountInfo[]> {
  const url =
    'https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username,name,profile_picture_url},access_token';
  const response = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Instagram accounts fetch failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const accounts: AccountInfo[] = [];

  for (const page of data.data ?? []) {
    const ig = page.instagram_business_account;
    if (!ig) continue; // Page has no linked Instagram business account

    accounts.push({
      platformUserId: ig.id,
      platformUsername: ig.username ?? null,
      displayName: ig.name ?? page.name ?? null,
      profileImageUrl: ig.profile_picture_url ?? null,
      accessToken: page.access_token, // Use the page token for Instagram API calls
    });
  }

  return accounts;
}

/**
 * Single-account profile fetch for platforms that connect one account per OAuth flow.
 */
async function fetchSingleProfile(platform: PlatformKey, accessToken: string): Promise<AccountInfo> {
  const { profileUrl } = PLATFORMS[platform];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  // TikTok
  if (platform === 'tiktok') {
    const tiktokResponse = await fetchWithRetry(`${profileUrl}?fields=open_id,display_name,avatar_url`, {
      method: 'GET',
      headers,
    });

    if (!tiktokResponse.ok) {
      const text = await tiktokResponse.text();
      throw new Error(`TikTok profile fetch failed (${tiktokResponse.status}): ${text}`);
    }

    const tiktokData = await tiktokResponse.json();
    const user = tiktokData?.data?.user;

    return {
      platformUserId: user?.open_id ?? '',
      platformUsername: null,
      displayName: user?.display_name ?? null,
      profileImageUrl: user?.avatar_url ?? null,
      accessToken,
    };
  }

  const response = await fetchWithRetry(profileUrl, { method: 'GET', headers });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[SocialConnect] ${platform} profile fetch failed (${response.status}):`, text);
    throw new Error(`${PLATFORMS[platform].name} profile fetch failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  switch (platform) {
    case 'linkedin':
      return {
        platformUserId: data.sub,
        platformUsername: null,
        displayName: data.name ?? null,
        profileImageUrl: data.picture ?? null,
        accessToken,
      };

    case 'x': {
      const xUser = data.data;
      return {
        platformUserId: xUser?.id ?? '',
        platformUsername: xUser?.username ?? null,
        displayName: xUser?.name ?? null,
        profileImageUrl: xUser?.profile_image_url ?? null,
        accessToken,
      };
    }

    case 'youtube':
    case 'youtube_shorts': {
      const channel = data.items?.[0];
      if (!channel?.id) {
        throw new Error(
          'No YouTube channel found for this account. Please select the Google account that has a YouTube channel, not your personal email.'
        );
      }
      return {
        platformUserId: channel.id,
        platformUsername: null,
        displayName: channel.snippet?.title ?? null,
        profileImageUrl: channel.snippet?.thumbnails?.default?.url ?? null,
        accessToken,
      };
    }

    default:
      throw new Error(`Unsupported platform for profile extraction: ${platform}`);
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export const socialOAuthCallback: SocialOAuthCallback = async (req, res, context) => {
  const rawPlatform = String(req.params.platform ?? '');
  const code = String(req.query.code ?? '');
  const state = String(req.query.state ?? '');
  const oauthError = req.query.error ? String(req.query.error) : null;

  // 1. OAuth provider returned an error
  if (oauthError) {
    return redirectWithError(res, oauthError);
  }

  // 2. Validate platform
  if (!rawPlatform || !isPlatformKey(rawPlatform)) {
    return redirectWithError(res, `Unsupported platform: ${rawPlatform || 'unknown'}`);
  }
  const platform: PlatformKey = rawPlatform;

  // 3. Validate required query params
  if (!code || !state) {
    return redirectWithError(res, 'Missing authorization code or state parameter');
  }

  try {
    // 4. Look up the OAuthState row
    const oauthState = await context.entities.OAuthState.findUnique({
      where: { state },
    });

    if (!oauthState) {
      return redirectWithError(res, 'Invalid or expired OAuth state. Please try connecting again.');
    }

    if (oauthState.expiresAt < new Date()) {
      await context.entities.OAuthState.delete({ where: { id: oauthState.id } });
      return redirectWithError(res, 'OAuth state has expired. Please try connecting again.');
    }

    if (oauthState.platform !== platform) {
      await context.entities.OAuthState.delete({ where: { id: oauthState.id } });
      return redirectWithError(res, 'Platform mismatch in OAuth state.');
    }

    // 5. Resolve credentials (system app vs. user's own app)
    let credentials: Credentials;
    let credentialId: string | null = null;

    if (oauthState.useSystemApp) {
      const settingKeys = [
        `social_connect_${platform}_client_id`,
        `social_connect_${platform}_client_secret`,
        `social_connect_${platform}_redirect_uri`,
      ];

      const settings = await context.entities.Setting.findMany({
        where: { key: { in: settingKeys } },
      });

      const settingMap = new Map(settings.map((s) => [s.key, s.value]));
      const clientId = settingMap.get(settingKeys[0]);
      const encryptedSecret = settingMap.get(settingKeys[1]);
      const redirectUri = settingMap.get(settingKeys[2]);

      if (!clientId || !encryptedSecret || !redirectUri) {
        await context.entities.OAuthState.delete({ where: { id: oauthState.id } });
        return redirectWithError(
          res,
          `System app credentials for ${PLATFORMS[platform].name} are not configured. Contact an administrator.`,
        );
      }

      credentials = {
        clientId,
        clientSecret: decrypt(encryptedSecret),
        redirectUri,
      };
    } else {
      const appCredential = await context.entities.SocialAppCredential.findFirst({
        where: {
          userId: oauthState.userId,
          platform,
        },
      });

      if (!appCredential) {
        await context.entities.OAuthState.delete({ where: { id: oauthState.id } });
        return redirectWithError(
          res,
          `No app credentials found for ${PLATFORMS[platform].name}. Please configure your app first.`,
        );
      }

      credentialId = appCredential.id;
      credentials = {
        clientId: appCredential.clientId,
        clientSecret: decrypt(appCredential.clientSecret),
        redirectUri: appCredential.redirectUri,
      };
    }

    // 6. Exchange authorization code for tokens
    const codeVerifier = oauthState.codeVerifier ?? null;
    const tokenData = await exchangeCodeForTokens(platform, code, credentials, codeVerifier);

    if (!tokenData.access_token) {
      await context.entities.OAuthState.delete({ where: { id: oauthState.id } });
      return redirectWithError(res, 'Token exchange succeeded but no access token was returned.');
    }

    // 7. Fetch accounts — Facebook and Instagram return multiple (pages),
    //    all other platforms return a single account.
    let accounts: AccountInfo[];

    if (platform === 'facebook') {
      accounts = await fetchFacebookPages(tokenData.access_token);
      if (accounts.length === 0) {
        await context.entities.OAuthState.delete({ where: { id: oauthState.id } });
        return redirectWithError(
          res,
          'No Facebook Pages found. Make sure you manage at least one Page and granted page permissions.',
        );
      }
    } else if (platform === 'instagram') {
      accounts = await fetchInstagramAccounts(tokenData.access_token);
      if (accounts.length === 0) {
        await context.entities.OAuthState.delete({ where: { id: oauthState.id } });
        return redirectWithError(
          res,
          'No Instagram Business accounts found. Make sure at least one of your Facebook Pages has a linked Instagram Business account.',
        );
      }
    } else {
      let profile: AccountInfo;
      try {
        profile = await fetchSingleProfile(platform, tokenData.access_token);
      } catch (profileErr: any) {
        await context.entities.OAuthState.delete({ where: { id: oauthState.id } });
        return redirectWithError(res, profileErr.message || 'Failed to fetch your profile from the platform.');
      }
      if (!profile.platformUserId) {
        await context.entities.OAuthState.delete({ where: { id: oauthState.id } });
        return redirectWithError(res, 'Could not determine your account ID from the platform.');
      }
      accounts = [profile];
    }

    // 8. Determine scopes string
    const scopes = tokenData.scope ?? PLATFORMS[platform].scopes.join(',');

    // 9. Upsert each account
    for (const account of accounts) {
      const encryptedAccessToken = encrypt(account.accessToken);
      const encryptedRefreshToken = tokenData.refresh_token
        ? encrypt(tokenData.refresh_token)
        : null;

      const tokenExpiresAt = tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

      await context.entities.SocialAccount.upsert({
        where: {
          userId_platform_platformUserId: {
            userId: oauthState.userId,
            platform,
            platformUserId: account.platformUserId,
          },
        },
        create: {
          userId: oauthState.userId,
          platform,
          platformUserId: account.platformUserId,
          platformUsername: account.platformUsername,
          displayName: account.displayName,
          profileImageUrl: account.profileImageUrl,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          scopes,
          isActive: true,
          useSystemApp: oauthState.useSystemApp,
          credentialId,
        },
        update: {
          platformUsername: account.platformUsername,
          displayName: account.displayName,
          profileImageUrl: account.profileImageUrl,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          scopes,
          isActive: true,
          useSystemApp: oauthState.useSystemApp,
          credentialId,
        },
      });
    }

    // 10. Clean up the OAuthState row
    await context.entities.OAuthState.delete({ where: { id: oauthState.id } });

    // 11. Redirect to success
    return redirectWithSuccess(res, platform);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred during OAuth callback.';
    console.error(`[social-connect/callback] Error for platform "${platform}":`, err);
    return redirectWithError(res, message);
  }
};
