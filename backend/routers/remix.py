import json

from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI
from supabase import create_client

from config import settings
from models.comic import RemixRequest
from prompts.remix_prompt import REMIX_SYSTEM_PROMPT, build_remix_prompt

router = APIRouter()

_openai = AsyncOpenAI(api_key=settings.openai_api_key)
_supabase = create_client(settings.supabase_url, settings.supabase_service_key)


@router.post("/remix")
async def remix(req: RemixRequest):
    resp = _supabase.table("comics").select("script_json").eq("id", req.comic_id).execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Comic not found")

    script_json = resp.data[0]["script_json"]
    if isinstance(script_json, str):
        script_json = json.loads(script_json)

    user_prompt = build_remix_prompt(script_json, req.tone)

    try:
        completion = await _openai.chat.completions.create(
            model="gpt-4.1",
            messages=[
                {"role": "system", "content": REMIX_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.9,
            max_tokens=4000,
        )
        raw = completion.choices[0].message.content
        remixed = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Remix generation failed: {e}")

    remixed_panels = remixed.get("panels", remixed) if isinstance(remixed, dict) else remixed

    if isinstance(remixed_panels, list):
        script_json["panels"] = remixed_panels
    else:
        raise HTTPException(status_code=500, detail="Unexpected remix output format")

    try:
        _supabase.table("comics").update({"script_json": script_json}).eq("id", req.comic_id).execute()
    except Exception as e:
        print(f"[remix] Supabase update failed: {e}")

    return {
        "comic_id": req.comic_id,
        "script": script_json,
        "panels": script_json["panels"],
    }
