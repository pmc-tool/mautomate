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
// Submit text-to-video
// ---------------------------------------------------------------------------

export async function submitT2V(
  apiKey: string,
  params: NovitaT2VParams
): Promise<NovitaSubmitResult> {
  const url = `${NOVITA_BASE_URL}/${_videoModel}-t2v`;
  const body = {
    input: {
      prompt: params.prompt,
      negative_prompt: params.negative_prompt ?? "",
    },
    parameters: {
      seed: params.seed,
      duration: params.duration,
      size: params.size,
      shot_type: params.shot_type,
      prompt_extend: params.prompt_extend ?? true,
      watermark: params.watermark ?? false,
      audio: false,
    },
  };

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
  params: NovitaI2VParams
): Promise<NovitaSubmitResult> {
  const url = `${NOVITA_BASE_URL}/${_videoModel}-i2v`;
  const body = {
    input: {
      prompt: params.prompt,
      negative_prompt: params.negative_prompt ?? "",
      img_url: params.image_url,
    },
    parameters: {
      seed: params.seed,
      duration: params.duration,
      size: params.size,
      shot_type: params.shot_type,
      prompt_extend: params.prompt_extend ?? true,
      watermark: params.watermark ?? false,
      audio: false,
    },
  };

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
    const response = await fetchWithTimeout(url, {
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
