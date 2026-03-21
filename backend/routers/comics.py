import asyncio
import json

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from models.comic import GenerateRequest
from services import cache, content_fetch, script_gen, image_gen, storage

router = APIRouter()

_comics: dict[str, dict] = {}


@router.post("/generate")
async def generate(req: GenerateRequest):
    cached = await cache.check_cache(req.input)
    if cached:
        return cached

    content = await content_fetch.fetch_content(req.input, req.mode)
    script = await script_gen.generate_script(content, req.art_style, req.pov, req.mode)

    panel_results = await image_gen.generate_all_panels(script["panels"], script["art_style"])

    results_map = {pnum: url for pnum, url in panel_results}
    for panel in script["panels"]:
        pnum = panel["panel_number"]
        panel["image_url"] = results_map.get(pnum)
        panel["image_status"] = "done" if pnum in results_map else "error"

    panel_urls = [results_map[p["panel_number"]] for p in script["panels"] if p["panel_number"] in results_map]
    comic = await storage.save_comic(script, panel_urls, req.input)

    _comics[comic["id"]] = comic
    await cache.store_cache(req.input, script)

    return {
        "comic_id": comic["id"],
        "script": script,
        "panels": script["panels"],
    }


@router.get("/generate/{comic_id}/stream")
async def stream(comic_id: str):
    comic = _comics.get(comic_id)
    if not comic:
        raise HTTPException(status_code=404, detail="Comic not found")

    async def event_generator():
        for panel in comic["script_json"]["panels"]:
            yield {
                "event": "panel_update",
                "data": json.dumps({
                    "panel_number": panel["panel_number"],
                    "image_url": panel["image_url"],
                    "image_status": panel["image_status"],
                }),
            }
            await asyncio.sleep(0.1)
        yield {
            "event": "complete",
            "data": json.dumps({
                "comic_id": comic_id,
                "shareable_url": comic.get("shareable_url"),
            }),
        }

    return EventSourceResponse(event_generator())


@router.get("/comics/{comic_id}")
async def get_comic(comic_id: str):
    comic = _comics.get(comic_id)
    if not comic:
        raise HTTPException(status_code=404, detail="Comic not found")
    return comic
