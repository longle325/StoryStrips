# StoryStrip Boilerplate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a working full-stack boilerplate — FastAPI backend + React/Vite frontend — wired together end-to-end so both frontend and backend developers can immediately start building features on a solid foundation.

**Architecture:** Python FastAPI backend exposes REST + SSE endpoints following `docs/API_CONTRACT.md`. React + Vite + Tailwind frontend consumes those endpoints via a typed API client. Both sides share the same TypeScript/Pydantic type definitions derived from the contract. No business logic yet — just the skeleton, routing, env config, and a working `/generate` stub that returns a mock comic.

**Tech Stack:** Python 3.11+, FastAPI, Uvicorn, Pydantic v2, httpx, python-dotenv | React 18, Vite, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`), Zustand, Axios, html2canvas, Bangers font (Google Fonts)

---

## File Map

```
StoryStrip/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, routers mount
│   ├── config.py                # Settings via pydantic-settings + .env
│   ├── models/
│   │   ├── __init__.py
│   │   └── comic.py             # All Pydantic schemas (mirrors API_CONTRACT.md)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── comics.py            # POST /generate, GET /comics/{id}, SSE stream
│   │   ├── remix.py             # POST /remix (stub)
│   │   └── digest.py            # GET /digest, POST /digest/schedule (stub)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── content_fetch.py     # Stub: classify + fetch (returns mock data)
│   │   ├── script_gen.py        # Stub: returns mock ComicScript
│   │   ├── image_gen.py         # Stub: returns placeholder image URL
│   │   ├── cache.py             # Stub: always returns cache miss
│   │   └── storage.py           # Stub: returns fake Supabase URL
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── vite.config.ts           # Tailwind v4 via @tailwindcss/vite plugin (no tailwind.config.ts needed)
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   └── client.ts        # Axios instance + typed API functions
│       ├── types/
│       │   └── comic.ts         # TypeScript types from API_CONTRACT.md
│       ├── store/
│       │   └── comicStore.ts    # Zustand store (full shape from contract)
│       ├── hooks/
│       │   ├── useGenerate.ts   # Calls POST /generate (SSE wiring is a TODO for real impl)
│       │   └── useComic.ts      # Fetches GET /comics/:id (stub, created in Task 10)
│       ├── components/
│       │   ├── ComicViewer/
│       │   │   ├── ComicViewer.tsx     # Panel grid + overlay container
│       │   │   ├── SpeechBubble.tsx   # Editable + deletable bubble
│       │   │   ├── NarrationBox.tsx   # Caption overlay
│       │   │   └── SfxText.tsx        # Comic-font SFX
│       │   └── Generator/
│       │       └── InputForm.tsx       # Single input + art style selector
│       └── pages/
│           ├── Home.tsx
│           └── Generate.tsx
├── .env.example                 # Root-level, documents all keys
└── CLAUDE.md
```

---

## Task 1: Backend — Project scaffold + config

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/config.py`
- Create: `backend/main.py`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.115.5
uvicorn[standard]==0.32.0
pydantic==2.9.2
pydantic-settings==2.6.1
python-dotenv==1.0.1
httpx==0.27.2
openai==1.54.3
exa-py==1.1.0
supabase==2.9.1
pymilvus==2.4.9
sse-starlette==2.1.3
```

- [ ] **Step 2: Create `backend/.env.example`**

```bash
# Required
OPENAI_API_KEY=sk-...
EXA_API_KEY=...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
ZILLIZ_ENDPOINT=https://xxx.zillizcloud.com
ZILLIZ_TOKEN=...

# Optional
BRIGHT_DATA_API_KEY=
ELEVENLABS_API_KEY=
VALSEA_API_KEY=

# Backend
PORT=8000
CORS_ORIGINS=http://localhost:5173
```

- [ ] **Step 3: Create `backend/config.py`**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    openai_api_key: str = ""
    exa_api_key: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    zilliz_endpoint: str = ""
    zilliz_token: str = ""

    bright_data_api_key: str = ""
    elevenlabs_api_key: str = ""
    valsea_api_key: str = ""

    port: int = 8000
    # pydantic-settings parses "http://a.com,http://b.com" env var natively into list[str]
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
```

- [ ] **Step 4: Create `backend/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.comics import router as comics_router
from routers.remix import router as remix_router
from routers.digest import router as digest_router

app = FastAPI(title="StoryStrip API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(comics_router, tags=["comics"])
app.include_router(remix_router, tags=["remix"])
app.include_router(digest_router, tags=["digest"])


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 5: Install dependencies and verify server starts**

```bash
cd /Users/longle/StoryStrip/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Create stub router files so imports don't fail (next task does full content)
mkdir -p routers models services
touch routers/__init__.py routers/comics.py routers/remix.py routers/digest.py
touch models/__init__.py services/__init__.py
# Add minimal router stubs
echo "from fastapi import APIRouter; router = APIRouter()" > routers/comics.py
echo "from fastapi import APIRouter; router = APIRouter()" > routers/remix.py
echo "from fastapi import APIRouter; router = APIRouter()" > routers/digest.py
uvicorn main:app --reload --port 8000
```

Expected: `Application startup complete.` — hit `http://localhost:8000/health` → `{"status":"ok"}`

