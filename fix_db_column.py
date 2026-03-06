
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

# Values from api/core/database.py
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "content_creator_db")

DATABASE_URL = f"mysql+aiomysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}"

async def fix_db():
    print(f"Connecting to {DATABASE_URL}...")
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        print("Checking users table...")
        try:
            # Check if column exists
            result = await conn.execute(text("SHOW COLUMNS FROM users LIKE 'global_vars'"))
            column = result.fetchone()
            if not column:
                print("Adding global_vars column to users table...")
                await conn.execute(text("ALTER TABLE users ADD COLUMN global_vars JSON NOT NULL DEFAULT (JSON_OBJECT())"))
                print("Column added successfully!")
            else:
                print("Column global_vars already exists.")
        except Exception as e:
            print(f"Error: {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_db())
