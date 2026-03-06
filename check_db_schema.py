
import asyncio
from sqlalchemy import text
from api.core.database import engine

async def check_schema():
    try:
        async with engine.connect() as conn:
            print("--- Users Table ---")
            res = await conn.execute(text("SHOW COLUMNS FROM users LIKE 'global_vars'"))
            print(res.fetchone())
            
            print("--- Social Profiles Table ---")
            res = await conn.execute(text("SHOW COLUMNS FROM social_profiles LIKE 'default_style_id'"))
            print(res.fetchone())
            
            print("--- User Format Configs Table ---")
            res = await conn.execute(text("SHOW COLUMNS FROM user_format_configs LIKE 'design_style_id'"))
            print(res.fetchone())
    except Exception as e:
        print(f"Error checking schema: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