- [ ] **Step 6: Commit**

```bash
cd /Users/longle/StoryStrip
git init  # if not already a git repo
git add backend/
git commit -m "feat: scaffold backend — FastAPI app, config, CORS"
```

---

## Task 2: Backend — Pydantic models (API contract)

**Files:**
- Create: `backend/models/comic.py`

- [ ] **Step 1: Create `backend/models/comic.py`**

```python
from __future__ import annotations
from enum import Enum
from typing import Literal
from pydantic import BaseModel


class ArtStyle(str, Enum):
    manga = "manga"
    marvel = "marvel"
    chibi = "chibi"
    noir = "noir"
    webtoon = "webtoon"
    pixel = "pixel"
    vintage = "vintage"


class BubbleType(str, Enum):
    speech = "speech"
    thought = "thought"
    shout = "shout"


class CharacterPosition(str, Enum):
    left = "left"
    center = "center"
    right = "right"


InputType = Literal["url", "history", "drama", "freeform"]

ImageStatus = Literal["pending", "generating", "done", "error"]


class DialogueLine(BaseModel):
    speaker: str
    text: str
    bubble_type: BubbleType


class Character(BaseModel):
    name: str
    emotion: str
    position: CharacterPosition


class Panel(BaseModel):
    panel_number: int
    scene_description: str
    characters: list[Character]
    dialogue: list[DialogueLine]
    narration: str | None = None
    sfx: str | None = None
    image_url: str | None = None
    image_status: ImageStatus = "pending"


class ComicScript(BaseModel):
    title: str
    art_style: ArtStyle
    detected_type: InputType
    panels: list[Panel]


class Comic(BaseModel):
    id: str
    user_id: str | None = None
    title: str
    art_style: ArtStyle
    detected_type: InputType
    input_query: str
    script_json: ComicScript
    panel_urls: list[str]
    shareable_url: str | None = None
    created_at: str


# --- Request/Response shapes ---

class GenerateRequest(BaseModel):
    input: str
    art_style: ArtStyle | None = None
    pov: str | None = None


class GenerateResponse(BaseModel):
    comic_id: str
    script: ComicScript
    panels: list[Panel]


class RemixRequest(BaseModel):
    comic_id: str
    tone: Literal["comedy", "vietnamese", "eli5", "serious"]


class RemixResponse(BaseModel):
    comic_id: str
    panels: list[Panel]
    script: ComicScript


class ErrorResponse(BaseModel):
    error: str
    code: str
    panel_number: int | None = None
```

- [ ] **Step 2: Verify models import cleanly**

```bash
cd /Users/longle/StoryStrip/backend
source .venv/bin/activate
python -c "from models.comic import Comic, GenerateRequest, ComicScript; print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/models/
git commit -m "feat: add Pydantic models matching API contract"
```

---

## Task 3: Backend — Service stubs

**Files:**
- Create: `backend/services/content_fetch.py`
- Create: `backend/services/script_gen.py`
- Create: `backend/services/image_gen.py`
- Create: `backend/services/cache.py`
- Create: `backend/services/storage.py`

These stubs return realistic mock data so the full pipeline can be exercised end-to-end before real API keys are wired.

- [ ] **Step 1: Create `backend/services/cache.py`**

```python
"""Zilliz vector cache. Stub always returns cache miss."""


async def check_cache(query: str) -> dict | None:
    """Returns cached comic dict or None on miss."""
    return None


async def write_cache(query: str, comic: dict) -> None:
    pass
```

- [ ] **Step 2: Create `backend/services/content_fetch.py`**

```python
"""Classifies input and fetches source content."""
from models.comic import InputType


def classify_input(text: str) -> InputType:
    """Heuristic pre-classifier. Real impl uses gpt-4.1."""
    text = text.strip()
    if text.startswith("http://") or text.startswith("https://"):
        return "url"
    return "freeform"


async def fetch_content(text: str, input_type: InputType) -> str:
    """Returns raw text content for the given input. Stub returns mock."""
    return (
        f"[MOCK CONTENT] Input type: {input_type}. "
        f"Original query: {text[:200]}. "
        "Key facts: event happened, there was conflict, resolution followed."
    )
```

- [ ] **Step 3: Create `backend/services/script_gen.py`**

