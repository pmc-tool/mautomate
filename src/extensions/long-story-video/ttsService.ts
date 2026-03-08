// ---------------------------------------------------------------------------
// TTS Service — Uses Novita AI Text-to-Speech API
// ---------------------------------------------------------------------------

const NOVITA_TTS_URL = "https://api.novita.ai/v3/async/txt2speech";
const NOVITA_STATUS_URL = "https://api.novita.ai/v3/async/task-result";
const LOG = "[ttsService]";
const TTS_POLL_INTERVAL_MS = 5_000;
const TTS_MAX_POLLS = 40; // 40 × 5s = ~3.3 minutes max wait

// ---------------------------------------------------------------------------
// Voice Options Registry
// ---------------------------------------------------------------------------

export interface VoiceOption {
  id: string;
  name: string;
  style: string;
  description: string;
  novitaVoiceId: string; // Novita voice_id
}

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "alloy", name: "James", style: "Neutral", description: "Clean, balanced male voice", novitaVoiceId: "James" },
  { id: "echo", name: "Michael", style: "Warm", description: "Warm and conversational", novitaVoiceId: "Michael" },
  { id: "fable", name: "John", style: "Storytelling", description: "Expressive, narrative style", novitaVoiceId: "John" },
  { id: "onyx", name: "Emily", style: "Authoritative", description: "Clear, commanding presence", novitaVoiceId: "Emily" },
  { id: "nova", name: "Olivia", style: "Friendly", description: "Bright and engaging", novitaVoiceId: "Olivia" },
  { id: "shimmer", name: "Sarah", style: "Gentle", description: "Soft and calming", novitaVoiceId: "Sarah" },
];

const VALID_VOICE_IDS = new Set(VOICE_OPTIONS.map((v) => v.id));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getVoiceById(id: string): VoiceOption | undefined {
  return VOICE_OPTIONS.find((v) => v.id === id);
}

export function isValidVoiceId(id: string): boolean {
  return VALID_VOICE_IDS.has(id);
}

function getNovitaVoiceId(voiceId: string): string {
  const voice = getVoiceById(voiceId);
  return voice?.novitaVoiceId || "James";
}

// ---------------------------------------------------------------------------
// Novita TTS: Submit + Poll
// ---------------------------------------------------------------------------

async function submitNovitaTTS(
  apiKey: string,
  text: string,
  novitaVoiceId: string
): Promise<string> {
  const resp = await fetch(NOVITA_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request: {
        voice_id: novitaVoiceId,
        language: "en-US",
        texts: [text],
        speed: 1.0,
      },
    }),
  });

  const data = await resp.json();
  if (!data.task_id) {
    throw new Error(`${LOG} TTS submit failed: ${JSON.stringify(data)}`);
  }
  return data.task_id;
}

async function pollNovitaTTS(
  apiKey: string,
  taskId: string
): Promise<string> {
  for (let i = 0; i < TTS_MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, TTS_POLL_INTERVAL_MS));

    const resp = await fetch(
      `${NOVITA_STATUS_URL}?task_id=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    const data = await resp.json();
    const status = data.task?.status;

    if (status === "TASK_STATUS_SUCCEED") {
      const audioUrl = data.audios?.[0]?.audio_url;
      if (!audioUrl) {
        throw new Error(`${LOG} TTS succeeded but no audio URL in response`);
      }
      return audioUrl;
    }

    if (status === "TASK_STATUS_FAILED") {
      throw new Error(
        `${LOG} TTS failed: ${data.task?.reason || "unknown error"}`
      );
    }
  }

  throw new Error(`${LOG} TTS timed out after ${TTS_MAX_POLLS * TTS_POLL_INTERVAL_MS / 1000}s`);
}

// ---------------------------------------------------------------------------
// Single-scene narration — returns audio URL (not buffer)
// ---------------------------------------------------------------------------

export async function generateSceneNarrationUrl(
  narrationText: string,
  voiceId: string,
  novitaApiKey: string
): Promise<string> {
  if (!isValidVoiceId(voiceId)) {
    throw new Error(
      `${LOG} Invalid voiceId "${voiceId}". Must be one of: ${VOICE_OPTIONS.map((v) => v.id).join(", ")}`
    );
  }

  if (!narrationText.trim()) {
    throw new Error(`${LOG} narrationText must not be empty`);
  }

  const novitaVoiceId = getNovitaVoiceId(voiceId);
  console.log(`${LOG} Submitting TTS for voice "${novitaVoiceId}"...`);

  const taskId = await submitNovitaTTS(novitaApiKey, narrationText, novitaVoiceId);
  console.log(`${LOG} TTS task submitted: ${taskId}`);

  const audioUrl = await pollNovitaTTS(novitaApiKey, taskId);
  console.log(`${LOG} TTS complete, audio URL obtained`);

  return audioUrl;
}

// ---------------------------------------------------------------------------
// Batch narration for all scenes (sequential to avoid rate limits)
// Returns Map of sceneId → audio URL
// ---------------------------------------------------------------------------

export async function generateAllNarrations(
  scenes: Array<{ id: string; narrationText: string }>,
  voiceId: string,
  novitaApiKey: string
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  if (scenes.length === 0) {
    console.log(`${LOG} No scenes provided — returning empty results`);
    return results;
  }

  console.log(
    `${LOG} Generating narration for ${scenes.length} scene(s) with voice "${voiceId}"`
  );

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let succeeded = false;

    // Retry up to 3 times with increasing delay
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Wait before each request (longer on retries)
        if (i > 0 || attempt > 1) {
          const delay = attempt === 1 ? 5000 : attempt * 10000;
          console.log(`${LOG} Waiting ${delay / 1000}s before TTS request (scene ${i + 1}, attempt ${attempt})...`);
          await new Promise((r) => setTimeout(r, delay));
        }

        const audioUrl = await generateSceneNarrationUrl(
          scene.narrationText,
          voiceId,
          novitaApiKey
        );
        results.set(scene.id, audioUrl);
        console.log(`${LOG} Scene "${scene.id}" narration complete`);
        succeeded = true;
        break;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `${LOG} Scene "${scene.id}" attempt ${attempt}/3 failed: ${message}`
        );
      }
    }

    if (!succeeded) {
      console.error(`${LOG} Scene "${scene.id}" narration failed after 3 attempts`);
    }
  }

  console.log(
    `${LOG} Narration batch complete: ${results.size}/${scenes.length} scenes succeeded`
  );

  return results;
}

// ---------------------------------------------------------------------------
// Legacy compatibility: generateSceneNarration returns Buffer
// (wraps the URL approach by downloading the audio)
// ---------------------------------------------------------------------------

export async function generateSceneNarration(
  narrationText: string,
  voiceId: string,
  novitaApiKey: string
): Promise<Buffer> {
  const audioUrl = await generateSceneNarrationUrl(narrationText, voiceId, novitaApiKey);

  // Download the audio file
  const resp = await fetch(audioUrl);
  if (!resp.ok) {
    throw new Error(`${LOG} Failed to download audio: HTTP ${resp.status}`);
  }
  const buffer = Buffer.from(await resp.arrayBuffer());
  console.log(`${LOG} Downloaded narration audio (${buffer.length} bytes)`);
  return buffer;
}
