import asyncio
from api.core.database import engine, Base
from api.models.user import User
from api.models.generation import Generation

async def init_db():
    async with engine.begin() as conn:
        print("Criando tabelas...")
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        print("Tabelas criadas com sucesso.")

if __name__ == "__main__":
    asyncio.run(init_db())