```python
"""Generates comic script JSON from source content using gpt-4.1."""
from models.comic import ArtStyle, ComicScript, InputType, Panel, Character, DialogueLine


async def generate_script(
    content: str,
    input_type: InputType,
    art_style: ArtStyle | None,
    pov: str | None,
) -> ComicScript:
    """Stub returns a hardcoded 4-panel mock script."""
    chosen_style = art_style or ArtStyle.manga
    return ComicScript(
        title="Mock Comic: The Great Event",
        art_style=chosen_style,
        detected_type=input_type,
        panels=[
            Panel(
                panel_number=1,
                scene_description="Wide establishing shot. City skyline at dawn.",
                characters=[Character(name="Hero", emotion="determined", position="left")],
                dialogue=[DialogueLine(speaker="Hero", text="This ends today.", bubble_type="speech")],
                narration="The city held its breath.",
                sfx=None,
                image_status="pending",
            ),
            Panel(
                panel_number=2,
                scene_description="Close-up on the antagonist's face, shadows.",
                characters=[Character(name="Villain", emotion="smug", position="right")],
                dialogue=[DialogueLine(speaker="Villain", text="You're too late!", bubble_type="shout")],
                narration=None,
                sfx="CRACK!",
                image_status="pending",
            ),
            Panel(
                panel_number=3,
                scene_description="Action shot — the confrontation peaks.",
                characters=[
                    Character(name="Hero", emotion="fierce", position="left"),
                    Character(name="Villain", emotion="shocked", position="right"),
                ],
                dialogue=[],
                narration=None,
                sfx="BOOM!",
                image_status="pending",
            ),
            Panel(
                panel_number=4,
                scene_description="Aftermath. Hero stands victorious, sun rising.",
                characters=[Character(name="Hero", emotion="relieved", position="center")],
                dialogue=[DialogueLine(speaker="Hero", text="It's finally over.", bubble_type="thought")],
                narration="And the city breathed again.",
                sfx=None,
                image_status="pending",
            ),
        ],
    )
```

- [ ] **Step 4: Create `backend/services/image_gen.py`**

```python
"""Generates comic panel images using gpt-image-1. Stub returns placeholder."""
import asyncio
from models.comic import ArtStyle

PLACEHOLDER = "https://placehold.co/1024x1024/1a1a2e/ffffff?text=Panel+{n}"


async def generate_panel_image(
    panel_number: int,
    scene_description: str,
    characters: list,
    art_style: ArtStyle,
    character_reference: str | None = None,
) -> str:
    """Returns image URL for a single panel. Stub simulates 1s delay."""
    await asyncio.sleep(1)
    return PLACEHOLDER.format(n=panel_number)


async def generate_panels_parallel(script, art_style: ArtStyle) -> list[tuple[int, str]]:
    """
    Generates all panels concurrently, max 2 at a time.
    Returns list of (panel_number, image_url).
    """
    semaphore = asyncio.Semaphore(2)

    async def gen_one(panel):
        async with semaphore:
            url = await generate_panel_image(
                panel.panel_number,
                panel.scene_description,
                panel.characters,
                art_style,
            )
            return (panel.panel_number, url)

    results = await asyncio.gather(*[gen_one(p) for p in script.panels])
    return sorted(results, key=lambda x: x[0])
```

- [ ] **Step 5: Create `backend/services/storage.py`**

```python
"""Uploads assembled comic to Supabase Storage. Stub returns fake URL."""
import uuid


async def upload_comic(comic_id: str, panel_urls: list[str]) -> str:
    """Returns shareable URL for the assembled comic."""
    return f"https://storystrip.ai/comics/{comic_id}"
```

- [ ] **Step 6: Verify all services import cleanly**

```bash
cd /Users/longle/StoryStrip/backend
source .venv/bin/activate
python -c "
from services.cache import check_cache
from services.content_fetch import fetch_content, classify_input
from services.script_gen import generate_script
from services.image_gen import generate_panels_parallel
from services.storage import upload_comic
print('All services OK')
"
```

Expected: `All services OK`

- [ ] **Step 7: Commit**

```bash
git add backend/services/
git commit -m "feat: add service stubs — full pipeline can be exercised with mock data"
```

---

## Task 4: Backend — Comics router (POST /generate + SSE)

**Files:**
- Modify: `backend/routers/comics.py`

- [ ] **Step 1: Write `backend/routers/comics.py`**

