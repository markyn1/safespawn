"""
migrate_text_blocks.py
Script de migração: cria as novas tabelas e opcionalmente migra os blocos
hardcoded (title_area, subtitle_area, hook_area) dos formatos existentes
para registros na tabela text_blocks.

Uso:
    python migrate_text_blocks.py

Seguro para rodar múltiplas vezes (idempotente).
"""

import asyncio
import json
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from sqlalchemy import text
from api.core.database import engine, Base

# Import all models so Base knows about them before create_all
from api.models.user import User                          # noqa
from api.models.generation import Generation              # noqa
from api.models.format_config import UserFormatConfig     # noqa
from api.models.user_prompt import UserPrompt             # noqa
from api.models.profile_config import ProfileConfig       # noqa
from api.models.text_block import TextBlock               # noqa
from api.models.prompt_template import PromptTemplate     # noqa


async def main():
    print("=" * 60)
    print("Content Creator — Migração de Banco de Dados")
    print("Fase: Remake da Geração de Texto")
    print("=" * 60)

    async with engine.begin() as conn:
        # Cria todas as tabelas que não existem ainda
        print("\n[1/2] Criando novas tabelas (se ainda não existem)...")
        await conn.run_sync(Base.metadata.create_all)
        print("      ✅ Tabelas: profile_configs, text_blocks, prompt_templates")

    print("\n[2/2] Migração de blocos hardcoded para text_blocks...")
    print("      ℹ️  A migração de dados específicos requer configuração manual.")
    print("      Os novos blocos serão criados através da interface web.")
    print("      Os layouts legados continuarão funcionando sem migração.")

    print("\n" + "=" * 60)
    print("✅ Migração concluída com sucesso!")
    print("\nPróximos passos:")
    print("  1. Reinicie o servidor FastAPI")
    print("  2. Acesse Settings → Aba 'Perfil' para configurar identidade")
    print("  3. Acesse Settings → Aba 'Prompts' para ver/criar templates")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
