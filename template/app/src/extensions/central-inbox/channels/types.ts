// ---------------------------------------------------------------------------
// Channel Adapter interfaces
// ---------------------------------------------------------------------------

export interface NormalizedMessage {
  content: string;
  contentType: "text" | "image" | "file" | "audio" | "sticker";
  senderName?: string;
  channelUserId: string;  // platform-specific user ID
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
    size?: number;
  }>;
  metadata?: Record<string, any>;
}

export interface ChannelAdapter {
  /** Parse incoming webhook payload into a normalized message */
  normalize(body: any, headers?: Record<string, string>): NormalizedMessage | null;

  /** Send a message to the customer via the channel's API */
  send(params: SendMessageParams): Promise<SendResult>;

  /** Validate webhook signature if applicable */
  validateSignature?(body: any, headers: Record<string, string>, secret: string): boolean;
}

export interface SendMessageParams {
  channelUserId: string;   // recipient platform ID
  content: string;
  contentType?: string;
  attachments?: Array<{ url: string; name: string; type: string }>;
  credentials: ChannelCredentials;
  metadata?: Record<string, any>;
}

export interface ChannelCredentials {
  accessToken?: string;
  botToken?: string;
  phoneNumberId?: string;
  verifyToken?: string;
  appSecret?: string;
  [key: string]: string | undefined;
}

export interface SendResult {
  success: boolean;
  externalMessageId?: string;
  error?: string;
}
