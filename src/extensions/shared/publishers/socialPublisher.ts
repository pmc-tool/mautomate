import { decrypt } from "../../../social-connect/encryption";

interface PublishResult {
  success: boolean;
  externalPostId?: string;
  errorMessage?: string;
}

/**
 * Publish content to a social media platform.
 * Uses the user's connected SocialAccount OAuth tokens.
 */
export async function publishToSocial(
  socialAccountEntity: any,
  userId: string,
  platform: string,
  content: string,
  imageUrl?: string | null,
  socialAccountId?: string | null
): Promise<PublishResult> {
  // If a specific socialAccountId is provided, use that account;
  // otherwise fall back to the first active account matching the platform.
  const account = socialAccountId
    ? await socialAccountEntity.findFirst({
        where: { id: socialAccountId, userId, isActive: true },
      })
    : await socialAccountEntity.findFirst({
        where: { userId, platform, isActive: true },
      });

  if (!account) {
    return {
      success: false,
      errorMessage: `No connected ${platform} account found. Connect one in Social Connect.`,
    };
  }

  const accessToken = decrypt(account.accessToken);

  try {
    switch (platform) {
      case "facebook":
        return await publishToFacebook(accessToken, account.platformUserId, content, imageUrl);
      case "instagram":
        return await publishToInstagram(accessToken, account.platformUserId, content, imageUrl);
      case "linkedin":
        return await publishToLinkedIn(accessToken, account.platformUserId, content, imageUrl);
      case "x":
        return await publishToX(accessToken, content);
      default:
        return { success: false, errorMessage: `Unsupported platform: ${platform}` };
    }
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err.message || `Failed to publish to ${platform}`,
    };
  }
}

// ---------------------------------------------------------------------------
// Facebook
// ---------------------------------------------------------------------------

async function publishToFacebook(
  accessToken: string,
  pageId: string,
  content: string,
  imageUrl?: string | null
): Promise<PublishResult> {
  try {
    let url: string;
    let body: Record<string, string>;

    if (imageUrl) {
      // Photo post
      url = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body = {
        url: imageUrl,
        caption: content,
        access_token: accessToken,
      };
    } else {
      // Text post
      url = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      body = {
        message: content,
        access_token: accessToken,
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Facebook API error (${response.status})`;
      return { success: false, errorMessage: errMsg };
    }

    const data = await response.json();
    return { success: true, externalPostId: data.id || data.post_id };
  } catch (err: any) {
    return { success: false, errorMessage: err.message || "Failed to publish to Facebook" };
  }
}

// ---------------------------------------------------------------------------
// Instagram (two-step: create media container, then publish)
// ---------------------------------------------------------------------------

async function publishToInstagram(
  accessToken: string,
  igBusinessAccountId: string,
  content: string,
  imageUrl?: string | null
): Promise<PublishResult> {
  try {
    if (!imageUrl) {
      return {
        success: false,
        errorMessage: "Instagram requires an image. No image URL provided.",
      };
    }

    // Step 1: Create media container
    const containerUrl = `https://graph.facebook.com/v19.0/${igBusinessAccountId}/media`;
    const containerResponse = await fetch(containerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: content,
        access_token: accessToken,
      }),
    });

    if (!containerResponse.ok) {
      const errData = await containerResponse.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Instagram container creation failed (${containerResponse.status})`;
      return { success: false, errorMessage: errMsg };
    }

    const containerData = await containerResponse.json();
    const creationId = containerData.id;

    if (!creationId) {
      return { success: false, errorMessage: "Instagram media container ID not returned." };
    }

    // Step 2: Publish the container
    const publishUrl = `https://graph.facebook.com/v19.0/${igBusinessAccountId}/media_publish`;
    const publishResponse = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });

    if (!publishResponse.ok) {
      const errData = await publishResponse.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Instagram publish failed (${publishResponse.status})`;
      return { success: false, errorMessage: errMsg };
    }

    const publishData = await publishResponse.json();
    return { success: true, externalPostId: publishData.id };
  } catch (err: any) {
    return { success: false, errorMessage: err.message || "Failed to publish to Instagram" };
  }
}

// ---------------------------------------------------------------------------
// LinkedIn
// ---------------------------------------------------------------------------

async function publishToLinkedIn(
  accessToken: string,
  platformUserId: string,
  content: string,
  imageUrl?: string | null
): Promise<PublishResult> {
  try {
    const authorUrn = `urn:li:person:${platformUserId}`;

    const shareContent: any = {
      shareCommentary: { text: content },
      shareMediaCategory: "NONE",
    };

    // If an image URL is provided, include it as a media element
    if (imageUrl) {
      shareContent.shareMediaCategory = "ARTICLE";
      shareContent.media = [
        {
          status: "READY",
          originalUrl: imageUrl,
        },
      ];
    }

    const body = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": shareContent,
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        errorMessage: `LinkedIn API error (${response.status}): ${errText}`,
      };
    }

    const data = await response.json();
    // LinkedIn returns the post URN in the `id` field
    return { success: true, externalPostId: data.id };
  } catch (err: any) {
    return { success: false, errorMessage: err.message || "Failed to publish to LinkedIn" };
  }
}

// ---------------------------------------------------------------------------
// X (formerly Twitter)
// ---------------------------------------------------------------------------

async function publishToX(
  accessToken: string,
  content: string
): Promise<PublishResult> {
  try {
    const response = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg =
        errData?.detail || errData?.title || `X API error (${response.status})`;
      return { success: false, errorMessage: errMsg };
    }

    const data = await response.json();
    return { success: true, externalPostId: data.data?.id };
  } catch (err: any) {
    return { success: false, errorMessage: err.message || "Failed to publish to X" };
  }
}
