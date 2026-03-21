import asyncio
import base64
import io
import json
import uuid

from PIL import Image
from openai import AsyncOpenAI
from supabase import create_client

from config import settings
from prompts.style_prompts import STYLE_PROMPTS

client = AsyncOpenAI(api_key=settings.openai_api_key)
supabase = create_client(settings.supabase_url, settings.supabase_service_key)

PANEL_SUFFIX_NO_TEXT = "comic book panel, clear composition, no text in image, leave space for speech bubbles"
PANEL_SUFFIX_WITH_TEXT = "comic book panel, clear composition, include dialogue text in speech bubbles, include narration text, include sound effects text"

_POSITION_FALLBACK = {"left": 20, "center": 50, "right": 80}


def _fallback_coords(characters: list[dict]) -> list[dict]:
    """Map character.position to approximate percentage coordinates."""
    coords = []
    for c in characters:
        pos = c.get("position", "center")
        coords.append({
            "name": c.get("name", "Unknown"),
            "x": _POSITION_FALLBACK.get(pos, 50),
            "y": 35,
        })
    return coords


async def _detect_character_positions(image_b64: str, characters: list[dict]) -> list[dict]:
    """Use GPT-4o Vision to detect character head positions as x,y percentages."""
    if not characters:
        return []
    names = [c.get("name", f"Character {i+1}") for i, c in enumerate(characters)]
    names_str = ", ".join(names)
    try:
        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"This comic panel contains these characters: {names_str}.\n"
                            "For each character, estimate the x,y percentage coordinates (0-100) "
                            "of where their HEAD is positioned in the image.\n"
                            "x=0 is left edge, x=100 is right edge. y=0 is top, y=100 is bottom.\n"
                            "Return ONLY a JSON array, no markdown:\n"
                            '[{"name": "...", "x": 25, "y": 30}, ...]'
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                    },
                ],
            }],
            max_tokens=300,
        )
        raw = response.choices[0].message.content or "[]"
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]
        coords = json.loads(raw)
        if isinstance(coords, list) and all("x" in c and "y" in c for c in coords):
            return coords
    except Exception as e:
        print(f"[image_gen] Character position detection failed: {e}")
    return _fallback_coords(characters)


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


async def generate_panel_image(
    panel: dict, art_style: str, character_desc: str = "", include_text: bool = False
) -> tuple[str, str, list[dict]]:
    """Generate a panel image. Returns (public_url, b64, character_coords)."""
    style_prefix = STYLE_PROMPTS.get(art_style, "")
    chars = ", ".join(
        f"{c['name']} ({c['emotion']}, positioned {c['position']})"
        for c in panel.get("characters", [])
    )

    consistency_block = ""
    if character_desc:
        consistency_block = f"\nCharacter visual reference (keep consistent):\n{character_desc}\n"

    suffix = PANEL_SUFFIX_WITH_TEXT if include_text else PANEL_SUFFIX_NO_TEXT
    prompt = (
        f"{style_prefix}. {panel['scene_description']}. "
        f"Characters: {chars}.{consistency_block}\n{suffix}"
    )

    if include_text:
        dialogue_lines = "; ".join(
            f'{d["speaker"]}: "{d["text"]}"' for d in panel.get("dialogue", [])
        )
        if dialogue_lines:
            prompt += f"\nDialogue in speech bubbles: {dialogue_lines}"
        if panel.get("narration"):
            prompt += f"\nNarration box: {panel['narration']}"
        if panel.get("sfx"):
            prompt += f"\nSound effect text: {panel['sfx']}"

    pnum = panel.get("panel_number", "?")

    # Image generation with 1 retry
    response = None
    for attempt in range(2):
        try:
            response = await client.images.generate(
                model="gpt-image-1.5",
                prompt=prompt[:4000],
                n=1,
                size="1024x1024",
                quality="low",
            )
            break
        except Exception as e:
            if attempt == 0:
                print(f"[image_gen] Panel {pnum} attempt 1 failed, retrying: {e}")
                continue
            print(f"[image_gen] Panel {pnum} attempt 2 failed: {e}")
            raise

    img_b64 = response.data[0].b64_json

    # PIL processing
    try:
        img_bytes = base64.b64decode(img_b64)
        img = Image.open(io.BytesIO(img_bytes))
        img = img.resize((512, 512), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        img_bytes = buf.getvalue()
    except Exception as e:
        print(f"[image_gen] Panel {pnum} PIL processing failed: {e}")
        raise

    # Supabase upload
    try:
        filename = f"panels/{uuid.uuid4()}.png"
        supabase.storage.from_("comics").upload(
            filename, img_bytes, {"content-type": "image/png"}
        )
        public_url = supabase.storage.from_("comics").get_public_url(filename)
    except Exception as e:
        print(f"[image_gen] Panel {pnum} Supabase upload failed: {e}")
        raise

    characters = panel.get("characters", [])
    coords = await _detect_character_positions(img_b64, characters)

    return public_url, img_b64, coords


async def generate_all_panels(
    panels: list[dict], art_style: str, include_text: bool = False
) -> list[tuple[int, str, list[dict]]]:
    """Generate all panels with character consistency from Panel 1.
    Returns [(panel_number, url, character_coords), ...]."""
    if not panels:
        return []

    sem = asyncio.Semaphore(2)
    character_desc = ""

    first_panel = panels[0]
    try:
        url, b64, coords = await generate_panel_image(first_panel, art_style, include_text=include_text)
        character_desc = await _extract_character_descriptions(b64)
        out = [(first_panel["panel_number"], url, coords)]
    except Exception as e:
        print(f"[image_gen] Panel {first_panel['panel_number']} failed: {e}")
        out = [(
            first_panel["panel_number"],
            f"https://placehold.co/512x512/1a1a2e/ffffff?text=Panel+{first_panel['panel_number']}+Error",
            _fallback_coords(first_panel.get("characters", [])),
        )]

    if len(panels) <= 1:
        return out

    async def gen_one(panel):
        async with sem:
            url, _, coords = await generate_panel_image(panel, art_style, character_desc, include_text=include_text)
            return (panel["panel_number"], url, coords)

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
                _fallback_coords(remaining[i].get("characters", [])),
            ))
        else:
            out.append(r)
    return out
