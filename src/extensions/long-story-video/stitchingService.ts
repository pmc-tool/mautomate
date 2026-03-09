// stitchingService.ts — FFmpeg video stitching pipeline for Long Story Video
// Composes final story video from scene clips, narration, background music, and subtitles

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import https from "https";
import http from "http";

import fsSync from "fs";
import { generateSRT, type SceneTimingInput } from "./subtitleService";
import { getTrackById, getRandomTrackForMood, type MusicMood } from "./musicLibrary";

const execFileAsync = promisify(execFile);

const LOG_PREFIX = "[stitchingService]";
const FFMPEG_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface StitchInput {
  projectId: string;
  scenes: Array<{
    sceneIndex: number;
    videoUrl: string;
    narrationUrl: string;
    narrationText: string;
    duration: number;
  }>;
  musicTrackId?: string;
  musicMood?: string;
  subtitlesEnabled: boolean;
  resolution: "720p" | "1080p";
}

export interface StitchResult {
  finalVideoPath: string;
  srtPath?: string;
  durationSec: number;
}

// ── Helper: Download a URL to a local file ──────────────────────────────────

export async function downloadFile(
  url: string,
  destPath: string
): Promise<void> {
  console.log(`${LOG_PREFIX} Downloading ${url.substring(0, 80)}... -> ${destPath}`);

  return new Promise<void>((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;

    const request = client.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode && response.statusCode >= 400) {
        reject(
          new Error(
            `${LOG_PREFIX} Download failed: HTTP ${response.statusCode} for ${url.substring(0, 80)}`
          )
        );
        return;
      }

      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", async () => {
        try {
          await fs.writeFile(destPath, Buffer.concat(chunks));
          resolve();
        } catch (err) {
          reject(
            new Error(
              `${LOG_PREFIX} Failed to write downloaded file to ${destPath}: ${err}`
            )
          );
        }
      });
      response.on("error", (err) =>
        reject(
          new Error(`${LOG_PREFIX} Download stream error: ${err}`)
        )
      );
    });

    request.on("error", (err) =>
      reject(new Error(`${LOG_PREFIX} Download request error: ${err}`))
    );

    request.setTimeout(120_000, () => {
      request.destroy();
      reject(new Error(`${LOG_PREFIX} Download timed out`));
    });
  });
}

// ── Helper: Run an FFmpeg command with timeout ──────────────────────────────

export async function runFFmpeg(
  args: string[],
  cwd: string,
  timeoutMs: number = FFMPEG_TIMEOUT_MS
): Promise<void> {
  console.log(`${LOG_PREFIX} FFmpeg: ffmpeg ${args.slice(0, 6).join(" ")}...`);

  try {
    const { stderr } = await execFileAsync("ffmpeg", args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
    });

    if (stderr) {
      console.log(`${LOG_PREFIX} FFmpeg stderr (last 300 chars): ${stderr.slice(-300)}`);
    }
  } catch (err: any) {
    const message = err.stderr
      ? `FFmpeg failed: ${err.stderr.slice(-1000)}`
      : `FFmpeg failed: ${err.message}`;
    throw new Error(`${LOG_PREFIX} ${message}`);
  }
}

// ── Helper: Clean up temp directory ─────────────────────────────────────────

export async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(`${LOG_PREFIX} Cleaned up temp dir: ${dirPath}`);
  } catch (err) {
    console.warn(`${LOG_PREFIX} Failed to clean up temp dir ${dirPath}: ${err}`);
  }
}

function padIndex(index: number): string {
  return String(index).padStart(3, "0");
}

// ── Target resolution dimensions ────────────────────────────────────────────

function getTargetSize(resolution: "720p" | "1080p"): { w: number; h: number } {
  return resolution === "1080p" ? { w: 1920, h: 1080 } : { w: 1280, h: 720 };
}

// ── Extract a reference frame from a video URL ──────────────────────────
// Downloads video and extracts a single frame at the given timestamp.
// Used to create a character reference image for I2V consistency.

