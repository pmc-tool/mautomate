import { HttpError, prisma } from "wasp/server";
import type {
  GetChatbots,
  GetChatbot,
  CreateChatbot,
  UpdateChatbot,
  DeleteChatbot,
  AddChatbotData,
  DeleteChatbotData,
  TrainChatbot,
  SaveChatbotChannel,
  DeleteChatbotChannel,
  SaveChannelCredentials,
  ChatWithBot,
} from "wasp/server/operations";
import OpenAI from "openai";
import * as z from "zod";
import { ensureArgsSchemaOrThrowHttpError } from "../server/validation";
import { encrypt } from "../social-connect/encryption";
import { deductCredits, refundCredits } from "../credits/creditService";
import { CreditActionType } from "../credits/creditConfig";

// ---------------------------------------------------------------------------
// Website scraping helper
// ---------------------------------------------------------------------------

async function scrapeWebsiteContent(url: string): Promise<string | null> {
  try {
    // Normalize URL — add https:// if missing
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const html = await response.text();
    let text = "";

    // Try extracting content from Next.js __NEXT_DATA__ (JS-rendered sites)
    const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        text = extractTextFromJson(nextData);
      } catch { /* fall through to HTML stripping */ }
    }

    // Try extracting from JSON-LD structured data
    const jsonLdMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/gi, "");
        try {
          const ld = JSON.parse(jsonContent);
          const ldText = extractTextFromJson(ld);
          if (ldText.length > 50) text += "\n" + ldText;
        } catch { /* skip invalid JSON-LD */ }
      }
    }

    // Also extract from HTML body (works for server-rendered sites)
    const htmlText = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<\/?(div|p|br|h[1-6]|li|tr|td|th|blockquote|section|article)[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    // Use whichever extracted more content
    if (htmlText.length > text.length) {
      text = htmlText;
    }

    // Also extract meta description and og:description
    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    let metaContent = "";
    if (title?.[1]) metaContent += "Page title: " + title[1].trim() + "\n";
    if (metaDesc?.[1]) metaContent += "Description: " + metaDesc[1].trim() + "\n";
    if (ogDesc?.[1] && ogDesc[1] !== metaDesc?.[1]) metaContent += ogDesc[1].trim() + "\n";
    if (metaContent) text = metaContent + "\n" + text;

    // Truncate to ~8000 chars to fit in context window
    if (text.length > 8000) {
      text = text.substring(0, 8000) + "\n[Content truncated]";
    }

    return text.length > 50 ? text : null;
  } catch (err: any) {
    console.error(`[Scrape] Error fetching ${url}:`, err.message);
    return null;
  }
}

