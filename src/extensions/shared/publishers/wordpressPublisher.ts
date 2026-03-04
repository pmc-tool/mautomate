import { decrypt } from "../../../social-connect/encryption";

interface WPPublishResult {
  success: boolean;
  wpPostId?: string;
  externalPostUrl?: string;
  errorMessage?: string;
}

/**
 * Publish an SEO article to WordPress via the WP REST API.
 *
 * Uses Application Passwords (Basic Auth) for authentication.
 * Optionally sets Yoast SEO meta description if the Yoast plugin is installed.
 */
export async function publishToWordPress(
  wpUrl: string,
  wpUsername: string,
  encryptedWpPassword: string,
  title: string,
  content: string,
  slug?: string | null,
  metaDescription?: string | null,
  categoryId?: string | null
): Promise<WPPublishResult> {
  const password = decrypt(encryptedWpPassword);
  const basicAuth = Buffer.from(`${wpUsername}:${password}`).toString("base64");

  const apiUrl = `${wpUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts`;

  const body: any = {
    title,
    content,
    status: "publish",
  };

  if (slug) body.slug = slug;
  if (categoryId) body.categories = [parseInt(categoryId, 10)];

  // Yoast SEO meta if plugin is available
  if (metaDescription) {
    body.meta = {
      _yoast_wpseo_metadesc: metaDescription,
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        success: false,
        errorMessage: `WordPress API error (${response.status}): ${errText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      wpPostId: String(data.id),
      externalPostUrl: data.link || `${wpUrl}/?p=${data.id}`,
    };
  } catch (err: any) {
    return {
      success: false,
      errorMessage: err.message || "Failed to connect to WordPress",
    };
  }
}
