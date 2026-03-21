from fastapi import APIRouter
from pydantic import BaseModel

from routers.comics import _comics


router = APIRouter()


class DigestScheduleRequest(BaseModel):
    interval_minutes: int = 60


_digest_config = {"interval_minutes": 60}


@router.get("/digest")
async def get_digest():
    comics = sorted(_comics.values(), key=lambda item: item.get("created_at", ""), reverse=True)
    if not comics:
        return []

    digest_items = []
    for comic in comics[:10]:
        input_query = comic.get("input_query", "")
        source_url = input_query if input_query.startswith("http") else f"https://example.com/search?q={input_query}"
        digest_items.append(
            {
                "id": f"digest-{comic['id']}",
                "title": comic.get("title", "Untitled"),
                "source_url": source_url,
                "comic_id": comic["id"],
            }
        )
    return digest_items


@router.post("/digest/schedule")
async def schedule_digest(req: DigestScheduleRequest):
    _digest_config["interval_minutes"] = max(5, req.interval_minutes)
    return {
        "status": "scheduled",
        "interval_minutes": _digest_config["interval_minutes"],
    }
