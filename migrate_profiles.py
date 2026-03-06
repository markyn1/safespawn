"""
migrate_profiles.py
Adds the profile_name column and unique constraint to user_format_configs
for the Multiple Layout Profiles feature (Phase 2).

Run once: python migrate_profiles.py
"""
import asyncio
import aiomysql
from api.core.database import DB_HOST, DB_USER, DB_PASS, DB_NAME

async def migrate():
    print("Iniciando migração de perfis de layout...")
    try:
        conn = await aiomysql.connect(host=DB_HOST, port=3306, user=DB_USER, password=DB_PASS, db=DB_NAME)
        async with conn.cursor() as cur:

            # 1. Add profile_name column with default value
            try:
                await cur.execute(
                    "ALTER TABLE user_format_configs ADD COLUMN profile_name VARCHAR(100) NOT NULL DEFAULT 'default';"
                )
                print("✅ Coluna profile_name adicionada.")
            except Exception as e:
                print(f"ℹ️  profile_name: {e}")

            # 2. Back-fill existing rows
            try:
                await cur.execute(
                    "UPDATE user_format_configs SET profile_name = 'default' WHERE profile_name IS NULL OR profile_name = '';"
                )
                print("✅ Linhas existentes atualizadas para profile_name='default'.")
            except Exception as e:
                print(f"ℹ️  Back-fill: {e}")

            # 3. Add unique constraint (user_id + format_name + profile_name)
            try:
                await cur.execute(
                    "ALTER TABLE user_format_configs ADD UNIQUE KEY uq_user_format_profile (user_id, format_name, profile_name);"
                )
                print("✅ Constraint única uq_user_format_profile adicionada.")
            except Exception as e:
                print(f"ℹ️  Constraint: {e}")

        await conn.commit()
        conn.close()
        print("Migração concluída com sucesso!")
    except Exception as e:
        print(f"Erro de conexão com o banco de dados: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