```python
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse

from models.comic import (
    Comic,
    GenerateRequest,
    GenerateResponse,
)
from services.content_fetch import classify_input, fetch_content
from services.image_gen import generate_panels_parallel
from services.script_gen import generate_script
from services.storage import upload_comic

router = APIRouter()

# In-memory store keyed by comic_id (replace with Redis in production)
_comic_store: dict[str, Comic] = {}


@router.post("/generate", response_model=GenerateResponse)
async def generate_comic(req: GenerateRequest):
    comic_id = str(uuid.uuid4())

    # Stage 1: classify + fetch
    input_type = classify_input(req.input)
    content = await fetch_content(req.input, input_type)

    # Stage 2: script
    script = await generate_script(content, input_type, req.art_style, req.pov)

    # Stage 3: images (parallel, max 2 concurrent via semaphore in service)
    panel_results = await generate_panels_parallel(script, script.art_style)
    panel_urls = [url for _, url in panel_results]

    # Update panels with image URLs — O(n) dict lookup, not O(n²)
    results_map = {pnum: url for pnum, url in panel_results}
    for panel in script.panels:
        if panel.panel_number in results_map:
            panel.image_url = results_map[panel.panel_number]
            panel.image_status = "done"

    # Stage 5: storage
    shareable_url = await upload_comic(comic_id, panel_urls)

    comic = Comic(
        id=comic_id,
        title=script.title,
        art_style=script.art_style,
        detected_type=script.detected_type,
        input_query=req.input,
        script_json=script,
        panel_urls=panel_urls,
        shareable_url=shareable_url,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    _comic_store[comic_id] = comic

    return GenerateResponse(
        comic_id=comic_id,
        script=script,
        panels=script.panels,
    )


@router.get("/generate/{comic_id}/stream")
async def stream_comic(comic_id: str):
    """
    SSE stream stub. In production, individual panel_update events stream here
    as each image finishes generating. This stub immediately emits 'complete'
    so frontend SSE wiring can be built and tested without real image gen.
    """
    async def event_gen():
        comic = _comic_store.get(comic_id)
        if not comic:
            yield {
                "event": "error",
                "data": '{"panel_number": null, "message": "Comic not found"}',
            }
            return
        yield {
            "event": "complete",
            "data": f'{{"comic_id": "{comic_id}", "shareable_url": "{comic.shareable_url or ""}"}}',
        }

    return EventSourceResponse(event_gen())


@router.get("/comics/{comic_id}", response_model=Comic)
async def get_comic(comic_id: str):
    comic = _comic_store.get(comic_id)
    if not comic:
        return JSONResponse(
            status_code=404,
            content={"error": "Comic not found", "code": "NOT_FOUND"},
        )
    return comic
```

- [ ] **Step 2: Verify the server starts with the real router**

```bash
cd /Users/longle/StoryStrip/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

Expected: startup with no import errors.

- [ ] **Step 3: Smoke-test the endpoint**

```bash
curl -s -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"input": "The fall of the Berlin Wall"}' | python -m json.tool | head -30
```

Expected: JSON with `comic_id`, `script.title`, `panels` array, each panel with `image_url` set.

- [ ] **Step 4: Commit**

```bash
git add backend/routers/comics.py
git commit -m "feat: POST /generate and GET /comics/:id endpoints with mock pipeline"
```

---

## Task 5: Backend — Remix + Digest router stubs

**Files:**
- Modify: `backend/routers/remix.py`
- Modify: `backend/routers/digest.py`

- [ ] **Step 1: Write `backend/routers/remix.py`**

```python
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models.comic import RemixRequest

router = APIRouter()


# response_model omitted intentionally — endpoint returns 501 until implemented
@router.post("/remix", responses={501: {"description": "Not yet implemented"}})
async def remix_comic(req: RemixRequest):
    return JSONResponse(
        status_code=501,
        content={"error": "Remix not yet implemented", "code": "NOT_IMPLEMENTED"},
    )
```

- [ ] **Step 2: Write `backend/routers/digest.py`**

```python
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.get("/digest")
async def get_digest():
    return JSONResponse(
        status_code=501,
        content={"error": "Digest not yet implemented", "code": "NOT_IMPLEMENTED"},
    )


@router.post("/digest/schedule")
async def schedule_digest():
    return JSONResponse(
        status_code=501,
        content={"error": "Digest scheduling not yet implemented", "code": "NOT_IMPLEMENTED"},
    )
```

- [ ] **Step 3: Verify all routes are registered**

```bash
curl -s http://localhost:8000/openapi.json | python -m json.tool | grep '"path"'
```

Expected: `/generate`, `/comics/{comic_id}`, `/remix`, `/digest`, `/digest/schedule`, `/health` all present.

- [ ] **Step 4: Commit**

```bash
git add backend/routers/
git commit -m "feat: stub remix + digest routers returning 501"
```

---

## Task 6: Frontend — Scaffold Vite + React + Tailwind

**Files:**
- Create: `frontend/` (Vite scaffold)
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/index.html`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/longle/StoryStrip
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install tailwindcss @tailwindcss/vite zustand axios html2canvas
```

- [ ] **Step 2: Configure Tailwind in `frontend/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

- [ ] **Step 3: Set up Tailwind in `frontend/src/index.css`**

```css
@import "tailwindcss";

@import url('https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@400;600;700&display=swap');

:root {
  font-family: 'Inter', sans-serif;
}

.font-comic {
  font-family: 'Bangers', cursive;
}
```

- [ ] **Step 4: Update `frontend/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Verify dev server starts**

```bash
cd /Users/longle/StoryStrip/frontend
npm run dev
```

Expected: `http://localhost:5173` loads Vite default page with no errors in console.

- [ ] **Step 6: Commit**

```bash
cd /Users/longle/StoryStrip
git add frontend/
git commit -m "feat: scaffold frontend — Vite + React + TypeScript + Tailwind + Bangers font"
```

