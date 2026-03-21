import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routers.comics import router as comics_router
from routers.remix import router as remix_router
from routers.digest import router as digest_router


async def _digest_scheduler():
    """Run digest generation daily. Waits until next midnight UTC, then loops."""
    from services.digest import generate_digest

    while True:
        now = datetime.now(timezone.utc)
        tomorrow_midnight = (now + timedelta(days=1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        wait_seconds = (tomorrow_midnight - now).total_seconds()
        print(f"[scheduler] Next digest run in {wait_seconds:.0f}s (midnight UTC)")
        await asyncio.sleep(wait_seconds)

        print("[scheduler] Starting daily digest generation...")
        try:
            results = await generate_digest()
            print(f"[scheduler] Digest complete: {len(results)} articles")
        except Exception as e:
            print(f"[scheduler] Digest failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_digest_scheduler())
    print("[scheduler] Digest scheduler started")
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="StoryStrip API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(comics_router, tags=["comics"])
app.include_router(remix_router, tags=["remix"])
app.include_router(digest_router, tags=["digest"])


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.port, reload=True)
