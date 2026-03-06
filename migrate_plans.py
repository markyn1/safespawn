import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.core.database import engine
from sqlalchemy import text

async def migrate():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN plan VARCHAR(50) DEFAULT 'gratuito'"))
            print("Successfully added 'plan' column to users.")
        except Exception as e:
            print("Migration failed or already applied:", e)

if __name__ == "__main__":
    asyncio.run(migrate())
