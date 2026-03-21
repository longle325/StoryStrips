export type Mode = "url" | "history" | "drama" | "freeform";
export type ArtStyle = "manga" | "marvel" | "chibi" | "noir" | "webtoon" | "pixel" | "vintage";
export type TextMode = "with_text" | "without_text";
export type ImageStatus = "pending" | "generating" | "done" | "error";

export interface Dialogue {
  speaker: string;
  text: string;
  bubble_type: "speech" | "thought" | "shout";
}

export interface CharacterCoord {
  name: string;
  x: number;
  y: number;
}

export interface Panel {
  panel_number: number;
  scene_description: string;
  characters: Array<{
    name: string;
    emotion: string;
    position: "left" | "center" | "right";
  }>;
  dialogue: Dialogue[];
  narration: string | null;
  sfx: string | null;
  caption?: string | null;
  image_url: string | null;
  image_status: ImageStatus;
  character_coords?: CharacterCoord[];
}

export interface ComicScript {
  title: string;
  art_style: ArtStyle;
  detected_type: Mode;
  panels: Panel[];
}

export interface GenerateComicPayload {
  input: string;
  mode: Mode;
  art_style?: ArtStyle;
  pov?: string;
  include_text?: boolean;
}

export interface GeneratedComic {
  comic_id: string;
  script: ComicScript;
  panels: Panel[];
  full_page_url?: string | null;
  text_mode?: TextMode;
}

export interface ComicRecord {
  id: string;
  title: string;
  art_style: ArtStyle;
  detected_type: Mode;
  input_query: string;
  panel_urls: string[];
  created_at: string;
}

export interface DigestArticle {
  title: string;
  summary: string;
  source_url: string | null;
  comic_id: string | null;
  panel_urls: string[];
  script_json?: ComicScript | null;
}

export interface DigestResponse {
  date: string;
  articles: DigestArticle[];
}

export interface RemixPayload {
  comic_id: string;
  tone: "comedy" | "vietnamese" | "eli5" | "serious";
}

const API_BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function generateComic(payload: GenerateComicPayload): Promise<GeneratedComic> {
  return request<GeneratedComic>("/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getComic(comicId: string): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>(`/comics/${comicId}`);
}

export async function listComics(limit = 50, offset = 0): Promise<{ comics: ComicRecord[]; count: number }> {
  return request<{ comics: ComicRecord[]; count: number }>(`/comics?limit=${limit}&offset=${offset}`);
}

export async function deleteComic(comicId: string): Promise<{ deleted: boolean }> {
  return request<{ deleted: boolean }>(`/comics/${comicId}`, { method: "DELETE" });
}

export async function remixComic(payload: RemixPayload): Promise<GeneratedComic> {
  return request<GeneratedComic>("/remix", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getDigest(): Promise<DigestResponse> {
  return request<DigestResponse>("/digest");
}

export async function refreshDigest(): Promise<{ status: string; count: number; articles: DigestArticle[] }> {
  return request<{ status: string; count: number; articles: DigestArticle[] }>("/digest/refresh", {
    method: "POST",
  });
}

export type SSECallback = (event: string, data: Record<string, unknown>) => void;

export async function streamRefreshDigest(onEvent: SSECallback): Promise<void> {
  const response = await fetch(`${API_BASE}/digest/refresh/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop()!;

    for (const part of parts) {
      let eventName = "message";
      let dataStr = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataStr = line.slice(5).trim();
      }
      if (dataStr) {
        try {
          onEvent(eventName, JSON.parse(dataStr));
        } catch {
          onEvent(eventName, { raw: dataStr });
        }
      }
    }
  }
}
