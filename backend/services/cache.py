async def check_cache(query: str) -> dict | None:
    # Always return None (cache miss) for now
    return None


async def store_cache(query: str, script: dict) -> None:
    pass  # No-op for now
