# Long Story Video Extension — Implementation Plan

User provides a single prompt (e.g., "How the pyramids were built"). The system produces a 1-2 minute narrated video with music, subtitles, and scene-by-scene editorial control.

## Pipeline

```
User Prompt → Story Plan (AI) → Scene Scripts → Video Clips (Novita) → Voice (TTS) → Music + Subtitles → Stitch → Final Video
                                      ↑
                              User can edit/regenerate any scene
```

---

## Agent Parallelization Map

```
WAVE 1 — Foundation (must complete first, single agent)
  └── Agent 0: Schema + Registry + Credits + main.wasp

WAVE 2 — Backend Services (4 agents in parallel, no interdependencies)
  ├── Agent A: Novita Video Client + Last-Frame Extraction
  ├── Agent B: Story Planner Service (OpenAI)
  ├── Agent C: TTS Narration Service
  └── Agent D: Music Library + Subtitle Generator

WAVE 3 — Pipeline + UI (3 agents in parallel)
  ├── Agent E: Generation Operations + Background Job (depends on A)
  ├── Agent F: Stitching Service (depends on C, D)
  └── Agent G: UI Pages — Wizard + Editor (depends on B)

WAVE 4 — Final UI + Hardening (2 agents in parallel)
  ├── Agent H: UI Pages — Dashboard + Gallery
  └── Agent I: Error handling, validation, production hardening
```

---

# WAVE 1 — Foundation

> **Agent 0** — Must complete before any other wave starts.
> Single agent, touches shared files (schema.prisma, main.wasp, registry.ts, creditConfig.ts).

---

## Phase 1: Database Models (`schema.prisma`)

Add to `schema.prisma` and add User relations:

```prisma
model StoryProject {
  id                String        @id @default(uuid())
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  user              User          @relation(fields: [userId], references: [id])
  userId            String
  title             String
  prompt            String        // original user prompt
  targetDuration    Int           @default(60)      // seconds: 60 or 120
  resolution        String        @default("720p")
  voiceId           String?                         // TTS voice identifier
  musicTrackId      String?                         // selected background music
  musicMood         String?                         // epic|calm|mysterious|upbeat|dramatic
  status            String        @default("draft") // draft|planning|planned|generating|narrating|stitching|completed|failed
  progress          Int           @default(0)
  finalVideoUrl     String?
  thumbnailUrl      String?
  totalCredits      Int           @default(0)
  errorMessage      String?
  metadata          Json?                           // extra config (subtitles on/off, etc.)
  scenes            StoryScene[]
  referenceImageUrl String?                         // user-uploaded reference image
}

model StoryScene {
  id              String       @id @default(uuid())
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  project         StoryProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  projectId       String
  sceneIndex      Int                           // order in story
  visualPrompt    String                        // video generation prompt
  narrationText   String                        // TTS narration script
  duration        Int          @default(5)      // 5, 10, or 15 seconds
  shotType        String       @default("single") // single|multi
  transitionNote  String?

  // Generation state
  status          String       @default("pending") // pending|generating|completed|failed
  progress        Int          @default(0)
  taskId          String?                        // Novita task_id
  videoUrl        String?                        // generated clip URL
  narrationUrl    String?                        // TTS audio URL
  inputImageUrl   String?                        // last frame from prev scene or user image
  thumbnailUrl    String?
  errorMessage    String?
  creditsCost     Int          @default(0)
  metadata        Json?
}
```

## Phase 2: Extension Registry (`src/extensions/registry.ts`)

Add entry to `EXTENSION_REGISTRY` array:

```typescript
{
  id: "long-story-video",
  name: "Long Story Video",
  description: "Create 1-2 minute narrated story videos from a single prompt — AI scenes, voice, music & subtitles.",
  icon: "Film",
  category: "ai",
  route: "/long-story",
  settingsKeys: [
    "ext.long-story-video.novita_api_key",
    "ext.long-story-video.price",
    "ext.long-story-video.stripe_price_id"
  ],
  isFree: false,
  defaultPrice: 20,
  isEnabled: true,
}
```

