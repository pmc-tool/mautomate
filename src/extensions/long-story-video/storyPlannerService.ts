import OpenAI from "openai";

export interface ScenePlan {
  sceneIndex: number;
  visualPrompt: string;
  narrationText: string;
  duration: number;
  shotType: "single" | "multi";
  transitionNote: string;
}

export interface StoryPlan {
  title: string;
  musicMood: "epic" | "calm" | "mysterious" | "upbeat" | "dramatic";
  scenes: ScenePlan[];
}

const VALID_MUSIC_MOODS = ["epic", "calm", "mysterious", "upbeat", "dramatic"] as const;
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
  "musicMood": "one of: epic, calm, mysterious, upbeat, dramatic — pick the mood that best fits the overall tone",
  "scenes": [
    {
      "sceneIndex": 0,
      "visualPrompt": "string — detailed cinematic visual description",
      "narrationText": "string — spoken narration script for this scene",
      "duration": 5 | 10 | 15,
      "shotType": "single | multi",
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

3. VISUAL PROMPTS: Write each visualPrompt as a detailed cinematic description optimized for AI video generation. Include:
   - Camera angle (close-up, wide shot, aerial, tracking, dolly, etc.)
   - Lighting (golden hour, neon-lit, overcast, chiaroscuro, etc.)
   - Movement (slow pan, static, handheld drift, sweeping crane, etc.)
   - Colors and color grading (warm tones, desaturated, high contrast, etc.)
   - Subjects and their actions (specific, concrete descriptions)
   - Environment and atmosphere (fog, rain, dust particles, etc.)
   CRITICAL: Do NOT include any text overlays, dialogue captions, titles, or written words in the visual prompts. Describe ONLY what the camera sees.

4. NARRATION TEXT: Write narrationText for spoken TTS delivery at approximately 150 words per minute. This means:
   - A 5s scene should have roughly 12-13 words of narration.
   - A 10s scene should have roughly 25 words of narration.
   - A 15s scene should have roughly 37-38 words of narration.
   Write in a natural spoken cadence — not overly formal, not too casual. The narration should complement the visuals, not describe them literally.

5. SHOT TYPE: Use "single" for scenes with one continuous camera setup, "multi" for scenes that imply multiple angles or a montage within the duration.

6. TRANSITION NOTES: Each transitionNote should describe how the visual connects to the NEXT scene (e.g., "Camera pushes into the darkness, dissolving into...", "Match cut from the spinning wheel to..."). The last scene's transitionNote should describe a closing/fadeout.

7. STORY STRUCTURE: Build a coherent narrative arc — opening hook, rising action, climax, resolution. Every scene should serve the story.`;

  if (referenceImageDescription) {
    prompt += `

8. VISUAL STYLE REFERENCE: The user has provided a reference image description. Incorporate this visual style throughout all scenes:
"${referenceImageDescription}"
Maintain consistency with this aesthetic in camera work, color palette, and atmosphere.`;
  }

  return prompt;
}

function validateAndFixStoryPlan(raw: unknown, targetDuration: number): StoryPlan {
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

    return {
      sceneIndex: idx,
      visualPrompt,
      narrationText,
      duration,
      shotType: shotType as "single" | "multi",
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
      // More aggressive fix: redistribute from the end
      let remaining = targetDuration;
      for (let i = 0; i < scenes.length - 1; i++) {
        remaining -= scenes[i].duration;
      }
      // Clamp last scene to valid value, then try adjusting second-to-last if needed
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

  // Enforce narration word counts — max ~2.5 words/sec per scene duration
  for (const scene of scenes) {
    const maxWords = Math.ceil(scene.duration * 2.5);
    const words = scene.narrationText.split(/\s+/);
    if (words.length > maxWords) {
      console.warn(
        `[storyPlanner] Scene ${scene.sceneIndex}: narration has ${words.length} words (max ${maxWords} for ${scene.duration}s). Trimming.`
      );
      scene.narrationText = words.slice(0, maxWords).join(" ");
      // Ensure it ends with punctuation
      if (!/[.!?]$/.test(scene.narrationText)) {
        scene.narrationText += ".";
      }
    }
  }

  return {
    title: (obj.title as string).trim(),
    musicMood: obj.musicMood as StoryPlan["musicMood"],
    scenes,
  };
}

export async function generateStoryPlan(
  prompt: string,
  targetDuration: number,
  openaiApiKey: string,
  referenceImageDescription?: string
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
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4096,
    });

    const choice = response.choices[0];
    if (!choice || !choice.message || !choice.message.content) {
      throw new Error("OpenAI returned an empty response");
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
    storyPlan = validateAndFixStoryPlan(parsed, targetDuration);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[storyPlanner] Validation failed: ${msg}`);
    throw new Error(`[storyPlanner] Generated story plan is invalid: ${msg}`);
  }

  const finalSum = storyPlan.scenes.reduce((sum, s) => sum + s.duration, 0);
  console.log(
    `[storyPlanner] Story plan generated: "${storyPlan.title}" — ${storyPlan.scenes.length} scenes, ${finalSum}s total, mood: ${storyPlan.musicMood}`
  );

  return storyPlan;
}
