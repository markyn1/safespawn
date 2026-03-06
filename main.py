"""
main.py — Content Creator Pipeline Orchestrator
Executa o fluxo completo: input → análise → copy → 3 variações → export.

Uso:
  python main.py                        # Usa config/settings.yaml padrão
  python main.py --format feed          # Sobrescreve o formato ativo
  python main.py --design meu_perfil    # Sobrescreve o perfil ativo
  python main.py --no-ai                # Pula análise por IA (usa copy placeholder)
"""

import os
import sys
import argparse
from datetime import datetime

# Add project root to path so `core` imports work
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from core.config_loader import load_config
from core.input_manager import detect_input, detect_all_inputs
from core.downloader import VideoDownloader, read_links_file
from core.ai_engine import AIEngine
from core.analyzer import Analyzer
from core.context_engine import ContextEngine, StructuredContext
from core.copy_engine import CopyEngine, CopyObject
from core.layout_intelligence import validate_and_adapt
from core.design_engine import DesignEngine
from core.export_engine import ExportEngine
from core.cost_control import CostController


BANNER = """
╔══════════════════════════════════════════╗
║   ✦ CONTENT CREATOR — AI Engine ✦       ║
║   Automated Social Media Generator      ║
╚══════════════════════════════════════════╝
"""

INPUT_DIR = os.path.join(ROOT, "input")
OUTPUT_DIR = os.path.join(ROOT, "output")


def parse_args():
    parser = argparse.ArgumentParser(description="Content Creator Pipeline")
    parser.add_argument("--format", type=str, help="Override active format (feed|reels|stories)")
    parser.add_argument("--design", type=str, help="Override active design profile")
    parser.add_argument("--url", action="append", help="URL do Instagram ou TikTok para baixar")
    parser.add_argument("--no-ai", action="store_true", help="Skip AI calls (use placeholder copy)")
    parser.add_argument("--economical", action="store_true", help="Force economical mode")
    parser.add_argument("--premium", action="store_true", help="Force premium mode")
    return parser.parse_args()


def pick_variation(variations) -> int:
    """CLI prompt to let user choose a variation. Returns index 0-2."""
    print("\n" + "═" * 50)
    print("  🎨 3 VARIATIONS GENERATED")
    print("═" * 50)
    for i, v in enumerate(variations):
        label = v.label.upper()
        path = os.path.basename(v.preview_path) if v.preview_path else "—"
        print(f"  [{chr(65+i)}] Variation {label:<10} → {path}")
    print("═" * 50)

    while True:
        choice = input("\n  Escolha a variação [A/B/C]: ").strip().upper()
        if choice in ("A", "B", "C"):
            idx = ord(choice) - ord("A")
            print(f"  ✅ Variação {choice} selecionada.\n")
            return idx
        print("  ⚠️  Digite A, B ou C.")


def make_placeholder_copy() -> CopyObject:
    """Returns a placeholder copy when --no-ai is used."""
    return CopyObject(
        titulo="SEU TÍTULO\nAQUI",
        subtitulo="Subtítulo descritivo do conteúdo",
        hook="Descubra algo que vai mudar sua visão",
        legenda="Legenda placeholder. Adicione sua mensagem aqui. #conteudo #marketing",
        hashtags=["#conteudo", "#marketing", "#socialmedia"],
        variacao_titulo_b="IMPACTO\nTOTAL",
        variacao_titulo_c="Elegância\ne Resultado",
    )


def make_placeholder_context() -> StructuredContext:
    return StructuredContext(
        tema="conteúdo genérico",
        emocao="inspiracao",
        intencao="engajar",
        publico_detectado="empreendedores e profissionais",
    )