## Phase 3: Credit Action Types (`src/credits/creditConfig.ts`)

Add to `CreditActionType` enum and `CREDIT_COSTS` map:

```typescript
StoryPlan = "story_plan",              // 10 credits — AI scene planning
StoryBasic = "story_basic",            // 150 credits — ~1 min video (6-8 scenes)
StoryStandard = "story_standard",      // 300 credits — ~2 min video (12-16 scenes)
StorySceneRegen = "story_scene_regen", // 30 credits — single scene re-gen
```

**Deduction strategy:**
1. Planning: deduct 10 credits upfront
2. Generation: calculate total cost based on scene count × resolution, deduct all upfront
3. Scene regen: deduct per scene (30 credits)
4. Narration + stitching: included in generation cost (OpenAI TTS is cheap, FFmpeg is free)
5. Refund remaining if scenes fail and user abandons

## Phase 4: Wasp Declarations (`main.wasp`)

**Routes & Pages:**
- `/long-story` → LongStoryPage (dashboard)
- `/long-story/create` → StoryCreatePage (wizard)
- `/long-story/project/:id` → StoryEditorPage (scene editor)
- `/long-story/gallery` → StoryGalleryPage (completed stories)

**Queries:**
- `getStoryProjects` — list user's story projects
- `getStoryProject` — single project with scenes

**Actions:**
- `createStoryProject` — create from prompt
- `generateStoryPlan` — AI scene breakdown (OpenAI)
- `updateStoryPlan` — user edits scenes (CRUD)
- `startStoryGeneration` — kick off video gen for all scenes
- `regenerateScene` — re-generate single scene video
- `generateNarration` — TTS for all scenes
- `stitchStoryVideo` — FFmpeg concat + audio + subtitles
- `checkStoryStatus` — manual status refresh
- `deleteStoryProject` — delete project + scenes

**Job:**
- `storyStatusCheck` — PgBoss cron (every minute), poll Novita for scene status

---

# WAVE 2 — Backend Services (4 Agents in Parallel)

> All 4 agents work simultaneously. No dependencies between them.
> Each produces a standalone service file.

---

## Agent A: Novita Video Client

**File:** `src/extensions/long-story-video/novitaVideoClient.ts`

### A.1 API Client

Wrapper around Novita's async video API:

```typescript
// Submit text-to-video (Scene 1)
submitT2V(apiKey, params) → { task_id }
// Endpoint: POST https://api.novita.ai/v3/async/wan2.6-t2v

// Submit image-to-video (Scenes 2+, using last frame)
submitI2V(apiKey, params) → { task_id }
// Endpoint: POST https://api.novita.ai/v3/async/wan2.6-i2v

// Poll status
checkStatus(apiKey, task_id) → { status, progress_percent, videos[] }
// Endpoint: GET https://api.novita.ai/v3/async/task-result?task_id={task_id}
```

**Model: Wan 2.6** — chosen because:
- Up to **15s per clip** (longest available on Novita)
- `shot_type: "multi"` for automatic multi-shot within a scene
- `prompt_extend: true` for intelligent prompt enhancement
- Built-in audio support
- Reference video support for character consistency
- 720p / 1080p support

**Novita API pricing per scene:**

| Resolution | 5s | 10s | 15s |
|---|---|---|---|
| 720p | $0.50 | $1.00 | $1.50 |
| 1080p | $0.75 | $1.50 | $2.25 |

**Novita status values:**
- `TASK_STATUS_QUEUED` → progress 10%
- `TASK_STATUS_PROCESSING` → use `progress_percent` from response
- `TASK_STATUS_SUCCEED` → 100%, extract `videos[0].video_url`
- `TASK_STATUS_FAILED` → mark failed, refund credits

### A.2 Last-Frame Extraction

Server-side FFmpeg utility function:

```bash
ffmpeg -sseof -0.1 -i scene.mp4 -frames:v 1 -q:v 2 lastframe.jpg
```

