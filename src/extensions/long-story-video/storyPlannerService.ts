import OpenAI from "openai";

export interface ScenePlan {
  sceneIndex: number;
  visualPrompt: string;
  narrationText: string;
  duration: number;
  shotType: "single" | "multi";
  hasCharacter: boolean;
  transitionNote: string;
}

export interface StoryPlan {
  title: string;
  musicMood: "epic" | "calm" | "mysterious" | "upbeat" | "dramatic" | "romantic" | "adventure" | "sad" | "fantasy" | "inspirational";
  characterDescription: string;
  styleGuide: string;
  scenes: ScenePlan[];
}

const VALID_MUSIC_MOODS = ["epic", "calm", "mysterious", "upbeat", "dramatic", "romantic", "adventure", "sad", "fantasy", "inspirational"] as const;
const VALID_DURATIONS = [5, 10, 15] as const;
const VALID_SHOT_TYPES = ["single", "multi"] as const;

function buildSystemPrompt(
  targetDuration: number,
  referenceImageDescription?: string
): string {
  const minScenes = targetDuration <= 20 ? 2 : targetDuration === 60 ? 6 : 12;
  const maxScenes = targetDuration <= 20 ? 3 : targetDuration === 60 ? 8 : 16;

  let prompt = `You are a cinematic story planner for AI-generated video productions. Your job is to take a user's topic and produce a structured JSON story plan with a scene-by-scene breakdown.

OUTPUT FORMAT — respond with a single JSON object, no markdown:
{
  "title": "string — a compelling, concise title for the story",
  "musicMood": "one of: epic, calm, mysterious, upbeat, dramatic, romantic, adventure, sad, fantasy, inspirational",
  "characterDescription": "string — detailed physical description of characters, or empty string if no characters needed",
  "styleGuide": "string — consistent visual art direction for the entire video",
  "scenes": [
    {
      "sceneIndex": 0,
      "visualPrompt": "string — detailed cinematic visual description for THIS specific scene",
      "narrationText": "string — spoken narration script for this scene",
      "duration": 5 | 10 | 15,
      "shotType": "single | multi",
      "hasCharacter": true | false,
      "transitionNote": "string — how this scene visually connects to the next"
    }
  ]
}

RULES:

1. SCENE COUNT: Generate between ${minScenes} and ${maxScenes} scenes (inclusive).

2. DURATION: The sum of all scene durations MUST equal exactly ${targetDuration} seconds. Each scene duration must be 5, 10, or 15 seconds.
   - Use 5s for quick cuts, fast transitions, or punchy moments.
   - Use 10s for standard narrative scenes.
   - Use 15s for establishing shots, climactic moments, or emotional beats.

3. CHARACTER DESCRIPTION (only when the story features human characters):
   IMPORTANT: Not every story needs characters. If the topic is about objects, places, concepts, history, nature, food, technology, etc., set "characterDescription" to an EMPTY STRING "". Do NOT invent characters just for the sake of it.

   Only provide a characterDescription when the story naturally centers on human characters (e.g. a personal journey, a fictional narrative, a biography). When characters ARE needed, include only T2V-relevant traits for consistency:
   - Age, gender, ethnicity
   - Hair: style and color
   - Outfit: clothing description with colors
   Skip facial details (eye color, face shape) — video models cannot render that level of detail.

   For multiple characters, describe each one separately with a name label.

   Also mark each scene with "hasCharacter": true or false to indicate whether the character appears in that scene. Scenes showing landscapes, objects, establishing shots, etc. should have "hasCharacter": false.

4. STYLE GUIDE (CRITICAL for visual consistency):
   The "styleGuide" field defines the art direction that applies to ALL scenes. Include:
   - Film style (e.g. "35mm cinematic film, shallow depth of field")
   - Color palette (e.g. "warm amber and teal color grading, slightly desaturated")
   - Lighting style (e.g. "natural golden hour lighting with soft shadows")
   - Overall mood (e.g. "nostalgic, dreamlike atmosphere with lens flare")
   - Rendering quality (e.g. "photorealistic, 4K, high detail")

   Example: "Photorealistic cinematic 4K, warm golden-hour color grading with amber highlights and deep teal shadows, natural soft lighting, shallow depth of field with bokeh, slight film grain, nostalgic documentary style."

5. VISUAL PROMPTS: These visual prompts will be processed by an AI text-to-video model. Focus on MOTION, temporal transitions, and camera movement. Describe what CHANGES over the scene duration, not static compositions.
   For 5s scenes, describe ONE simple motion. For 10s scenes, describe a beginning and end state. For 15s scenes, describe a full motion arc with 2-3 stages.
   Each scene must depict a DIFFERENT location, angle, action, or moment. Include:
   - Camera angle and movement (slow pan, tracking shot, dolly zoom, sweeping crane, etc.)
   - What MOVES or CHANGES during the scene (subject actions, camera transitions, lighting shifts)
   - Environment and atmosphere (fog, rain, dust particles, etc.)
   CRITICAL: Each scene MUST show a distinctly different moment, location, or action. Do NOT write similar scenes. Vary the camera angles, settings, and character positions dramatically.
   CRITICAL: Do NOT include any text overlays, dialogue captions, titles, or written words in the visual prompts. Describe ONLY what the camera sees.

6. NARRATION TEXT: Write narrationText for spoken TTS delivery at approximately 150 words per minute. This means:
   - A 5s scene should have roughly 12-13 words of narration.
   - A 10s scene should have roughly 25 words of narration.
   - A 15s scene should have roughly 37-38 words of narration.
   Write in a natural spoken cadence — not overly formal, not too casual. The narration should complement the visuals, not describe them literally.

7. SHOT TYPE: Use "single" for scenes with one continuous camera setup, "multi" for scenes that imply multiple angles or a montage within the duration.

8. TRANSITION NOTES: Each transitionNote should describe how the visual connects to the NEXT scene (e.g., "Camera pushes into the darkness, dissolving into...", "Match cut from the spinning wheel to..."). The last scene's transitionNote should describe a closing/fadeout.

9. STORY STRUCTURE: Build a coherent narrative arc — opening hook, rising action, climax, resolution. Every scene should serve the story.

10. SCENE VARIETY: NEVER repeat similar visual compositions. If one scene is a "wide aerial shot of a landscape", the next must use a completely different angle, scale, and subject. Alternate between wide/close/medium shots, static/moving camera, indoor/outdoor, macro/landscape. Each scene's visualPrompt should be visually distinguishable from every other scene even without narration.`;

  if (referenceImageDescription) {
    prompt += `

11. VISUAL STYLE REFERENCE: The user has provided a reference image description. Incorporate this visual style throughout all scenes:
"${referenceImageDescription}"
Maintain consistency with this aesthetic in camera work, color palette, and atmosphere. Integrate it into the styleGuide.`;
  }

  return prompt;
}

