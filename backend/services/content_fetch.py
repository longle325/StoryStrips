import re
import httpx
from exa_py import Exa
from config import settings

exa = Exa(api_key=settings.exa_api_key)


async def fetch_content(query: str, mode: str) -> str:
    if mode == "url":
        try:
            result = exa.get_contents([query], text=True)
            text = result.results[0].text if result.results else ""
            return text[:5000] if text else query
        except Exception as e:
            print(f"[content_fetch] Exa URL fetch failed: {e}")
            return query

    elif mode == "history":
        try:
            results = exa.search_and_contents(
                query,
                num_results=3,
                text=True,
                use_autoprompt=True,
            )
            combined = "\n\n".join(r.text for r in results.results if r.text)
            return combined[:5000] if combined else query
        except Exception as e:
            print(f"[content_fetch] Exa history search failed: {e}")
            return query

    elif mode == "drama":
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    "https://api.brightdata.com/request",
                    headers={"Authorization": f"Bearer {settings.bright_data_api_key}"},
                    json={
                        "url": f"https://www.reddit.com/search/?q={query}&sort=top",
                        "format": "raw_html",
                    },
                )
            text = re.sub(r"<[^>]+>", " ", resp.text)
            text = re.sub(r"\s+", " ", text).strip()
            return text[:4000] if text else query
        except Exception as e:
            print(f"[content_fetch] Bright Data drama scrape failed: {e}, falling back to Exa")
            try:
                results = exa.search_and_contents(query, num_results=3, text=True, use_autoprompt=True)
                combined = "\n\n".join(r.text for r in results.results if r.text)
                return combined[:4000] if combined else query
            except Exception as e2:
                print(f"[content_fetch] Exa fallback also failed: {e2}")
                return query

    else:
        return query