- Downloads video clip to temp dir
- Extracts final frame as JPEG
- Uploads to S3
- Returns S3 URL for next scene's I2V input
- Cleans up temp files

---

## Agent B: Story Planner Service

**File:** `src/extensions/long-story-video/storyPlannerService.ts`

### B.1 Story Planning Service

Uses OpenAI (platform key from Settings table: `platform.openai_api_key`) to break a user prompt into scenes.

**Input:** User prompt + target duration (60 or 120s) + optional reference image description

**Output (structured JSON):**
```json
{
  "title": "How the Pyramids Were Built",
  "musicMood": "epic",
  "scenes": [
    {
      "sceneIndex": 0,
      "visualPrompt": "Aerial shot of the Giza plateau 4,500 years ago, golden sand stretching to the horizon, early morning light casting long shadows over limestone quarries where thousands of workers begin their day",
      "narrationText": "Four and a half thousand years ago, on the banks of the Nile, humanity embarked on one of its most ambitious projects ever conceived.",
      "duration": 10,
      "shotType": "single",
      "transitionNote": "Zoom into the quarry workers for next scene"
    }
  ]
}
```

**Prompt engineering requirements:**
- System prompt instructs GPT to write cinematic visual descriptions optimized for AI video generation
- Narration text written for spoken delivery (natural cadence, ~150 words/min)
- Scene durations MUST sum to target duration (60s or 120s)
- Each visual prompt describes camera angle, lighting, movement, subject
- Use `response_format: { type: "json_object" }` for reliable parsing
- Create OpenAI client dynamically per-request using key from Settings table

### B.2 Exports

```typescript
export async function generateStoryPlan(
  prompt: string,
  targetDuration: number,
  referenceImageDescription?: string,
  openaiApiKey: string
): Promise<StoryPlan>
```

---

## Agent C: TTS Narration Service

**File:** `src/extensions/long-story-video/ttsService.ts`

### C.1 TTS Service

**Primary: OpenAI TTS** (`tts-1-hd`)
- Uses platform OpenAI key from Settings table
- 6 voices: alloy, echo, fable, onyx, nova, shimmer
- Cost: ~$0.03 per 1K characters (negligible vs video cost)
- Output: MP3 per scene

### C.2 Voice Options

```typescript
export const VOICE_OPTIONS = [
  { id: "alloy", name: "Alloy", style: "Neutral", description: "Clean, balanced tone" },
  { id: "echo", name: "Echo", style: "Warm", description: "Warm and conversational" },
  { id: "fable", name: "Fable", style: "Storytelling", description: "Expressive, narrative style" },
  { id: "onyx", name: "Onyx", style: "Authoritative", description: "Deep, commanding presence" },
  { id: "nova", name: "Nova", style: "Friendly", description: "Bright and engaging" },
  { id: "shimmer", name: "Shimmer", style: "Gentle", description: "Soft and calming" },
];
```

### C.3 Exports

```typescript
// Generate TTS audio for a single scene
export async function generateSceneNarration(
  narrationText: string,
  voiceId: string,
  openaiApiKey: string
): Promise<Buffer>  // MP3 audio buffer

// Generate TTS for all scenes in a project
export async function generateAllNarrations(
  scenes: { id: string; narrationText: string }[],
  voiceId: string,
  openaiApiKey: string
): Promise<Map<string, Buffer>>  // sceneId → audio buffer
```

---

## Agent D: Music Library + Subtitle Generator

**Files:**
- `src/extensions/long-story-video/musicLibrary.ts`
- `src/extensions/long-story-video/subtitleService.ts`

### D.1 Music Library

Curated royalty-free background music registry (10-15 tracks):

