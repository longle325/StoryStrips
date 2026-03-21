import asyncio
import json
import re
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from sse_starlette.sse import EventSourceResponse
from supabase import create_client

from config import settings
from models.comic import GenerateRequest
from services import cache, content_fetch, script_gen, image_gen, storage
from services.image_gen import generate_panel_image, _extract_character_descriptions, _fallback_coords

router = APIRouter()

_supabase = create_client(settings.supabase_url, settings.supabase_service_key)
_comics: dict[str, dict] = {}

URL_PATTERN = re.compile(r"^https?://", re.IGNORECASE)


def _fetch_comic_from_db(comic_id: str) -> Optional[dict]:
    try:
        resp = _supabase.table("comics").select("*").eq("id", comic_id).execute()
        if resp.data:
            return resp.data[0]
    except Exception as e:
        print(f"[comics] Supabase fetch failed: {e}")
    return None


@router.post("/generate")
async def generate(req: GenerateRequest):
    cached = await cache.check_cache(req.input)
    if cached:
        return cached

    effective_mode = req.mode
    if req.mode == "url" and not URL_PATTERN.match(req.input.strip()):
        effective_mode = "freeform"

    try:
        content = await content_fetch.fetch_content(req.input, effective_mode)
    except Exception as e:
        print(f"[generate] Content fetch failed: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch content: {e}")

    try:
        script = await script_gen.generate_script(content, req.art_style, req.pov, effective_mode)
    except Exception as e:
        print(f"[generate] Script generation failed: {e}")
        raise HTTPException(status_code=502, detail=f"Script generation failed: {e}")

    if not script.get("panels") or not isinstance(script["panels"], list):
        raise HTTPException(status_code=502, detail="AI returned an invalid script (no panels). Please try again.")

    panel_results = await image_gen.generate_all_panels(
        script["panels"], script["art_style"], include_text=req.include_text
    )

    results_map = {pnum: (url, coords) for pnum, url, coords in panel_results}
    for panel in script["panels"]:
        pnum = panel["panel_number"]
        hit = results_map.get(pnum)
        panel["image_url"] = hit[0] if hit else None
        panel["image_status"] = "done" if hit else "error"
        panel["character_coords"] = hit[1] if hit else []

    panel_urls = [results_map[p["panel_number"]][0] for p in script["panels"] if p["panel_number"] in results_map]
    text_mode = "with_text" if req.include_text else "without_text"
    comic = await storage.save_comic(script, panel_urls, req.input, text_mode=text_mode)

    _comics[comic["id"]] = comic

    response = {
        "comic_id": comic["id"],
        "script": script,
        "panels": script["panels"],
    }
    await cache.store_cache(req.input, response)

    return response


