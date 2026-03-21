import uuid
from datetime import datetime, timezone

from supabase import create_client
from config import settings

supabase = create_client(settings.supabase_url, settings.supabase_service_key)


async def save_comic(
    script: dict,
    panel_urls: list[str],
    input_query: str,
    full_page_url: str | None = None,
    text_mode: str = "without_text",
    is_digest: bool = False,
    digest_date: str | None = None,
    source_url: str | None = None,
) -> dict:
    comic_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    row = {
        "id": comic_id,
        "user_id": None,
        "title": script.get("title", "Untitled"),
        "art_style": script.get("art_style", "manga"),
        "detected_type": script.get("detected_type", "freeform"),
        "input_query": input_query,
        "script_json": script,
        "panel_urls": panel_urls,
        "shareable_url": None,
        "created_at": now,
    }
    if full_page_url is not None:
        row["full_page_url"] = full_page_url
    if text_mode != "without_text":
        row["text_mode"] = text_mode
    if is_digest:
        row["is_digest"] = True
    if digest_date is not None:
        row["digest_date"] = digest_date
    if source_url is not None:
        row["source_url"] = source_url
    try:
        supabase.table("comics").insert(row).execute()
    except Exception as e:
        print(f"[storage] Supabase insert failed (non-fatal): {e}")
    return row