```typescript
export interface MusicTrack {
  id: string;
  name: string;
  mood: "epic" | "calm" | "mysterious" | "upbeat" | "dramatic";
  file: string;       // filename in public/music/ or S3
  durationSec: number;
  description: string;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  { id: "epic-1", name: "Rise of Empires", mood: "epic", file: "epic-1.mp3", durationSec: 120, description: "Orchestral build-up with drums" },
  { id: "epic-2", name: "Ancient Glory", mood: "epic", file: "epic-2.mp3", durationSec: 150, description: "Grand cinematic strings" },
  { id: "calm-1", name: "Morning Light", mood: "calm", file: "calm-1.mp3", durationSec: 120, description: "Gentle piano with ambient pads" },
  { id: "calm-2", name: "Still Waters", mood: "calm", file: "calm-2.mp3", durationSec: 130, description: "Soft acoustic guitar" },
  { id: "mysterious-1", name: "Hidden Depths", mood: "mysterious", file: "mysterious-1.mp3", durationSec: 120, description: "Dark ambient with subtle tension" },
  { id: "mysterious-2", name: "Shadows", mood: "mysterious", file: "mysterious-2.mp3", durationSec: 140, description: "Eerie synths with deep bass" },
  { id: "upbeat-1", name: "Forward Motion", mood: "upbeat", file: "upbeat-1.mp3", durationSec: 120, description: "Energetic electronic pop" },
  { id: "upbeat-2", name: "New Day", mood: "upbeat", file: "upbeat-2.mp3", durationSec: 130, description: "Bright indie acoustic" },
  { id: "dramatic-1", name: "Turning Point", mood: "dramatic", file: "dramatic-1.mp3", durationSec: 120, description: "Intense orchestral with timpani" },
  { id: "dramatic-2", name: "Breaking Through", mood: "dramatic", file: "dramatic-2.mp3", durationSec: 140, description: "Powerful brass crescendo" },
];

export function getTracksByMood(mood: string): MusicTrack[]
export function getTrackById(id: string): MusicTrack | undefined
```

- AI suggests mood during story planning; user can override
- Music mixed at -15dB behind narration (ducked)
- Tracks must be royalty-free and included as static assets

### D.2 Subtitle Generator

```typescript
export interface SubtitleEntry {
  index: number;
  startTime: string;  // "00:00:05,000" SRT format
  endTime: string;    // "00:00:15,000"
  text: string;
}

// Generate SRT file content from scenes
export function generateSRT(
  scenes: { narrationText: string; duration: number; sceneIndex: number }[]
): string

// Calculate scene start/end times based on cumulative durations
// Split narration text into readable subtitle chunks (max ~10 words per line)
// Ensure timing aligns with scene boundaries
```

---

# WAVE 3 — Pipeline + UI (3 Agents in Parallel)

> Starts after Wave 2 completes.
> Agent E needs Agent A's output. Agent F needs C + D. Agent G needs B.

---

## Agent E: Generation Operations + Background Job

**Depends on:** Agent A (novitaVideoClient.ts)

**Files:**
- `src/extensions/long-story-video/operations.ts` — Project CRUD
- `src/extensions/long-story-video/generationOperations.ts` — Generation pipeline
- `src/extensions/long-story-video/storyCheckJob.ts` — PgBoss cron job

### E.1 Project CRUD (`operations.ts`)

```typescript
const EXTENSION_ID = "long-story-video";

// Guard: check extension is active for user
async function ensureExtensionActive(ueEntity, userId)

// Query: list user's story projects
export const getStoryProjects: GetStoryProjects<void, StoryProject[]>

// Query: single project with all scenes (ordered by sceneIndex)
export const getStoryProject: GetStoryProject<{ id: string }, StoryProjectWithScenes>

// Action: create new project from prompt
export const createStoryProject: CreateStoryProject<CreateArgs, StoryProject>

// Action: delete project + cascade scenes
export const deleteStoryProject: DeleteStoryProject<{ id: string }, void>
```

### E.2 Generation Pipeline (`generationOperations.ts`)

**`generateStoryPlan` action:**
1. Validate input (prompt, duration)
2. Deduct 10 credits (StoryPlan)
3. Call `storyPlannerService.generateStoryPlan()`
4. Create StoryScene records from plan
5. Update project: title, musicMood, status → "planned"
6. On failure: refund credits

