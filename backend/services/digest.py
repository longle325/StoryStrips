"""Daily Digest service — fetch trending news via Exa, generate a comic for each."""

import asyncio
from datetime import datetime, timezone

from exa_py import Exa

from config import settings
from services import script_gen, image_gen, storage

exa = Exa(api_key=settings.exa_api_key)

DIGEST_COUNT = 5


async def _fetch_trending_news() -> list[dict]:
    """Use Exa to find today's top breaking world news."""
    try:
        results = exa.search_and_contents(
            "top breaking world news today",
            num_results=DIGEST_COUNT,
            text=True,
            use_autoprompt=True,
        )
        articles = []
        for r in results.results:
            if r.text:
                articles.append({
                    "title": r.title or "Untitled",
                    "text": r.text[:3000],
                    "url": r.url or "",
                })
        return articles[:DIGEST_COUNT]
    except Exception as e:
        print(f"[digest] Exa trending news fetch failed: {e}")
        return []


async def generate_digest() -> list[dict]:
    """Fetch trending news and generate a comic for each article.

    Returns list of dicts with {title, summary, source_url, comic_id, panel_urls}.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    articles = await _fetch_trending_news()
    if not articles:
        print("[digest] No articles fetched, skipping digest generation")
        return []

    results = []
    for article in articles:
        try:
            content = f"Title: {article['title']}\n\n{article['text']}"
            script = await script_gen.generate_script(
                content, art_style=None, pov=None, mode="url"
            )

            panel_results = await image_gen.generate_all_panels(
                script["panels"], script["art_style"]
            )

            results_map = {pnum: url for pnum, url in panel_results}
            for panel in script["panels"]:
                pnum = panel["panel_number"]
                panel["image_url"] = results_map.get(pnum)
                panel["image_status"] = "done" if pnum in results_map else "error"

            panel_urls = [results_map[p["panel_number"]] for p in script["panels"] if p["panel_number"] in results_map]

            comic = await storage.save_comic(
                script, panel_urls, article["title"],
                is_digest=True,
                digest_date=today,
            )

            results.append({
                "title": article["title"],
                "summary": article["text"][:200],
                "source_url": article["url"],
                "comic_id": comic["id"],
                "panel_urls": panel_urls,
            })
            print(f"[digest] Generated comic for: {article['title']}")

        except Exception as e:
            print(f"[digest] Failed to generate comic for '{article['title']}': {e}")
            results.append({
                "title": article["title"],
                "summary": article["text"][:200],
                "source_url": article["url"],
                "comic_id": None,
                "panel_urls": [],
            })

    print(f"[digest] Completed: {len(results)}/{len(articles)} articles processed")
    return results