/**
 * Post-generation quality checks — auto-fix issues GPT commonly introduces.
 * Runs after all other validation/trimming.
 */
function validateSceneQuality(scenes: ScenePlan[]): void {
  // 1. Strip text overlay / written words instructions from visual prompts
  //    GPT sometimes adds "focus on the words '...'" or "text appears: '...'"
  const textOverlayPatterns = [
    /\b(?:focus(?:ing)?\s+on\s+the\s+words?|text\s+(?:appears?|reads?|overlay|fades?\s+in)|words?\s+(?:appear|fade|flash)|title\s+(?:card|text)|subtitle|caption|letter(?:s|ing)\s+(?:that|reading|saying)|written\s+(?:text|words))\b[^.!?]*[.!?]?\s*/gi,
    /["'][A-Z][^"']{5,}["']\s*(?:appears?|fades?\s+in|is\s+(?:written|displayed)|overlays?)/gi,
    /(?:with|showing)\s+(?:the\s+)?(?:text|words|title|caption)\s*[:"]?\s*["'][^"']+["']/gi,
  ];

  for (const scene of scenes) {
    let prompt = scene.visualPrompt;
    let cleaned = false;
    for (const pattern of textOverlayPatterns) {
      const before = prompt;
      prompt = prompt.replace(pattern, " ");
      if (prompt !== before) cleaned = true;
    }
    if (cleaned) {
      // Clean up double spaces and trailing whitespace
      scene.visualPrompt = prompt.replace(/\s{2,}/g, " ").trim();
      console.warn(
        `[storyPlanner] Scene ${scene.sceneIndex}: removed text overlay instructions from visual prompt`
      );
    }
  }

  // 2. Check for character description in non-character scenes
  //    (shouldn't happen after hasCharacter fix, but double-check)
  // This is handled by the prefix injection logic above, so just log if detected

  // 3. Detect duplicate/very similar visual compositions
  //    Compare adjacent scenes for repeated camera angles or subject descriptions
  const cameraAngles = scenes.map((s) => {
    const match = s.visualPrompt.match(
      /\b(close[- ]up|wide\s+shot|aerial|tracking\s+shot|dolly|crane|medium\s+shot|overhead|POV|establishing\s+shot|macro|low[- ]angle|high[- ]angle)\b/i
    );
    return match ? match[1].toLowerCase() : "";
  });

  for (let i = 1; i < scenes.length; i++) {
    if (cameraAngles[i] && cameraAngles[i] === cameraAngles[i - 1]) {
      console.warn(
        `[storyPlanner] Scene ${i - 1} and ${i} use same camera angle "${cameraAngles[i]}" — consider varying`
      );
      // Not auto-fixing camera angles (would require re-prompting GPT),
      // but the warning helps with debugging quality issues
    }
  }

  // 4. Final word count sanity check (should be caught by trimmer above, but verify)
  for (const scene of scenes) {
    const wordCount = scene.narrationText.split(/\s+/).length;
    const maxWords = Math.ceil(scene.duration * 2.5);
    if (wordCount > maxWords) {
      // This should never happen after the trimmer, but if it does, force cut
      console.error(
        `[storyPlanner] Scene ${scene.sceneIndex}: STILL over word limit after trimming (${wordCount}/${maxWords}). Force cutting.`
      );
      const forceCut = scene.narrationText.split(/\s+/).slice(0, maxWords).join(" ");
      scene.narrationText = forceCut.replace(/[,;:\-—]$/, "").trimEnd();
      if (!/[.!?]$/.test(scene.narrationText)) {
        scene.narrationText += ".";
      }
    }
  }
}

function validateAndFixStoryPlan(raw: unknown, targetDuration: number, quality?: string): StoryPlan {
  if (!raw || typeof raw !== "object") {
    throw new Error("Response is not a valid object");
  }

  const obj = raw as Record<string, unknown>;

  // Validate title
  if (typeof obj.title !== "string" || obj.title.trim().length === 0) {
    throw new Error("Missing or invalid 'title' field");
  }

  // Validate musicMood
  if (!VALID_MUSIC_MOODS.includes(obj.musicMood as typeof VALID_MUSIC_MOODS[number])) {
    console.warn(`[storyPlanner] Invalid musicMood "${obj.musicMood}", defaulting to "dramatic"`);
    obj.musicMood = "dramatic";
  }

  // Extract character description and style guide
  const characterDescription = typeof obj.characterDescription === "string"
    ? obj.characterDescription.trim()
    : "";
  if (!characterDescription) {
    console.warn("[storyPlanner] No characterDescription in response, character consistency may suffer");
  }

  const styleGuide = typeof obj.styleGuide === "string"
    ? obj.styleGuide.trim()
    : "";
  if (!styleGuide) {
    console.warn("[storyPlanner] No styleGuide in response, visual consistency may vary");
  }

  // Validate scenes array
  if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    throw new Error("Missing or empty 'scenes' array");
  }

  const scenes: ScenePlan[] = obj.scenes.map((scene: unknown, idx: number) => {
    if (!scene || typeof scene !== "object") {
      throw new Error(`Scene at index ${idx} is not a valid object`);
    }

    const s = scene as Record<string, unknown>;

    const visualPrompt = typeof s.visualPrompt === "string" ? s.visualPrompt.trim() : "";
    const narrationText = typeof s.narrationText === "string" ? s.narrationText.trim() : "";
    const transitionNote = typeof s.transitionNote === "string" ? s.transitionNote.trim() : "";

    if (!visualPrompt) {
      throw new Error(`Scene ${idx} has an empty visualPrompt`);
    }
    if (!narrationText) {
      throw new Error(`Scene ${idx} has an empty narrationText`);
    }

    let duration = typeof s.duration === "number" ? s.duration : 10;
    if (!VALID_DURATIONS.includes(duration as typeof VALID_DURATIONS[number])) {
      console.warn(`[storyPlanner] Scene ${idx} has invalid duration ${duration}, clamping to nearest valid`);
      duration = duration <= 7 ? 5 : duration <= 12 ? 10 : 15;
    }

    let shotType = typeof s.shotType === "string" ? s.shotType : "single";
    if (!VALID_SHOT_TYPES.includes(shotType as typeof VALID_SHOT_TYPES[number])) {
      shotType = "single";
    }

    const hasCharacter = typeof s.hasCharacter === "boolean" ? s.hasCharacter : false;

    return {
      sceneIndex: idx,
      visualPrompt,
      narrationText,
      duration,
      shotType: shotType as "single" | "multi",
      hasCharacter,
      transitionNote,
    };
  });

  // Fix duration sum
  const currentSum = scenes.reduce((sum, s) => sum + s.duration, 0);
  if (currentSum !== targetDuration) {
    console.warn(
      `[storyPlanner] Scene durations sum to ${currentSum}s, expected ${targetDuration}s. Adjusting last scene.`
    );
    const diff = targetDuration - currentSum;
    const lastScene = scenes[scenes.length - 1];
    const adjusted = lastScene.duration + diff;

    if (adjusted >= 5 && adjusted <= 15 && VALID_DURATIONS.includes(adjusted as typeof VALID_DURATIONS[number])) {
      lastScene.duration = adjusted;
    } else {
      let remaining = targetDuration;
      for (let i = 0; i < scenes.length - 1; i++) {
        remaining -= scenes[i].duration;
      }
      if (remaining === 5 || remaining === 10 || remaining === 15) {
        scenes[scenes.length - 1].duration = remaining;
      } else {
        console.warn(
          `[storyPlanner] Cannot cleanly adjust durations (remaining=${remaining}s). Forcing last scene to ${remaining > 10 ? 15 : remaining > 5 ? 10 : 5}s.`
        );
        const forced = remaining > 10 ? 15 : remaining > 5 ? 10 : 5;
        scenes[scenes.length - 1].duration = forced;
        const finalSum = scenes.reduce((sum, s) => sum + s.duration, 0);
        if (finalSum !== targetDuration) {
          console.warn(
            `[storyPlanner] Final duration sum is ${finalSum}s (target: ${targetDuration}s). Proceeding with best effort.`
          );
        }
      }
    }
  }

  // Prepend style guide to ALL scenes (visual consistency),
  // but only add character description to scenes that feature characters.
  // Cap total prompt length to avoid silent truncation by video models (~500 tokens ≈ 1500 chars).
  // Reorder: scene description FIRST (T2V models weight early tokens more),
  // then style guide and character description AFTER.
  const MAX_VISUAL_PROMPT_CHARS = 1500;
  const styleSuffix = styleGuide ? `. ${styleGuide}` : "";
  const charSuffix = characterDescription ? `. ${characterDescription}` : "";

  let charScenes = 0;
  for (const scene of scenes) {
    let fullPrompt: string;
    if (scene.hasCharacter && charSuffix) {
      fullPrompt = `${scene.visualPrompt}${styleSuffix}${charSuffix}`;
      charScenes++;
    } else {
      fullPrompt = `${scene.visualPrompt}${styleSuffix}`;
    }
    // If prompt exceeds model limit, trim the style/character suffix to preserve
    // the actual scene description (which is the most important part)
    if (fullPrompt.length > MAX_VISUAL_PROMPT_CHARS) {
      const scenePromptLen = scene.visualPrompt.length;
      const available = MAX_VISUAL_PROMPT_CHARS - scenePromptLen - 2;
      if (available > 100) {
        const suffix = (styleSuffix + (scene.hasCharacter ? charSuffix : "")).substring(0, available);
        fullPrompt = `${scene.visualPrompt}. ${suffix}`;
      } else {
        fullPrompt = fullPrompt.substring(0, MAX_VISUAL_PROMPT_CHARS);
      }
      console.warn(
        `[storyPlanner] Scene ${scene.sceneIndex}: prompt capped at ${MAX_VISUAL_PROMPT_CHARS} chars`
      );
    }
    scene.visualPrompt = fullPrompt;
  }
  if (styleSuffix || charSuffix) {
    console.log(`[storyPlanner] Appended style (${styleGuide.length} chars) to all ${scenes.length} scenes, character desc to ${charScenes}/${scenes.length} scenes`);
  }

  // Enforce narration word counts — max ~2.5 words/sec per scene duration
  // Trim at the last complete sentence boundary to avoid mid-sentence cuts
  for (const scene of scenes) {
    const maxWords = Math.ceil(scene.duration * 2.5);
    const words = scene.narrationText.split(/\s+/);
    if (words.length > maxWords) {
      console.warn(
        `[storyPlanner] Scene ${scene.sceneIndex}: narration has ${words.length} words (max ${maxWords} for ${scene.duration}s). Trimming.`
      );
      // Find the last sentence-ending punctuation within the word limit
      const truncated = words.slice(0, maxWords).join(" ");
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf(". "),
        truncated.lastIndexOf("! "),
        truncated.lastIndexOf("? "),
      );
      // Also check if the truncated text itself ends with sentence punctuation
      if (/[.!?]$/.test(truncated)) {
        scene.narrationText = truncated;
      } else if (lastSentenceEnd > truncated.length * 0.4) {
        // Only trim to sentence boundary if we keep at least 40% of the text
        scene.narrationText = truncated.substring(0, lastSentenceEnd + 1);
      } else {
        // No sentence boundary — try cutting at a clause boundary (comma, semicolon, em dash)
        // This produces more natural-sounding narration than a raw word cut
        const clauseEnd = Math.max(
          truncated.lastIndexOf(", "),
          truncated.lastIndexOf("; "),
          truncated.lastIndexOf(" — "),
          truncated.lastIndexOf(" – "),
          truncated.lastIndexOf("— "),
        );
        let finalNarration: string;
        if (clauseEnd > truncated.length * 0.4) {
          // Cut at clause boundary — sounds natural as a standalone phrase
          finalNarration = truncated.substring(0, clauseEnd).trimEnd();
        } else {
          // No clause boundary either — hard cut at word limit
          finalNarration = truncated.replace(/[,;:\-—]$/, "").trimEnd();
        }
        // Add period if doesn't end with sentence punctuation
        if (!/[.!?]$/.test(finalNarration)) {
          finalNarration += ".";
        }
        scene.narrationText = finalNarration;
        console.warn(
          `[storyPlanner] Scene ${scene.sceneIndex}: trimmed to ${finalNarration.split(/\s+/).length} words at ${clauseEnd > truncated.length * 0.4 ? "clause" : "word"} boundary (was ${words.length})`
        );
      }
    }
  }

  // Post-generation validation — catch common GPT mistakes
  validateSceneQuality(scenes);

  // Wan 2.1 always generates ~5s clips. Force all scenes to 5s for "low" quality
  // to prevent black frames. More scenes = faster-paced style which works well.
  if (quality === "low") {
    const totalTarget = scenes.reduce((sum, s) => sum + s.duration, 0);
    const neededScenes = Math.min(20, Math.ceil(totalTarget / 5));

    if (scenes.some(s => s.duration !== 5)) {
      console.log(`[storyPlanner] Wan 2.1 mode: forcing all scenes to 5s (${scenes.length} scenes → ${neededScenes} needed for ${totalTarget}s)`);

      // If we need more scenes than we have, duplicate some (cycle through originals)
      const originalSceneCount = scenes.length;
      while (scenes.length < neededScenes) {
        const sourceScene = scenes[scenes.length % originalSceneCount];
        scenes.push({
          ...sourceScene,
          sceneIndex: scenes.length,
          duration: 5,
        });
      }

      // Force all to 5s and trim excess
      for (const scene of scenes) {
        scene.duration = 5;
      }
      if (scenes.length > neededScenes) {
        scenes.length = neededScenes;
      }

      // Re-index
      for (let i = 0; i < scenes.length; i++) {
        scenes[i].sceneIndex = i;
      }
    }
  }

  return {
    title: (obj.title as string).trim(),
    musicMood: obj.musicMood as StoryPlan["musicMood"],
    characterDescription,
    styleGuide,
    scenes,
  };
}