**`updateStoryPlan` action:**
- Update scene fields (visualPrompt, narrationText, duration, shotType)
- Reorder scenes (update sceneIndex values)
- Add new scene / delete scene
- Only allowed when project status is "planned" (before generation)

**`startStoryGeneration` action:**
1. Calculate total credit cost: `sceneCount × 30 credits` (or resolution-adjusted)
2. Deduct credits upfront (StoryBasic or StoryStandard based on scene count)
3. Set project status → "generating"
4. **Scene 1**: Submit T2V to Novita with visualPrompt
   - If user provided reference image → use I2V instead
5. Update scene: status → "generating", save taskId
6. Scenes 2+ remain "pending" — handled by background job

**`regenerateScene` action:**
1. Deduct 30 credits (StorySceneRegen)
2. Reset scene: status → "generating", clear videoUrl/errorMessage
3. If previous scene has videoUrl → extract last frame → submit I2V
4. If no previous scene (scene 0) → submit T2V
5. Save taskId

**`checkStoryStatus` action:**
- Manual refresh: poll Novita for all "generating" scenes
- Update progress values
- Return current project state

### E.3 Visual Continuity Strategy

```
Scene 1 (T2V) → complete → extract last frame →
Scene 2 (I2V with last frame) → complete → extract last frame →
Scene 3 (I2V with last frame) → ...
```

- Scenes generated **sequentially** to maintain visual continuity
- User-uploaded image for a scene overrides the last-frame input
- Reference image from project seeds Scene 1 as I2V

### E.4 Background Job (`storyCheckJob.ts`)

PgBoss cron job — runs every minute:

1. Find all StoryScenes with status = "generating" (join project for API key)
2. For each: poll Novita `checkStatus(taskId)`
3. Update scene progress
4. **On completion:**
   - Save videoUrl + thumbnailUrl
   - Extract last frame → save as next scene's inputImageUrl
   - Submit next pending scene to Novita
   - If ALL scenes complete → set project status → "narrating"
   - Auto-trigger narration generation
