"""
api/routes/resolutions.py
Rotas para listar resoluções (formato de vídeo/arte).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from api.core.database import get_db
from api.models.user import User
from api.models.resolutions import Resolution
from api.schemas.resolutions import ResolutionResponse
from api.routes.auth import get_current_user

router = APIRouter(prefix="/resolutions", tags=["resolutions"])


@router.get("", response_model=list[ResolutionResponse])
async def list_resolutions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista todas as resoluções disponíveis. Requer autenticação."""
    result = await db.execute(select(Resolution))
    resolutions = result.scalars().all()
    return [ResolutionResponse.model_validate(r) for r in resolutions]
