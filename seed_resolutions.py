"""
seed_resolutions.py
Popula a tabela resolutions com resoluções padrão: Stories, Reels, Feed, 4:3, Feed quadrado, YouTube.

Uso (na raiz do projeto):
    python seed_resolutions.py

Idempotente: não duplica registros (verifica por nome).
"""

import asyncio
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from sqlalchemy import select
from api.core.database import AsyncSessionLocal, engine, init_tables
from api.models.resolutions import Resolution


RESOLUCOES = [
    {"name": "stories", "proportion": "9:16", "width": 1080, "height": 1920, "label": "Stories"},
    {"name": "reels", "proportion": "9:16", "width": 1080, "height": 1920, "label": "Reels"},
    {"name": "feed", "proportion": "4:5", "width": 1080, "height": 1350, "label": "Feed"},
    {"name": "4:3", "proportion": "4:3", "width": 1920, "height": 1440, "label": "4:3"},
    {"name": "feed_quadrado", "proportion": "1:1", "width": 1080, "height": 1080, "label": "Feed quadrado"},
    {"name": "youtube", "proportion": "16:9", "width": 1920, "height": 1080, "label": "YouTube"},
]


async def seed():
    await init_tables()
    async with AsyncSessionLocal() as session:
        for r in RESOLUCOES:
            result = await session.execute(select(Resolution).where(Resolution.name == r["name"]))
            if result.scalars().first() is None:
                session.add(Resolution(**r))
                print(f"  + {r['name']}: {r['width']}x{r['height']} ({r['label']})")
            else:
                print(f"  = {r['name']} já existe, ignorado.")
        await session.commit()
    await engine.dispose()
    print("Seed de resoluções concluído.")


if __name__ == "__main__":
    asyncio.run(seed())
