# StoryStrip AI — CLAUDE.md

> Every event in the world, retold as a comic strip in 30 seconds.

This file is the source of truth for AI agents building StoryStrip. Read it fully before writing any code.

---

## 1. Project Overview

StoryStrip AI transforms any news article, historical event, or internet drama into a 4–6 panel comic strip in under 30 seconds. Users provide a topic (URL, text, or drama description) and the AI researches, scripts, generates panels, and assembles a shareable comic with speech bubbles, narration, and SFX overlays.

**Three modes:**
- **News Mode** — paste a URL, get a comic
- **History Mode** — type any event, choose art style
- **Drama Mode** — describe any drama, get a viral recap comic

**Key differentiating features (build in priority order):**
1. Core pipeline (all 3 modes)
2. Choose Your POV (same event, different perspectives)
3. Remix & Meme Mode (tap bubble → edit text inline)
4. Daily Comic Digest (morning automated delivery)
5. Audio Comic (optional, ElevenLabs — build last)
6. Collab Comic (optional, Agora — stretch goal)

---

## 2. Architecture

### Stack

| Layer | Tool | Notes |
|---|---|---|
| **Frontend** | React + Tailwind CSS (Vite) | Web app, desktop-first |
| **Backend** | Python + FastAPI | Direct pipeline, no Dify |
| **Script Gen** | OpenAI GPT-4o | Comic script as structured JSON |
| **Image Gen** | OpenAI GPT-4o image | Parallel panel generation |
| **Content Fetch** | Exa AI | News articles + historical research |
| **Social Scrape** | Bright Data | Drama mode — Twitter/Reddit context |
| **Cache/Search** | Zilliz (Milvus) | Vector cache for repeat topics |
| **Database/Auth/Storage** | Supabase | Comics, users, preferences, image storage |
| **User Preferences** | Supabase (simple DB table) | No ByteRover — keep it simple |
| **Audio (optional)** | ElevenLabs | Implement after core features work |

### Pipeline (5 stages, target <30s total)

```
Input (URL / text / drama)
  │
  ▼
Stage 1: Content Acquisition (3–5s)
  News Mode  → Exa fetch article
  History    → Exa deep search
  Drama      → Bright Data scrape + GPT-4o summary
  [Check Zilliz cache first — skip if similarity > 0.92]
  │
  ▼
Stage 2: Comic Script Generation (5–8s)
  GPT-4o → structured JSON script
  { title, panels: [{ scene, characters, dialogue, narration, sfx }], art_style }
  │
  ▼
Stage 3: Panel Image Generation (10–15s)
  Generate panels in parallel (2 concurrent)
  Style prefix + character consistency description injected into each prompt
  Fallback: VALSEA API → SVG template
  │
  ▼
Stage 4: Comic Assembly (3–5s)
  Frontend overlays speech bubbles, narration boxes, SFX as HTML/CSS layers
  Text layers are editable (contenteditable or controlled React state)
  │
  ▼
Stage 5: Output & Distribution (2–3s)
  Save to Supabase Storage → return shareable URL
  Formats: Instagram Story (1080×1920), Twitter (1200×675), full-res PNG download
```

---

## 3. Directory Structure

```
storystrip/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── routers/
│   │   ├── comics.py         # POST /generate, GET /comics/:id
│   │   ├── remix.py          # POST /remix
│   │   └── digest.py         # GET /digest, POST /digest/schedule
│   ├── services/
│   │   ├── content_fetch.py  # Exa + Bright Data
│   │   ├── script_gen.py     # GPT-4o script generation
│   │   ├── image_gen.py      # GPT-4o image generation (parallel)
│   │   ├── assembly.py       # Comic metadata assembly
│   │   ├── cache.py          # Zilliz vector cache
│   │   └── storage.py        # Supabase Storage upload
│   ├── models/
│   │   ├── comic.py          # Pydantic schemas
│   │   └── script.py         # Comic script JSON schema
│   ├── prompts/
│   │   ├── script_prompt.py  # Master comic script prompt
│   │   ├── style_prompts.py  # Per-art-style prefix strings
│   │   └── remix_prompt.py   # Remix/tone-shift prompt
│   └── config.py             # Settings, API keys via env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ComicViewer/
│   │   │   │   ├── ComicViewer.tsx      # Panel grid + overlay system
│   │   │   │   ├── SpeechBubble.tsx     # Editable/deletable bubble
│   │   │   │   ├── NarrationBox.tsx     # Caption overlay
│   │   │   │   └── SfxText.tsx          # Comic-font SFX overlay
│   │   │   ├── Generator/
│   │   │   │   ├── ModeSelector.tsx     # News / History / Drama tabs
│   │   │   │   └── InputForm.tsx        # URL / text / drama input
│   │   │   ├── ShareCard.tsx            # Export comic as image
│   │   │   └── DailyDigest.tsx          # Morning digest page
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Generate.tsx
│   │   │   ├── ComicPage.tsx
│   │   │   └── Digest.tsx
│   │   ├── hooks/
│   │   │   ├── useGenerate.ts           # Generation API calls
│   │   │   └── useComic.ts              # Comic state management
│   │   ├── store/
│   │   │   └── comicStore.ts            # Zustand store
│   │   └── api/
│   │       └── client.ts                # Axios/fetch wrappers
│   └── public/
│       └── fonts/                       # Comic fonts (Bangers, etc.)
├── .env.example
├── requirements.txt
├── package.json
└── CLAUDE.md
```

