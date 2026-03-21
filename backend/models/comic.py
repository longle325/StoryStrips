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
TextMode = Literal["with_text", "without_text"]
ImageStatus = Literal["pending", "generating", "done", "error"]


class DialogueLine(BaseModel):
    speaker: str
    text: str
    bubble_type: BubbleType


class Character(BaseModel):
    name: str
    emotion: str
    position: CharacterPosition


class CharacterCoord(BaseModel):
    name: str
    x: float
    y: float


class Panel(BaseModel):
    panel_number: int
    scene_description: str
    characters: list[Character]
    dialogue: list[DialogueLine]
    narration: str | None = None
    sfx: str | None = None
    image_url: str | None = None
    image_status: ImageStatus = "pending"
    character_coords: list[CharacterCoord] = []


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
    full_page_url: str | None = None
    text_mode: TextMode = "without_text"
    is_digest: bool = False
    digest_date: str | None = None
    shareable_url: str | None = None
    created_at: str


class GenerateRequest(BaseModel):
    input: str
    mode: InputType
    art_style: ArtStyle | None = None
    pov: str | None = None
    include_text: bool = True


class GenerateResponse(BaseModel):
    comic_id: str
    script: ComicScript
    panels: list[Panel]
    full_page_url: str | None = None
    text_mode: TextMode = "without_text"


class RemixRequest(BaseModel):
    comic_id: str
    tone: Literal["comedy", "vietnamese", "eli5", "serious"]


class RemixResponse(BaseModel):
    comic_id: str
    panels: list[Panel]
    script: ComicScript


class DigestArticle(BaseModel):
    title: str
    summary: str
    source_url: str | None = None
    comic_id: str | None = None
    full_page_url: str | None = None


class DigestResponse(BaseModel):
    date: str
    articles: list[DigestArticle]


class ErrorResponse(BaseModel):
    error: str
    code: str
    panel_number: int | None = None