---

## Task 7: Frontend — TypeScript types + API client

**Files:**
- Create: `frontend/src/types/comic.ts`
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: Create `frontend/src/types/comic.ts`**

```ts
// Mirrors API_CONTRACT.md exactly. Do not add fields not in the contract.

export type ArtStyle = 'manga' | 'marvel' | 'chibi' | 'noir' | 'webtoon' | 'pixel' | 'vintage'
export type BubbleType = 'speech' | 'thought' | 'shout'
export type CharacterPosition = 'left' | 'center' | 'right'
export type InputType = 'url' | 'history' | 'drama' | 'freeform'
export type ImageStatus = 'pending' | 'generating' | 'done' | 'error'

export interface DialogueLine {
  speaker: string
  text: string
  bubble_type: BubbleType
}

export interface Character {
  name: string
  emotion: string
  position: CharacterPosition
}

export interface Panel {
  panel_number: number
  scene_description: string
  characters: Character[]
  dialogue: DialogueLine[]
  narration: string | null
  sfx: string | null
  image_url: string | null
  image_status: ImageStatus
}

export interface ComicScript {
  title: string
  art_style: ArtStyle
  detected_type: InputType
  panels: Panel[]
}

export interface Comic {
  id: string
  user_id: string | null
  title: string
  art_style: ArtStyle
  detected_type: InputType
  input_query: string
  script_json: ComicScript
  panel_urls: string[]
  shareable_url: string | null
  created_at: string
}

// API request/response shapes
export interface GenerateRequest {
  input: string
  art_style?: ArtStyle
  pov?: string
}

export interface GenerateResponse {
  comic_id: string
  script: ComicScript
  panels: Panel[]
}

export interface RemixRequest {
  comic_id: string
  tone: 'comedy' | 'vietnamese' | 'eli5' | 'serious'
}

export interface ApiError {
  error: string
  code: string
  panel_number?: number
}
```

- [ ] **Step 2: Create `frontend/src/api/client.ts`**

```ts
import axios from 'axios'
import type { GenerateRequest, GenerateResponse, Comic } from '../types/comic'

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const api = {
  generate: (req: GenerateRequest): Promise<GenerateResponse> =>
    http.post<GenerateResponse>('/generate', req).then((r) => r.data),

  getComic: (id: string): Promise<Comic> =>
    http.get<Comic>(`/comics/${id}`).then((r) => r.data),
}

export default http
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd /Users/longle/StoryStrip/frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/ frontend/src/api/
git commit -m "feat: add TypeScript types and API client matching contract"
```

---

## Task 8: Frontend — Zustand store

**Files:**
- Create: `frontend/src/store/comicStore.ts`

- [ ] **Step 1: Create `frontend/src/store/comicStore.ts`**

```ts
import { create } from 'zustand'
import type { Comic, ArtStyle, DialogueLine, Panel, ImageStatus } from '../types/comic'

export type GenerationStatus =
  | 'idle'
  | 'classifying'
  | 'scripting'
  | 'generating'
  | 'done'
  | 'error'

interface PanelEdit {
  dialogue: DialogueLine[]
  deletedBubbleIndices: number[]
  narration: string | null
  sfx: string | null
}

interface ComicState {
  currentComic: Comic | null
  panelEdits: Record<number, PanelEdit>
  generationStatus: GenerationStatus
  panelStatuses: Record<number, ImageStatus>

  setComic: (comic: Comic) => void
  setGenerationStatus: (status: GenerationStatus) => void
  updatePanelImage: (panelNumber: number, imageUrl: string) => void
  editBubble: (panelNumber: number, bubbleIndex: number, text: string) => void
  deleteBubble: (panelNumber: number, bubbleIndex: number) => void
  reset: () => void
}

const initialState = {
  currentComic: null,
  panelEdits: {},
  generationStatus: 'idle' as GenerationStatus,
  panelStatuses: {},
}

export const useComicStore = create<ComicState>((set, get) => ({
  ...initialState,

  setComic: (comic) => set({ currentComic: comic }),

  setGenerationStatus: (status) => set({ generationStatus: status }),

  updatePanelImage: (panelNumber, imageUrl) => {
    const comic = get().currentComic
    if (!comic) return
    const updatedPanels = comic.script_json.panels.map((p) =>
      p.panel_number === panelNumber
        ? { ...p, image_url: imageUrl, image_status: 'done' as const }
        : p
    )
    set({
      currentComic: {
        ...comic,
        script_json: { ...comic.script_json, panels: updatedPanels },
      },
      panelStatuses: { ...get().panelStatuses, [panelNumber]: 'done' },
    })
  },

  editBubble: (panelNumber, bubbleIndex, text) => {
    const comic = get().currentComic
    if (!comic) return
    const panel = comic.script_json.panels.find((p) => p.panel_number === panelNumber)
    if (!panel) return
    const existing = get().panelEdits[panelNumber]
    const baseDial = existing?.dialogue ?? [...panel.dialogue]
    const updated = baseDial.map((d, i) => (i === bubbleIndex ? { ...d, text } : d))
    set({
      panelEdits: {
        ...get().panelEdits,
        [panelNumber]: {
          dialogue: updated,
          deletedBubbleIndices: existing?.deletedBubbleIndices ?? [],
          narration: existing?.narration ?? panel.narration,
          sfx: existing?.sfx ?? panel.sfx,
        },
      },
    })
  },

  deleteBubble: (panelNumber, bubbleIndex) => {
    const existing = get().panelEdits[panelNumber]
    const deleted = [...(existing?.deletedBubbleIndices ?? []), bubbleIndex]
    // If no prior edit exists, seed dialogue from the live panel so remaining
    // bubbles are not wiped when the first delete happens
    const panel = get().currentComic?.script_json.panels.find(
      (p) => p.panel_number === panelNumber
    )
    set({
      panelEdits: {
        ...get().panelEdits,
        [panelNumber]: {
          dialogue: existing?.dialogue ?? [...(panel?.dialogue ?? [])],
          narration: existing?.narration ?? panel?.narration ?? null,
          sfx: existing?.sfx ?? panel?.sfx ?? null,
          deletedBubbleIndices: deleted,
        },
      },
    })
  },

  reset: () => set(initialState),
}))
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/longle/StoryStrip/frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/
git commit -m "feat: Zustand store with panel edit, bubble delete, generation status"
```

