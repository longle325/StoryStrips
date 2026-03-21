from __future__ import annotations
from enum import Enum
from typing import Literal
from pydantic import BaseModel


class ArtStyle(str, Enum):
    manga = "manga"
    marvel = "marvel"
    chibi = "chibi"
    noir = "noir"
    webtoon = "webtoon"
    pixel = "pixel"
    vintage = "vintage"


class BubbleType(str, Enum):
    speech = "speech"
    thought = "thought"
    shout = "shout"


class CharacterPosition(str, Enum):
    left = "left"
    center = "center"
    right = "right"


InputType = Literal["url", "history", "drama", "freeform"]
ImageStatus = Literal["pending", "generating", "done", "error"]


class DialogueLine(BaseModel):
    speaker: str
    text: str
    bubble_type: BubbleType


class Character(BaseModel):
    name: str
    emotion: str
    position: CharacterPosition


class Panel(BaseModel):
    panel_number: int
    scene_description: str
    characters: list[Character]
    dialogue: list[DialogueLine]
    narration: str | None = None
    sfx: str | None = None
    image_url: str | None = None
    image_status: ImageStatus = "pending"


class ComicScript(BaseModel):
    title: str
    art_style: ArtStyle
    detected_type: InputType
    panels: list[Panel]


class Comic(BaseModel):
    id: str
    user_id: str | None = None
    title: str
    art_style: ArtStyle
    detected_type: InputType
    input_query: str
    script_json: ComicScript
    panel_urls: list[str]
    shareable_url: str | None = None
    created_at: str


class GenerateRequest(BaseModel):
    input: str
    mode: InputType  # "url" | "history" | "drama" | "freeform"
    art_style: ArtStyle | None = None
    pov: str | None = None
    include_text: bool = True


class GenerateResponse(BaseModel):
    comic_id: str
    script: ComicScript
    panels: list[Panel]


class RemixRequest(BaseModel):
    comic_id: str
    tone: Literal["comedy", "vietnamese", "eli5", "serious"]


class RemixResponse(BaseModel):
    comic_id: str
    panels: list[Panel]
    script: ComicScript


class ErrorResponse(BaseModel):
    error: str
    code: str
    panel_number: int | None = None
