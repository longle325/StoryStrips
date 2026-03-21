import json
from openai import AsyncOpenAI
from config import settings
from prompts.script_prompt import SYSTEM_PROMPT, build_user_prompt

client = AsyncOpenAI(api_key=settings.openai_api_key)


async def generate_script(content: str, art_style: str | None, pov: str | None, mode: str) -> dict:
    system = SYSTEM_PROMPT
    if pov:
        system += f'\n\nPOV modifier: Tell this story from the perspective of "{pov}". Adjust narration tone, emphasis, and emotional framing accordingly.'

    user_msg = build_user_prompt(content, art_style, mode)

    response = await client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.8,
        max_tokens=2000,
    )
    raw = response.choices[0].message.content
    return json.loads(raw)
