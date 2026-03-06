"""
api/routes/admin.py
Rotas administrativas protegidas por require_superuser.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete as sa_delete
import os, json, yaml, datetime

from api.core.database import get_db
from api.models.user import User
from api.models.generation import Generation
from api.models.resolutions import Resolution
from api.routes.auth import require_superuser
from api.schemas.resolutions import ResolutionResponse, ResolutionUpdate
from api.services.tokens import get_user_monthly_usage, get_plan_limits, PLANS_YAML_PATH, _load_plans_yaml

router = APIRouter(prefix="/admin", tags=["admin"])

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DESIGNS_DIR = os.path.join(ROOT_DIR, "designs")

# ─────────────────────────────────────────────────────────────────────────────
# GESTÃO DE USUÁRIOS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os usuários com uso atual."""
    result = await db.execute(select(User))
    users = result.scalars().all()
    
    user_list = []
    for u in users:
        usage = await get_user_monthly_usage(db, u.id)
        limits = get_plan_limits()
        plan_name = getattr(u, "plan", "gratuito")
        limit = limits.get(plan_name.lower(), limits.get("gratuito", 1_000))
        
        user_list.append({
            "id": u.id,
            "username": u.username,
            "plan": plan_name,
            "has_access": u.has_access,
            "is_superuser": bool(getattr(u, "is_superuser", False)),
            "usage": usage,
            "limit": limit,
            "created_at": str(u.created_at) if u.created_at else None
        })
    
    return user_list


@router.put("/users/{user_id}/access")
async def toggle_access(
    user_id: int,
    has_access: bool = Body(..., embed=True),
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db)
):
    """Bloqueia ou libera acesso de um usuário."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")
    
    user.has_access = has_access
    await db.commit()
    return {"ok": True, "username": user.username, "has_access": has_access}


@router.put("/users/{user_id}/plan")
async def change_plan(
    user_id: int,
    plan: str = Body(..., embed=True),
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db)
):
    """Altera o plano de um usuário."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")
    
    user.plan = plan
    await db.commit()
    return {"ok": True, "username": user.username, "plan": plan}


@router.put("/users/{user_id}/reset-tokens")
async def reset_tokens(
    user_id: int,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db)
):
    """Zera os tokens gastos do mês (deleta gerações do mês atual)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    first_day = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Zera os tokens_used ao invés de deletar as gerações
    result = await db.execute(
        select(Generation)
        .where(Generation.user_id == user_id)
        .where(Generation.created_at >= first_day)
    )
    gens = result.scalars().all()
    for gen in gens:
        gen.tokens_used = 0
    
    await db.commit()
    return {"ok": True, "reset_count": len(gens)}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db)
):
    """Exclui permanentemente um usuário e todas as suas gerações."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")
    
    if user.is_superuser:
        raise HTTPException(400, "Não é possível excluir um superusuário.")
    
    await db.delete(user)
    await db.commit()
    return {"ok": True, "deleted": user.username}


# ─────────────────────────────────────────────────────────────────────────────
# GESTÃO DE RESOLUÇÕES
# ─────────────────────────────────────────────────────────────────────────────

@router.patch("/resolutions/{resolution_id}", response_model=ResolutionResponse)
async def update_resolution(
    resolution_id: int,
    payload: ResolutionUpdate,
    admin: User = Depends(require_superuser),
    db: AsyncSession = Depends(get_db),
):
    """Altera dados de uma resolução. Apenas superusuário."""
    result = await db.execute(select(Resolution).where(Resolution.id == resolution_id))
    resolution = result.scalars().first()
    if not resolution:
        raise HTTPException(404, "Resolução não encontrada.")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(resolution, key, value)
    await db.commit()
    await db.refresh(resolution)
    return ResolutionResponse.model_validate(resolution)


# ─────────────────────────────────────────────────────────────────────────────
# GESTÃO DE PLANOS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/plans")
async def list_plans(admin: User = Depends(require_superuser)):
    """Lista planos atuais do YAML."""
    plans = _load_plans_yaml()
    if not plans:
        plans = {
            "gratuito": {"limit": 1000, "price": 0},
            "starter": {"limit": 200000, "price": 39},
            "profissional": {"limit": 600000, "price": 97},
            "maestro": {"limit": 10000000, "price": 497},
        }
    return plans


@router.put("/plans")
async def update_plans(
    plans: dict = Body(...),
    admin: User = Depends(require_superuser)
):
    """Atualiza limites e preços dos planos e salva no YAML."""
    data = {"plans": plans}
    with open(PLANS_YAML_PATH, "w", encoding="utf-8") as f:
        yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
    return {"ok": True, "plans": plans}


# ─────────────────────────────────────────────────────────────────────────────
# GESTÃO DE DEFAULTS GLOBAIS (Formatos e Prompts)
# ─────────────────────────────────────────────────────────────────────────────

@router.put("/defaults/formats/{format_name}")
async def save_format_as_global(
    format_name: str,
    config_data: dict = Body(...),
    admin: User = Depends(require_superuser)
):
    """Salva o layout como padrão global (sobrescreve o JSON no disco)."""
    # Localiza o tema ativo (default)
    theme_dir = os.path.join(DESIGNS_DIR, "default", "formats")
    os.makedirs(theme_dir, exist_ok=True)
    
    filepath = os.path.join(theme_dir, f"{format_name}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)
    
    return {"ok": True, "format": format_name, "saved_to": filepath}


@router.post("/defaults/formats")
async def create_format(
    format_name: str = Body(..., embed=True),
    config_data: dict = Body({}, embed=True),
    admin: User = Depends(require_superuser)
):
    """Cria um novo formato/resolução."""
    theme_dir = os.path.join(DESIGNS_DIR, "default", "formats")
    os.makedirs(theme_dir, exist_ok=True)
    
    filepath = os.path.join(theme_dir, f"{format_name}.json")
    if os.path.exists(filepath):
        raise HTTPException(400, f"Formato '{format_name}' já existe.")
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2, ensure_ascii=False)
    
    return {"ok": True, "format": format_name}


@router.delete("/defaults/formats/{format_name}")
async def delete_format(
    format_name: str,
    admin: User = Depends(require_superuser)
):
    """Remove um formato do disco."""
    filepath = os.path.join(DESIGNS_DIR, "default", "formats", f"{format_name}.json")
    if not os.path.exists(filepath):
        raise HTTPException(404, f"Formato '{format_name}' não encontrado.")
    
    os.remove(filepath)
    return {"ok": True, "deleted": format_name}


@router.put("/defaults/prompts/{filename}")
async def save_prompt_as_global(
    filename: str,
    content: str = Body(..., embed=True),
    admin: User = Depends(require_superuser)
):
    """Salva o prompt como padrão global (sobrescreve o TXT no disco)."""
    prompts_dir = os.path.join(DESIGNS_DIR, "default", "prompts")
    filepath = os.path.join(prompts_dir, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(404, f"Prompt '{filename}' não encontrado.")
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    
    return {"ok": True, "prompt": filename}
