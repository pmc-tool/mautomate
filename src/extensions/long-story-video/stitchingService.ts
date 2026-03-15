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
import { generateSRT, generateSRTWithWhisper, type SceneTimingInput, type SceneWhisperInput } from "./subtitleService";
import { getTrackById, getRandomTrackForMood, type MusicMood } from "./musicLibrary";

const execFileAsync = promisify(execFile);

const LOG_PREFIX = "[stitchingService]";

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
  openaiApiKey?: string;
}

export interface StitchResult {
  finalVideoPath: string;
  srtPath?: string;
  durationSec: number;
}

// ── Helper: Download a URL to a local file (streaming, with retry) ────────

async function downloadFileOnce(
  url: string,
  destPath: string,
  maxRedirects = 5
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error(`${LOG_PREFIX} Too many redirects for ${url.substring(0, 80)}`));
      return;
    }

    const client = url.startsWith("https") ? https : http;

    const request = client.get(url, (response) => {
      if (
        response.statusCode &&
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        downloadFileOnce(response.headers.location, destPath, maxRedirects - 1)
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

      // Stream directly to file instead of buffering in memory
      const writeStream = fsSync.createWriteStream(destPath);
      response.pipe(writeStream);

      writeStream.on("finish", () => {
        writeStream.close();
        resolve();
      });

      writeStream.on("error", (err) => {
        // Clean up partial file
        fsSync.unlink(destPath, () => {});
        reject(new Error(`${LOG_PREFIX} Failed to write downloaded file to ${destPath}: ${err}`));
      });

      response.on("error", (err) => {
        writeStream.destroy();
        fsSync.unlink(destPath, () => {});
        reject(new Error(`${LOG_PREFIX} Download stream error: ${err}`));
      });
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

export async function downloadFile(
  url: string,
  destPath: string
): Promise<void> {
  console.log(`${LOG_PREFIX} Downloading ${url.substring(0, 80)}... -> ${destPath}`);

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await downloadFileOnce(url, destPath);

      // Validate file was written and is non-empty
      const stat = await fs.stat(destPath);
      if (stat.size === 0) {
        throw new Error(`Downloaded file is empty (0 bytes)`);
      }

      return;
    } catch (err: any) {
      console.warn(`${LOG_PREFIX} Download attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        const delay = 2000 * Math.pow(2, attempt - 1); // 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw new Error(`${LOG_PREFIX} Download failed after ${maxRetries} attempts: ${err.message}`);
      }
    }
  }
}

// ── Helper: Validate a downloaded video file with ffprobe ─────────────────

async function validateVideoFile(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    filePath,
  ]);
  const duration = parseFloat(stdout.trim());
  if (isNaN(duration) || duration <= 0) {
    throw new Error(`${LOG_PREFIX} Invalid video file: ${filePath} (duration=${stdout.trim()})`);
  }
  return duration;
}

// ── Helper: Probe duration of a remote video URL via ffprobe ─────────────────

export async function probeRemoteVideoDuration(videoUrl: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      videoUrl,
    ], { timeout: 20_000 });
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration) || duration <= 0) return null;
    // Round to nearest integer — StoryScene.duration is Int in the schema
    return Math.round(duration);
  } catch (err: any) {
    console.warn(`${LOG_PREFIX} probeRemoteVideoDuration failed: ${err.message}`);
    return null;
  }
}

// ── Helper: Run an FFmpeg command with timeout ──────────────────────────────

export async function runFFmpeg(
  args: string[],
  cwd: string,
  timeoutMs: number = 5 * 60 * 1000
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

// ── Helper: Clean up orphaned temp dirs older than 30 minutes ───────────────

export async function cleanupOrphanedTempDirs(): Promise<void> {
  try {
    const tmpDir = os.tmpdir();
    const entries = await fs.readdir(tmpDir);
    const cutoff = Date.now() - 30 * 60 * 1000;

    for (const entry of entries) {
      if (!entry.startsWith("story-stitch-")) continue;
      const fullPath = path.join(tmpDir, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory() && stat.mtimeMs < cutoff) {
          await fs.rm(fullPath, { recursive: true, force: true });
          console.log(`${LOG_PREFIX} Cleaned orphaned temp dir: ${fullPath}`);
        }
      } catch {
        // Ignore individual failures
      }
    }
  } catch (err) {
    console.warn(`${LOG_PREFIX} Failed to scan for orphaned temp dirs: ${err}`);
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

// ── Subtitle style helper ───────────────────────────────────────────────────

function getSubtitleStyle(resolution: "720p" | "1080p"): string {
  const fontSize = resolution === "1080p" ? 26 : 20;
  return `FontSize=${fontSize},FontName=Liberation Sans,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BackColour=&H80000000,BorderStyle=4,Outline=2,Shadow=1,MarginV=35,Alignment=2`;
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

  // Scale FFmpeg timeout with video duration: ~1 min per 20s of video, min 5 min
  const estimatedDuration = sortedScenes.reduce((sum, s) => sum + s.duration, 0);
  const ffmpegTimeout = Math.max(5, Math.ceil(estimatedDuration / 20)) * 60 * 1000;
  console.log(`${LOG_PREFIX} FFmpeg timeout: ${ffmpegTimeout / 1000}s for ${estimatedDuration}s of video`);

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

    // ── Step 2: Probe ACTUAL video + narration durations ────────────
    // Use the real video duration (not planned) to avoid frozen frames.
    // If narration is longer than the actual video, speed it up.

    console.log(`${LOG_PREFIX} Probing actual video & narration durations...`);

    const sceneDurations: number[] = []; // actual video duration (not planned)
    const narTempos: number[] = []; // atempo factors (1.0 = no change, >1.0 = speed up)

    for (const scene of sortedScenes) {
      const idx = padIndex(scene.sceneIndex);
      const rawVideoPath = path.join(workDir, `scene_${idx}_raw.mp4`);
      const narExt = scene.narrationUrl?.includes(".wav") ? "wav" : "mp3";
      const rawNarPath = path.join(workDir, `narration_${idx}_raw.${narExt}`);

      // Probe ACTUAL video duration — this is the truth, not scene.duration
      let actualVideoDuration = scene.duration; // fallback to planned
      try {
        const { stdout: videoProbe } = await execFileAsync("ffprobe", [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "csv=p=0",
          rawVideoPath,
        ]);
        const probed = parseFloat(videoProbe.trim());
        if (!isNaN(probed) && probed > 0) {
          actualVideoDuration = probed;
          if (Math.abs(probed - scene.duration) > 1.0) {
            console.warn(
              `${LOG_PREFIX}   Scene ${scene.sceneIndex}: actual video=${probed.toFixed(1)}s vs planned=${scene.duration}s — using actual`
            );
          }
        }
      } catch (probeErr: any) {
        console.warn(`${LOG_PREFIX}   Scene ${scene.sceneIndex}: video probe failed, using planned duration ${scene.duration}s`);
      }

      sceneDurations.push(actualVideoDuration);

      // Probe narration duration
      let narDuration = 0;
      try {
        const { stdout } = await execFileAsync("ffprobe", [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "csv=p=0",
          rawNarPath,
        ]);
        narDuration = parseFloat(stdout.trim());
      } catch (narProbeErr: any) {
        console.warn(`${LOG_PREFIX}   Scene ${scene.sceneIndex}: narration probe failed (${narProbeErr.message}), no tempo adjustment`);
      }

      if (isNaN(narDuration) || narDuration <= 0) {
        console.warn(`${LOG_PREFIX}   Scene ${scene.sceneIndex}: invalid narration duration, no tempo adjustment`);
        narTempos.push(1.0);
        continue;
      }

      if (narDuration > actualVideoDuration) {
        // Speed up narration to fit actual video duration (cap at 1.5x to keep intelligible)
        const tempo = Math.min(1.5, narDuration / actualVideoDuration);
        narTempos.push(tempo);
        console.log(
          `${LOG_PREFIX}   Scene ${scene.sceneIndex}: narration=${narDuration.toFixed(1)}s > video=${actualVideoDuration.toFixed(1)}s → atempo=${tempo.toFixed(2)}x`
        );
      } else {
        narTempos.push(1.0);
        console.log(
          `${LOG_PREFIX}   Scene ${scene.sceneIndex}: narration=${narDuration.toFixed(1)}s ≤ video=${actualVideoDuration.toFixed(1)}s → no adjustment`
        );
      }
    }

    console.log(`${LOG_PREFIX}   Pre-segment durations: ${sceneDurations.map(d => d.toFixed(1)).join(", ")}s`);

    // ── Step 3: Create per-scene intermediate segments ──────────────────
    // Each scene becomes a self-contained mp4 with:
    // - Video re-encoded to uniform resolution/fps/codec at intermediate quality (CRF 18)
    // - Narration audio muxed in
    // Using CRF 18 for intermediates to preserve quality for final encode.

    console.log(`${LOG_PREFIX} Creating per-scene segments...`);

    for (let i = 0; i < sortedScenes.length; i++) {
      const scene = sortedScenes[i];
      const idx = padIndex(scene.sceneIndex);
      const narExt = scene.narrationUrl?.includes(".wav") ? "wav" : "mp3";
      const rawNarPath = path.join(workDir, `narration_${idx}_raw.${narExt}`);

      const videoDur = sceneDurations[i]; // actual video duration from probe
      const tempo = narTempos[i];

      // Segment duration = actual video duration. No stretching, no freezing.
      // If narration overflows at 1.5x, it gets trimmed — but this is prevented
      // upstream: the planner writes narration for the actual model's output
      // duration (5s for wan2.1, requested duration for wan2.6).
      const durStr = videoDur.toFixed(3);

      // Video filter: uniform resolution/fps, yuv420p for browser compat
      const videoFilter = `fps=30,scale=${target.w}:${target.h}:force_original_aspect_ratio=decrease,pad=${target.w}:${target.h}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p`;

      // Audio filter: speed up narration if needed (atempo), pad/trim to segment duration
      // FFmpeg atempo range is 0.5–2.0
      let atempoChain = "";
      if (tempo > 1.0) {
        atempoChain = `atempo=${tempo.toFixed(4)},`;
      }
      const audioFilter = `${atempoChain}apad=whole_dur=${durStr},atrim=0:${durStr},aresample=48000`;

      // Create combined segment: video + speed-adjusted narration
      // Use CRF 18 for intermediates to preserve quality
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
          "-c:v", "libx264", "-preset", "medium", "-crf", "18",
          "-c:a", "aac", "-b:a", "192k",
          "-r", "30",
          "-movflags", "+faststart",
          `segment_${idx}.mp4`,
        ],
        workDir,
        ffmpegTimeout
      );

      console.log(`${LOG_PREFIX}   Segment ${scene.sceneIndex} created (${durStr}s, atempo=${tempo.toFixed(2)}x)`);
    }

    // Recalculate total after possible slow-mo extensions
    const totalDuration = sceneDurations.reduce((a, b) => a + b, 0);
    console.log(`${LOG_PREFIX}   Total duration: ${totalDuration.toFixed(1)}s (after adjustments)`);

    // ── Step 4: Crossfade & concatenate all segments ─────────────────
    // Use xfade transitions between scenes for smooth dissolves

    console.log(`${LOG_PREFIX} Crossfading and concatenating segments...`);

    if (sortedScenes.length === 1) {
      // Single scene — no crossfade needed, just rename
      await fs.rename(
        path.join(workDir, `segment_${padIndex(sortedScenes[0].sceneIndex)}.mp4`),
        path.join(workDir, "concatenated.mp4")
      );
    } else {
      // Build xfade filter chain for video and acrossfade for audio
      const XFADE_DURATION = 0.5;
      const inputs: string[] = [];
      for (let i = 0; i < sortedScenes.length; i++) {
        inputs.push("-i", `segment_${padIndex(sortedScenes[i].sceneIndex)}.mp4`);
      }

      // For xfade chain: offset for transition i→i+1 is sum of durations[0..i] minus i*XFADE_DURATION
      let videoFilter = "";
      let audioFilter = "";
      let prevVLabel = "0:v";
      let prevALabel = "0:a";

      for (let i = 1; i < sortedScenes.length; i++) {
        // Cumulative duration up to scene i (exclusive), minus overlaps from previous xfades
        let offset = 0;
        for (let j = 0; j < i; j++) {
          offset += sceneDurations[j];
        }
        offset -= (i - 1) * XFADE_DURATION; // each prior xfade consumed XFADE_DURATION
        offset -= XFADE_DURATION; // this xfade starts XFADE_DURATION before the cut point

        const isLast = i === sortedScenes.length - 1;
        const vOutLabel = isLast ? "vout" : `v${i}`;
        const aOutLabel = isLast ? "aout" : `a${i}`;

        videoFilter += `[${prevVLabel}][${i}:v]xfade=transition=fade:duration=${XFADE_DURATION}:offset=${Math.max(0, offset).toFixed(3)}[${vOutLabel}];`;
        audioFilter += `[${prevALabel}][${i}:a]acrossfade=d=${XFADE_DURATION}:c1=tri:c2=tri[${aOutLabel}];`;

        prevVLabel = vOutLabel;
        prevALabel = aOutLabel;
      }

      // Remove trailing semicolons
      videoFilter = videoFilter.replace(/;$/, "");
      audioFilter = audioFilter.replace(/;$/, "");

      const filterComplex = `${videoFilter};${audioFilter}`;

      await runFFmpeg(
        [
          "-y",
          ...inputs,
          "-filter_complex", filterComplex,
          "-map", "[vout]",
          "-map", "[aout]",
          "-c:v", "libx264", "-preset", "medium", "-crf", "18",
          "-c:a", "aac", "-b:a", "192k",
          "-movflags", "+faststart",
          "concatenated.mp4",
        ],
        workDir,
        ffmpegTimeout
      );
    }

    // Recalculate total duration accounting for crossfade overlaps
    const crossfadeOverlap = (sortedScenes.length - 1) * 0.5;
    const effectiveTotalDuration = totalDuration - crossfadeOverlap;

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

    // Scale fade durations to video length
    const fadeIn = effectiveTotalDuration <= 30 ? 1.0 : 2.0;
    const fadeOut = effectiveTotalDuration <= 30 ? 1.5 : 3.0;
    const fadeOutStart = Math.max(0, effectiveTotalDuration - fadeOut).toFixed(3);

    // Process music: loop if needed, trim to total duration, add fade-in/fade-out
    const trimDur = effectiveTotalDuration.toFixed(3);
    await runFFmpeg(
      [
        "-y",
        "-stream_loop", "-1",
        "-i", "music_raw.mp3",
        "-t", trimDur,
        "-af", `afade=t=in:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}`,
        "-c:a", "pcm_s16le",
        "music_processed.wav",
      ],
      workDir,
      ffmpegTimeout
    );

    // Mix: narration at full volume, background music at 0.15
    // normalize=0 prevents amix from dividing each input by number of inputs
    await runFFmpeg(
      [
        "-y",
        "-i", "concatenated.mp4",
        "-i", "music_processed.wav",
        "-filter_complex",
        `[0:a]volume=1.0[voice];[1:a]volume=0.15[bg];[voice][bg]amix=inputs=2:duration=first:normalize=0[audio]`,
        "-map", "0:v",
        "-map", "[audio]",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        "mixed.mp4",
      ],
      workDir,
      ffmpegTimeout
    );

    // ── Step 6: Generate & burn subtitles ──────────────────────────────

    const finalPath = path.join(workDir, "final.mp4");

    if (subtitlesEnabled) {
      let srtContent: string;

      // Crossfade duration used for subtitle timing alignment
      const xfadeSec = sortedScenes.length > 1 ? 0.5 : 0;

      if (input.openaiApiKey) {
        // Use Whisper for word-level aligned subtitles
        console.log(`${LOG_PREFIX} Generating subtitles with Whisper word-level alignment...`);

        const whisperInputs: SceneWhisperInput[] = sortedScenes.map((s, i) => {
          const idx = padIndex(s.sceneIndex);
          const narExt = s.narrationUrl?.includes(".wav") ? "wav" : "mp3";
          return {
            sceneIndex: s.sceneIndex,
            narrationText: s.narrationText,
            duration: sceneDurations[i],
            audioFilePath: path.join(workDir, `narration_${idx}_raw.${narExt}`),
            tempo: narTempos[i],
          };
        });

        try {
          srtContent = await generateSRTWithWhisper(whisperInputs, input.openaiApiKey, xfadeSec);
          console.log(`${LOG_PREFIX} Whisper-aligned SRT generated successfully`);
        } catch (err: any) {
          console.warn(`${LOG_PREFIX} Whisper alignment failed, falling back to proportional: ${err.message}`);
          const sceneTimings: SceneTimingInput[] = sortedScenes.map((s, i) => ({
            sceneIndex: s.sceneIndex,
            narrationText: s.narrationText,
            duration: sceneDurations[i],
          }));
          srtContent = generateSRT(sceneTimings, xfadeSec);
        }
      } else {
        // Proportional fallback (no OpenAI key)
        console.log(`${LOG_PREFIX} Generating subtitles with proportional timing...`);
        const sceneTimings: SceneTimingInput[] = sortedScenes.map((s, i) => ({
          sceneIndex: s.sceneIndex,
          narrationText: s.narrationText,
          duration: sceneDurations[i],
        }));
        srtContent = generateSRT(sceneTimings, xfadeSec);
      }

      const srtPath = path.join(workDir, "subtitles.srt");
      await fs.writeFile(srtPath, srtContent, "utf-8");
      console.log(`${LOG_PREFIX} SRT content:\n${srtContent}`);

      const subtitleStyle = getSubtitleStyle(resolution);

      // Single final encode at CRF 20 with subtitles burned in
      await runFFmpeg(
        [
          "-y",
          "-i", "mixed.mp4",
          "-vf", `subtitles=subtitles.srt:force_style='${subtitleStyle}'`,
          "-c:v", "libx264",
          "-preset", "medium",
          "-crf", "20",
          "-pix_fmt", "yuv420p",
          "-c:a", "copy",
          "-movflags", "+faststart",
          "final.mp4",
        ],
        workDir,
        ffmpegTimeout
      );
    } else {
      console.log(`${LOG_PREFIX} Subtitles disabled, finalizing...`);
      await fs.rename(path.join(workDir, "mixed.mp4"), finalPath);
    }

    console.log(
      `${LOG_PREFIX} Stitching complete: ${finalPath} (${effectiveTotalDuration.toFixed(1)}s)`
    );

    return {
      finalVideoPath: finalPath,
      srtPath: subtitlesEnabled ? path.join(workDir, "subtitles.srt") : undefined,
      durationSec: effectiveTotalDuration,
    };
  } catch (err) {
    await cleanupTempDir(workDir);
    throw err;
  }
}
