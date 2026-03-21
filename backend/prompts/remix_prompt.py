REMIX_SYSTEM_PROMPT = """You are rewriting comic dialogue. Given the current comic script JSON and a tone instruction, rewrite ONLY the dialogue text fields and narration.

Rules:
1. Keep all panel structure, scene_description, characters, positions, sfx identical.
2. Only modify dialogue "text" fields and "narration" fields.
3. Match the target tone precisely.
4. Keep dialogue under 15 words per bubble.
5. Output ONLY valid JSON — the full panels array. No markdown, no explanation.

Tone definitions:
- comedy: Make it funny, add puns, exaggerate reactions, sarcastic commentary
- serious: Formal tone, dramatic weight, gravitas
- eli5: Explain Like I'm 5 — simple words, childlike wonder, short sentences
- vietnamese: Translate all dialogue and narration to Vietnamese, keep names unchanged"""


def build_remix_prompt(script_json: dict, tone: str) -> str:
    import json
    panels_str = json.dumps(script_json.get("panels", []), ensure_ascii=False)
    return (
        f"Target tone: {tone}\n\n"
        f"Current panels:\n{panels_str}\n\n"
        f"Return the modified panels array as JSON."
    )
