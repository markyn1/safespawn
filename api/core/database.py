"""
api/core/database.py
Configura a conexão com o banco MySQL usando SQLAlchemy assíncrono.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os

# Adapte as credenciais do seu banco de dados local ou remoto
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")  # Coloque sua senha do MySQL aqui se não usar .env
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "content_creator_db")

# pymysql + aiomysql driver para async
DATABASE_URL = f"mysql+aiomysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


from sqlalchemy import text
import asyncio

async def create_database_if_not_exists():
    # Cria uma engine temporária conectando apenas ao servidor (sem especificar o banco)
    server_url = f"mysql+aiomysql://{DB_USER}:{DB_PASS}@{DB_HOST}/"
    temp_engine = create_async_engine(server_url, echo=False)
    
    try:
        async with temp_engine.begin() as conn:
            # Tenta criar o banco de dados caso não exista
            await conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}`"))
            print(f"Banco de dados '{DB_NAME}' criado/verificado com sucesso!")
    except Exception as e:
        print(f"Erro ao verificar/criar o banco de dados: {e}")
    finally:
        await temp_engine.dispose()

async def test_connection():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            print("Conexão com o banco de dados estabelecida com sucesso!")
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")

async def init_tables():
    from api.models.user import User
    from api.models.generation import Generation
    from api.models.format_config import UserFormatConfig
    from api.models.resolutions import Resolution
    async with engine.begin() as conn:
        # 1. Cria as tabelas que não existem
        await conn.run_sync(Base.metadata.create_all)
        
        # 2. Migração manual para adicionar global_vars se faltar
        try:
            # Check if column exists
            from sqlalchemy import text
            result = await conn.execute(text("SHOW COLUMNS FROM users LIKE 'global_vars'"))
            column = result.fetchone()
            if not column:
                print("Migração: Adicionando global_vars à tabela users...")
                await conn.execute(text("ALTER TABLE users ADD COLUMN global_vars JSON NOT NULL DEFAULT (JSON_OBJECT())"))
                print("Migração concluída com sucesso!")
        except Exception as e:
            print(f"Erro na migração global_vars: {e}")

        print("Tabelas sincronizadas via ORM com sucesso!")

async def main():
    await test_connection()
    await init_tables()

if __name__ == "__main__":
    asyncio.run(main())