export async function generateStoryPlan(
  prompt: string,
  targetDuration: number,
  openaiApiKey: string,
  referenceImageDescription?: string,
  quality?: string
): Promise<StoryPlan> {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("[storyPlanner] Prompt cannot be empty");
  }

  if (![20, 60, 120].includes(targetDuration)) {
    throw new Error(`[storyPlanner] targetDuration must be 20, 60, or 120, got ${targetDuration}`);
  }

  if (!openaiApiKey || openaiApiKey.trim().length === 0) {
    throw new Error("[storyPlanner] OpenAI API key is required");
  }

  console.log(
    `[storyPlanner] Generating story plan for "${prompt.substring(0, 80)}..." (${targetDuration}s target)`
  );

  const openai = new OpenAI({ apiKey: openaiApiKey });

  const systemPrompt = buildSystemPrompt(targetDuration, referenceImageDescription);

  let rawContent: string;

  try {
    // Scale max_tokens by story length to prevent truncation
    const maxTokens = targetDuration <= 20 ? 4096 : targetDuration <= 60 ? 8192 : 12000;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.65,
      max_tokens: maxTokens,
    });

    const choice = response.choices[0];
    if (!choice || !choice.message || !choice.message.content) {
      throw new Error("OpenAI returned an empty response");
    }

    // Detect truncated response
    if (choice.finish_reason === "length") {
      console.warn(`[storyPlanner] Response was truncated (hit ${maxTokens} token limit). Story may be incomplete.`);
    }

    rawContent = choice.message.content;
  } catch (error: unknown) {
    if (error instanceof OpenAI.APIError) {
      console.error(`[storyPlanner] OpenAI API error: ${error.status} ${error.message}`);
      throw new Error(
        `[storyPlanner] OpenAI API error (${error.status}): ${error.message}`
      );
    }
    if (error instanceof Error && error.message.startsWith("[storyPlanner]")) {
      throw error;
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[storyPlanner] Unexpected error calling OpenAI: ${msg}`);
    throw new Error(`[storyPlanner] Failed to generate story plan: ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    console.error(`[storyPlanner] Failed to parse OpenAI response as JSON`);
    console.error(`[storyPlanner] Raw response (first 500 chars): ${rawContent.substring(0, 500)}`);
    throw new Error("[storyPlanner] OpenAI returned invalid JSON. Please try again.");
  }

  let storyPlan: StoryPlan;
  try {
    storyPlan = validateAndFixStoryPlan(parsed, targetDuration, quality);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[storyPlanner] Validation failed: ${msg}`);
    throw new Error(`[storyPlanner] Generated story plan is invalid: ${msg}`);
  }

  const finalSum = storyPlan.scenes.reduce((sum, s) => sum + s.duration, 0);
  console.log(
    `[storyPlanner] Story plan generated: "${storyPlan.title}" — ${storyPlan.scenes.length} scenes, ${finalSum}s total, mood: ${storyPlan.musicMood}, charDesc: ${storyPlan.characterDescription.length} chars, styleGuide: ${storyPlan.styleGuide.length} chars`
  );

  return storyPlan;
}
