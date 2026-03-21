# StoryStrip AI — API Contract

> Canonical source of truth for all data shapes exchanged between frontend and backend.
> Both sides MUST use these schemas exactly. Do not invent fields.

---

## Base URL

```
Development:  http://localhost:8000
Production:   https://api.storystrip.ai   (TBD)
```

All endpoints return `Content-Type: application/json` unless noted.

---

## Shared Types

These types appear in multiple request/response bodies. Both frontend (TypeScript) and backend (Pydantic) must implement them identically.

### `ArtStyle`

```ts
type ArtStyle = "manga" | "marvel" | "chibi" | "noir" | "webtoon" | "pixel" | "vintage"
```

### `BubbleType`

```ts
type BubbleType = "speech" | "thought" | "shout"
```

### `CharacterPosition`

```ts
type CharacterPosition = "left" | "center" | "right"
```

### `InputType` (backend-classified, returned in response)

```ts
type InputType = "url" | "history" | "drama" | "freeform"
```

### `DialogueLine`

```ts
interface DialogueLine {
  speaker: string        // character name
  text: string           // max 15 words
  bubble_type: BubbleType
}
```

### `Character`

```ts
interface Character {
  name: string
  emotion: string        // e.g. "angry", "excited", "fearful"
  position: CharacterPosition
}
```

### `Panel`

```ts
interface Panel {
  panel_number: number   // 1–6
  scene_description: string
  characters: Character[]
  dialogue: DialogueLine[]
  narration: string | null
  sfx: string | null     // e.g. "BOOM!", "CRACK!"
  image_url: string | null  // null while generating, filled after image gen
  image_status: "pending" | "generating" | "done" | "error"
}
```

### `ComicScript`

The structured output from GPT-4.1 script generation. Backend stores this in `script_json` (Supabase). Frontend renders from this.

```ts
interface ComicScript {
  title: string
  art_style: ArtStyle
  detected_type: InputType   // what the AI classified the input as
  panels: Panel[]
}
```

### `Comic`

Full comic record as stored in Supabase and returned by the API.

```ts
interface Comic {
  id: string             // uuid
  user_id: string | null // null if anonymous
  title: string
  art_style: ArtStyle
  detected_type: InputType
  input_query: string
  script_json: ComicScript
  panel_urls: string[]   // Supabase Storage URLs, ordered by panel_number
  shareable_url: string | null
  created_at: string     // ISO 8601
}
```

---

## Endpoints

### POST `/generate`

Generate a comic from any text input. Returns a `Comic` object. Panels stream in progressively via SSE (see below).

**Request:**
```ts
{
  input: string          // Required. URL, event name, drama text — anything.
  art_style?: ArtStyle   // Optional. If omitted, AI chooses based on content.
  pov?: string           // Optional. Character name for POV feature. e.g. "the iceberg"
}
```

**Response (initial, before images finish):**
```ts
{
  comic_id: string       // Use this to subscribe to SSE stream
  script: ComicScript    // Full script available immediately after Stage 2
  panels: Panel[]        // image_url=null, image_status="pending" initially
}
```

**SSE Stream:** `GET /generate/{comic_id}/stream`

After calling `POST /generate`, frontend subscribes to this SSE endpoint to receive panel updates as images finish generating.

Each SSE event:
```ts
// event: panel_update
{
  panel_number: number
  image_url: string
  image_status: "done" | "error"
}

// event: complete
{
  comic_id: string
  shareable_url: string
}

// event: error
{
  panel_number: number | null   // null = pipeline-level error
  message: string
}
```

---

### GET `/comics/{comic_id}`

Fetch a saved comic by ID.

**Response:** `Comic`

---

### POST `/remix`

Rewrite dialogue in an existing comic with a different tone. Only `dialogue.text` fields change — art, panels, narration stay the same.

**Request:**
```ts
{
  comic_id: string
  tone: "comedy" | "vietnamese" | "eli5" | "serious"
}
```

**Response:**
```ts
{
  comic_id: string          // new comic_id (remixed comic is saved separately)
  panels: Panel[]           // same images, new dialogue text
  script: ComicScript
}
```

---

### GET `/digest`

Returns today's daily digest (5 auto-generated comics from trending news).

**Response:**
```ts
{
  date: string              // "2026-03-21"
  comics: Comic[]           // array of 5 Comic objects
}
```

---

### POST `/digest/schedule`

(Admin only) Trigger a manual digest generation. In production this runs on a cron schedule.

**Request:** `{}` (empty body, requires service key auth)

**Response:**
```ts
{ job_id: string, status: "queued" }
```

---

## Error Shape

All errors use this shape:

```ts
{
  error: string            // human-readable message
  code: string             // machine-readable code, e.g. "FETCH_FAILED", "QUOTA_EXCEEDED"
  panel_number?: number    // present if error is panel-specific
}
```

HTTP status codes:
- `400` — bad request (invalid input, missing fields)
- `422` — AI could not parse/classify the input
- `429` — rate limit / OpenAI quota exceeded
- `500` — unexpected pipeline failure (should never happen — we catch and emit partials)

---

## Frontend State Shape (Zustand)

The frontend store mirrors these types. This is what `comicStore.ts` must implement:

```ts
interface ComicState {
  // Current comic being generated or viewed
  currentComic: Comic | null

  // Per-panel edits by the user (overrides script_json dialogue)
  panelEdits: Record<number, {          // keyed by panel_number
    dialogue: DialogueLine[]            // full replacement, not delta
    deletedBubbleIndices: number[]      // which dialogue items were deleted
    narration: string | null            // user-edited narration
    sfx: string | null
  }>

  // Generation state
  generationStatus: "idle" | "classifying" | "scripting" | "generating" | "done" | "error"
  panelStatuses: Record<number, Panel["image_status"]>

  // Actions
  startGeneration: (input: string, artStyle?: ArtStyle, pov?: string) => void
  updatePanel: (panelNumber: number, imageUrl: string) => void
  editBubble: (panelNumber: number, bubbleIndex: number, text: string) => void
  deleteBubble: (panelNumber: number, bubbleIndex: number) => void
  resetEdits: () => void
}
```

---

## Notes for Frontend

- The `script_json` from backend is the **source of truth** for initial render. User edits live only in `panelEdits` in Zustand — never mutate `script_json`.
- When exporting with `html2canvas`, apply `panelEdits` on top of `script_json` before rasterizing.
- `panel_urls` and `script_json.panels[].image_url` always point to the same images — use `panel_urls` for display, `image_url` inside panels for per-panel access.
- SSE stream closes automatically after `event: complete`. If it closes without `complete`, treat as error and show retry.

## Notes for Backend

- Validate `input` is non-empty and under 2000 characters. Return `400` otherwise.
- `detected_type` must always be present in `ComicScript` — frontend uses it to show a label ("From URL", "History", "Drama").
- Never omit `panel_number` from Panel objects — frontend uses it for ordering and edit keying.
- `shareable_url` is the Supabase Storage public URL for the assembled comic PNG. Generate it in Stage 5.
