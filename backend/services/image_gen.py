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

PANEL_SUFFIX = "comic book panel, clear composition, no text in image, leave space for speech bubbles"
PAGE_SUFFIX_NO_TEXT = "comic book page layout, panels with black borders, dynamic composition, no text in image, leave space for speech bubbles"
PAGE_SUFFIX_WITH_TEXT = "comic book page layout, panels with black borders, dynamic composition, include all speech bubbles with dialogue text, narration boxes, and sound effect text"


async def _extract_character_descriptions(image_b64: str) -> str:
    """Use GPT-4o vision to extract character descriptions from Panel 1 for consistency."""
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Describe each character visible in this comic panel in detail. "
                            "For each character, describe: hair color/style, clothing, body type, "
                            "skin tone, distinctive features. Be specific and concise. "
                            "Format: 'Character N: [description]' one per line."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                    },
                ],
            }],
            max_tokens=500,
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        print(f"[image_gen] Character extraction failed: {e}")
        return ""


async def generate_panel_image(panel: dict, art_style: str, character_desc: str = "") -> tuple[str, str]:
    style_prefix = STYLE_PROMPTS.get(art_style, "")
    chars = ", ".join(
        f"{c['name']} ({c['emotion']}, positioned {c['position']})"
        for c in panel.get("characters", [])
    )

    consistency_block = ""
    if character_desc:
        consistency_block = f"\nCharacter visual reference (keep consistent):\n{character_desc}\n"

    prompt = (
        f"{style_prefix}. {panel['scene_description']}. "
        f"Characters: {chars}.{consistency_block}\n{PANEL_SUFFIX}"
    )

    response = await client.images.generate(
        model="gpt-image-1.5",
        prompt=prompt[:4000],
        n=1,
        size="1024x1024",
        quality="low",
    )

    img_b64 = response.data[0].b64_json
    img_bytes = base64.b64decode(img_b64)

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
    return public_url, img_b64


async def generate_all_panels(
    panels: list[dict], art_style: str
) -> list[tuple[int, str]]:
    """Generate all panels with character consistency from Panel 1."""
    if not panels:
        return []

    sem = asyncio.Semaphore(2)
    character_desc = ""

    first_panel = panels[0]
    try:
        url, b64 = await generate_panel_image(first_panel, art_style)
        character_desc = await _extract_character_descriptions(b64)
        out = [(first_panel["panel_number"], url)]
    except Exception as e:
        print(f"[image_gen] Panel {first_panel['panel_number']} failed: {e}")
        out = [(
            first_panel["panel_number"],
            f"https://placehold.co/512x512/1a1a2e/ffffff?text=Panel+{first_panel['panel_number']}+Error",
        )]

    if len(panels) <= 1:
        return out

    async def gen_one(panel):
        async with sem:
            url, _ = await generate_panel_image(panel, art_style, character_desc)
            return (panel["panel_number"], url)

    remaining = panels[1:]
    results = await asyncio.gather(
        *[gen_one(p) for p in remaining], return_exceptions=True
    )
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            pnum = remaining[i]["panel_number"]
            print(f"[image_gen] Panel {pnum} failed: {r}")
            out.append((
                pnum,
                f"https://placehold.co/512x512/1a1a2e/ffffff?text=Panel+{pnum}+Error",
            ))
        else:
            out.append(r)
    return out


def _build_panel_block(panel: dict, text_mode: str) -> str:
    chars = ", ".join(
        f"{c['name']} ({c['emotion']}, {c['position']})"
        for c in panel.get("characters", [])
    )
    block = f"Panel {panel['panel_number']}: {panel['scene_description']}. Characters: {chars}."

    if text_mode == "with_text":
        for d in panel.get("dialogue", []):
            bubble = d.get("bubble_type", "speech")
            block += f'\n  {bubble.capitalize()} bubble from {d["speaker"]}: "{d["text"]}"'
        if panel.get("narration"):
            block += f'\n  Narration box: "{panel["narration"]}"'
        if panel.get("sfx"):
            block += f"\n  Sound effect: {panel['sfx']}"

    return block


async def generate_full_page(
    panels: list[dict], art_style: str, text_mode: str = "without_text"
) -> str:
    """Generate a complete comic page with all panels in a single image."""
    style_prefix = STYLE_PROMPTS.get(art_style, "")
    n = len(panels)

    panel_blocks = "\n\n".join(_build_panel_block(p, text_mode) for p in panels)

    suffix = PAGE_SUFFIX_WITH_TEXT if text_mode == "with_text" else PAGE_SUFFIX_NO_TEXT

    prompt = (
        f"{style_prefix}.\n"
        f"Create a complete comic book page with {n} panels arranged naturally.\n\n"
        f"{panel_blocks}\n\n"
        f"{suffix}"
    )

    response = await client.images.generate(
        model="gpt-image-1",
        prompt=prompt[:4000],
        n=1,
        size="1024x1536",
        quality="low",
    )

    img_b64 = response.data[0].b64_json
    img_bytes = base64.b64decode(img_b64)

    img = Image.open(io.BytesIO(img_bytes))
    img = img.resize((768, 1152), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    img_bytes = buf.getvalue()

    filename = f"pages/{uuid.uuid4()}.png"
    supabase.storage.from_("comics").upload(
        filename, img_bytes, {"content-type": "image/png"}
    )
    return supabase.storage.from_("comics").get_public_url(filename)
