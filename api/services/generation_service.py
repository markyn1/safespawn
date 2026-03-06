"""
api/services/generation_service.py
Serviço para gerenciar o ciclo de vida das gerações (URL, Upload, Retries).
Encapsula lógica de negócio e orquestra repositórios e filas.
"""
import os
import shutil
import asyncio
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.generation import Generation, GenerationStatus
from api.models.user import User
from api.repositories.generation_repository import GenerationRepository
from api.services.tokens import check_user_limits
from api.core.queue import generation_queue
from api.services.pipeline import process_url_task, process_file_task
from core.config_loader import load_config
from core.ai_engine import AIEngine
from core.copy_engine import CopyEngine
from core.context_engine import StructuredContext

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INPUT_DIR = os.path.join(ROOT, "input")

class GenerationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = GenerationRepository(db)

    async def create_from_url(self, user: User, url: str, format_override: str = None, profile_name: str = "default") -> Generation:
        # 1. Valida limites
        await check_user_limits(self.db, user, estimated_cost=500)
        
        # 2. Cria registro pendente
        gen = await self.repo.create_generation(
            user_id=user.id,
            input_type="url",
            input_value=url,
            status=GenerationStatus.PENDING
        )
        
        # 3. Prepara dados para a fila
        task_data = await self._prepare_task_data(user.id, "url", url, gen.id, format_override, profile_name)
        
        # 4. Enfileira
        await generation_queue.put(task_data)
        
        return gen

    async def create_from_upload(self, user: User, file, filename: str, format_override: str = None, profile_name: str = "default") -> Generation:
        # 1. Valida limites
        await check_user_limits(self.db, user, estimated_cost=500)
        
        # 2. Salva arquivo localmente
        os.makedirs(INPUT_DIR, exist_ok=True)
        file_location = os.path.join(INPUT_DIR, filename)
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file, file_object)
            
        # 3. Cria registro pendente
        gen = await self.repo.create_generation(
            user_id=user.id,
            input_type="file",
            input_value=file_location,
            status=GenerationStatus.PENDING
        )
        
        # 4. Prepara dados para a fila
        task_data = await self._prepare_task_data(user.id, "file", file_location, gen.id, format_override, profile_name)
        
        # 5. Enfileira
        await generation_queue.put(task_data)
        
        return gen

    async def retry_generation(self, user: User, gen_id: int) -> Generation:
        gen = await self.repo.get_generation_by_id(gen_id, user.id)
        if not gen:
            raise ValueError("Generation not found")
            
        if gen.status not in [GenerationStatus.ERROR, GenerationStatus.COMPLETED]:
            raise ValueError("Somente pode tentar novamente itens com falha ou ja concluidos.")
            
        # Reset status
        gen.status = GenerationStatus.PENDING
        gen.error_message = None
        await self.repo.update_generation(gen)
        
        # Re-enfileira (usando config atual do profile/format se possível, ou fallback)
        task_data = await self._prepare_task_data(user.id, gen.input_type, gen.input_value, gen.id, None, "default")
        await generation_queue.put(task_data)
        
        return gen

    async def test_prompts(self, blocks: List[dict], profile_vars: dict) -> dict:
        config = load_config()
        ai_engine = AIEngine(config)
        copy_engine = CopyEngine(config, ai_engine)
        
        mock_ctx = StructuredContext(
            tema="Marketing Digital e Empreendedorismo",
            emocao="Inspirador e Motivacional",
            intencao="Engajamento e Vendas",
            publico_detectado="Jovens empreendedores e criadores de conteúdo",
            pontos_chave=["Liberdade geográfica", "Escalabilidade no digital", "Mindset de crescimento", "Uso estratégico de IA"],
            palavras_impacto=["Faturamento", "Estratégia", "Viral", "Autoridade"],
            chamada_para_acao_sugerida="Comente 'QUERO' para saber mais!",
            obra_original={"tipo": "podcast", "titulo": "Café com Fundadores", "autor": "Marcos Reels"}
        )

        results = copy_engine.generate_blocks(
            blocks=blocks,
            profile=profile_vars,
            context=mock_ctx
        )
        return results

    async def _prepare_task_data(self, user_id: int, task_type: str, input_value: str, gen_id: int, format_override: Optional[str], profile_name: str) -> dict:
        fmt_name = format_override or "instagram43"
        cfg_user = await self.repo.get_user_format_config(user_id, fmt_name, profile_name)
        cfg_data = cfg_user.config_data if cfg_user else None
        ai_styles = (cfg_data or {}).get("ai_styles", {})

        if cfg_data and "blocks" in cfg_data:
            text_blocks = await self._resolve_unified_blocks(cfg_data["blocks"])
        else:
            text_blocks = []

        profile_vars = await self._load_profile_vars(user_id, profile_name)

        return {
            "type": task_type,
            "gen_id": gen_id,
            "user_id": user_id,
            "input_value": input_value,
            "format_override": format_override,
            "custom_format_config": cfg_data,
            "ai_styles": ai_styles,
            "text_blocks": text_blocks,
            "profile_vars": profile_vars,
        }

    async def _resolve_unified_blocks(self, blocks: List[dict]) -> List[dict]:
        result_blocks = []
        for b in blocks:
            block_dict = b.copy()
            mapping = {
                "fontSize": "font_size", "fontFamily": "font_path", "fontColor": "font_color",
                "aiEnabled": "ai_enabled", "promptTemplateId": "prompt_template_id",
                "promptOverride": "prompt_override", "zIndex": "z_index", "scaleMode": "scale_mode"
            }
            for camel, snake in mapping.items():
                if camel in block_dict and snake not in block_dict:
                    block_dict[snake] = block_dict[camel]

            result_blocks.append(block_dict)
        return result_blocks

    async def _load_profile_vars(self, user_id: int, profile_name: str) -> dict:
        vars_dict = {"username": "", "display_name": "", "contact": "", "genre": ""}
        from sqlalchemy.future import select
        from api.models.user import User
        user_res = await self.db.execute(select(User).where(User.id == user_id))
        user = user_res.scalars().first()
        if user and getattr(user, "global_vars", None):
            vars_dict.update(user.global_vars)
        return vars_dict