---

## 4. Critical Implementation Rules

### Backend

**DO NOT use Dify.** All orchestration is direct Python code in FastAPI services.

**Comic script JSON schema — always use this exact shape:**
```python
{
  "title": str,
  "art_style": str,  # manga | marvel | chibi | noir | webtoon | pixel | vintage
  "panels": [
    {
      "panel_number": int,  # 1–6
      "scene_description": str,
      "characters": [
        {"name": str, "emotion": str, "position": str}  # position: left|center|right
      ],
      "dialogue": [
        {"speaker": str, "text": str, "bubble_type": str}  # speech|thought|shout
      ],
      "narration": str | None,
      "sfx": str | None
    }
  ]
}
```

**Character consistency:** Extract character description from Panel 1 output using GPT-4o Vision, inject verbatim into all subsequent panel prompts. Never skip this — it's the hardest UX problem.

**Parallel image generation:** Use `asyncio.gather` with a semaphore limiting 2 concurrent requests. Do not generate panels sequentially.

**Zilliz caching:** Always check cache before calling Exa/GPT-4o. Embed the input query, search Zilliz, return hit if cosine similarity > 0.92.

**Fallback chain:** GPT-4o image gen → VALSEA API → SVG template. Never return an empty panel.

**Error handling:** All pipeline stages must catch exceptions and emit partial results with error flags, never a 500. Frontend shows which panels failed and retries individually.

### Frontend

**Speech bubbles are NOT burned into images.** They are HTML/CSS overlays positioned absolutely over panel images. Each bubble is:
- **Editable:** click/tap → `contenteditable` or controlled textarea
- **Deletable:** X button appears on hover/focus, removes bubble from state
- Text changes must update the Zustand store and be included in share card export

**Comic viewer layers (bottom to top):**
1. Panel image (`<img>` or `<canvas>`)
2. Narration box (semi-transparent, top or bottom edge)
3. Speech bubbles (positioned per `character.position`)
4. SFX text (comic font, angled, outlined)
5. Edit controls (hover state only)

**Share card export:** Use `html2canvas` to rasterize the full layered comic into a single PNG for download/share. Respect edited bubble text.

**Art style selector:** Show visual preview thumbnails, not just text labels. Pre-generate one example panel per style for the UI.

**Loading UX:** Progressive reveal — don't wait for all panels. Stream results: show script text first ("Writing script..."), then panels appear one by one as they complete. Use SSE or polling.

**Desktop-first:** Target 1280px+ viewport. No mobile responsiveness required.

### Database (Supabase)

```sql
-- comics table
id uuid primary key
user_id uuid references auth.users
title text
mode text  -- news | history | drama
art_style text
input_query text
script_json jsonb
panel_urls text[]  -- Supabase Storage URLs
shareable_url text
created_at timestamptz

-- user_preferences table (replaces ByteRover)
user_id uuid references auth.users primary key
preferred_styles text[]
topic_interests text[]
reading_history jsonb  -- last 20 comic IDs
updated_at timestamptz
```

---

## 5. Art Style Prompt Templates

Use these exact prefixes in every image generation call:

