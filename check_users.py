
import asyncio
from api.core.database import AsyncSessionLocal
from api.models.user import User
from sqlalchemy.future import select

async def check_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"DEBUG: Found {len(users)} users.")
        for u in users:
            print(f"DEBUG: User: {u.username}, Role: {u.role}, IsSuperuser: {getattr(u, 'is_superuser', 'N/A')}")

if __name__ == "__main__":
    asyncio.run(check_users())