@router.post("/generate/stream")
async def generate_stream(req: GenerateRequest):
    """Stream comic generation progress via SSE."""

    async def event_gen():
        # Step 1: Cache check
        cached = await cache.check_cache(req.input)
        if cached:
            yield {"event": "complete", "data": json.dumps(cached)}
            return

        effective_mode = req.mode
        if req.mode == "url" and not URL_PATTERN.match(req.input.strip()):
            effective_mode = "freeform"

        # Step 2: Content fetch
        yield {"event": "progress", "data": json.dumps({"stage": "fetching", "message": "Fetching content..."})}
        try:
            content = await content_fetch.fetch_content(req.input, effective_mode)
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"message": f"Failed to fetch content: {e}"})}
            return

        # Step 3: Script generation
        yield {"event": "progress", "data": json.dumps({"stage": "scripting", "message": "Writing script..."})}
        try:
            script = await script_gen.generate_script(content, req.art_style, req.pov, effective_mode)
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"message": f"Script generation failed: {e}"})}
            return

        if not script.get("panels") or not isinstance(script["panels"], list):
            yield {"event": "error", "data": json.dumps({"message": "AI returned an invalid script (no panels)."})}
            return

        panels = script["panels"]
        total_panels = len(panels)
        yield {"event": "progress", "data": json.dumps({"stage": "generating_images", "message": f"Generating panel 1/{total_panels}...", "total_panels": total_panels, "completed": 0})}

        # Step 4: Generate panel 1 first (character consistency)
        sem = asyncio.Semaphore(2)
        character_desc = ""
        first_panel = panels[0]

        try:
            url, b64, coords = await generate_panel_image(first_panel, script["art_style"], include_text=req.include_text)
            character_desc = await _extract_character_descriptions(b64)
            first_panel["image_url"] = url
            first_panel["image_status"] = "done"
            first_panel["character_coords"] = coords
        except Exception as e:
            print(f"[generate_stream] Panel {first_panel['panel_number']} failed: {e}")
            pnum = first_panel["panel_number"]
            first_panel["image_url"] = f"https://placehold.co/512x512/1a1a2e/ffffff?text=Panel+{pnum}+Error"
            first_panel["image_status"] = "error"
            first_panel["character_coords"] = _fallback_coords(first_panel.get("characters", []))

        yield {"event": "panel_ready", "data": json.dumps({"panel_number": first_panel["panel_number"], "image_url": first_panel["image_url"], "image_status": first_panel["image_status"], "completed": 1, "total_panels": total_panels})}

        # Step 5: Generate remaining panels in parallel batches, yielding each as done
        if len(panels) > 1:
            remaining = panels[1:]
            completed_count = 1

            async def gen_one(panel):
                async with sem:
                    try:
                        url, _, coords = await generate_panel_image(panel, script["art_style"], character_desc, include_text=req.include_text)
                        panel["image_url"] = url
                        panel["image_status"] = "done"
                        panel["character_coords"] = coords
                    except Exception as e:
                        pnum = panel["panel_number"]
                        print(f"[generate_stream] Panel {pnum} failed: {e}")
                        panel["image_url"] = f"https://placehold.co/512x512/1a1a2e/ffffff?text=Panel+{pnum}+Error"
                        panel["image_status"] = "error"
                        panel["character_coords"] = _fallback_coords(panel.get("characters", []))
                    return panel

            # Use asyncio.as_completed to yield panels as they finish
            tasks = {asyncio.ensure_future(gen_one(p)): p for p in remaining}
            for coro in asyncio.as_completed(tasks.keys()):
                panel = await coro
                completed_count += 1
                yield {"event": "panel_ready", "data": json.dumps({"panel_number": panel["panel_number"], "image_url": panel["image_url"], "image_status": panel["image_status"], "completed": completed_count, "total_panels": total_panels})}

        # Step 6: Save and return complete result
        yield {"event": "progress", "data": json.dumps({"stage": "saving", "message": "Saving comic..."})}

        panel_urls = [p["image_url"] for p in panels if p.get("image_status") == "done"]
        text_mode = "with_text" if req.include_text else "without_text"
        comic = await storage.save_comic(script, panel_urls, req.input, text_mode=text_mode)
        _comics[comic["id"]] = comic

        response = {
            "comic_id": comic["id"],
            "script": script,
            "panels": script["panels"],
        }
        await cache.store_cache(req.input, response)

        yield {"event": "complete", "data": json.dumps(response)}

    return EventSourceResponse(event_gen())


@router.get("/generate/{comic_id}/stream")
async def stream(comic_id: str):
    comic = _comics.get(comic_id)
    if not comic:
        comic = _fetch_comic_from_db(comic_id)
    if not comic:
        raise HTTPException(status_code=404, detail="Comic not found")

    async def event_generator():
        panels = comic.get("script_json", {}).get("panels", [])
        for panel in panels:
            yield {
                "event": "panel_update",
                "data": json.dumps({
                    "panel_number": panel["panel_number"],
                    "image_url": panel.get("image_url"),
                    "image_status": panel.get("image_status", "done"),
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


@router.get("/comics")
async def list_comics(
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
):
    try:
        resp = (
            _supabase.table("comics")
            .select("id, title, art_style, detected_type, input_query, panel_urls, full_page_url, created_at")
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return {"comics": resp.data, "count": len(resp.data)}
    except Exception as e:
        print(f"[comics] list_comics failed: {e}")
        return {"comics": [], "count": 0}


@router.get("/comics/{comic_id}")
async def get_comic(comic_id: str):
    comic = _comics.get(comic_id)
    if comic:
        return comic

    comic = _fetch_comic_from_db(comic_id)
    if not comic:
        raise HTTPException(status_code=404, detail="Comic not found")
    return comic


@router.delete("/comics/{comic_id}")
async def delete_comic(comic_id: str):
    try:
        resp = _supabase.table("comics").select("panel_urls").eq("id", comic_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Comic not found")

        panel_urls = resp.data[0].get("panel_urls", [])
        for url in panel_urls:
            if "/storage/v1/object/public/comics/" in url:
                path = url.split("/storage/v1/object/public/comics/")[-1]
                try:
                    _supabase.storage.from_("comics").remove([path])
                except Exception:
                    pass

        _supabase.table("comics").delete().eq("id", comic_id).execute()
        _comics.pop(comic_id, None)
        return {"deleted": True, "comic_id": comic_id}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[comics] delete_comic failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete comic")