5. **On failure:**
   - Set scene status → "failed" with error message
   - Refund that scene's credits
   - Pause pipeline (don't submit next scene)
   - User must retry or skip
6. **On timeout (>15 min):**
   - Mark scene as failed
   - Refund credits

### E.5 Narration + Stitching Triggers

When all scenes complete video generation:
1. Auto-call `generateNarration` → generates TTS for all scenes
2. Upload narration audio to S3, save narrationUrl per scene
3. Set project status → "stitching"
4. Auto-call stitching pipeline

---

## Agent F: Stitching Service

**Depends on:** Agent C (ttsService.ts), Agent D (musicLibrary.ts, subtitleService.ts)

**File:** `src/extensions/long-story-video/stitchingService.ts`

### F.1 FFmpeg Pipeline

Server-side FFmpeg composition:

```bash
# 1. Download all scene clips + narration audio + music track to temp dir

# 2. Concatenate video clips in order
ffmpeg -f concat -safe 0 -i scenes.txt -c copy concatenated.mp4

# 3. Concatenate narration audio files (timed to scene boundaries)
ffmpeg -f concat -safe 0 -i narrations.txt -c copy narration_full.mp3

# 4. Mix: video + narration + background music (looped, ducked)
ffmpeg -i concatenated.mp4 -i narration_full.mp3 -i music.mp3 \
  -filter_complex "[2:a]aloop=loop=-1:size=2e+09,volume=0.15[bg];[1:a][bg]amix=inputs=2:duration=first[audio]" \
  -map 0:v -map "[audio]" \
  -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k \
  mixed.mp4

# 5. Burn subtitles (if enabled)
ffmpeg -i mixed.mp4 -vf "subtitles=story.srt:force_style='FontSize=24,PrimaryColour=&Hffffff&'" \
  -c:v libx264 -preset medium -crf 23 -c:a copy \
  final.mp4
```

### F.2 `stitchStoryVideo` action

```typescript
export async function stitchStoryVideo(args: { projectId: string }, context): Promise<void>
```

1. Verify ALL scenes have `videoUrl` + `narrationUrl`
2. Get project settings (musicTrackId, subtitles toggle, resolution)
3. Create temp working directory
4. Download all assets (scene videos, narration audio, music file)
5. Generate `scenes.txt` concat file (ordered by sceneIndex)
6. Generate `narrations.txt` concat file
7. Generate SRT subtitle file using `subtitleService.generateSRT()`
8. Run FFmpeg pipeline (child_process.execFile)
9. Upload final MP4 to S3
10. Update project: status → "completed", finalVideoUrl, thumbnailUrl
11. Clean up temp directory
12. On failure: set status → "failed", preserve scene assets for retry

### F.3 Requirements

- FFmpeg must be installed on production server (`apt install ffmpeg` or Docker layer)
- Temp directory: `/tmp/story-stitch-{projectId}/`
- Max file size estimate: 1-2 min video ≈ 50-150MB
- Timeout: 5 minutes for FFmpeg process

---

## Agent G: UI — Creation Wizard + Scene Editor

**Depends on:** Agent B (storyPlannerService.ts for types/interfaces)

**Files:**
- `src/extensions/long-story-video/StoryCreatePage.tsx`
- `src/extensions/long-story-video/StoryEditorPage.tsx`
- `src/extensions/long-story-video/components/StoryWizard.tsx`
- `src/extensions/long-story-video/components/SceneTimeline.tsx`
- `src/extensions/long-story-video/components/SceneCard.tsx`
- `src/extensions/long-story-video/components/SceneEditor.tsx`
- `src/extensions/long-story-video/components/VoicePicker.tsx`
- `src/extensions/long-story-video/components/MusicPicker.tsx`
- `src/extensions/long-story-video/components/CostEstimate.tsx`
- `src/extensions/long-story-video/components/ProgressTracker.tsx`

### G.1 StoryCreatePage — 4-Step Wizard

**Step 1: Prompt**
- Text area for topic/story idea (min 20 chars, max 2000)
- Duration selector: 1 minute / 2 minutes (radio cards)
- Optional reference image upload (drag-drop, uses S3)
- Credit cost preview badge

**Step 2: Story Plan**
- Loading state with animation while AI generates
- Timeline view of all scenes as editable cards
- Each card: scene number, visual prompt (editable textarea), narration text (editable textarea), duration selector (5/10/15s)
- Drag-to-reorder scenes
- Add scene button (inserts blank scene)
- Delete scene button (with confirmation)
- "Regenerate Plan" button (re-calls AI, costs 10 more credits)
- Duration sum indicator (shows total vs target)

**Step 3: Style**
- Voice picker — 6 OpenAI voices with style tags
- Music mood selector — 5 moods (epic, calm, mysterious, upbeat, dramatic) with track previews
- Resolution selector: 720p / 1080p (with price difference shown)
- Subtitles toggle
- Per-scene image upload option (accordion, advanced)

**Step 4: Review & Generate**
- Summary card: scene count, total duration, resolution, voice, music
- Exact credit cost breakdown (planning + generation)
- "Generate Story Video" button
- On click: calls `startStoryGeneration` → redirects to StoryEditorPage

### G.2 StoryEditorPage — Scene Editor (Core UX)

**Layout:**
- Left panel (60%): Vertical timeline of scene cards
- Right panel (40%): Preview panel (selected scene video or final video)

**Scene Card (SceneCard.tsx):**
- Scene number badge + duration tag
- Visual prompt text (click to edit inline)
- Narration text (click to edit inline)
- Status indicator: pending (gray) / generating (blue + progress %) / completed (green) / failed (red)
- Video thumbnail preview (when completed, click to play in right panel)
- Actions row: Edit, Regenerate (30 credits), Upload Image, Play

**Top Controls:**
- Overall progress bar (scenes completed / total)
- Project status badge (planned / generating / narrating / stitching / completed)
- "Regenerate Scene" button — re-gen selected failed/completed scene
- "Finalize Video" button — appears when all scenes complete, triggers narration + stitching

**Right Panel:**
- Scene video player (when scene selected + completed)
- Or final video player (when project completed)
- Download button
- Generation log / error messages

**Polling:**
- `useQuery(getStoryProject)` with `refetchInterval: 5000` while status is generating/narrating/stitching

### G.3 Component Details

**SceneTimeline.tsx:** Vertical connected timeline with scene cards, drag handles, add buttons between scenes

**SceneEditor.tsx:** Expanded edit view for a single scene — full prompt textarea, narration textarea, duration dropdown, image upload, save/cancel

**VoicePicker.tsx:** Grid of voice cards with name, style tag, description. Selected state with checkmark.

**MusicPicker.tsx:** List of mood categories, each expandable with track cards. Preview button plays 10s sample.

**CostEstimate.tsx:** Breakdown badge showing: "Plan: 10cr + Generation: 150cr = Total: 160cr"

**ProgressTracker.tsx:** Horizontal bar with scene dots, colored by status. Shows "Scene 3/8 generating..."

---

# WAVE 4 — Final UI + Hardening (2 Agents in Parallel)

> Starts after Wave 3 completes.

---

## Agent H: UI — Dashboard + Gallery

**Files:**
- `src/extensions/long-story-video/LongStoryPage.tsx`
- `src/extensions/long-story-video/StoryGalleryPage.tsx`
- `src/extensions/long-story-video/components/StoryPlayer.tsx`

### H.1 LongStoryPage (Dashboard)

- Hero section: gradient background, "Create Your Story" CTA button → `/long-story/create`
- Stats row: total stories, completed, in progress, failed
- Recent stories section: grid of story cards (max 6)
- Each card: thumbnail, title, duration, scene count, status badge, date
- Click card → `/long-story/project/:id`
- Quick action buttons: Create New, View Gallery

### H.2 StoryGalleryPage

- Grid layout of all story projects
- Filter tabs: All / Completed / In Progress / Failed
- Sort dropdown: Newest / Oldest
- Pagination (12 per page)
- Each card: video thumbnail (or placeholder), title, duration, scene count, status, created date
- Click → StoryEditorPage
- Empty state with CTA to create first story

### H.3 StoryPlayer Component

- Full video player for completed stories
- Controls: play/pause, seek, volume, fullscreen
- Download button (direct S3 link)
- Video metadata: title, duration, resolution, created date

---

## Agent I: Error Handling, Validation & Production Hardening

**Touches:** All files created in Waves 2-3.

### I.1 Error Handling Matrix

| Failure Point | Handling |
|---|---|
| OpenAI plan generation fails | Refund 10 credits, show error toast, let user retry |
| Novita scene generation fails | Refund that scene's credits, mark failed, user can retry scene |
| Novita timeout (>15 min per scene) | Job marks as failed after threshold, auto-refund |
| TTS generation fails | Retry up to 3 times, then mark narration failed, allow retry |
| FFmpeg stitching fails | Separate status, retry without re-generating scenes |
| S3 upload fails | Retry with exponential backoff (3 attempts) |
| User has insufficient credits | Show 402 with required vs available, block generation |
| Scene video URL expired | Re-poll Novita for fresh URL (TTL is 3600s) |
| User deletes project during generation | Cancel pending Novita tasks, refund unspent credits |

### I.2 Input Validation (Zod schemas)

```typescript
const createProjectSchema = z.object({
  prompt: z.string().min(20).max(2000),
  targetDuration: z.enum(["60", "120"]).transform(Number),
  referenceImageUrl: z.string().url().optional(),
});

const updateSceneSchema = z.object({
  sceneId: z.string().uuid(),
  visualPrompt: z.string().min(10).max(2000).optional(),
  narrationText: z.string().min(10).max(1000).optional(),
  duration: z.number().refine(d => [5, 10, 15].includes(d)).optional(),
  shotType: z.enum(["single", "multi"]).optional(),
});

const startGenerationSchema = z.object({
  projectId: z.string().uuid(),
  voiceId: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]),
  musicTrackId: z.string().optional(),
  resolution: z.enum(["720p", "1080p"]),
  subtitlesEnabled: z.boolean().default(true),
});
```

### I.3 Production Safeguards

- **Idempotent operations**: Check scene status before re-submitting; duplicate submissions don't double-charge
- **Credit atomicity**: All deductions wrapped in `prisma.$transaction()`
- **Graceful degradation**: Individual scene failures don't kill the whole story
- **Progress persistence**: All state in DB, survives server restarts
- **Cleanup**: Temp files deleted after stitching; failed job temp files cleaned on next run
- **Rate limiting**: Max 3 concurrent stories per user (check in `startStoryGeneration`)
- **Extension guard**: Every operation calls `ensureExtensionActive()`
- **User isolation**: All queries filtered by `userId`
- **Auth check**: Every operation: `if (!context.user) throw new HttpError(401)`

---

# File Structure Summary

```
src/extensions/long-story-video/
│
│  ── BACKEND (Wave 2) ──────────────────────────
├── novitaVideoClient.ts         # Agent A: Novita API wrapper
├── storyPlannerService.ts       # Agent B: OpenAI story planning
├── ttsService.ts                # Agent C: OpenAI TTS narration
├── musicLibrary.ts              # Agent D: Background music registry
├── subtitleService.ts           # Agent D: SRT subtitle generator
│
│  ── PIPELINE (Wave 3) ──────────────────────────
├── operations.ts                # Agent E: Project CRUD
├── generationOperations.ts      # Agent E: Generation + narration actions
├── storyCheckJob.ts             # Agent E: PgBoss cron job
├── stitchingService.ts          # Agent F: FFmpeg video composition
│
│  ── UI PAGES (Wave 3-4) ────────────────────────
├── StoryCreatePage.tsx          # Agent G: 4-step creation wizard
├── StoryEditorPage.tsx          # Agent G: Scene editor (core UX)
├── LongStoryPage.tsx            # Agent H: Dashboard
├── StoryGalleryPage.tsx         # Agent H: Gallery
│
│  ── UI COMPONENTS (Wave 3) ─────────────────────
└── components/
    ├── StoryWizard.tsx          # Agent G: Multi-step wizard container
    ├── SceneTimeline.tsx        # Agent G: Vertical scene timeline
    ├── SceneCard.tsx            # Agent G: Individual scene card
    ├── SceneEditor.tsx          # Agent G: Expand/edit single scene
    ├── VoicePicker.tsx          # Agent G: TTS voice selection
    ├── MusicPicker.tsx          # Agent G: Background music selection
    ├── CostEstimate.tsx         # Agent G: Credit cost calculator
    ├── StoryPlayer.tsx          # Agent H: Final video player
    └── ProgressTracker.tsx      # Agent G: Overall + per-scene progress
```

---

# Execution Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│ WAVE 1 — Agent 0: Foundation                                       │
│ Schema + Registry + Credits + main.wasp                            │
│ (must complete before Wave 2)                                      │
├────────────┬────────────┬────────────┬────────────┬────────────────┤
│ WAVE 2     │            │            │            │                │
│ Agent A    │ Agent B    │ Agent C    │ Agent D    │  ← parallel    │
│ Novita     │ Story      │ TTS        │ Music +    │                │
│ Client     │ Planner    │ Service    │ Subtitles  │                │
├────────────┴──┬─────────┴──┬─────────┴────────────┤                │
│ WAVE 3        │            │                       │                │
│ Agent E       │ Agent F    │ Agent G               │  ← parallel   │
│ Gen Ops +     │ Stitching  │ UI: Wizard +          │                │
│ Check Job     │ Service    │ Editor                │                │
├───────────────┴──┬─────────┴───────────────────────┤                │
│ WAVE 4           │                                  │                │
│ Agent H          │ Agent I                          │  ← parallel   │
│ UI: Dashboard    │ Hardening +                      │                │
│ + Gallery        │ Validation                       │                │
└──────────────────┴──────────────────────────────────┘
```

**Total: 10 agents across 4 waves. Max 4 agents running in parallel.**