```python
STYLE_PROMPTS = {
    "manga": "Manga art style, black and white with screentone shading, dynamic speed lines, expressive eyes, Japanese comic panel composition, high contrast ink work",
    "marvel": "American superhero comic art style, bold colors, dramatic lighting, muscular proportions, detailed backgrounds, dynamic poses, thick outlines",
    "chibi": "Chibi kawaii style, oversized heads, tiny bodies, pastel colors, simple backgrounds, exaggerated cute expressions, rounded features",
    "noir": "Film noir comic style, heavy shadows, black and white with dramatic single-color accent (red or yellow), venetian blind shadows, fedora hats, rain",
    "webtoon": "Korean webtoon style, soft gradients, clean digital art, natural proportions, pastel color palette, minimal backgrounds, emotional close-ups",
    "pixel": "Pixel art style, 16-bit retro game aesthetic, limited color palette, chunky pixels, isometric or side-scrolling perspective",
    "vintage": "Vintage golden age comic style, halftone dots, muted yellowed colors, thick borders, 1950s illustration style, simple bold linework",
}
```

Append to every panel prompt: `"comic book panel, clear composition, no text in image, leave space for speech bubbles"`

---

## 6. Key Prompts

### Script Generation System Prompt

```
You are a master comic book writer. Given source material about an event, create a comic strip script.

Rules:
1. 4–6 panels maximum
2. Each panel needs: scene_description, characters (name, emotion, position), dialogue (speaker, text, bubble_type), narration (optional), sfx (optional)
3. Dramatic pacing: setup → tension → climax → resolution
4. Dialogue: MAX 15 words per bubble. Short. Punchy.
5. SFX: ALL CAPS, onomatopoeia (BOOM!, CRACK!, WHOOSH!)
6. Output strict JSON matching the schema. No markdown, no explanation.

POV modifier (inject when feature is active):
"Tell this story from the perspective of [CHARACTER]. Adjust narration tone, which moments to emphasize, and emotional framing accordingly."
```

### Remix Prompt

```
You are rewriting comic dialogue. Given the current script JSON and a tone instruction, rewrite ONLY the dialogue text fields.
Tone: [serious → comedy | english → vietnamese | adult → ELI5]
Return only the modified panels array. Keep all other fields identical.
```

---

## 7. Environment Variables

```bash
# Required
OPENAI_API_KEY=
EXA_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ZILLIZ_ENDPOINT=
ZILLIZ_TOKEN=

# Optional (Drama mode)
BRIGHT_DATA_API_KEY=

# Optional (Audio — implement last)
ELEVENLABS_API_KEY=

# Optional (Image fallback)
VALSEA_API_KEY=

# Backend
PORT=8000
CORS_ORIGINS=http://localhost:5173
```

---

## 8. Feature Priority & Build Order

Build in this exact order. Do not skip ahead.

1. **Backend pipeline** — content fetch → script gen → image gen → storage (News Mode only)
2. **Frontend ComicViewer** — panel display + editable/deletable speech bubbles
3. **Input form + mode selector** — News / History / Drama UI
4. **History Mode** — same pipeline, Exa historical search
5. **Drama Mode** — add Bright Data scrape step
6. **Choose Your POV** — GPT-4o system prompt modifier, tab UI
7. **Remix Mode** — edit dialogue tone, contenteditable bubbles
8. **Share card** — html2canvas export for Instagram/Twitter formats
9. **Daily Digest** — scheduled backend job + digest page UI
10. **Zilliz caching** — add cache check/write around pipeline
11. **Audio Comic** (optional) — ElevenLabs narrator per panel, Web Audio API sync
12. **Collab Comic** (stretch) — Agora voice room + multi-user dialogue input

---

## 9. Testing & Verification

- Each backend service has a corresponding `test_*.py` using `pytest` + `httpx`
- Test with real API calls in a sandbox (not mocked) for content fetch and script gen
- Always test with at least 3 diverse inputs before considering a feature done
- Frontend: test on 1280px+ desktop viewport
- Image gen: visually inspect 5 generated panels per art style change
- Pipeline smoke test: `POST /generate` with a real BBC URL → must return comic in <45s

---

## 10. What NOT to Build

- **No Dify** — zero workflow nodes, zero Dify API calls, zero Dify dependencies
- **No ByteRover** — user preferences live in Supabase `user_preferences` table
- **No voice/audio until steps 1–9 are complete** — ElevenLabs is the last feature
- **No Agora/Collab Comic** unless all other features are working and polished
- **No custom ML models** — use OpenAI APIs for everything AI-related
- **No flat image speech bubbles** — always render text as editable HTML overlays
