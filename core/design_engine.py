"""
core/design_engine.py
Carrega perfil + formato, aplica branding e gera variações da arte.

Variação A — Standard: Título grande no topo, subtítulo no meio, logo no canto.
Variação B — Bold: Título com accent color + stroke, composição com barra lateral.
Variação C — Centered: Tudo centralizado, gradiente radial de fundo, elegante.

Suporta dois modos de renderização de texto:
- Legacy: title_area / subtitle_area / hook_area do JSON do formato
- Dinâmico: lista de TextBlock com prompt por bloco (nova arquitetura)
"""

import os
import math
from dataclasses import dataclass
from typing import Literal

from PIL import Image, ImageDraw, ImageFont, ImageFilter

from core.copy_engine import CopyObject
from core.config_loader import AppConfig


VARIATION_NAMES = {
    "a": "standard",
    "b": "bold",
    "c": "centered",
}


@dataclass
class DesignResult:
    variation_id: Literal["a", "b", "c"]
    image: Image.Image
    underlay: Image.Image = None
    overlay: Image.Image = None
    preview_path: str = ""
    label: str = ""


class DesignEngine:
    def __init__(self, config: AppConfig):
        self.config = config
        self.branding = config.profile["branding"]
        self.fmt = config.format_data
        self._font_cache: dict[tuple, ImageFont.FreeTypeFont] = {}

    # ─────────────────────────────────────────────
    # Public API
    # ─────────────────────────────────────────────
    def generate_variations(self, copy: CopyObject) -> list["DesignResult"]:
        """Generates the Standard (A) variation using LEGACY fixed blocks."""
        print(f"[DesignEngine] 🎨 Rendering variation A (Standard, legacy)...")
        underlay, overlay, combined = self._render("a", copy)
        return [DesignResult(
            variation_id="a",
            image=combined,
            underlay=underlay,
            overlay=overlay,
            label=VARIATION_NAMES["a"],
        )]

    def generate_with_blocks(
        self,
        blocks: list[dict],
        block_texts: dict[str, str],
    ) -> list["DesignResult"]:
        """
        Gera a arte usando a Arquitetura de Blocos Unificada (Phase 8).

        Args:
            blocks: Lista de dicionários BlockData
            block_texts: dict[label] → texto já gerado (ou resolvido) para cada bloco
        """
        print(f"[DesignEngine] 🎨 Rendering variation A (unified blocks)...")
        w, h = self.fmt["resolution"]
        underlay = self._get_base_image()
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        udraw = ImageDraw.Draw(underlay)
        odraw = ImageDraw.Draw(overlay)

        # 1. Obter funções de desenho para todos os blocos unificados
        render_queue = self._get_unified_blocks_draw_funcs(blocks, block_texts, udraw)

        # 2. Ordenar por Z-Index
        render_queue.sort(key=lambda x: x[0])
        
        # 3. Renderizar (decidindo entre underlay ou overlay com base no media_z_index)
        # Tenta encontrar o Z-Index do bloco de mídia nos dados recebidos
        media_block = next((b for b in blocks if b.get("type") == "media"), None)
        media_z = int(media_block.get("z_index", media_block.get("zIndex", 5))) if media_block else self.fmt.get("media_z_index", 5)

        for z, func in render_queue:
            tgt_img = underlay if z < media_z else overlay
            tgt_draw = udraw if z < media_z else odraw
            func(tgt_img, tgt_draw)

        combined = Image.alpha_composite(underlay.convert("RGBA"), overlay).convert("RGB")
        return [DesignResult(
            variation_id="a",
            image=combined,
            underlay=underlay,
            overlay=overlay,
            label=VARIATION_NAMES["a"],
        )]

    # ─────────────────────────────────────────────
    # Dispatch renderers
    # ─────────────────────────────────────────────
    def _render(self, var_id: str, copy: CopyObject) -> tuple[Image.Image, Image.Image, Image.Image]:
        dispatcher = {
            "a": self._render_standard,
            "b": self._render_bold,
            "c": self._render_centered,
        }
        return dispatcher[var_id](copy)

    # ─────────────────────────────────────────────
    # Variation A — Standard
    # ─────────────────────────────────────────────
    def _render_standard(self, copy: CopyObject) -> tuple[Image.Image, Image.Image, Image.Image]:
        w, h = self.fmt["resolution"]
        underlay = self._get_base_image()
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        
        udraw = ImageDraw.Draw(underlay)
        odraw = ImageDraw.Draw(overlay)

        render_queue = []

        # Title
        title_area = self.fmt["title_area"]       # [x, y, w, h]
        font_title = self._font(self.fmt["title_font_size"], custom_font_path=self.fmt.get("title_font"))
        title_color = self.fmt.get("title_color") or self.branding["primary_color"]
        wrapped_title = self._wrap_text(udraw, copy.titulo, font_title, title_area[2] - 40)
        def draw_title(tgt_img, tgt_draw):
            tgt_draw.text((title_area[0] + 20, title_area[1]), wrapped_title, font=font_title, fill=title_color)
        render_queue.append((self.fmt.get("title_z_index", 10), draw_title))

        # Subtitle
        sub_area = self.fmt["subtitle_area"]
        font_sub = self._font(self.fmt["subtitle_font_size"], custom_font_path=self.fmt.get("subtitle_font"))
        subtitle_color = self.fmt.get("subtitle_color") or self.branding["secondary_color"]
        wrapped_subtitle = self._wrap_text(udraw, copy.subtitulo, font_sub, sub_area[2] - 40)
        def draw_subtitle(tgt_img, tgt_draw):
            tgt_draw.text((sub_area[0] + 20, sub_area[1]), wrapped_subtitle, font=font_sub, fill=subtitle_color)
        render_queue.append((self.fmt.get("subtitle_z_index", 11), draw_subtitle))

        # Hook (small, bottom area) — optional
        hook_area = self.fmt.get("hook_area")
        enable_hook = self.fmt.get("enable_hook", True)
        if hook_area and enable_hook:
            font_hook = self._font(self.fmt["hook_font_size"], custom_font_path=self.fmt.get("hook_font"))
            wrapped_hook = self._wrap_text(udraw, copy.hook, font_hook, hook_area[2] - 40)
            hook_color = self.fmt.get("hook_color") or "#FFFFFF"
            def draw_hook(tgt_img, tgt_draw):
                tgt_draw.text((hook_area[0] + 20, hook_area[1]), wrapped_hook, font=font_hook, fill=hook_color)
            render_queue.append((self.fmt.get("hook_z_index", 12), draw_hook))

        render_queue.extend(self._get_static_elements_draw_funcs())
        render_queue.sort(key=lambda x: x[0])
        
        media_z = self.fmt.get("media_z_index", 5)
        for z, func in render_queue:
            tgt_img = underlay if z < media_z else overlay
            tgt_draw = udraw if z < media_z else odraw
            func(tgt_img, tgt_draw)

        combined = Image.alpha_composite(underlay.convert("RGBA"), overlay).convert("RGB")
        return underlay, overlay, combined

    # ─────────────────────────────────────────────
    def _render_bold(self, copy: CopyObject) -> tuple[Image.Image, Image.Image, Image.Image]:
        w, h = self.fmt["resolution"]
        underlay = self._get_base_image()
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        udraw = ImageDraw.Draw(underlay)
        odraw = ImageDraw.Draw(overlay)
        render_queue = []

        # Title with accent color + stroke effect
        title_area = self.fmt["title_area"]
        font_title = self._font(self.fmt["title_font_size"], custom_font_path=self.fmt.get("title_font"))
        title_text = copy.variacao_titulo_b or copy.titulo
        wrapped_title = self._wrap_text(udraw, title_text, font_title, title_area[2] - 40)
        title_color = self.fmt.get("title_color") or self.branding["primary_color"]
        subtitle_color = self.fmt.get("subtitle_color") or self.branding["secondary_color"]

        def draw_title(tgt_img, tgt_draw):
            # Stroke (shadow offset)
            stroke_color = self.branding["accent_color"]
            for offset in [(3, 3), (-1, -1)]:
                tgt_draw.text(
                    (title_area[0] + 20 + offset[0], title_area[1] + offset[1]),
                    wrapped_title,
                    font=font_title,
                    fill=stroke_color,
                )
            tgt_draw.text(
                (title_area[0] + 20, title_area[1]),
                wrapped_title,
                font=font_title,
                fill=title_color,
            )
        render_queue.append((self.fmt.get("title_z_index", 10), draw_title))

        # Subtitle
        sub_area = self.fmt["subtitle_area"]
        font_sub = self._font(self.fmt["subtitle_font_size"], custom_font_path=self.fmt.get("subtitle_font"))
        wrapped_subtitle = self._wrap_text(udraw, copy.subtitulo, font_sub, sub_area[2] - 40)
        def draw_subtitle(tgt_img, tgt_draw):
            tgt_draw.text((sub_area[0] + 20, sub_area[1]), wrapped_subtitle, font=font_sub, fill=subtitle_color)
        render_queue.append((self.fmt.get("subtitle_z_index", 11), draw_subtitle))

        # Hook — optional
        hook_area = self.fmt.get("hook_area")
        enable_hook = self.fmt.get("enable_hook", True)
        if hook_area and enable_hook:
            font_hook = self._font(self.fmt["hook_font_size"], custom_font_path=self.fmt.get("hook_font"))
            wrapped_hook = self._wrap_text(udraw, copy.hook, font_hook, hook_area[2] - 40)
            hook_color = self.fmt.get("hook_color") or "#FFFFFF"
            def draw_hook(tgt_img, tgt_draw):
                tgt_draw.text((hook_area[0] + 20, hook_area[1]), wrapped_hook, font=font_hook, fill=hook_color)
            render_queue.append((self.fmt.get("hook_z_index", 12), draw_hook))

        render_queue.extend(self._get_static_elements_draw_funcs())
        render_queue.sort(key=lambda x: x[0])
        
        media_z = self.fmt.get("media_z_index", 5)
        for z, func in render_queue:
            tgt_img = underlay if z < media_z else overlay
            tgt_draw = udraw if z < media_z else odraw
            func(tgt_img, tgt_draw)

        combined = Image.alpha_composite(underlay.convert("RGBA"), overlay).convert("RGB")
        return underlay, overlay, combined

    # ─────────────────────────────────────────────
    # Variation C — Centered
    # ─────────────────────────────────────────────
    def _render_centered(self, copy: CopyObject) -> tuple[Image.Image, Image.Image, Image.Image]:
        w, h = self.fmt["resolution"]
        underlay = self._get_base_image()
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        udraw = ImageDraw.Draw(underlay)
        odraw = ImageDraw.Draw(overlay)
        render_queue = []

        # Centered title
        title_area = self.fmt["title_area"]
        font_title_path = self.fmt.get("title_font")
        font_title = self._font(self.fmt["title_font_size"], custom_font_path=font_title_path)
        title_text = copy.variacao_titulo_c or copy.titulo
        wrapped_title = self._wrap_text(udraw, title_text, font_title, title_area[2] - 40)
        title_color = self.fmt.get("title_color") or self.branding["primary_color"]
        subtitle_color = self.fmt.get("subtitle_color") or self.branding["secondary_color"]

        def draw_title(tgt_img, tgt_draw):
            title_bbox = tgt_draw.textbbox((0, 0), wrapped_title, font=font_title, align="center")
            title_w = title_bbox[2] - title_bbox[0]
            tgt_draw.text(((w - title_w) // 2, title_area[1]), wrapped_title, font=font_title, fill=title_color, align="center")
        render_queue.append((self.fmt.get("title_z_index", 10), draw_title))

        # Centered subtitle
        sub_area = self.fmt["subtitle_area"]
        font_sub_path = self.fmt.get("subtitle_font")
        font_sub = self._font(self.fmt["subtitle_font_size"], custom_font_path=font_sub_path)
        wrapped_subtitle = self._wrap_text(udraw, copy.subtitulo, font_sub, sub_area[2] - 40)
        
        def draw_subtitle(tgt_img, tgt_draw):
            sub_bbox = tgt_draw.textbbox((0, 0), wrapped_subtitle, font=font_sub, align="center")
            sub_w = sub_bbox[2] - sub_bbox[0]
            tgt_draw.text(((w - sub_w) // 2, sub_area[1]), wrapped_subtitle, font=font_sub, fill=subtitle_color, align="center")
        render_queue.append((self.fmt.get("subtitle_z_index", 11), draw_subtitle))

        # Centered hook — optional
        hook_area = self.fmt.get("hook_area")
        enable_hook = self.fmt.get("enable_hook", True)
        if hook_area and enable_hook:
            font_hook_path = self.fmt.get("hook_font")
            font_hook = self._font(self.fmt["hook_font_size"], custom_font_path=font_hook_path)
            wrapped_hook = self._wrap_text(udraw, copy.hook, font_hook, hook_area[2] - 40)
            hook_color = self.fmt.get("hook_color") or "#FFFFFF"
            def draw_hook(tgt_img, tgt_draw):
                hook_bbox = tgt_draw.textbbox((0, 0), wrapped_hook, font=font_hook, align="center")
                hook_w = hook_bbox[2] - hook_bbox[0]
                tgt_draw.text(((w - hook_w) // 2, hook_area[1]), wrapped_hook, font=font_hook, fill=hook_color, align="center")
            render_queue.append((self.fmt.get("hook_z_index", 12), draw_hook))

        render_queue.extend(self._get_static_elements_draw_funcs())
        render_queue.sort(key=lambda x: x[0])
        
        media_z = self.fmt.get("media_z_index", 5)
        for z, func in render_queue:
            tgt_img = underlay if z < media_z else overlay
            tgt_draw = udraw if z < media_z else odraw
            func(tgt_img, tgt_draw)

        combined = Image.alpha_composite(underlay.convert("RGBA"), overlay).convert("RGB")
        return underlay, overlay, combined

    # ─────────────────────────────────────────────
    # Drawing helpers
    # ─────────────────────────────────────────────
    def _get_base_image(self) -> Image.Image:
        """Returns the base image based on format (solid color or template)."""
        w, h = self.fmt["resolution"]
        template_rel = self.fmt.get("template_path")
        
        base_color = self.fmt.get("background_color") or "#0E0E0E"
        base_img = Image.new("RGB", (w, h), base_color)
        
        if template_rel:
            root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            template_path = os.path.join(root, "designs", self.config.active_design, template_rel)
            if os.path.isfile(template_path):
                bg_layer = Image.open(template_path).convert("RGB")
                
                # If the user defined a specific box for the background (x, y, w, h)
                bg_area = self.fmt.get("bg_area")
                if bg_area:
                    bx, by, bw, bh = bg_area
                    bg_layer = bg_layer.resize((bw, bh))
                    base_img.paste(bg_layer, (bx, by))
                else:
                    # Default: fill the whole canvas
                    bg_layer = bg_layer.resize((w, h))
                    base_img.paste(bg_layer, (0, 0))
                    
        return base_img

    # ─────────────────────────────────────────────
    # Static Overlay Elements (User-Defined)
    # ─────────────────────────────────────────────
    def _get_static_elements_draw_funcs(self) -> list:
        """
        Returns a list of closures (z_index, func) to draw static elements.
        """
        funcs = []
        elements = self.fmt.get("static_elements", [])
        if not elements:
            return funcs

        for el in elements:
            el_type = el.get("type")
            z = el.get("z_index", 20)
            x = int(el.get("x", 0))
            y = int(el.get("y", 0))

            if el_type == "text":
                value = el.get("value", "")
                if not value:
                    continue
                font_size = int(el.get("font_size", 28))
                color = el.get("color", "#FFFFFF")
                font_path = el.get("font")
                font = self._font(font_size, custom_font_path=font_path)
                
                def make_text_drawer(xx, yy, vv, ff, cc):
                    return lambda tgt_img, tgt_draw: tgt_draw.text((xx, yy), vv, font=ff, fill=cc)
                
                funcs.append((z, make_text_drawer(x, y, value, font, color)))

            elif el_type == "image":
                src = el.get("src", "")
                if src and not os.path.isabs(src):
                    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    src = os.path.join(root_dir, "designs", src)
                
                if not src or not os.path.isfile(src):
                    continue
                w_el = int(el.get("w", 80))
                h_el = int(el.get("h", 80))
                try:
                    img_src = Image.open(src).convert("RGBA")
                    orig_w, orig_h = img_src.size
                    
                    # Proportional resize (object-fit: contain)
                    ratio = min(w_el / max(orig_w, 1), h_el / max(orig_h, 1))
                    new_w, new_h = max(int(orig_w * ratio), 1), max(int(orig_h * ratio), 1)
                    
                    overlay = img_src.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    
                    # Center the image inside the user-defined box
                    offset_x = x + (w_el - new_w) // 2
                    offset_y = y + (h_el - new_h) // 2
                    
                    def make_img_drawer(xx, yy, ov):
                        def _d(tgt_img, tgt_draw):
                            if ov.mode == "RGBA":
                                tgt_img.paste(ov, (xx, yy), ov)
                            else:
                                tgt_img.paste(ov, (xx, yy))
                        return _d
                    
                    funcs.append((z, make_img_drawer(offset_x, offset_y, overlay)))
                except Exception as e:
                    print(f"[DesignEngine] Skipping static image '{src}': {e}")
                    
        return funcs

    def _get_unified_blocks_draw_funcs(
        self,
        blocks: list[dict],
        block_texts: dict[str, str],
        draw_ref: ImageDraw.Draw,
    ) -> list[tuple]:
        """
        Converte blocos unificados em closures de renderização.
        """
        funcs = []
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        for b in blocks:
            # Pular se desabilitado ou invisível
            if not b.get("visible", b.get("enabled", True)):
                continue
            
            b_type = b.get("type", "text")
            z = int(b.get("z_index", b.get("zIndex", 10)))
            x = int(b.get("x", 0))
            y = int(b.get("y", 0))
            w_b = int(b.get("w", 100))
            h_b = int(b.get("h", 100))

            if b_type == "text":
                label = b.get("label", "")
                # Prioridade: texto gerado pela IA > valor estático
                text = block_texts.get(label) or b.get("value") or ""
                if not text: continue

                font_size = int(b.get("font_size", b.get("fontSize", 60)))
                font_path = b.get("font_path", b.get("fontFamily"))
                color = b.get("font_color", b.get("fontColor")) or "#FFFFFF"

                font = self._font(font_size, custom_font_path=font_path)
                wrapped = self._wrap_text(draw_ref, text, font, w_b - 40)

                def make_text_drawer(xx, yy, txt, ff, cc):
                    return lambda tgt_img, tgt_draw: tgt_draw.text((xx + 20, yy), txt, font=ff, fill=cc)
                
                funcs.append((z, make_text_drawer(x, y, wrapped, font, color)))

            elif b_type == "image":
                src = b.get("src", "")
                # Resolver caminhos relativos
                if src and not os.path.isabs(src):
                    src_full = os.path.join(root_dir, "designs", src)
                    if not os.path.isfile(src_full):
                        # Tentar relativo ao drive raiz
                        src_full = os.path.join(root_dir, src)
                else:
                    src_full = src

                if not src_full or not os.path.isfile(src_full):
                    print(f"[DesignEngine] Warning: Block image not found: {src_full}")
                    continue

                try:
                    img_src = Image.open(src_full).convert("RGBA")
                    orig_w, orig_h = img_src.size
                    
                    # Proportional resize (contain)
                    ratio = min(w_b / max(orig_w, 1), h_b / max(orig_h, 1))
                    new_w, new_h = max(int(orig_w * ratio), 1), max(int(orig_h * ratio), 1)
                    
                    overlay_img = img_src.resize((new_w, new_h), Image.Resampling.LANCZOS)
                    
                    # Opacity
                    opacity = b.get("opacity", 1.0)
                    if opacity < 1.0:
                        alpha = overlay_img.getchannel('A')
                        alpha = alpha.point(lambda i: i * opacity)
                        overlay_img.putalpha(alpha)

                    # Center in box
                    off_x = x + (w_b - new_w) // 2
                    off_y = y + (h_b - new_h) // 2
                    
                    def make_img_drawer(xx, yy, ov):
                        return lambda tgt_img, tgt_draw: tgt_img.paste(ov, (xx, yy), ov)
                    
                    funcs.append((z, make_img_drawer(off_x, off_y, overlay_img)))
                except Exception as e:
                    print(f"[DesignEngine] Error rendering block image '{src_full}': {e}")

        return funcs

    def _paste_logo(self, img: Image.Image):
        # Check if logo is disabled in format config
        if not self.fmt.get("show_logo", True):
            return

        logo_path = self.branding["logo"]
        if not os.path.isfile(logo_path):
            return
        logo_size = self.fmt["logo_size"]
        pos = tuple(self.fmt["logo_position"])
        logo = Image.open(logo_path).convert("RGBA").resize((logo_size, logo_size))
        img.paste(logo, pos, logo)

    def _draw_gradient_overlay(self, img: Image.Image, direction: str = "bottom", opacity: int = 180):
        """Draws a linear gradient overlay from transparent to semi-dark."""
        w, h = img.size
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        for y in range(h):
            alpha = int((y / h) * opacity) if direction == "bottom" else int(((h - y) / h) * opacity)
            draw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
        img.paste(Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB"))

    def _draw_diagonal_band(self, draw: ImageDraw.Draw, w: int, h: int):
        """Draws a dark diagonal accent band in the top-right corner."""
        color = tuple(int(self.branding["secondary_color"].lstrip("#")[i:i+2], 16)
                      for i in (0, 2, 4)) + (40,)
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        band_w = w // 3
        points = [(w - band_w, 0), (w, 0), (w, h // 2), (w - band_w * 2, 0)]
        od.polygon(points, fill=color)
        return overlay

    def _draw_radial_gradient(self, img: Image.Image, w: int, h: int):
        """Creates a subtle radial glow from center."""
        overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)
        cx, cy = w // 2, h // 2
        max_r = min(w, h) * 0.6

        for r in range(int(max_r), 0, -1):
            ratio = r / max_r
            # Gold glow from center fading out
            alpha = int((1 - ratio) * 18)
            r_val, g_val, b_val = 255, 215, 0  # gold
            draw.ellipse(
                [cx - r, cy - r, cx + r, cy + r],
                fill=(r_val, g_val, b_val, alpha),
            )

        img.paste(
            Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
        )

    def _wrap_text(self, draw: ImageDraw.Draw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> str:
        if not text:
            return ""
        lines = []
        for paragraph in text.split('\n'):
            words = paragraph.split(' ')
            current_line = []
            for word in words:
                current_line.append(word)
                bbox = draw.textbbox((0, 0), ' '.join(current_line), font=font)
                w = bbox[2] - bbox[0]
                if w > max_width and len(current_line) > 1:
                    current_line.pop()
                    lines.append(' '.join(current_line))
                    current_line = [word]
            if current_line:
                lines.append(' '.join(current_line))
        return '\n'.join(lines)

    def _font(self, size: int, custom_font_path: str = None) -> ImageFont.FreeTypeFont:
        key = (size, custom_font_path)
        if key not in self._font_cache:
            # Priority: custom > fmt config (per layout/profile) > branding fallback > system default
            font_path = (
                custom_font_path
                or self.fmt.get("font_bold")
                or self.fmt.get("font_regular")
                or self.branding.get("font_bold")
                or self.branding.get("font_regular")
            )
            # Resolve paths relative to project root
            if font_path and not os.path.isabs(font_path):
                root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                font_path = os.path.join(root, font_path)
            try:
                if font_path and os.path.isfile(font_path):
                    self._font_cache[key] = ImageFont.truetype(font_path, size)
                else:
                    print(f"[DesignEngine] Font not found at: {font_path}, using default.")
                    self._font_cache[key] = ImageFont.load_default()
            except Exception as e:
                print(f"[DesignEngine] Font load error: {e}")
                self._font_cache[key] = ImageFont.load_default()
        return self._font_cache[key]
