// subtitleService.ts — SRT subtitle generation from scene narration
// Standalone service, zero external dependencies, pure functions only

export interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface SceneTimingInput {
  sceneIndex: number;
  narrationText: string;
  duration: number;
}

// Words/conjunctions where splitting feels natural
const SPLIT_WORDS = new Set([
  "and",
  "but",
  "or",
  "which",
  "that",
  "when",
  "where",
]);

/**
 * Converts a decimal seconds value to SRT timestamp format "HH:MM:SS,mmm".
 *
 * @example formatSRTTime(65.5)  => "00:01:05,500"
 * @example formatSRTTime(0)     => "00:00:00,000"
 */
export function formatSRTTime(seconds: number): string {
  const totalMs = Math.round(Math.max(0, seconds) * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const pad3 = (n: number) => String(n).padStart(3, "0");

  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

/**
 * Splits narration text into readable subtitle chunks at natural boundaries.
 *
 * Priority order for split points:
 *   1. Sentence-ending punctuation (. ! ?)
 *   2. Clause-level punctuation (, ; : —)
 *   3. Conjunctions / relative pronouns (and, but, or, which, that, when, where)
 *   4. Hard word-count limit fallback
 *
 * @param text               The narration string to split
 * @param maxWordsPerChunk   Maximum words per subtitle chunk (default 10)
 * @returns                  Array of trimmed, non-empty subtitle strings
 */
export function splitIntoSubtitleChunks(
  text: string,
  maxWordsPerChunk: number = 10
): string[] {
  if (!text || !text.trim()) return [];

  // Normalise whitespace and em-dashes to a standard form
  const normalised = text
    .replace(/\s+/g, " ")
    .replace(/—/g, " — ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalised.split(" ");
  if (words.length === 0) return [];

  const chunks: string[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length > 0) {
      chunks.push(buffer.join(" ").trim());
      buffer = [];
    }
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    buffer.push(word);

    const isLast = i === words.length - 1;

    if (isLast) {
      flushBuffer();
      break;
    }

    // Check if we should split after this word
    const atLimit = buffer.length >= maxWordsPerChunk;
    const endsWithPunctuation = /[.!?]$/.test(word);
    const endsWithClausePunct = /[,;:]$/.test(word) || word === "—";
    const nextWord = words[i + 1];
    const nextIsConjunction =
      nextWord !== undefined && SPLIT_WORDS.has(nextWord.toLowerCase());

    // Always split at sentence boundaries if we have a reasonable chunk
    if (endsWithPunctuation && buffer.length >= 3) {
      flushBuffer();
      continue;
    }

    // Split at clause punctuation or before conjunctions when near/at limit
    if (atLimit) {
      // Try to find the best recent split point within the buffer
      if (endsWithClausePunct || nextIsConjunction || endsWithPunctuation) {
        flushBuffer();
        continue;
      }
      // Hard split at word-count limit
      flushBuffer();
      continue;
    }

    // Split at clause punctuation when buffer is reasonably sized (>= 5 words)
    if (buffer.length >= 5 && (endsWithClausePunct || endsWithPunctuation)) {
      flushBuffer();
      continue;
    }

    // Split before conjunctions when buffer is reasonably sized
    if (buffer.length >= 5 && nextIsConjunction) {
      flushBuffer();
      continue;
    }
  }

  // Filter out any empty strings that might have slipped through
  return chunks
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/**
 * Generates a complete SRT subtitle file from an ordered list of scenes.
 *
 * Each scene's narration is split into readable chunks. Subtitle timing is
 * calculated by dividing each scene's duration proportionally across its
 * chunks, with cumulative offsets so scenes play back-to-back.
 *
 * @param scenes  Ordered array of scenes with narration and duration
 * @returns       A standards-compliant SRT file as a string
 */
export function generateSRT(scenes: SceneTimingInput[]): string {
  if (!scenes || scenes.length === 0) return "";

  const entries: SubtitleEntry[] = [];
  let globalIndex = 1;
  let cumulativeTime = 0;

  // Sort by sceneIndex to guarantee order
  const sorted = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);

  for (const scene of sorted) {
    const { narrationText, duration } = scene;

    // Skip scenes with no narration — just advance the clock
    if (!narrationText || !narrationText.trim()) {
      cumulativeTime += Math.max(0, duration);
      continue;
    }

    const chunks = splitIntoSubtitleChunks(narrationText);
    if (chunks.length === 0) {
      cumulativeTime += Math.max(0, duration);
      continue;
    }

    const safeDuration = Math.max(0, duration);
    const chunkDuration = safeDuration / chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      const startSec = cumulativeTime + i * chunkDuration;
      const endSec = cumulativeTime + (i + 1) * chunkDuration;

      entries.push({
        index: globalIndex++,
        startTime: formatSRTTime(startSec),
        endTime: formatSRTTime(endSec),
        text: chunks[i],
      });
    }

    cumulativeTime += safeDuration;
  }

  // Build the SRT string — entries separated by blank lines
  return entries
    .map(
      (e) =>
        `${e.index}\n${e.startTime} --> ${e.endTime}\n${e.text}`
    )
    .join("\n\n")
    + (entries.length > 0 ? "\n" : "");
}
