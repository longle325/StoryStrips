# StoryStrip AI

> Every event in the world, retold as a comic strip in 30 seconds.

StoryStrip AI transforms any news article, historical event, or internet drama into a 4–6 panel comic strip. Users provide a topic (URL, text, or drama description) and the AI researches, scripts, generates panels, and assembles a shareable comic with speech bubbles, narration, and SFX.

## Modes

- **News Mode** — paste a URL, get a comic
- **History Mode** — type any event, choose an art style
- **Drama Mode** — describe any drama, get a viral recap comic

## Features

- **AI Comic Generation** — GPT-4o scripts + gpt-image-1 panel images, generated in parallel
- **7 Art Styles** — Manga, Marvel, Chibi, Noir, Webtoon, Pixel, Vintage
- **Choose Your POV** — same event told from different character perspectives
- **Remix & Meme Mode** — edit dialogue text inline, change tone (comedy, ELI5, etc.)
- **Daily Comic Digest** — automated daily cron job fetches trending news and generates comics
- **Share Card Export** — download comics as PNG for Instagram/Twitter
- **Editable Speech Bubbles** — HTML/CSS overlay bubbles, click to edit or delete
- **Streaming Generation** — panels appear one-by-one as they complete with progress bars
- **Vector Cache** — Zilliz-powered deduplication for repeat topics

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React + Tailwind CSS (Vite) |
| Backend | Python + FastAPI |
| Script Gen | OpenAI GPT-4o-mini |
| Image Gen | OpenAI gpt-image-1 |
| Content Fetch | Exa AI |
| Social Scrape | Bright Data |
| Cache/Search | Zilliz (Milvus) |
| Database/Auth/Storage | Supabase |

## Project Structure

```
storystrip/
├── backend/
│   ├── main.py              # FastAPI entry point + digest scheduler
│   ├── config.py             # Settings via environment variables
│   ├── routers/
│   │   ├── comics.py         # POST /generate, /generate/stream, GET /comics
│   │   ├── remix.py          # POST /remix
│   │   └── digest.py         # GET /digest, POST /digest/refresh/stream
│   ├── services/
│   │   ├── content_fetch.py  # Exa + Bright Data content acquisition
│   │   ├── script_gen.py     # GPT-4o-mini comic script generation
│   │   ├── image_gen.py      # gpt-image-1 parallel panel generation
│   │   ├── digest.py         # Daily digest pipeline
│   │   ├── cache.py          # Zilliz vector cache (REST API)
│   │   ├── storage.py        # Supabase storage upload
│   │   └── assembly.py       # Comic metadata assembly
│   ├── models/
│   │   ├── comic.py          # Pydantic schemas
│   │   └── script.py         # Comic script JSON schema
│   └── prompts/
│       ├── script_prompt.py  # Master comic script prompt
│       ├── style_prompts.py  # Per-art-style prefix strings
│       └── remix_prompt.py   # Remix/tone-shift prompt
├── frontend/
│   ├── src/
│   │   ├── components/       # ComicViewer, Generator, ShareCard, etc.
│   │   ├── pages/            # Home, Generate, ComicPage, Digest
│   │   ├── hooks/            # useGenerate, useComic
│   │   ├── store/            # Zustand store
│   │   └── api/              # API client + SSE helpers
│   └── public/
├── .env.example
├── requirements.txt
└── package.json
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- API keys: OpenAI, Exa, Supabase (see `.env.example`)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r ../requirements.txt
cp ../.env.example .env  # fill in your API keys
uvicorn main:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API requests to the backend on port 8001.

## Environment Variables

```bash
# Required
OPENAI_API_KEY=
EXA_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
ZILLIZ_ENDPOINT=
ZILLIZ_TOKEN=

# Optional
BRIGHT_DATA_API_KEY=    # Drama mode
ELEVENLABS_API_KEY=     # Audio (future)
```

## Pipeline

```
Input (URL / text / drama)
  → Content Acquisition (Exa / Bright Data, 3-5s)
  → Comic Script Generation (GPT-4o-mini, 3-5s)
  → Panel Image Generation (gpt-image-1, parallel, 10-15s)
  → Supabase Storage Upload
  → Shareable Comic Output
```

## License

MIT
