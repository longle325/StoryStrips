
from fastapi import APIRouter, HTTPException

from models.comic import RemixRequest

router = APIRouter()


@router.post("/remix")
async def remix(req: RemixRequest):
    raise HTTPException(status_code=501, detail="Remix not yet implemented")