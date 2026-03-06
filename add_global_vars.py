import asyncio
from sqlalchemy import text
from api.core.database import engine

async def add_global_vars():
    print("Verificando coluna 'global_vars' em 'users'...")
    async with engine.begin() as conn:
        try:
            # Verifica se a coluna existe (MySQL)
            result = await conn.execute(text("SHOW COLUMNS FROM users LIKE 'global_vars'"))
            column_exists = result.fetchone()
            
            if not column_exists:
                print("Adicionando coluna 'global_vars' em 'users'...")
                # No MySQL, JSON é suportado
                await conn.execute(text("ALTER TABLE users ADD COLUMN global_vars JSON NOT NULL"))
                print("Coluna global_vars adicionada com sucesso!")
            else:
                print("Coluna global_vars já existe.")
        except Exception as e:
            print(f"Erro ao alterar tabela 'users': {e}")

if __name__ == "__main__":
    asyncio.run(add_global_vars())
