"""
debug_layout.py — Visual Layout Debug Tool
Renderiza o template com retângulos coloridos mostrando as áreas de texto e mídia.
Abre a imagem automaticamente para inspeção rápida.

Uso:
  python debug_layout.py                    # Usa o formato do settings.yaml
  python debug_layout.py --format instagram43  # Especifica o formato
"""

import os
import sys
import json
import argparse

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from PIL import Image, ImageDraw, ImageFont
from core.config_loader import load_config


def main():
    parser = argparse.ArgumentParser(description="Debug Layout Tool")
    parser.add_argument("--format", type=str, help="Format to debug (e.g. instagram43, reels, feed)")
    args = parser.parse_args()

    config = load_config()

    # Override format if specified
    if args.format:
        fmt_path = os.path.join(config.design_dir, "formats", f"{args.format}.json")
        with open(fmt_path) as f:
            config.format_data = json.load(f)
        config.active_format = args.format

    fmt = config.format_data
    branding = config.profile["branding"]
    w, h = fmt["resolution"]

    # ── Load base image (template or solid) ──
    template_rel = fmt.get("template_path")
    if template_rel:
        template_path = os.path.join(config.design_dir, template_rel)
        if os.path.isfile(template_path):
            img = Image.open(template_path).convert("RGBA").resize((w, h))
        else:
            img = Image.new("RGBA", (w, h), branding.get("background_color", "#1a1a2e"))
    else:
        img = Image.new("RGBA", (w, h), branding.get("background_color", "#1a1a2e"))

    draw = ImageDraw.Draw(img)

    # ── Color map for areas ──
    areas = {
        "title_area":    {"color": (255, 50, 50, 80),   "border": (255, 50, 50),   "label": "TITLE"},
        "subtitle_area": {"color": (50, 50, 255, 80),   "border": (50, 50, 255),   "label": "SUBTITLE"},
        "media_area":    {"color": (50, 255, 50, 80),   "border": (50, 255, 50),   "label": "MEDIA"},
        "hook_area":     {"color": (255, 255, 50, 80),  "border": (255, 255, 50),  "label": "HOOK"},
    }

    # ── Draw each area ──
    for key, style in areas.items():
        area = fmt.get(key)
        if not area:
            continue

        x, y, aw, ah = area
        # Semi-transparent fill
        overlay = Image.new("RGBA", (aw, ah), style["color"])
        img.paste(overlay, (x, y), overlay)
        # Border
        draw.rectangle([x, y, x + aw, y + ah], outline=style["border"], width=3)
        # Label
        draw.text((x + 10, y + 5), f"← {style['label']} ({aw}x{ah})", fill=style["border"])

    # ── Draw sample text at configured font sizes ──
    try:
        font_path = branding.get("font_bold") or branding.get("font_regular")
        if font_path and os.path.isfile(font_path):
            font_loader = lambda s: ImageFont.truetype(font_path, s)
        else:
            font_loader = lambda s: ImageFont.load_default()
    except Exception:
        font_loader = lambda s: ImageFont.load_default()

    # Title sample
    title_area = fmt.get("title_area")
    if title_area:
        title_font_size = fmt.get("title_font_size", 72)
        font = font_loader(title_font_size)
        tx, ty, tw, th = title_area
        draw.text((tx + 20, ty + 10), "TÍTULO\nAQUI", font=font, fill=(255, 255, 255, 200))
        # Show font size info
        draw.text((tx + 10, ty + th - 25), f"font_size: {title_font_size}", fill=(255, 200, 200))

    # Subtitle sample
    sub_area = fmt.get("subtitle_area")
    if sub_area:
        sub_font_size = fmt.get("subtitle_font_size", 48)
        font = font_loader(sub_font_size)
        sx, sy, sw, sh = sub_area
        draw.text((sx + 20, sy + 10), "Subtítulo descritivo", font=font, fill=(200, 200, 255, 200))
        draw.text((sx + 10, sy + sh - 25), f"font_size: {sub_font_size}", fill=(200, 200, 255))

    # ── Draw crosshairs at center ──
    cx, cy = w // 2, h // 2
    draw.line([(cx - 20, cy), (cx + 20, cy)], fill=(255, 255, 255, 128), width=1)
    draw.line([(cx, cy - 20), (cx, cy + 20)], fill=(255, 255, 255, 128), width=1)

    # ── Draw resolution info ──
    draw.text((10, h - 30), f"Resolution: {w}x{h}  |  Format: {config.active_format}", fill=(255, 255, 255))

    # ── Save & Open ──
    output_path = os.path.join(ROOT, "output", "debug_layout.png")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.convert("RGB").save(output_path, "PNG")

    print(f"\n{'═' * 50}")
    print(f"  🔍 LAYOUT DEBUG — {config.active_format}")
    print(f"{'═' * 50}")
    print(f"  Resolution : {w}x{h}")
    print(f"  Template   : {template_rel or 'none (solid color)'}")
    print()

    for key, style in areas.items():
        area = fmt.get(key)
        if area:
            x, y, aw, ah = area
            print(f"  {style['label']:10s} : x={x}, y={y}, w={aw}, h={ah}")

    if fmt.get("title_font_size"):
        print(f"\n  Title font : {fmt['title_font_size']}px")
    if fmt.get("subtitle_font_size"):
        print(f"  Sub font   : {fmt['subtitle_font_size']}px")

    print(f"\n  Saved to   : {output_path}")
    print(f"{'═' * 50}\n")

    # Try to open the file
    try:
        os.startfile(output_path)
    except Exception:
        pass


if __name__ == "__main__":
    main()
