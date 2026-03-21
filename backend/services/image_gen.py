import asyncio
import base64
import io
import uuid

from PIL import Image
from openai import AsyncOpenAI
from supabase import create_client

from config import settings
from prompts.style_prompts import STYLE_PROMPTS

client = AsyncOpenAI(api_key=settings.openai_api_key)
supabase = create_client(settings.supabase_url, settings.supabase_service_key)

SUFFIX_WITH_TEXT = "comic book panel, clear composition, draw speech bubbles with dialogue text inside them"
SUFFIX_NO_TEXT = "comic book panel, clear composition, no text in image, no speech bubbles, leave clear space for overlays"


def _build_dialogue_prompt(panel: dict) -> str:
    parts = []
    for d in panel.get("dialogue", []):
        bubble = d.get("bubble_type", "speech")
        parts.append(f'- {d["speaker"]} ({bubble} bubble): "{d["text"]}"')
    if panel.get("narration"):
        parts.append(f'Narration caption box at top: "{panel["narration"]}"')
    if panel.get("sfx"):
        parts.append(f'Sound effect text: {panel["sfx"]}')
    return "\n".join(parts)


async def generate_panel_image(panel: dict, art_style: str, include_text: bool = True) -> str:
    style_prefix = STYLE_PROMPTS.get(art_style, "")
    chars = ", ".join(
        f"{c['name']} ({c['emotion']}, {c['position']})" for c in panel.get("characters", [])
    )
    if include_text:
        dialogue_prompt = _build_dialogue_prompt(panel)
        prompt = (
            f"{style_prefix}. {panel['scene_description']}. Characters: {chars}.\n"
            f"Speech bubbles with dialogue:\n{dialogue_prompt}\n"
            f"{SUFFIX_WITH_TEXT}"
        )
    else:
        prompt = (
            f"{style_prefix}. {panel['scene_description']}. Characters: {chars}.\n"
            f"{SUFFIX_NO_TEXT}"
        )

    response = await client.images.generate(
        model="gpt-image-1.5",
        prompt=prompt[:5000],
        n=1,
        size="1024x1024",
        quality="low",
    )

    img_b64 = response.data[0].b64_json
    img_bytes = base64.b64decode(img_b64)

    # Resize 1024x1024 → 512x512 before upload
    img = Image.open(io.BytesIO(img_bytes))
    img = img.resize((512, 512), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    img_bytes = buf.getvalue()

    filename = f"panels/{uuid.uuid4()}.png"
    supabase.storage.from_("comics").upload(
        filename, img_bytes, {"content-type": "image/png"}
    )
    public_url = supabase.storage.from_("comics").get_public_url(filename)
    return public_url


async def generate_all_panels(
    panels: list[dict],
    art_style: str,
    include_text: bool = True,
) -> list[tuple[int, str]]:
    sem = asyncio.Semaphore(4)

    async def gen_one(panel):
        async with sem:
            url = await generate_panel_image(panel, art_style, include_text=include_text)
            return (panel["panel_number"], url)

    results = await asyncio.gather(*[gen_one(p) for p in panels], return_exceptions=True)
    out = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            print(f"[image_gen] Panel {panels[i]['panel_number']} failed: {r}")
            out.append((
                panels[i]["panel_number"],
                f"https://placehold.co/1024x1024/1a1a2e/ffffff?text=Panel+{panels[i]['panel_number']}+Error",
            ))
        else:
            out.append(r)
    return out
