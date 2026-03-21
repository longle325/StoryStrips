import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse
from supabase import create_client

from config import settings
from services.digest import generate_digest, generate_digest_stream

router = APIRouter()

_supabase = create_client(settings.supabase_url, settings.supabase_service_key)
_digest_running = False


@router.get("/digest")
async def get_digest():
    """Return today's digest comics from Supabase."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        resp = (
            _supabase.table("comics")
            .select("id, title, input_query, panel_urls, script_json, source_url, created_at")
            .eq("is_digest", True)
            .eq("digest_date", today)
            .order("created_at", desc=False)
            .execute()
        )
        articles = []
        for row in resp.data:
            articles.append({
                "title": row.get("title", "Untitled"),
                "summary": row.get("input_query", ""),
                "source_url": row.get("source_url"),
                "comic_id": row["id"],
                "panel_urls": row.get("panel_urls", []),
                "script_json": row.get("script_json"),
            })
        return {"date": today, "articles": articles}
    except Exception as e:
        print(f"[digest] Failed to fetch digest: {e}")
        return {"date": today, "articles": []}


@router.post("/digest/refresh")
async def refresh_digest():
    """Manually trigger digest generation for today."""
    global _digest_running
    if _digest_running:
        return {"status": "already_running"}

    _digest_running = True
    try:
        new_results = await generate_digest()
        # Re-fetch all today's digests (old + new) from DB
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        all_resp = (
            _supabase.table("comics")
            .select("id, title, input_query, panel_urls, script_json, source_url, created_at")
            .eq("is_digest", True)
            .eq("digest_date", today)
            .order("created_at", desc=False)
            .execute()
        )
        articles = []
        for row in all_resp.data:
            articles.append({
                "title": row.get("title", "Untitled"),
                "summary": row.get("input_query", ""),
                "source_url": row.get("source_url"),
                "comic_id": row["id"],
                "panel_urls": row.get("panel_urls", []),
                "script_json": row.get("script_json"),
            })
        return {"status": "completed", "count": len(new_results), "articles": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Digest generation failed: {e}")
    finally:
        _digest_running = False


@router.post("/digest/refresh/stream")
async def refresh_digest_stream():
    """Stream digest generation progress via SSE — each article yields an event as it completes."""
    global _digest_running
    if _digest_running:
        return {"status": "already_running"}

    _digest_running = True

    async def event_gen():
        try:
            async for item in generate_digest_stream():
                yield {
                    "event": item["event"],
                    "data": json.dumps(item),
                }
        finally:
            global _digest_running
            _digest_running = False

    return EventSourceResponse(event_gen())
