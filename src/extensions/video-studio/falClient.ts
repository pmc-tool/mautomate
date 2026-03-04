// ---------------------------------------------------------------------------
// Video Studio — fal.ai Queue API Client
// ---------------------------------------------------------------------------

const FAL_QUEUE_BASE = "https://queue.fal.run";

interface FalSubmitResult {
  request_id: string;
}

interface FalStatusResult {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  logs?: Array<{ message: string }>;
}

interface FalResult {
  video?: { url: string };
  images?: Array<{ url: string }>;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Submit a generation to the fal.ai queue
// ---------------------------------------------------------------------------

export async function submitGeneration(
  apiKey: string,
  endpoint: string,
  params: Record<string, unknown>,
): Promise<string> {
  const res = await fetch(`${FAL_QUEUE_BASE}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fal.ai submit failed (${res.status}): ${body}`);
  }

  const data: FalSubmitResult = await res.json();
  return data.request_id;
}

// ---------------------------------------------------------------------------
// Check status of a queued request
// ---------------------------------------------------------------------------

export async function checkStatus(
  apiKey: string,
  endpoint: string,
  requestId: string,
): Promise<{ status: string; progress: number }> {
  const res = await fetch(
    `${FAL_QUEUE_BASE}/${endpoint}/requests/${requestId}/status`,
    {
      method: "GET",
      headers: { Authorization: `Key ${apiKey}` },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fal.ai status check failed (${res.status}): ${body}`);
  }

  const data: FalStatusResult = await res.json();

  let progress = 0;
  if (data.status === "COMPLETED") progress = 100;
  else if (data.status === "IN_PROGRESS") progress = 50;
  else if (data.status === "IN_QUEUE") progress = 10;

  return { status: data.status, progress };
}

// ---------------------------------------------------------------------------
// Get the result of a completed request
// ---------------------------------------------------------------------------

export async function getResult(
  apiKey: string,
  endpoint: string,
  requestId: string,
): Promise<{ videoUrl: string | null; thumbnailUrl: string | null }> {
  const res = await fetch(
    `${FAL_QUEUE_BASE}/${endpoint}/requests/${requestId}`,
    {
      method: "GET",
      headers: { Authorization: `Key ${apiKey}` },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fal.ai result fetch failed (${res.status}): ${body}`);
  }

  const data: FalResult = await res.json();

  // Different models return video URL in different fields
  const videoUrl =
    data.video?.url ||
    (data as any).video_url ||
    (data as any).output?.video?.url ||
    null;

  const thumbnailUrl =
    (data.images && data.images[0]?.url) ||
    (data as any).thumbnail_url ||
    null;

  return { videoUrl, thumbnailUrl };
}

// ---------------------------------------------------------------------------
// Cancel a queued/processing request
// ---------------------------------------------------------------------------

export async function cancelRequest(
  apiKey: string,
  endpoint: string,
  requestId: string,
): Promise<void> {
  const res = await fetch(
    `${FAL_QUEUE_BASE}/${endpoint}/requests/${requestId}/cancel`,
    {
      method: "PUT",
      headers: { Authorization: `Key ${apiKey}` },
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fal.ai cancel failed (${res.status}): ${body}`);
  }
}
