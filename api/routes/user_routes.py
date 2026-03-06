"""
api/routes/user_routes.py
Rotas para gerenciar dados do usuário (ex: variáveis globais).
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from api.core.database import get_db
from api.models.user import User
from api.routes.auth import get_current_user

router = APIRouter(prefix="/user", tags=["user"])

@router.get("/variables")
async def get_user_variables(current_user: User = Depends(get_current_user)):
    """Retorna as variáveis globais do usuário."""
    return {"global_vars": current_user.global_vars or {}}

@router.put("/variables")
async def update_user_variables(
    variables: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Atualiza as variáveis globais do usuário."""
    current_user.global_vars = variables
    await db.commit()
    await db.refresh(current_user)
    return {"status": "success", "global_vars": current_user.global_vars}
