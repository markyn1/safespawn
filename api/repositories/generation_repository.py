"""
api/repositories/generation_repository.py
Abstração de acesso ao banco de dados para a entidade Generation e relacionadas.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import Optional, List

from api.models.generation import Generation
from api.models.format_config import UserFormatConfig

class GenerationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_generation(self, user_id: int, input_type: str, input_value: str, status: str) -> Generation:
        new_gen = Generation(
            user_id=user_id,
            input_type=input_type,
            input_value=input_value,
            status=status
        )
        self.db.add(new_gen)
        await self.db.commit()
        await self.db.refresh(new_gen)
        return new_gen

    async def get_generation_by_id(self, gen_id: int, user_id: int) -> Optional[Generation]:
        result = await self.db.execute(
            select(Generation).where(Generation.id == gen_id, Generation.user_id == user_id)
        )
        return result.scalars().first()

    async def get_generation_by_id_internal(self, gen_id: int) -> Optional[Generation]:
        result = await self.db.execute(
            select(Generation).where(Generation.id == gen_id)
        )
        return result.scalars().first()

    async def update_generation(self, gen: Generation) -> Generation:
        await self.db.commit()
        await self.db.refresh(gen)
        return gen

    async def get_history(self, user_id: int) -> List[Generation]:
        result = await self.db.execute(
            select(Generation)
            .where(Generation.user_id == user_id)
            .order_by(Generation.created_at.desc())
        )
        return result.scalars().all()

    async def delete_generation(self, gen: Generation):
        await self.db.delete(gen)
        await self.db.commit()

    async def get_user_format_config(self, user_id: int, format_name: str, profile_name: str) -> Optional[UserFormatConfig]:
        result = await self.db.execute(
            select(UserFormatConfig)
            .where(UserFormatConfig.user_id == user_id)
            .where(UserFormatConfig.format_name == format_name)
            .where(UserFormatConfig.profile_name == profile_name)
        )
        return result.scalars().first()

    async def get_generations_by_ids(self, ids: List[int], user_id: int, status: str) -> List[Generation]:
        result = await self.db.execute(
            select(Generation)
            .where(Generation.id.in_(ids))
            .where(Generation.user_id == user_id)
            .where(Generation.status == status)
        )
        return result.scalars().all()
