"""
api/services/tokens.py
Lógica de limites de tokens por assinatura / plano.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import datetime
from fastapi import HTTPException

from api.models.user import User
from api.models.generation import Generation

import os, yaml

PLANS_YAML_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "config", "plans.yaml")

# Fallback hardcoded para caso o YAML não exista
_FALLBACK_LIMITS = {
    "gratuito": 1_000,
    "starter": 200_000,
    "profissional": 600_000,
    "maestro": 10_000_000
}

def _load_plans_yaml() -> dict:
    """Lê o plans.yaml e retorna dict {nome: {limit, price}}"""
    if os.path.exists(PLANS_YAML_PATH):
        with open(PLANS_YAML_PATH, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
            return data.get("plans", {})
    return {}

def get_plan_limits() -> dict[str, int]:
    """Retorna mapa nome_plano -> limite_tokens lido do YAML."""
    plans = _load_plans_yaml()
    if plans:
        return {k: v.get("limit", 1_000) for k, v in plans.items()}
    return _FALLBACK_LIMITS

# Exportação mantida para compatibilidade
PLAN_LIMITS = get_plan_limits()

async def get_user_monthly_usage(db: AsyncSession, user_id: int) -> int:
    """
    Soma os tokens_used de todas as gerações feitas pelo usuário
    no mês corrente (do dia 1º até agora).
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(func.sum(Generation.tokens_used))
        .where(Generation.user_id == user_id)
        .where(Generation.created_at >= first_day_of_month)
    )
    
    total = result.scalar()
    return total or 0

async def check_user_limits(db: AsyncSession, user: User, estimated_cost: int = 0):
    """
    Verifica se a cota do usuário no mês mais o novo custo estimado passa do limite.
    Lança HTTPException(403) caso passe.
    """
    if not user.has_access:
        raise HTTPException(status_code=403, detail="Acesso bloqueado ou revogado para sua conta.")

    # Superusuário: sem limite de tokens
    if getattr(user, "is_superuser", False):
        return

    plan_name = getattr(user, "plan", "gratuito")
    
    # Leitura dinâmica do YAML para pegar alterações do admin em tempo real
    limits = get_plan_limits()
    limit = limits.get(plan_name.lower(), limits.get("gratuito", 1_000))
    
    current_usage = await get_user_monthly_usage(db, user.id)
    
    if current_usage + estimated_cost > limit:
        raise HTTPException(
            status_code=403, 
            detail=f"Limite mensal de tokens atingido. Seu plano '{plan_name}' suporta até {limit} tokens por mês, "
                   f"e você já utilizou {current_usage} tokens. Faça o upgrade de plano."
        )