---

## Task 9: Frontend — ComicViewer components

**Files:**
- Create: `frontend/src/components/ComicViewer/SpeechBubble.tsx`
- Create: `frontend/src/components/ComicViewer/NarrationBox.tsx`
- Create: `frontend/src/components/ComicViewer/SfxText.tsx`
- Create: `frontend/src/components/ComicViewer/ComicViewer.tsx`

- [ ] **Step 1: Create `SpeechBubble.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react'
import type { DialogueLine, CharacterPosition } from '../../types/comic'

interface Props {
  line: DialogueLine
  index: number
  position: CharacterPosition
  onEdit: (index: number, text: string) => void
  onDelete: (index: number) => void
}

const positionClass: Record<CharacterPosition, string> = {
  left: 'left-2 top-2',
  center: 'left-1/2 -translate-x-1/2 top-2',
  right: 'right-2 top-2',
}

const bubbleStyle: Record<string, string> = {
  speech: 'rounded-2xl border-2 border-black',
  thought: 'rounded-full border-2 border-black border-dashed',
  shout: 'rounded-sm border-4 border-black rotate-1',
}

export function SpeechBubble({ line, index, position, onEdit, onDelete }: Props) {
  const [hovered, setHovered] = useState(false)
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editing && ref.current) ref.current.focus()
  }, [editing])

  return (
    <div
      className={`absolute ${positionClass[position]} max-w-[45%] z-10`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`relative bg-white px-3 py-2 text-sm font-bold text-black shadow-md cursor-text
          ${bubbleStyle[line.bubble_type]}
          ${line.bubble_type === 'shout' ? 'font-comic text-base uppercase' : ''}`}
        onClick={() => setEditing(true)}
      >
        <div
          ref={ref}
          contentEditable={editing}
          suppressContentEditableWarning
          onBlur={(e) => {
            setEditing(false)
            onEdit(index, e.currentTarget.textContent ?? '')
          }}
          className="outline-none min-w-[40px]"
        >
          {line.text}
        </div>

        {hovered && !editing && (
          <button
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs
              flex items-center justify-center leading-none hover:bg-red-700"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(index)
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `NarrationBox.tsx`**

```tsx
interface Props {
  text: string
  position?: 'top' | 'bottom'
}

export function NarrationBox({ text, position = 'top' }: Props) {
  return (
    <div
      className={`absolute left-0 right-0 ${position === 'top' ? 'top-0' : 'bottom-0'}
        bg-black/70 text-white text-xs px-3 py-1 font-bold z-10`}
    >
      {text}
    </div>
  )
}
```

- [ ] **Step 3: Create `SfxText.tsx`**

```tsx
interface Props {
  text: string
}

export function SfxText({ text }: Props) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <span
        className="font-comic text-4xl text-yellow-400 drop-shadow-[2px_2px_0px_black]
          rotate-[-8deg] inline-block select-none"
      >
        {text}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Create `ComicViewer.tsx`**