def main():
    print(BANNER)

    # ── Args ──────────────────────────────────────
    args = parse_args()

    # ── 1. Config ─────────────────────────────────
    print("📋 Loading configuration...")
    config = load_config()

    # Apply CLI overrides
    if args.format:
        config.active_format = args.format
        from core import config_loader as _cl
        import json, os as _os
        fmt_path = _os.path.join(config.design_dir, "formats", f"{args.format}.json")
        with open(fmt_path) as f:
            config.format_data = json.load(f)

    if args.design:
        config.active_design = args.design

    if args.economical:
        config.ai["economical_mode"] = True
    elif args.premium:
        config.ai["economical_mode"] = False

    print(f"  Profile  : {config.active_design}")
    print(f"  Format   : {config.active_format}")
    print(f"  AI Mode  : {'economical' if config.economical_mode else 'premium'}")
    print(f"  AI Model : {config.ai_model}")

    # ── 1.5. Downloader (Opcional) ────────────────
    urls_to_download = []
    if args.url:
        urls_to_download.extend(args.url)
        
    links_file = os.path.join(INPUT_DIR, "links.txt")
    if os.path.isfile(links_file):
        print(f"\n📥 Encontrado {links_file}, lendo URLs...")
        urls_to_download.extend(read_links_file(links_file))

    if urls_to_download:
        print("\n📥 Iniciando download de vídeos...")
        downloader = VideoDownloader(INPUT_DIR)
        downloaded = downloader.download(urls_to_download)
        
        if downloaded:
            print(f"  ✅ {len(downloaded)} vídeo(s) baixado(s) com sucesso.")
            # Apaga o links.txt para não baixar de novo acidentalmente depois
            if os.path.isfile(links_file):
                try:
                    os.remove(links_file)
                    print(f"  🗑️ {links_file} apagado.")
                except Exception as e:
                    print(f"  ⚠️  Não foi possível apagar {links_file}: {e}")
        else:
            print("  ❌ Nenhum vídeo pôde ser baixado pelas URLs fornecidas.")
            print("  ➡️  O pipeline tentará continuar com arquivos existentes em /input.")

    # ── 2. Input ──────────────────────────────────
    print("\n📂 Scanning input directory...")
    try:
        inputs = detect_all_inputs(INPUT_DIR, config.analysis.get("max_video_duration", 120))
    except ValueError as e:
        print(f"❌ Erro: {e}")
        print("Adicione imagens/vídeos na pasta input/ ou use --url")
        sys.exit(1)

    print(f"  Inputs Encontrados: {len(inputs)}")

    # ── 3. AI Engine & Cost Controller ───────────
    ai_engine = AIEngine(config)
    cost_ctrl = CostController(config, ai_engine)
    
    for idx, input_obj in enumerate(inputs, 1):
        print(f"\n" + "═" * 50)
        print(f"🎬 PROCESSANDO MÍDIA {idx}/{len(inputs)}: {os.path.basename(input_obj.primary_file)}")
        print("═" * 50)
        
        cost_ctrl.record_run_metadata(
            input_type=input_obj.type,
            format=config.active_format,
            profile=config.active_design,
        )

        # ── 4. Analyze ─────────────────────────────────
        if args.no_ai:
            print("\n⏭️  Skipping AI analysis (--no-ai mode).")
            structured_ctx = make_placeholder_context()
            copy_obj = make_placeholder_copy()
        else:
            print("\n🔍 Analyzing content...")
            analyzer = Analyzer(config, ai_engine)
            raw_ctx = analyzer.analyze(input_obj)

            # ── 5. Context ─────────────────────────────
            ctx_engine = ContextEngine(config, ai_engine)
            structured_ctx = ctx_engine.build(raw_ctx)

            print(f"\n  Tema     : {structured_ctx.tema}")
            print(f"  Emoção   : {structured_ctx.emocao}")
            print(f"  Intenção : {structured_ctx.intencao}")

            # ── 6. Copy ────────────────────────────────
            copy_engine = CopyEngine(config, ai_engine)
            copy_obj = copy_engine.generate(structured_ctx)

        # ── 7. Layout Validation ──────────────────────
        print("\n📐 Validating copy against layout constraints...")
        copy_obj = validate_and_adapt(copy_obj, config)

        print(f"  Título   : {copy_obj.titulo!r}")
        print(f"  Subtítulo: {copy_obj.subtitulo!r}")
        print(f"  Hook     : {copy_obj.hook!r}")

        # ── 8. Design — 3 Variations ─────────────────
        print("\n🎨 Rendering 3 art variations...")
        design_engine = DesignEngine(config)
        variations = design_engine.generate_variations(copy_obj)

        # ── 9. Save Previews ─────────────────────────
        export_engine = ExportEngine(config)
        preview_paths = export_engine.save_previews(variations, structured_ctx)

        print(f"\n  Previews saved to: output/previews/")
        print(f"  Open the previews folder to compare variations before choosing.")

        # ── 10. User Picks Variation ──────────────────
        chosen_idx = pick_variation(variations)
        chosen = variations[chosen_idx]

        # ── 11. Export Final ──────────────────────────
        print("📤 Exporting final file...")
        if input_obj.type == "video":
            final_path = export_engine.export_video(chosen, input_obj.primary_file, structured_ctx)
        else:
            final_path = export_engine.export_image(chosen, structured_ctx, input_obj.primary_file)

        # Export post caption (description)
        caption_path = export_engine.export_caption(copy_obj, structured_ctx, final_path)

        # ── 12. Cleanup ───────────────────────────────

        if not args.no_ai:
            analyzer.cleanup_temp()
        export_engine.cleanup_temp()
        
        # Opcional: mover ou deletar o arquivo original para não reprocessar no futuro
        # os.remove(input_obj.primary_file)
        
        print(f"\n✅ Mídia {idx} concluída: {os.path.basename(final_path)}")

    # ── 13. Cost Report ───────────────────────────
    cost_ctrl.print_summary()
    log_path = cost_ctrl.save_log()

    print("═" * 50)
    print("🚀 DONE! ALL VIDEOS PROCESSED.")
    print(f"   Cost log   : {os.path.relpath(log_path, ROOT)}")
    print("═" * 50 + "\n")


if __name__ == "__main__":
    main()