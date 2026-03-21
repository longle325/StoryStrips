"""Zilliz vector cache via REST API — no pymilvus needed."""

import json
import httpx
from openai import AsyncOpenAI
from config import settings

_openai = AsyncOpenAI(api_key=settings.openai_api_key)

COLLECTION = "comic_cache"
EMBEDDING_DIM = 1536
SIMILARITY_THRESHOLD = 0.92

_collection_ready = False


def _base_url() -> str:
    endpoint = settings.zilliz_endpoint.rstrip("/")
    if not endpoint.startswith("http"):
        endpoint = f"https://{endpoint}"
    return f"{endpoint}/v2/vectordb"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.zilliz_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def _ensure_collection():
    global _collection_ready
    if _collection_ready:
        return True
    if not settings.zilliz_endpoint or not settings.zilliz_token:
        return False

    base = _base_url()
    headers = _headers()

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{base}/collections/has",
            headers=headers,
            json={"collectionName": COLLECTION},
        )
        data = resp.json()
        has = data.get("data", {}).get("has", False)

        if not has:
            await client.post(
                f"{base}/collections/create",
                headers=headers,
                json={
                    "collectionName": COLLECTION,
                    "dimension": EMBEDDING_DIM,
                    "metricType": "COSINE",
                },
            )
            print(f"[cache] Created collection '{COLLECTION}'")

    _collection_ready = True
    return True


async def _embed(text: str) -> list[float]:
    resp = await _openai.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000],
    )
    return resp.data[0].embedding


async def check_cache(query: str) -> dict | None:
    try:
        if not await _ensure_collection():
            return None
    except Exception as e:
        print(f"[cache] init failed: {e}")
        return None

    try:
        vec = await _embed(query)
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{_base_url()}/entities/search",
                headers=_headers(),
                json={
                    "collectionName": COLLECTION,
                    "data": [vec],
                    "limit": 1,
                    "outputFields": ["result_json"],
                },
            )
        data = resp.json()
        results = data.get("data", [])
        if results:
            hit = results[0]
            distance = hit.get("distance", 0)
            if distance >= SIMILARITY_THRESHOLD:
                print(f"[cache] HIT (similarity={distance:.3f})")
                return json.loads(hit["result_json"])
        return None
    except Exception as e:
        print(f"[cache] check_cache failed: {e}")
        return None


async def store_cache(query: str, result: dict) -> None:
    try:
        if not await _ensure_collection():
            return
    except Exception as e:
        print(f"[cache] init failed: {e}")
        return

    try:
        vec = await _embed(query)
        result_str = json.dumps(result, ensure_ascii=False)
        if len(result_str) > 65535:
            result_str = result_str[:65535]

        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"{_base_url()}/entities/insert",
                headers=_headers(),
                json={
                    "collectionName": COLLECTION,
                    "data": [{
                        "vector": vec,
                        "query": query[:2000],
                        "result_json": result_str,
                    }],
                },
            )
        print(f"[cache] Stored cache for query: {query[:80]}")
    except Exception as e:
        print(f"[cache] store_cache failed: {e}")