```tsx
import type { ComicScript } from '../../types/comic'
import { useComicStore } from '../../store/comicStore'
import { SpeechBubble } from './SpeechBubble'
import { NarrationBox } from './NarrationBox'
import { SfxText } from './SfxText'

interface Props {
  script: ComicScript
}

export function ComicViewer({ script }: Props) {
  const { panelEdits, editBubble, deleteBubble } = useComicStore()

  return (
    <div className="grid grid-cols-2 gap-1 bg-black p-1 w-full max-w-4xl mx-auto">
      {script.panels.map((panel) => {
        const edits = panelEdits[panel.panel_number]
        const dialogue = edits?.dialogue ?? panel.dialogue
        const deletedIndices = edits?.deletedBubbleIndices ?? []
        const narration = edits?.narration ?? panel.narration
        const sfx = edits?.sfx ?? panel.sfx

        return (
          <div
            key={panel.panel_number}
            className="relative aspect-square bg-gray-200 overflow-hidden border-2 border-black"
          >
            {/* Panel image */}
            {panel.image_url ? (
              <img
                src={panel.image_url}
                alt={`Panel ${panel.panel_number}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-300">
                <span className="text-gray-500 text-sm">Generating...</span>
              </div>
            )}

            {/* Narration box */}
            {narration && <NarrationBox text={narration} position="top" />}

            {/* Speech bubbles — iterate with originalIndex to survive store mutations */}
            {dialogue.map((line, originalIndex) => {
              if (deletedIndices.includes(originalIndex)) return null
              const char = panel.characters.find((c) => c.name === line.speaker)
              const position = char?.position ?? 'left'
              return (
                <SpeechBubble
                  key={originalIndex}
                  line={line}
                  index={originalIndex}
                  position={position}
                  onEdit={(idx, text) => editBubble(panel.panel_number, idx, text)}
                  onDelete={(idx) => deleteBubble(panel.panel_number, idx)}
                />
              )
            })}

            {/* SFX */}
            {sfx && <SfxText text={sfx} />}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/longle/StoryStrip/frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ComicViewer/
git commit -m "feat: ComicViewer with editable/deletable speech bubbles, narration, SFX overlays"
```

---

## Task 10: Frontend — InputForm + pages + App wiring

**Files:**
- Create: `frontend/src/components/Generator/InputForm.tsx`
- Create: `frontend/src/pages/Home.tsx`
- Create: `frontend/src/pages/Generate.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create `InputForm.tsx`**

