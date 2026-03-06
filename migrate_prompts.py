"""
migrate_prompts.py
Creates the user_prompts table for per-user prompt overrides.

Run once: python migrate_prompts.py
"""
import asyncio
import aiomysql
from api.core.database import DATABASE_URL


async def migrate():
    # Parse host/port/user/password/db from DATABASE_URL
    # Expected format: mysql+aiomysql://user:pass@host:port/dbname
    url = DATABASE_URL.replace("mysql+aiomysql://", "")
    credentials, rest = url.split("@")
    user, password = credentials.split(":", 1)
    host_port, dbname = rest.split("/")
    host, port = (host_port.split(":") + ["3306"])[:2]

    conn = await aiomysql.connect(
        host=host, port=int(port),
        user=user, password=password,
        db=dbname, autocommit=True
    )
    cursor = await conn.cursor()

    print("Creating user_prompts table...")
    await cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_prompts (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            user_id     INT NOT NULL,
            theme       VARCHAR(100) NOT NULL DEFAULT 'default',
            filename    VARCHAR(200) NOT NULL,
            content     LONGTEXT NOT NULL,
            UNIQUE KEY uq_user_theme_prompt (user_id, theme, filename),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """)
    print("✅ user_prompts table ready.")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())
