import uuid
from datetime import datetime, timezone

from supabase import create_client
from config import settings

supabase = create_client(settings.supabase_url, settings.supabase_service_key)


async def save_comic(script: dict, panel_urls: list[str], input_query: str) -> dict:
    comic_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": comic_id,
        "user_id": None,
        "title": script["title"],
        "art_style": script["art_style"],
        "detected_type": script["detected_type"],
        "input_query": input_query,
        "script_json": script,
        "panel_urls": panel_urls,
        "shareable_url": None,
        "created_at": now,
    }
    try:
        supabase.table("comics").insert(row).execute()
    except Exception as e:
        print(f"[storage] Supabase insert failed (non-fatal): {e}")
    return row
