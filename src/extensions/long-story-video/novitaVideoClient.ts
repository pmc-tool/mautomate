const NOVITA_BASE_URL = "https://api.novita.ai/v3/async";
const FETCH_TIMEOUT_MS = 30_000;
const LOG_PREFIX = "[novitaVideoClient]";

// Configurable video model — set via Setting "ext.long-story-video.video_model"
// Options: "wan2.6" (best quality, ~$0.50/5s), "wan2.1" (cheaper, ~$0.10/5s)
let _videoModel = "wan2.1"; // default to cheaper model for testing

export function setVideoModel(model: string) {
  const valid = ["wan2.6", "wan2.1"];
  if (valid.includes(model)) {
    _videoModel = model;
    console.log(`${LOG_PREFIX} Video model set to: ${model}`);
  } else {
    console.warn(`${LOG_PREFIX} Unknown model "${model}", keeping ${_videoModel}. Valid: ${valid.join(", ")}`);
  }
}

export function getVideoModel(): string {
  return _videoModel;
}

// ---------------------------------------------------------------------------
// Exported interfaces
// ---------------------------------------------------------------------------

export interface NovitaT2VParams {
  prompt: string;
  negative_prompt?: string;
  seed?: number;
  duration: 5 | 10 | 15;
  size: string; // e.g. "1280*720"
  shot_type: "single" | "multi";
  prompt_extend?: boolean;
  watermark?: boolean;
}

export interface NovitaI2VParams extends NovitaT2VParams {
  image_url: string;
}

export interface NovitaSubmitResult {
  task_id: string;
}

