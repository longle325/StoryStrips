import type { GeneratedComic } from "@/api/client";

export interface CachedComic extends GeneratedComic {
  created_at: string;
  source_input: string;
}

const CACHE_KEY = "storystrip.recentComics.v1";
const MAX_CACHE_ITEMS = 30;

function isValidComic(value: unknown): value is CachedComic {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CachedComic>;
  return (
    typeof candidate.comic_id === "string" &&
    typeof candidate.created_at === "string" &&
    typeof candidate.source_input === "string" &&
    typeof candidate.script === "object" &&
    Array.isArray(candidate.panels)
  );
}

export function loadCachedComics(): CachedComic[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isValidComic);
  } catch {
    return [];
  }
}

export function saveCachedComics(comics: CachedComic[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(comics.slice(0, MAX_CACHE_ITEMS)));
}

export function addComicToCache(comic: GeneratedComic, sourceInput: string): CachedComic[] {
  const now = new Date().toISOString();
  const incoming: CachedComic = {
    ...comic,
    created_at: now,
    source_input: sourceInput,
  };

  const existing = loadCachedComics();
  const deduped = [incoming, ...existing.filter((item) => item.comic_id !== incoming.comic_id)];
  saveCachedComics(deduped);
  return deduped;
}

export function removeComicFromCache(comicId: string): CachedComic[] {
  const next = loadCachedComics().filter((item) => item.comic_id !== comicId);
  saveCachedComics(next);
  return next;
}