async def process_queue_worker(queue: asyncio.Queue):
    from api.core.database import AsyncSessionLocal
    from sqlalchemy.future import select
    while True:
        try:
            task = await queue.get()
            gen_id = task.get("gen_id")
            task_type = task.get("type")
            
            async with AsyncSessionLocal() as db:
                repo = GenerationRepository(db)
                gen = await repo.get_generation_by_id_internal(gen_id)
                if not gen:
                    queue.task_done()
                    continue
                
                gen.status = GenerationStatus.PROCESSING
                await repo.update_generation(gen)
                
                try:
                    if task_type == "url":
                        data = await process_url_task(
                            task.get("input_value"), task.get("format_override"), 
                            task.get("custom_format_config"), task.get("ai_styles"),
                            text_blocks=task.get("text_blocks"), profile_vars=task.get("profile_vars")
                        )
                    else:
                        data = await process_file_task(
                            task.get("input_value"), task.get("format_override"), 
                            task.get("custom_format_config"), task.get("ai_styles"),
                            text_blocks=task.get("text_blocks"), profile_vars=task.get("profile_vars")
                        )
                        
                    gen.status = GenerationStatus.COMPLETED
                    gen.result_media_path = data.get("media")
                    gen.result_caption_path = data.get("caption")
                    gen.tokens_used = data.get("tokens_used", 0)
                except Exception as e:
                    gen.status = GenerationStatus.ERROR
                    gen.error_message = str(e)
                
                await repo.update_generation(gen)
            
            queue.task_done()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Erro inesperado no worker da fila: {e}")