export interface NovitaStatusResult {
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  videoUrl?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildHeaders(apiKey: string, json = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (json) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

/**
 * Wraps native fetch with an AbortController-based timeout.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        `${LOG_PREFIX} Request to ${url} timed out after ${timeoutMs}ms`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Endpoint & body helpers per model version
// ---------------------------------------------------------------------------

/**
 * Wan 2.1 uses flat body format: { prompt, width, height, seed, ... }
 * Endpoint: wan-t2v / wan-i2v
 *
 * Wan 2.6 uses nested format: { input: { prompt, ... }, parameters: { ... } }
 * Endpoint: wan2.6-t2v / wan2.6-i2v
 */

function sizeToWidthHeight(size: string): { width: number; height: number } {
  const [w, h] = size.split("*").map(Number);
  return { width: w || 1280, height: h || 720 };
}

function buildT2VUrlAndBody(params: NovitaT2VParams, model?: string): { url: string; body: any } {
  const effectiveModel = model || _videoModel;
  const defaultNeg = "text, watermark, subtitles, captions, letters, words, logo, blurry, low quality, static image, still frame, morphing, melting, flickering, jittering, duplicate frames, deformed hands, deformed fingers";
  const negPrompt = params.negative_prompt || defaultNeg;
  if (effectiveModel === "wan2.1") {
    const { width, height } = sizeToWidthHeight(params.size);
    return {
      url: `${NOVITA_BASE_URL}/wan-t2v`,
      body: {
        prompt: params.prompt,
        negative_prompt: negPrompt,
        width,
        height,
        seed: params.seed ?? -1,
        steps: 30,
        guidance_scale: 5.0,
        flow_shift: 5.0,
        fast_mode: false,
      },
    };
  }

  // wan2.6 — nested format, prompt_extend disabled to preserve our crafted prompts
  return {
    url: `${NOVITA_BASE_URL}/wan2.6-t2v`,
    body: {
      input: {
        prompt: params.prompt,
        negative_prompt: negPrompt,
      },
      parameters: {
        seed: params.seed,
        duration: params.duration,
        size: params.size,
        shot_type: params.shot_type,
        prompt_extend: false,
        watermark: params.watermark ?? false,
        audio: false,
      },
    },
  };
}

function buildI2VUrlAndBody(params: NovitaI2VParams, model?: string): { url: string; body: any } {
  const effectiveModel = model || _videoModel;
  const defaultNeg = "text, watermark, subtitles, captions, letters, words, logo, blurry, low quality, static image, still frame, morphing, melting, flickering, jittering, duplicate frames, deformed hands, deformed fingers";
  const negPrompt = params.negative_prompt || defaultNeg;
  if (effectiveModel === "wan2.1") {
    const { width, height } = sizeToWidthHeight(params.size);
    return {
      url: `${NOVITA_BASE_URL}/wan-i2v`,
      body: {
        prompt: params.prompt,
        image_url: params.image_url,
        negative_prompt: negPrompt,
        width,
        height,
        seed: params.seed ?? -1,
        steps: 30,
        guidance_scale: 5.0,
        flow_shift: 5.0,
        fast_mode: false,
      },
    };
  }

  // wan2.6 — nested format, prompt_extend disabled to preserve our crafted prompts
  return {
    url: `${NOVITA_BASE_URL}/wan2.6-i2v`,
    body: {
      input: {
        prompt: params.prompt,
        negative_prompt: negPrompt,
        img_url: params.image_url,
      },
      parameters: {
        seed: params.seed,
        duration: params.duration,
        size: params.size,
        shot_type: params.shot_type,
        prompt_extend: false,
        watermark: params.watermark ?? false,
        audio: false,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Resolution helper
// ---------------------------------------------------------------------------

/**
 * Convert a human-friendly resolution + aspect ratio into a Novita size string.
 *
 * Examples:
 *   resolutionToSize("720p", "16:9")  => "1280*720"
 *   resolutionToSize("1080p", "9:16") => "1080*1920"
 *   resolutionToSize("720p", "1:1")   => "720*720"
 */
export function resolutionToSize(
  resolution: "720p" | "1080p",
  aspectRatio: "16:9" | "9:16" | "1:1"
): string {
  const map: Record<string, Record<string, string>> = {
    "720p": {
      "16:9": "1280*720",
      "9:16": "720*1280",
      "1:1": "960*960",
    },
    "1080p": {
      "16:9": "1920*1080",
      "9:16": "1080*1920",
      "1:1": "1440*1440",
    },
  };

  const size = map[resolution]?.[aspectRatio];
  if (!size) {
    console.error(
      `${LOG_PREFIX} Unknown resolution/aspect combo: ${resolution} / ${aspectRatio}, falling back to 1280*720`
    );
    return "1280*720";
  }
  return size;
}

// ---------------------------------------------------------------------------
// Retry wrapper with exponential backoff (used for status polling only)
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3,
  baseDelayMs = 2000
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url, init);
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt); // 2s, 4s, 8s
        console.warn(`${LOG_PREFIX} Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// Submit text-to-video
// ---------------------------------------------------------------------------

export async function submitT2V(
  apiKey: string,
  params: NovitaT2VParams,
  model?: string
): Promise<NovitaSubmitResult> {
  const { url, body } = buildT2VUrlAndBody(params, model);
  const effectiveModel = model || _videoModel;

  console.log(`${LOG_PREFIX} submitT2V → ${url} (model: ${effectiveModel})`);

  try {
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: buildHeaders(apiKey, true),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `${LOG_PREFIX} T2V submit failed (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();
    if (!data.task_id) {
      throw new Error(
        `${LOG_PREFIX} T2V response missing task_id: ${JSON.stringify(data)}`
      );
    }

    return { task_id: data.task_id };
  } catch (err: any) {
    console.error(`${LOG_PREFIX} submitT2V error:`, err.message || err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Submit image-to-video
// ---------------------------------------------------------------------------

export async function submitI2V(
  apiKey: string,
  params: NovitaI2VParams,
  model?: string
): Promise<NovitaSubmitResult> {
  const { url, body } = buildI2VUrlAndBody(params, model);
  const effectiveModel = model || _videoModel;

  console.log(`${LOG_PREFIX} submitI2V → ${url} (model: ${effectiveModel})`);

  try {
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: buildHeaders(apiKey, true),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `${LOG_PREFIX} I2V submit failed (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();
    if (!data.task_id) {
      throw new Error(
        `${LOG_PREFIX} I2V response missing task_id: ${JSON.stringify(data)}`
      );
    }

    return { task_id: data.task_id };
  } catch (err: any) {
    console.error(`${LOG_PREFIX} submitI2V error:`, err.message || err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Check task status
// ---------------------------------------------------------------------------

export async function checkStatus(
  apiKey: string,
  taskId: string
): Promise<NovitaStatusResult> {
  const url = `${NOVITA_BASE_URL}/task-result?task_id=${encodeURIComponent(taskId)}`;

  try {
    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: buildHeaders(apiKey),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `${LOG_PREFIX} Status check failed (${response.status}): ${errorBody}`
      );
    }

    const data = await response.json();
    const rawStatus: string = data.task?.status ?? "";
    const progress: number = data.task?.progress_percent ?? 0;

    switch (rawStatus) {
      case "TASK_STATUS_SUCCEED":
        return {
          status: "completed",
          progress: 100,
          videoUrl: data.videos?.[0]?.video_url,
        };

      case "TASK_STATUS_FAILED":
        return {
          status: "failed",
          progress,
          error: data.task?.reason || "Video generation failed",
        };

      case "TASK_STATUS_PROCESSING":
        return {
          status: "processing",
          progress,
        };

      case "TASK_STATUS_QUEUED":
      default:
        return {
          status: "queued",
          progress,
        };
    }
  } catch (err: any) {
    console.error(`${LOG_PREFIX} checkStatus error:`, err.message || err);
    throw err;
  }
}
