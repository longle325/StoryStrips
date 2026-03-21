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
