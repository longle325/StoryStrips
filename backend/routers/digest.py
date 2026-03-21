from fastapi import APIRouter, HTTPException


router = APIRouter()

@router.get("/digest")
async def get_digest():
    raise HTTPException(status_code=501, detail="Daily digest not yet implemented")


@router.post("/digest/schedule")
async def schedule_digest():
    raise HTTPException(status_code=501, detail="Digest scheduling not yet implemented")
