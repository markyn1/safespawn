"""
core/layout_intelligence.py
Valida e adapta copy às restrições do layout.
Modo ai_limited: IA já recebeu os limites no prompt; aqui validamos e truncamos como fallback.
Modo dynamic_resize: (futuro) mede texto e reduz fonte até caber.
"""

from core.copy_engine import CopyObject
from core.config_loader import AppConfig


def validate_and_adapt(copy_obj: CopyObject, config: AppConfig) -> CopyObject:
    """
    Valida copy contra os limites do formato ativo.
    Em ai_limited: apenas trunca como fallback seguro.
    """
    mode = config.layout.get("adaptation_mode", "ai_limited")
    fmt = config.format_data

    if mode == "ai_limited":
        return _truncate_fallback(copy_obj, fmt)
    elif mode == "dynamic_resize":
        # Placeholder for future implementation
        print("[LayoutIntelligence] ⚠️  dynamic_resize mode not yet implemented. Using ai_limited.")
        return _truncate_fallback(copy_obj, fmt)
    else:
        return copy_obj


def _truncate_fallback(copy_obj: CopyObject, fmt: dict) -> CopyObject:
    """
    Safety truncation: ensures copy never exceeds format limits.
    The AI should already have generated compliant text, but this is the safety net.
    """
    max_title = fmt.get("max_title_chars", 40)
    max_sub = fmt.get("max_subtitle_chars", 80)
    max_hook = fmt.get("max_hook_chars", 100)
    max_lines = 2

    titulo = _enforce_limits(copy_obj.titulo, max_title, max_lines)
    subtitulo = _enforce_limits(copy_obj.subtitulo, max_sub, max_lines)
    hook = _enforce_limits(copy_obj.hook, max_hook, 1)

    if titulo != copy_obj.titulo:
        print(f"[LayoutIntelligence] ⚠️  Título truncated: '{copy_obj.titulo}' → '{titulo}'")
    if subtitulo != copy_obj.subtitulo:
        print(f"[LayoutIntelligence] ⚠️  Subtítulo truncated.")

    copy_obj.titulo = titulo
    copy_obj.subtitulo = subtitulo
    copy_obj.hook = hook

    # Also validate variation titles
    if copy_obj.variacao_titulo_b:
        copy_obj.variacao_titulo_b = _enforce_limits(copy_obj.variacao_titulo_b, max_title, max_lines)
    if copy_obj.variacao_titulo_c:
        copy_obj.variacao_titulo_c = _enforce_limits(copy_obj.variacao_titulo_c, max_title, max_lines)

    return copy_obj


def _enforce_limits(text: str, max_chars: int, max_lines: int) -> str:
    if not text:
        return text

    # Enforce max lines
    lines = text.split("\n")
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        text = "\n".join(lines)

    # Enforce max chars (total across all lines)
    if len(text) > max_chars:
        text = text[:max_chars].rstrip()

    return text


def calculate_font_size_to_fit(
    text: str,
    area_width: int,
    area_height: int,
    font_path: str,
    initial_size: int = 100,
    min_size: int = 20,
) -> int:
    """
    Dynamic resize utility (used in dynamic_resize mode).
    Reduces font size until text fits inside the bounding box.
    Requires PIL.
    """
    try:
        from PIL import ImageFont, ImageDraw, Image

        size = initial_size
        while size >= min_size:
            try:
                font = ImageFont.truetype(font_path, size)
            except Exception:
                font = ImageFont.load_default()

            # Measure text size
            dummy = Image.new("RGB", (area_width, area_height))
            draw = ImageDraw.Draw(dummy)
            bbox = draw.textbbox((0, 0), text, font=font)
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]

            if w <= area_width and h <= area_height:
                return size
            size -= 4

    except ImportError:
        pass

    return min_size
