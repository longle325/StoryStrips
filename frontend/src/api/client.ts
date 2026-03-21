export type Mode = "url" | "history" | "drama" | "freeform";
export type ArtStyle = "manga" | "marvel" | "chibi" | "noir" | "webtoon" | "pixel" | "vintage";
export type ImageStatus = "pending" | "generating" | "done" | "error";

export interface Dialogue {
  speaker: string;
  text: string;
  bubble_type: "speech" | "thought" | "shout";
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
  image_url: string | null;
  image_status: ImageStatus;
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
  script: {
    title: string;
    art_style: ArtStyle;
    detected_type: Mode;
    panels: Panel[];
  };
  panels: Panel[];
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
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

export async function getDigest(): Promise<Array<{ id: string; title: string; source_url: string; comic_id: string | null }>> {
  return request<Array<{ id: string; title: string; source_url: string; comic_id: string | null }>>("/digest");
}