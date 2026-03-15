// subtitleService.ts — SRT subtitle generation from scene narration
// Supports two modes:
// 1. Whisper-aligned (accurate) — uses OpenAI Whisper for word-level timestamps
// 2. Proportional fallback — estimates timing from word counts
//
// Both modes account for:
// - Crossfade overlap between scenes (subtitles shift earlier per transition)
// - Atempo speed-up (Whisper timestamps are from raw audio, scaled by tempo)

import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";

const LOG = "[subtitleService]";

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

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export interface SceneWhisperInput {
  sceneIndex: number;
  narrationText: string;
  duration: number;
  audioFilePath: string;
  tempo?: number; // atempo factor applied during stitching (1.0 = no change)
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
 */
export function formatSRTTime(seconds: number): string {
  if (isNaN(seconds)) seconds = 0;
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
 */
export function splitIntoSubtitleChunks(
  text: string,
  maxWordsPerChunk: number = 10
): string[] {
  if (!text || !text.trim()) return [];

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

    const atLimit = buffer.length >= maxWordsPerChunk;
    const endsWithPunctuation = /[.!?]$/.test(word);
    const endsWithClausePunct = /[,;:]$/.test(word) || word === "—";
    const nextWord = words[i + 1];
    const nextIsConjunction =
      nextWord !== undefined && SPLIT_WORDS.has(nextWord.toLowerCase());

    if (endsWithPunctuation && buffer.length >= 3) {
      flushBuffer();
      continue;
    }

    if (atLimit) {
      if (endsWithClausePunct || nextIsConjunction || endsWithPunctuation) {
        flushBuffer();
        continue;
      }
      flushBuffer();
      continue;
    }

    if (buffer.length >= 5 && (endsWithClausePunct || endsWithPunctuation)) {
      flushBuffer();
      continue;
    }

    if (buffer.length >= 5 && nextIsConjunction) {
      flushBuffer();
      continue;
    }
  }

  return chunks
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

// ---------------------------------------------------------------------------
// Whisper word-level alignment
// ---------------------------------------------------------------------------

/**
 * Extracts word-level timestamps from an audio file using OpenAI Whisper API.
 * Returns an array of { word, start, end } objects.
 */
async function getWhisperWordTimestamps(
  audioFilePath: string,
  openaiApiKey: string
): Promise<WhisperWord[]> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const fileHandle = await fs.open(audioFilePath, "r");
  try {
    const fileStream = fileHandle.createReadStream();

    // Whisper needs a File-like object — use the OpenAI SDK's toFile helper
    const fileName = path.basename(audioFilePath);
    const audioFile = await OpenAI.toFile(fileStream, fileName);

    const response = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    const words = (response as any).words;
    if (!Array.isArray(words) || words.length === 0) {
      return [];
    }

    return words.map((w: any) => ({
      word: String(w.word).trim(),
      start: Number(w.start),
      end: Number(w.end),
    }));
  } finally {
    await fileHandle.close();
  }
}

/**
 * Groups Whisper word timestamps into readable subtitle chunks,
 * using the same natural-boundary splitting logic but with real timing.
 *
 * `tempo` scales raw Whisper timestamps to match the sped-up audio in the final video.
 * e.g. if tempo=1.3, a word at 3.0s in raw audio plays at 3.0/1.3=2.3s in the video.
 */
function groupWordsIntoTimedChunks(
  words: WhisperWord[],
  sceneOffset: number,
  tempo: number = 1.0,
  maxWordsPerChunk: number = 10
): SubtitleEntry[] {
  if (words.length === 0) return [];

  const t = Math.max(1.0, tempo); // safety: never divide by <1

  const entries: SubtitleEntry[] = [];
  let buffer: WhisperWord[] = [];

  const flushBuffer = (index: number): number => {
    if (buffer.length === 0) return index;
    const text = buffer.map((w) => w.word).join(" ").trim();
    if (text.length > 0) {
      entries.push({
        index,
        // Scale Whisper timestamps by tempo to match sped-up audio in final video
        startTime: formatSRTTime(sceneOffset + buffer[0].start / t),
        endTime: formatSRTTime(sceneOffset + buffer[buffer.length - 1].end / t),
        text,
      });
      index++;
    }
    buffer = [];
    return index;
  };

  let entryIndex = 1;

  for (let i = 0; i < words.length; i++) {
    buffer.push(words[i]);

    const isLast = i === words.length - 1;
    if (isLast) {
      entryIndex = flushBuffer(entryIndex);
      break;
    }

    const word = words[i].word;
    const atLimit = buffer.length >= maxWordsPerChunk;
    const endsWithPunctuation = /[.!?]$/.test(word);
    const endsWithClausePunct = /[,;:]$/.test(word) || word === "—";
    const nextWord = words[i + 1]?.word;
    const nextIsConjunction =
      nextWord !== undefined && SPLIT_WORDS.has(nextWord.toLowerCase());

    if (endsWithPunctuation && buffer.length >= 3) {
      entryIndex = flushBuffer(entryIndex);
      continue;
    }

    if (atLimit) {
      entryIndex = flushBuffer(entryIndex);
      continue;
    }

    if (buffer.length >= 5 && (endsWithClausePunct || endsWithPunctuation)) {
      entryIndex = flushBuffer(entryIndex);
      continue;
    }

    if (buffer.length >= 5 && nextIsConjunction) {
      entryIndex = flushBuffer(entryIndex);
      continue;
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Whisper-based SRT generation (accurate)
// ---------------------------------------------------------------------------

/**
 * Generates SRT subtitles using Whisper word-level timestamps for each scene.
 * Falls back to proportional timing per-scene if Whisper fails for that scene.
 *
 * @param crossfadeSec — seconds of overlap per scene transition (0.5 for xfade)
 */
export async function generateSRTWithWhisper(
  scenes: SceneWhisperInput[],
  openaiApiKey: string,
  crossfadeSec: number = 0
): Promise<string> {
  if (!scenes || scenes.length === 0) return "";

  const sorted = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);
  const allEntries: SubtitleEntry[] = [];
  let globalIndex = 1;
  let cumulativeTime = 0;

  for (let scIdx = 0; scIdx < sorted.length; scIdx++) {
    const scene = sorted[scIdx];
    const { narrationText, duration, audioFilePath } = scene;
    const tempo = scene.tempo || 1.0;

    if (!narrationText || !narrationText.trim()) {
      cumulativeTime += Math.max(0, duration);
      // Subtract crossfade overlap for next scene (except after last)
      if (crossfadeSec > 0 && scIdx < sorted.length - 1) {
        cumulativeTime -= crossfadeSec;
      }
      continue;
    }

    let sceneEntries: SubtitleEntry[] = [];

    try {
      console.log(`${LOG} Whisper alignment for scene ${scene.sceneIndex}...`);
      const words = await getWhisperWordTimestamps(audioFilePath, openaiApiKey);

      if (words.length > 0) {
        sceneEntries = groupWordsIntoTimedChunks(words, cumulativeTime, tempo);
        console.log(`${LOG} Scene ${scene.sceneIndex}: ${words.length} words → ${sceneEntries.length} subtitle chunks (Whisper, tempo=${tempo.toFixed(2)})`);
      } else {
        console.warn(`${LOG} Scene ${scene.sceneIndex}: Whisper returned no words, falling back to proportional`);
      }
    } catch (err: any) {
      console.warn(`${LOG} Scene ${scene.sceneIndex}: Whisper failed (${err.message}), falling back to proportional`);
    }

    // Fallback: proportional timing if Whisper failed or returned nothing
    if (sceneEntries.length === 0) {
      const chunks = splitIntoSubtitleChunks(narrationText);
      if (chunks.length > 0) {
        const isLastScene = scIdx === sorted.length - 1;
        // Shorten subtitle window by crossfade overlap so subtitles don't bleed into next scene
        const effectiveDuration = Math.max(0, duration) - (isLastScene ? 0 : crossfadeSec);
        const safeDuration = Math.max(0, effectiveDuration);
        const chunkWordCounts = chunks.map((c) => c.split(/\s+/).length);
        const totalWords = chunkWordCounts.reduce((a, b) => a + b, 0);

        let elapsed = 0;
        for (let i = 0; i < chunks.length; i++) {
          const weight = totalWords > 0 ? chunkWordCounts[i] / totalWords : 1 / chunks.length;
          const chunkDur = safeDuration * weight;

          sceneEntries.push({
            index: 0, // re-indexed below
            startTime: formatSRTTime(cumulativeTime + elapsed),
            endTime: formatSRTTime(cumulativeTime + elapsed + chunkDur),
            text: chunks[i],
          });
          elapsed += chunkDur;
        }
      }
    }

    // Re-index entries with global counter
    for (const entry of sceneEntries) {
      entry.index = globalIndex++;
      allEntries.push(entry);
    }

    cumulativeTime += Math.max(0, duration);
    // Subtract crossfade overlap for next scene (except after last)
    if (crossfadeSec > 0 && scIdx < sorted.length - 1) {
      cumulativeTime -= crossfadeSec;
    }
  }

  return allEntries
    .map((e) => `${e.index}\n${e.startTime} --> ${e.endTime}\n${e.text}`)
    .join("\n\n")
    + (allEntries.length > 0 ? "\n" : "");
}

// ---------------------------------------------------------------------------
// Proportional SRT generation (fallback, no API needed)
// ---------------------------------------------------------------------------

/**
 * Generates SRT subtitles using proportional word-count timing (no API needed).
 *
 * @param crossfadeSec — seconds of overlap per scene transition (0.5 for xfade)
 */
export function generateSRT(scenes: SceneTimingInput[], crossfadeSec: number = 0): string {
  if (!scenes || scenes.length === 0) return "";

  const entries: SubtitleEntry[] = [];
  let globalIndex = 1;
  let cumulativeTime = 0;

  const sorted = [...scenes].sort((a, b) => a.sceneIndex - b.sceneIndex);

  for (let scIdx = 0; scIdx < sorted.length; scIdx++) {
    const scene = sorted[scIdx];
    const { narrationText, duration } = scene;

    if (!narrationText || !narrationText.trim()) {
      cumulativeTime += Math.max(0, duration);
      if (crossfadeSec > 0 && scIdx < sorted.length - 1) {
        cumulativeTime -= crossfadeSec;
      }
      continue;
    }

    const chunks = splitIntoSubtitleChunks(narrationText);
    if (chunks.length === 0) {
      cumulativeTime += Math.max(0, duration);
      if (crossfadeSec > 0 && scIdx < sorted.length - 1) {
        cumulativeTime -= crossfadeSec;
      }
      continue;
    }

    const isLastScene = scIdx === sorted.length - 1;
    // Shorten subtitle window by crossfade overlap so subtitles don't bleed into next scene
    const effectiveDuration = Math.max(0, duration) - (isLastScene ? 0 : crossfadeSec);
    const safeDuration = Math.max(0, effectiveDuration);

    const chunkWordCounts = chunks.map((c) => c.split(/\s+/).length);
    const totalWords = chunkWordCounts.reduce((a, b) => a + b, 0);

    let elapsed = 0;
    for (let i = 0; i < chunks.length; i++) {
      const weight = totalWords > 0 ? chunkWordCounts[i] / totalWords : 1 / chunks.length;
      const chunkDur = safeDuration * weight;
      const startSec = cumulativeTime + elapsed;
      const endSec = startSec + chunkDur;

      entries.push({
        index: globalIndex++,
        startTime: formatSRTTime(startSec),
        endTime: formatSRTTime(endSec),
        text: chunks[i],
      });

      elapsed += chunkDur;
    }

    cumulativeTime += Math.max(0, duration);
    // Subtract crossfade overlap for next scene (except after last)
    if (crossfadeSec > 0 && scIdx < sorted.length - 1) {
      cumulativeTime -= crossfadeSec;
    }
  }

  return entries
    .map(
      (e) =>
        `${e.index}\n${e.startTime} --> ${e.endTime}\n${e.text}`
    )
    .join("\n\n")
    + (entries.length > 0 ? "\n" : "");
}
