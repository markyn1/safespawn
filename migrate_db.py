import asyncio
from sqlalchemy import text
from api.core.database import engine, Base
from api.models.user import User
from api.models.generation import Generation
from api.models.format_config import UserFormatConfig
from api.models.design_style import DesignStyle

async def migrate():
    print("Iniciando migração manual...")
    async with engine.begin() as conn:
        # 1. Garantir que todas as tabelas novas existam
        await conn.run_sync(Base.metadata.create_all)
        print("Tabelas base verificadas/criadas.")

        # 2. Adicionar a coluna design_style_id se ela não existir
        try:
            # Verifica se a coluna existe (MySQL)
            result = await conn.execute(text("SHOW COLUMNS FROM user_format_configs LIKE 'design_style_id'"))
            column_exists = result.fetchone()
            
            if not column_exists:
                print("Adicionando coluna 'design_style_id' em 'user_format_configs'...")
                await conn.execute(text("ALTER TABLE user_format_configs ADD COLUMN design_style_id INT NULL"))
                await conn.execute(text("ALTER TABLE user_format_configs ADD CONSTRAINT fk_design_style FOREIGN KEY (design_style_id) REFERENCES design_styles(id) ON DELETE CASCADE"))
                print("Coluna design_style_id adicionada com sucesso!")
            else:
                print("Coluna design_style_id já existe.")
        except Exception as e:
            print(f"Erro ao alterar tabela: {e}")

    print("Migração concluída.")

if __name__ == "__main__":
    asyncio.run(migrate())