/** Recursively extract string values from a JSON object */
function extractTextFromJson(obj: any, depth = 0): string {
  if (depth > 10) return "";
  if (typeof obj === "string") {
    const trimmed = obj.trim();
    // Skip URLs, hashes, short tokens, base64
    if (trimmed.length < 5 || /^https?:\/\//.test(trimmed) || /^[a-f0-9]{20,}$/i.test(trimmed) || /^data:/.test(trimmed)) return "";
    return trimmed;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => extractTextFromJson(item, depth + 1)).filter(Boolean).join("\n");
  }
  if (obj && typeof obj === "object") {
    // Skip known non-content keys
    const skipKeys = new Set(["buildId", "assetPrefix", "scriptLoader", "locale", "locales", "defaultLocale", "domainLocales", "isPreview", "__N_SSG", "__N_SSP", "isFallback", "gssp", "customServer", "gip", "appGip", "dynamicIds", "err"]);
    return Object.entries(obj)
      .filter(([key]) => !skipKeys.has(key))
      .map(([_, val]) => extractTextFromJson(val, depth + 1))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const getChatbotSchema = z.object({
  id: z.string().uuid(),
});

const createChatbotSchema = z.object({
  title: z.string().optional(),
});

const updateChatbotSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  bubbleMessage: z.string().optional().nullable(),
  welcomeMessage: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  dontGoBeyond: z.boolean().optional(),
  language: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  color: z.string().optional(),
  position: z.string().optional(),
  showLogo: z.boolean().optional(),
  showDateTime: z.boolean().optional(),
  isEmailCollect: z.boolean().optional(),
  isContact: z.boolean().optional(),
  isAttachment: z.boolean().optional(),
  isEmoji: z.boolean().optional(),
  embedWidth: z.number().int().optional(),
  embedHeight: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const deleteChatbotSchema = z.object({
  id: z.string().uuid(),
});

const addChatbotDataSchema = z.object({
  chatbotId: z.string().uuid(),
  type: z.enum(["website", "pdf", "text", "qa"]),
  typeValue: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  path: z.string().optional().nullable(),
});

const deleteChatbotDataSchema = z.object({
  id: z.string().uuid(),
});

const trainChatbotSchema = z.object({
  id: z.string().uuid(),
});

const channelEnum = z.enum(["website", "messenger", "whatsapp", "telegram"]);

const saveChatbotChannelSchema = z.object({
  chatbotId: z.string().uuid(),
  channel: channelEnum,
  isActive: z.boolean().optional(),
});

const deleteChatbotChannelSchema = z.object({
  id: z.string().uuid(),
});

const saveChannelCredentialsSchema = z.object({
  id: z.string().uuid(),
  // Messenger
  fbAppId: z.string().optional().nullable(),
  fbAppSecret: z.string().optional().nullable(),
  fbPageName: z.string().optional().nullable(),
  fbAccessToken: z.string().optional().nullable(),
  fbVerifyToken: z.string().optional().nullable(),
  // WhatsApp
  waPhoneNumberId: z.string().optional().nullable(),
  waBusinessId: z.string().optional().nullable(),
  waAccessToken: z.string().optional().nullable(),
  waVerifyToken: z.string().optional().nullable(),
  // Telegram
  tgBotToken: z.string().optional().nullable(),
  tgBotUsername: z.string().optional().nullable(),
  // Website
  embedWidth: z.number().int().optional().nullable(),
  embedHeight: z.number().int().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getChatbots: GetChatbots<void, any[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  return context.entities.Chatbot.findMany({
    where: { userId: context.user.id },
    include: { data: true, channels: true },
    orderBy: { createdAt: "desc" },
  });
};

export const getChatbot: GetChatbot<{ id: string }, any> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const validated = ensureArgsSchemaOrThrowHttpError(getChatbotSchema, args);

  const chatbot = await context.entities.Chatbot.findUnique({
    where: { id: validated.id },
    include: { data: true, channels: true },
  });

  if (!chatbot) {
    throw new HttpError(404, "Chatbot not found");
  }

  if (chatbot.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  return chatbot;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const createChatbot: CreateChatbot<z.infer<typeof createChatbotSchema>, any> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(createChatbotSchema, rawArgs);

  const chatbot = await context.entities.Chatbot.create({
    data: {
      userId: context.user.id,
      title: args.title ?? "Untitled Chatbot",
    },
  });

  // Auto-create a "website" channel for new chatbots
  await context.entities.ChatbotChannel.create({
    data: {
      chatbotId: chatbot.id,
      userId: context.user.id,
      channel: "website",
    },
  });

  return context.entities.Chatbot.findUnique({
    where: { id: chatbot.id },
    include: { data: true, channels: true },
  });
};

export const updateChatbot: UpdateChatbot<z.infer<typeof updateChatbotSchema>, any> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(updateChatbotSchema, rawArgs);

  // Verify ownership
  const existing = await context.entities.Chatbot.findUnique({
    where: { id: args.id },
  });

  if (!existing) {
    throw new HttpError(404, "Chatbot not found");
  }

  if (existing.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  // Build update data from provided fields (exclude id)
  const { id, ...updateFields } = args;

  await context.entities.Chatbot.update({
    where: { id },
    data: updateFields,
  });

  return context.entities.Chatbot.findUnique({
    where: { id },
    include: { data: true, channels: true },
  });
};

export const deleteChatbot: DeleteChatbot<{ id: string }, void> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const validated = ensureArgsSchemaOrThrowHttpError(deleteChatbotSchema, args);

  const chatbot = await context.entities.Chatbot.findUnique({
    where: { id: validated.id },
  });

  if (!chatbot) {
    throw new HttpError(404, "Chatbot not found");
  }

  if (chatbot.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  // ChatbotData cascade-deletes via the schema relation
  await context.entities.Chatbot.delete({
    where: { id: validated.id },
  });
};

export const addChatbotData: AddChatbotData<z.infer<typeof addChatbotDataSchema>, any> = async (
  rawArgs,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(addChatbotDataSchema, rawArgs);

  // Verify chatbot ownership
  const chatbot = await context.entities.Chatbot.findUnique({
    where: { id: args.chatbotId },
  });

  if (!chatbot) {
    throw new HttpError(404, "Chatbot not found");
  }

  if (chatbot.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  // For website type, scrape content immediately
  let content = args.content ?? null;
  if (args.type === "website" && args.typeValue) {
    try {
      const scraped = await scrapeWebsiteContent(args.typeValue);
      if (scraped) {
        content = scraped;
      } else {
        content = `[Could not extract content from ${args.typeValue}]`;
      }
    } catch {
      content = `[Scraping failed for ${args.typeValue}]`;
    }
  }

  return context.entities.ChatbotData.create({
    data: {
      chatbotId: args.chatbotId,
      userId: context.user.id,
      type: args.type,
      typeValue: args.typeValue ?? null,
      content,
      path: args.path ?? null,
    },
  });
};

export const deleteChatbotData: DeleteChatbotData<{ id: string }, void> = async (
  args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const validated = ensureArgsSchemaOrThrowHttpError(deleteChatbotDataSchema, args);

  const dataRecord = await context.entities.ChatbotData.findUnique({
    where: { id: validated.id },
    include: { chatbot: true },
  });

  if (!dataRecord) {
    throw new HttpError(404, "Chatbot data not found");
  }

  if (dataRecord.chatbot.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  await context.entities.ChatbotData.delete({
    where: { id: validated.id },
  });
};

export const trainChatbot: TrainChatbot<{ id: string }, any> = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const validated = ensureArgsSchemaOrThrowHttpError(trainChatbotSchema, args);

  // Verify ownership
  const chatbot = await context.entities.Chatbot.findUnique({
    where: { id: validated.id },
    include: { data: true },
  });

  if (!chatbot) {
    throw new HttpError(404, "Chatbot not found");
  }

  if (chatbot.userId !== context.user.id) {
    throw new HttpError(403, "Not authorized");
  }

  // Phase 1: Scrape website URLs and populate content
  const websiteRecords = chatbot.data.filter(
    (d: any) => d.type === "website" && d.typeValue
  );

  for (const record of websiteRecords) {
    try {
      const scrapedContent = await scrapeWebsiteContent(record.typeValue!);
      if (scrapedContent) {
        await context.entities.ChatbotData.update({
          where: { id: record.id },
          data: { content: scrapedContent, status: "trained" },
        });
      } else {
        await context.entities.ChatbotData.update({
          where: { id: record.id },
          data: { status: "trained" },
        });
      }
    } catch (err) {
      console.error(`[Chatbot Train] Failed to scrape ${record.typeValue}:`, err);
      // Still mark as trained but with a note
      await context.entities.ChatbotData.update({
        where: { id: record.id },
        data: {
          content: `[Failed to scrape] ${record.typeValue}`,
          status: "trained",
        },
      });
    }
  }

  // Phase 2: Mark all non-website records as trained
  await context.entities.ChatbotData.updateMany({
    where: { chatbotId: validated.id, type: { not: "website" } },
    data: { status: "trained" },
  });

  // Update chatbot status to trained
  return context.entities.Chatbot.update({
    where: { id: validated.id },
    data: { status: "trained" },
    include: { data: true },
  });
};

// ---------------------------------------------------------------------------
// Channel Operations
// ---------------------------------------------------------------------------

export const saveChatbotChannel: SaveChatbotChannel<
  z.infer<typeof saveChatbotChannelSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(saveChatbotChannelSchema, rawArgs);

  // Verify chatbot ownership
  const chatbot = await context.entities.Chatbot.findUnique({
    where: { id: args.chatbotId },
  });

  if (!chatbot) throw new HttpError(404, "Chatbot not found");
  if (chatbot.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  // Upsert: create or update the channel
  return context.entities.ChatbotChannel.upsert({
    where: {
      chatbotId_channel: { chatbotId: args.chatbotId, channel: args.channel },
    },
    create: {
      chatbotId: args.chatbotId,
      userId: context.user.id,
      channel: args.channel,
      isActive: args.isActive ?? true,
    },
    update: {
      isActive: args.isActive ?? true,
    },
  });
};

export const deleteChatbotChannel: DeleteChatbotChannel<{ id: string }, void> = async (
  args,
  context,
) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const validated = ensureArgsSchemaOrThrowHttpError(deleteChatbotChannelSchema, args);

  const channel = await context.entities.ChatbotChannel.findUnique({
    where: { id: validated.id },
    include: { chatbot: true },
  });

  if (!channel) throw new HttpError(404, "Channel not found");
  if (channel.chatbot.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  await context.entities.ChatbotChannel.delete({
    where: { id: validated.id },
  });
};

const ENCRYPTED_FIELDS = [
  "fbAppSecret",
  "fbAccessToken",
  "waAccessToken",
  "tgBotToken",
] as const;

export const saveChannelCredentials: SaveChannelCredentials<
  z.infer<typeof saveChannelCredentialsSchema>,
  any
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(saveChannelCredentialsSchema, rawArgs);

  const channel = await context.entities.ChatbotChannel.findUnique({
    where: { id: args.id },
    include: { chatbot: true },
  });

  if (!channel) throw new HttpError(404, "Channel not found");
  if (channel.chatbot.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  // Build update data, encrypting sensitive fields
  const { id, ...fields } = args;
  const updateData: Record<string, any> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    if (value && ENCRYPTED_FIELDS.includes(key as any)) {
      updateData[key] = encrypt(value as string);
    } else {
      updateData[key] = value;
    }
  }

  // Determine if the channel is configured based on required fields
  const merged = { ...channel, ...updateData };
  let isConfigured = false;
  switch (channel.channel) {
    case "website":
      isConfigured = true;
      break;
    case "messenger":
      isConfigured = !!(merged.fbAppId && merged.fbAppSecret && merged.fbAccessToken);
      break;
    case "whatsapp":
      isConfigured = !!(merged.waPhoneNumberId && merged.waAccessToken);
      break;
    case "telegram":
      isConfigured = !!merged.tgBotToken;
      break;
  }

  updateData.isConfigured = isConfigured;

  return context.entities.ChatbotChannel.update({
    where: { id },
    data: updateData,
  });
};

// ---------------------------------------------------------------------------
// Chat with Bot (Live Preview)
// ---------------------------------------------------------------------------

const chatWithBotSchema = z.object({
  chatbotId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
});

export const chatWithBot: ChatWithBot<
  z.infer<typeof chatWithBotSchema>,
  { reply: string }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, "Not authenticated");
  }

  const args = ensureArgsSchemaOrThrowHttpError(chatWithBotSchema, rawArgs);

  // Fetch chatbot config
  const chatbot = await context.entities.Chatbot.findUnique({
    where: { id: args.chatbotId },
  });

  if (!chatbot) throw new HttpError(404, "Chatbot not found");
  if (chatbot.userId !== context.user.id) throw new HttpError(403, "Not authorized");

  // Fetch OpenAI API key from Setting table
  const apiKeySetting = await context.entities.Setting.findUnique({
    where: { key: "platform.openai_api_key" },
  });

  if (!apiKeySetting?.value) {
    throw new HttpError(
      400,
      "OpenAI API key not configured. Go to Admin Settings to add your API key."
    );
  }

  // Fetch trained data
  const trainedData = await context.entities.ChatbotData.findMany({
    where: { chatbotId: args.chatbotId, status: "trained" },
  });

  // Build system prompt
  let systemPrompt = `You are a helpful chatbot assistant named "${chatbot.title}".\n`;

  if (chatbot.instructions) {
    systemPrompt += `${chatbot.instructions}\n`;
  }

  if (chatbot.dontGoBeyond) {
    systemPrompt +=
      "Only answer questions based on the context below. If asked about unrelated topics, politely decline.\n";
  }

  if (chatbot.language) {
    systemPrompt += `Always respond in ${chatbot.language}.\n`;
  }

  if (trainedData.length > 0) {
    systemPrompt += "\n### Knowledge Base:\n";
    for (const item of trainedData) {
      const label = item.typeValue ? `[${item.type}: ${item.typeValue}]` : `[${item.type}]`;
      systemPrompt += `${label} ${item.content ?? ""}\n`;
    }
  }

  // Build messages array for OpenAI
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...args.history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content: args.message },
  ];

  // Deduct credits for chatbot message
  await deductCredits(prisma, context.user.id, CreditActionType.ChatbotMessage, { chatbotId: args.chatbotId });

  // Create OpenAI client dynamically (key from DB, not env)
  const openai = new OpenAI({ apiKey: apiKeySetting.value });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";
    return { reply };
  } catch (err: any) {
    await refundCredits(prisma, context.user.id, CreditActionType.ChatbotMessage, "AI chat failed");
    if (err?.status === 401) {
      throw new HttpError(400, "Invalid OpenAI API key. Check your settings.");
    }
    throw new HttpError(500, "Failed to get AI response. Please try again.");
  }
};