```tsx
import { useState } from 'react'
import type { ArtStyle } from '../../types/comic'

const ART_STYLES: ArtStyle[] = ['manga', 'marvel', 'chibi', 'noir', 'webtoon', 'pixel', 'vintage']

interface Props {
  onSubmit: (input: string, artStyle?: ArtStyle) => void
  loading: boolean
}

export function InputForm({ onSubmit, loading }: Props) {
  const [input, setInput] = useState('')
  const [artStyle, setArtStyle] = useState<ArtStyle | undefined>()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    onSubmit(input.trim(), artStyle)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-2xl">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste a URL, type an event, describe a drama... anything."
        rows={4}
        className="w-full border-2 border-black rounded-lg p-3 text-base resize-none
          focus:outline-none focus:ring-2 focus:ring-yellow-400"
      />

      {/* Art style selector */}
      <div className="flex flex-wrap gap-2">
        {ART_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setArtStyle(artStyle === style ? undefined : style)}
            className={`px-3 py-1 rounded-full border-2 border-black text-sm font-bold capitalize
              transition-colors
              ${artStyle === style ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
          >
            {style}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="bg-yellow-400 text-black font-bold text-lg py-3 rounded-lg border-2 border-black
          hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Generating...' : 'Make Comic →'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create `frontend/src/hooks/useGenerate.ts`**

```ts
import { useState } from 'react'
import { api } from '../api/client'
import { useComicStore } from '../store/comicStore'
import type { ArtStyle, Comic } from '../types/comic'

export function useGenerate() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setComic, setGenerationStatus, reset } = useComicStore()

  const generate = async (input: string, artStyle?: ArtStyle) => {
    reset()
    setLoading(true)
    setError(null)
    setGenerationStatus('scripting')

    try {
      const response = await api.generate({ input, art_style: artStyle })

      // Build a Comic from the synchronous response (stub path — panels already done)
      // TODO: when real image gen is wired, switch to SSE stream:
      //   const es = new EventSource(`/api/generate/${response.comic_id}/stream`)
      //   es.addEventListener('panel_update', (e) => updatePanelImage(...))
      //   es.addEventListener('complete', () => { setGenerationStatus('done'); es.close() })
      const comic: Comic = {
        id: response.comic_id,
        user_id: null,
        title: response.script.title,
        art_style: response.script.art_style,
        detected_type: response.script.detected_type,
        input_query: input,
        script_json: response.script,
        panel_urls: response.panels.map((p) => p.image_url ?? ''),
        shareable_url: null,
        created_at: new Date().toISOString(),
      }
      setComic(comic)
      setGenerationStatus('done')
      return comic
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed'
      setError(msg)
      setGenerationStatus('error')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { generate, loading, error }
}
```

- [ ] **Step 3: Create `frontend/src/pages/Generate.tsx`**

```tsx
import { InputForm } from '../components/Generator/InputForm'
import { ComicViewer } from '../components/ComicViewer/ComicViewer'
import { useGenerate } from '../hooks/useGenerate'
import { useComicStore } from '../store/comicStore'
import type { ArtStyle } from '../types/comic'

export function Generate() {
  const { generate, loading, error } = useGenerate()
  const { currentComic, generationStatus } = useComicStore()

  const handleSubmit = async (input: string, artStyle?: ArtStyle) => {
    await generate(input, artStyle)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-8">
        <h1 className="font-comic text-5xl text-black tracking-wide">StoryStrip</h1>
        <p className="text-gray-600 text-center max-w-md">
          Paste a URL, type any event, or describe a drama. We'll turn it into a comic in seconds.
        </p>

        <InputForm onSubmit={handleSubmit} loading={loading} />

        {error && (
          <p className="text-red-600 font-semibold">Error: {error}</p>
        )}

        {generationStatus === 'scripting' && (
          <p className="text-gray-500 animate-pulse">Writing script...</p>
        )}

        {currentComic && (
          <div className="w-full">
            <h2 className="font-comic text-3xl text-center mb-4">
              {currentComic.script_json.title}
            </h2>
            <p className="text-xs text-center text-gray-400 mb-4 uppercase tracking-widest">
              {currentComic.detected_type} · {currentComic.art_style}
            </p>
            <ComicViewer script={currentComic.script_json} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/pages/Home.tsx`**

```tsx
export function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-400">
      <div className="text-center">
        <h1 className="font-comic text-7xl text-black mb-4">StoryStrip</h1>
        <p className="text-xl text-black/70 mb-8">Every event, retold as a comic strip.</p>
        <a
          href="/generate"
          className="bg-black text-yellow-400 font-bold text-lg px-8 py-4 rounded-lg
            hover:bg-gray-900 transition-colors"
        >
          Make a Comic →
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire up `frontend/src/App.tsx`**

```tsx
import { Home } from './pages/Home'
import { Generate } from './pages/Generate'

export default function App() {
  const path = window.location.pathname

  if (path === '/generate') return <Generate />
  return <Home />
}
```

- [ ] **Step 6: Final TypeScript check**

```bash
cd /Users/longle/StoryStrip/frontend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: End-to-end smoke test**

With backend running on port 8000 and frontend on 5173:
1. Open `http://localhost:5173` → Home page with yellow background
2. Click "Make a Comic →" → navigate to `/generate`
3. Type "The fall of the Berlin Wall", select "manga", click submit
4. Should see "Writing script...", then mock comic appears with 4 panels
5. Hover over a speech bubble → red X appears → click X → bubble disappears
6. Click on bubble text → type new text → click outside → text updates

- [ ] **Step 8: Create `frontend/src/hooks/useComic.ts` (stub)**

```ts
import { useState } from 'react'
import { api } from '../api/client'
import type { Comic } from '../types/comic'

export function useComic() {
  const [comic, setComic] = useState<Comic | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchComic = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getComic(id)
      setComic(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }

  return { comic, loading, error, fetchComic }
}
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/
git commit -m "feat: wire up InputForm, Generate page, hooks — full end-to-end flow working"
```

---

## Task 11: Root-level cleanup

**Files:**
- Create: `.env.example` (root)
- Create: `.gitignore` (root)

- [ ] **Step 1: Create root `.env.example`**

```bash
# Root .env.example — documents all keys used across the project
# Backend uses backend/.env; this is documentation only.

OPENAI_API_KEY=
EXA_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ZILLIZ_ENDPOINT=
ZILLIZ_TOKEN=
BRIGHT_DATA_API_KEY=
ELEVENLABS_API_KEY=
VALSEA_API_KEY=
```

- [ ] **Step 2: Create `.gitignore`**

```
# Python
backend/.venv/
backend/__pycache__/
backend/**/__pycache__/
backend/.env
*.pyc

# Node
frontend/node_modules/
frontend/dist/

# Env
.env
.env.local

# OS
.DS_Store
```

- [ ] **Step 3: Final commit**

```bash
cd /Users/longle/StoryStrip
git add .env.example .gitignore
git commit -m "chore: root gitignore and env example"
```

---

## Verification Checklist

Before declaring boilerplate done, confirm all of these:

- [ ] `GET http://localhost:8000/health` → `{"status":"ok"}`
- [ ] `POST http://localhost:8000/generate` with `{"input":"Berlin Wall"}` → returns `comic_id`, 4 panels with `image_url`
- [ ] `GET http://localhost:8000/openapi.json` → all 6 routes present
- [ ] `http://localhost:5173` → Home page renders, yellow background, Bangers font
- [ ] `http://localhost:5173/generate` → Generate page renders
- [ ] Submit "Berlin Wall" → mock comic renders with 4 panels
- [ ] Hover bubble → X button visible → delete works
- [ ] Click bubble text → edit in place → blur → text updated in store
- [ ] `npx tsc --noEmit` in frontend → zero errors
- [ ] `python -c "from models.comic import Comic"` in backend → OK
