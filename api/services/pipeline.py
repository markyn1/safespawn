"""
api/services/pipeline.py
Orquestrador principal:
- Se o usuário tem TextBlocks configurados → usa o novo fluxo dinâmico
- Caso contrário → fallback para o fluxo legado (copy.txt monolítico)
"""

import os
import asyncio
from core.config_loader import load_config
from core.input_manager import detect_all_inputs
from core.downloader import VideoDownloader
from core.ai_engine import AIEngine
from core.analyzer import Analyzer
from core.context_engine import ContextEngine
from core.copy_engine import CopyEngine
from core.layout_intelligence import validate_and_adapt
from core.design_engine import DesignEngine
from core.export_engine import ExportEngine
from core.cost_control import CostController
from core.variable_resolver import VariableResolver

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INPUT_DIR = os.path.join(ROOT, "input")


def run_pipeline_for_media(
    filepath: str,
    format_override: str = None,
    design_override: str = None,
    custom_format_config: dict = None,
    ai_styles: dict = None,
    text_blocks: list[dict] = None,       # TextBlock dicts do banco
    profile_vars: dict = None,            # Variáveis do ProfileConfig
) -> dict:
    """
    Roda a inteligência no arquivo passado.
    
    Se text_blocks for fornecido e não estiver vazio → usa o novo sistema de blocos.
    Caso contrário → usa o pipeline legado (copy.txt monolítico).
    
    Retorna o dicionário com media_path e caption_path.
    """
    config = load_config()

    if format_override:
        config.active_format = format_override
        import json as _json, os as _os
        fmt_path = _os.path.join(config.design_dir, "formats", f"{format_override}.json")
        try:
            with open(fmt_path) as f:
                config.format_data = _json.load(f)
        except Exception:
            pass

    if design_override:
        config.active_design = design_override

    if custom_format_config:
        config.format_data.update(custom_format_config)

    os.makedirs(INPUT_DIR, exist_ok=True)

    inputs = detect_all_inputs(os.path.dirname(filepath), config.analysis.get("max_video_duration", 120))
    input_obj = next((x for x in inputs if x.primary_file == filepath), None)

    if not input_obj:
        raise ValueError("Invalid file or format not supported.")

    ai_engine = AIEngine(config)
    cost_ctrl = CostController(config, ai_engine)
    analyzer = Analyzer(config, ai_engine)
    ctx_engine = ContextEngine(config, ai_engine)
    copy_engine = CopyEngine(config, ai_engine, ai_styles=ai_styles)
    design_engine = DesignEngine(config)
    export_engine = ExportEngine(config)

    # ── Análise ─────────────────────────────────────────────
    raw_ctx = analyzer.analyze(input_obj)
    structured_ctx = ctx_engine.build(raw_ctx)

    # ── Geração de Texto + Renderização ─────────────────────
    use_dynamic_blocks = text_blocks and len(text_blocks) > 0

    if use_dynamic_blocks:
        print(f"[Pipeline] 🧱 Using dynamic text blocks ({len(text_blocks)} blocks)")

        # Pré-carregar conteúdo dos prompt templates para evitar N+1
        _inject_template_content(text_blocks)

        # Gerar texto por bloco (IA + estático)
        block_texts = copy_engine.generate_blocks(
            blocks=text_blocks,
            profile=profile_vars or {},
            context=structured_ctx,
        )

        # Renderizar com blocos dinâmicos
        variations = design_engine.generate_with_blocks(
            blocks=text_blocks,
            block_texts=block_texts,
        )

        # Montar CopyObject legado para compatibilidade com export_caption
        copy_obj = _build_legacy_copy_from_blocks(block_texts, structured_ctx)
        copy_obj = validate_and_adapt(copy_obj, config)

    else:
        print("[Pipeline] 📜 Using legacy monolithic copy.txt generation")
        copy_obj = copy_engine.generate(structured_ctx)
        copy_obj = validate_and_adapt(copy_obj, config)
        variations = design_engine.generate_variations(copy_obj)

    # ── Export ───────────────────────────────────────────────
    export_engine.save_previews(variations, structured_ctx)
    chosen = variations[0]

    if input_obj.type == "video":
        final_path = export_engine.export_video(chosen, input_obj.primary_file, structured_ctx)
    else:
        final_path = export_engine.export_image(chosen, structured_ctx, input_obj.primary_file)

    caption_path = export_engine.export_caption(copy_obj, structured_ctx, final_path)

    analyzer.cleanup_temp()
    export_engine.cleanup_temp()

    return {
        "media": final_path,
        "caption": caption_path,
        "tokens_used": ai_engine.stats.total_prompt_tokens + ai_engine.stats.total_completion_tokens
    }


def _inject_template_content(blocks: list[dict]) -> None:
    """
    Pré-injeta o conteúdo do PromptTemplate no campo 'prompt_template_content'
    de cada bloco (quando disponível via JOIN ou eager load da rota).
    Esta função é um no-op se o conteúdo já vem preenchido.
    """
    # Se a pipeline receber os dados do banco já com o template resolvido via JOIN
    # (feito na rota de geração), nada precisa ser feito aqui.
    pass


def _build_legacy_copy_from_blocks(block_texts: dict, ctx) -> "CopyObject":
    """
    Constrói um CopyObject legado a partir dos blocos gerados,
    para compatibilidade com export_caption e validate_and_adapt.
    """
    from core.copy_engine import CopyObject
    return CopyObject(
        titulo=block_texts.get("Título") or block_texts.get("titulo") or "",
        subtitulo=block_texts.get("Subtítulo") or block_texts.get("subtitulo") or "",
        hook=block_texts.get("Hook") or block_texts.get("hook") or "",
        legenda=block_texts.get("Legenda") or block_texts.get("legenda") or "",
        hashtags=[],
        blocks=block_texts,
    )


async def process_url_task(
    url: str,
    format_override: str = None,
    custom_format_config: dict = None,
    ai_styles: dict = None,
    text_blocks: list[dict] = None,
    profile_vars: dict = None,
) -> dict:
    """Baixa o vídeo e joga no pipeline."""
    downloader = VideoDownloader(INPUT_DIR)
    downloaded = await asyncio.to_thread(downloader.download, [url])

    if not downloaded:
        raise ValueError("Could not download media from URL.")

    filepath = downloaded[0]
    result = await asyncio.to_thread(
        run_pipeline_for_media,
        filepath, format_override, None, custom_format_config, ai_styles, text_blocks, profile_vars
    )
    return result


async def process_file_task(
    filepath: str,
    format_override: str = None,
    custom_format_config: dict = None,
    ai_styles: dict = None,
    text_blocks: list[dict] = None,
    profile_vars: dict = None,
) -> dict:
    """Executa o pipeline em cima de arquivo já upado."""
    result = await asyncio.to_thread(
        run_pipeline_for_media,
        filepath, format_override, None, custom_format_config, ai_styles, text_blocks, profile_vars
    )
    return result