export async function extractReferenceFrame(
  videoUrl: string,
  outputPath: string,
  timestampSec: number = 2
): Promise<void> {
  const tmpDir = path.join(os.tmpdir(), `ref-frame-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });
  const tmpVideo = path.join(tmpDir, "ref_video.mp4");

  try {
    await downloadFile(videoUrl, tmpVideo);

    await execFileAsync("ffmpeg", [
      "-y",
      "-ss", String(timestampSec),
      "-i", tmpVideo,
      "-vframes", "1",
      "-q:v", "2",
      outputPath,
    ], { timeout: 30_000 });

    console.log(`${LOG_PREFIX} Reference frame extracted: ${outputPath}`);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Main stitching function ─────────────────────────────────────────────────

export async function stitchStoryVideo(
  input: StitchInput
): Promise<StitchResult> {
  const { projectId, scenes, musicTrackId, musicMood, subtitlesEnabled, resolution } = input;

  const sortedScenes = [...scenes].sort(
    (a, b) => a.sceneIndex - b.sceneIndex
  );

  const workDir = path.join(os.tmpdir(), `story-stitch-${projectId}`);
  await fs.mkdir(workDir, { recursive: true });
  console.log(`${LOG_PREFIX} Work directory: ${workDir}`);

  const target = getTargetSize(resolution);

  try {
    // ── Step 1: Download all assets ─────────────────────────────────────

    console.log(`${LOG_PREFIX} Downloading ${sortedScenes.length} scene(s)...`);

    const downloadPromises: Promise<void>[] = [];

    for (const scene of sortedScenes) {
      const idx = padIndex(scene.sceneIndex);

      // Download scene video
      downloadPromises.push(
        downloadFile(scene.videoUrl, path.join(workDir, `scene_${idx}_raw.mp4`))
      );

      // Download narration audio
      const narExt = scene.narrationUrl.includes(".wav") ? "wav" : "mp3";
      const narPath = path.join(workDir, `narration_${idx}_raw.${narExt}`);
      if (
        scene.narrationUrl.startsWith("http://") ||
        scene.narrationUrl.startsWith("https://")
      ) {
        downloadPromises.push(downloadFile(scene.narrationUrl, narPath));
      } else if (scene.narrationUrl.startsWith("data:audio")) {
        const commaIndex = scene.narrationUrl.indexOf(",");
        if (commaIndex !== -1) {
          const base64Data = scene.narrationUrl.substring(commaIndex + 1);
          const buffer = Buffer.from(base64Data, "base64");
          fsSync.writeFileSync(narPath, buffer);
        }
      }
    }

    await Promise.all(downloadPromises);
    console.log(`${LOG_PREFIX} All assets downloaded`);

    // ── Step 2: Probe narration durations & plan tempo adjustments ────
    // VIDEO drives timing. If narration is longer than scene, speed up narration.
    // Never freeze/pad video frames — it looks terrible.

    console.log(`${LOG_PREFIX} Probing narration durations...`);

    const sceneDurations: number[] = []; // always = scene.duration (video-driven)
    const narTempos: number[] = []; // atempo factors (1.0 = no change, >1.0 = speed up)

    for (const scene of sortedScenes) {
      const idx = padIndex(scene.sceneIndex);
      const narExt = scene.narrationUrl?.includes(".wav") ? "wav" : "mp3";
      const rawNarPath = path.join(workDir, `narration_${idx}_raw.${narExt}`);

      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        rawNarPath,
      ]);
      const narDuration = parseFloat(stdout.trim());

      // Always use scene.duration as the effective duration (video-driven)
      sceneDurations.push(scene.duration);

      if (isNaN(narDuration) || narDuration <= 0) {
        console.warn(`${LOG_PREFIX}   Scene ${scene.sceneIndex}: ffprobe returned invalid duration "${stdout.trim()}", using scene.duration=${scene.duration}s`);
        narTempos.push(1.0);
        continue;
      }

      if (narDuration > scene.duration) {
        // Speed up narration to fit scene duration (cap at 2.5x to keep intelligible)
        const tempo = Math.min(2.5, narDuration / scene.duration);
        narTempos.push(tempo);
        console.log(
          `${LOG_PREFIX}   Scene ${scene.sceneIndex}: narration=${narDuration.toFixed(1)}s > video=${scene.duration}s → atempo=${tempo.toFixed(2)}x`
        );
      } else {
        narTempos.push(1.0);
        console.log(
          `${LOG_PREFIX}   Scene ${scene.sceneIndex}: narration=${narDuration.toFixed(1)}s ≤ video=${scene.duration}s → no adjustment`
        );
      }
    }

    const totalDuration = sceneDurations.reduce((a, b) => a + b, 0);
    console.log(`${LOG_PREFIX}   Total duration: ${totalDuration.toFixed(1)}s (video-driven)`);

    // ── Step 3: Create per-scene combined segments ────────────────────
    // Each scene becomes a self-contained mp4 with:
    // - Video re-encoded to uniform resolution/fps/codec
    // - Stretched or trimmed to match narration duration
    // - Narration audio muxed in
    // This ensures concat works perfectly without desync.

    console.log(`${LOG_PREFIX} Creating per-scene segments...`);

    for (let i = 0; i < sortedScenes.length; i++) {
      const scene = sortedScenes[i];
      const idx = padIndex(scene.sceneIndex);
      const dur = sceneDurations[i]; // = scene.duration (video-driven)
      const durStr = dur.toFixed(3);
      const narExt = scene.narrationUrl?.includes(".wav") ? "wav" : "mp3";
      const tempo = narTempos[i];

      // Video filter: uniform resolution/fps, NO tpad/freeze — video plays naturally
      const videoFilter = `fps=30,scale=${target.w}:${target.h}:force_original_aspect_ratio=decrease,pad=${target.w}:${target.h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`;

      // Audio filter: speed up narration if needed (atempo), pad/trim to scene duration
      // FFmpeg atempo range is 0.5–2.0, so chain filters for higher values
      let atempoChain = "";
      if (tempo > 1.0) {
        if (tempo <= 2.0) {
          atempoChain = `atempo=${tempo.toFixed(4)},`;
        } else {
          // Chain two atempo filters for >2.0x (e.g., 2.5 = 2.0 * 1.25)
          atempoChain = `atempo=2.0,atempo=${(tempo / 2.0).toFixed(4)},`;
        }
      }
      const audioFilter = `${atempoChain}apad=whole_dur=${durStr},atrim=0:${durStr},aresample=44100`;

      // Create combined segment: video + speed-adjusted narration
      await runFFmpeg(
        [
          "-y",
          "-i", `scene_${idx}_raw.mp4`,
          "-i", `narration_${idx}_raw.${narExt}`,
          "-filter_complex",
          `[0:v]${videoFilter}[v];[1:a]${audioFilter}[a]`,
          "-map", "[v]",
          "-map", "[a]",
          "-t", durStr,
          "-c:v", "libx264", "-preset", "fast", "-crf", "23",
          "-c:a", "aac", "-b:a", "192k",
          "-r", "30",
          "-movflags", "+faststart",
          `segment_${idx}.mp4`,
        ],
        workDir
      );

      console.log(`${LOG_PREFIX}   Segment ${scene.sceneIndex} created (${durStr}s, atempo=${tempo.toFixed(2)}x)`);
    }

    // ── Step 4: Concatenate all segments ─────────────────────────────

    console.log(`${LOG_PREFIX} Concatenating segments...`);

    const concatList = sortedScenes
      .map((s) => `file 'segment_${padIndex(s.sceneIndex)}.mp4'`)
      .join("\n");
    await fs.writeFile(path.join(workDir, "concat.txt"), concatList, "utf-8");

    // All segments have identical encoding params, so -c copy is safe
    await runFFmpeg(
      [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", "concat.txt",
        "-c", "copy",
        "-movflags", "+faststart",
        "concatenated.mp4",
      ],
      workDir
    );

    // ── Step 5: Add background music ────────────────────────────────

    console.log(`${LOG_PREFIX} Adding background music...`);

    // Resolve the music track: explicit ID > mood-based random > default "calm"
    let musicTrack;
    if (musicTrackId) {
      musicTrack = getTrackById(musicTrackId);
      if (!musicTrack) {
        console.warn(`${LOG_PREFIX} Track ID "${musicTrackId}" not found, falling back to calm mood`);
        musicTrack = getRandomTrackForMood("calm");
      }
    } else {
      const mood = (musicMood as MusicMood) || "calm";
      musicTrack = getRandomTrackForMood(mood);
    }

    console.log(`${LOG_PREFIX} Using music track: ${musicTrack.name} (${musicTrack.id})`);

    // Download the music file
    const musicRawPath = path.join(workDir, "music_raw.mp3");
    await downloadFile(musicTrack.url, musicRawPath);

    // Process music: loop if needed, trim to total duration, add fade-in/fade-out
    const trimDur = totalDuration.toFixed(3);
    const fadeOutStart = Math.max(0, totalDuration - 3).toFixed(3);
    await runFFmpeg(
      [
        "-y",
        "-stream_loop", "-1",
        "-i", "music_raw.mp3",
        "-t", trimDur,
        "-af", `afade=t=in:d=2,afade=t=out:st=${fadeOutStart}:d=3`,
        "-c:a", "pcm_s16le",
        "music_processed.wav",
      ],
      workDir
    );

    // Mix: narration at full volume, background music at 0.15
    await runFFmpeg(
      [
        "-y",
        "-i", "concatenated.mp4",
        "-i", "music_processed.wav",
        "-filter_complex",
        `[0:a]volume=1.0[voice];[1:a]volume=0.15[bg];[voice][bg]amix=inputs=2:duration=first[audio]`,
        "-map", "0:v",
        "-map", "[audio]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "mixed.mp4",
      ],
      workDir
    );

    // ── Step 6: Generate & burn subtitles using narration-driven durations ─

    const finalPath = path.join(workDir, "final.mp4");

    if (subtitlesEnabled) {
      console.log(`${LOG_PREFIX} Generating subtitles with narration-driven timing...`);

      // Use the actual narration-driven durations, NOT the planned scene.duration
      const sceneTimings: SceneTimingInput[] = sortedScenes.map((s, i) => ({
        sceneIndex: s.sceneIndex,
        narrationText: s.narrationText,
        duration: sceneDurations[i], // <-- narration-driven duration
      }));

      const srtContent = generateSRT(sceneTimings);
      const srtPath = path.join(workDir, "subtitles.srt");
      await fs.writeFile(srtPath, srtContent, "utf-8");
      console.log(`${LOG_PREFIX} SRT content:\n${srtContent}`);

      // Copy SRT into workDir so we can use a simple relative path (no colons/escaping issues)
      const localSrtPath = path.join(workDir, "subtitles.srt");
      // srtPath is already in workDir, but let's be safe
      if (srtPath !== localSrtPath) {
        await fs.copyFile(srtPath, localSrtPath);
      }

      // Use relative path from workDir — avoids all path escaping issues
      await runFFmpeg(
        [
          "-y",
          "-i", "mixed.mp4",
          "-vf", `subtitles=subtitles.srt:force_style='FontSize=22,FontName=Arial,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,MarginV=35,Alignment=2'`,
          "-c:v", "libx264",
          "-preset", "fast",
          "-crf", "23",
          "-c:a", "copy",
          "-movflags", "+faststart",
          "final.mp4",
        ],
        workDir
      );
    } else {
      console.log(`${LOG_PREFIX} Subtitles disabled, finalizing...`);
      await fs.rename(path.join(workDir, "mixed.mp4"), finalPath);
    }

    console.log(
      `${LOG_PREFIX} Stitching complete: ${finalPath} (${totalDuration.toFixed(1)}s)`
    );

    return {
      finalVideoPath: finalPath,
      srtPath: subtitlesEnabled ? path.join(workDir, "subtitles.srt") : undefined,
      durationSec: totalDuration,
    };
  } catch (err) {
    await cleanupTempDir(workDir);
    throw err;
  }
}
