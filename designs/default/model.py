"""
designs/default/model.py
Perfil dinâmico gerado pelo Sistema Web.
"""

import os

_BASE = os.path.dirname(os.path.abspath(__file__))

profile = {
    "branding": {
        "logo": os.path.join(_BASE, "assets", "logo.png"),
        "font_bold": os.path.join(_BASE, "fonts", "Ubuntu-Light.ttf"),
        "font_regular": os.path.join(_BASE, "fonts", "Ubuntu-Light.ttf"),
        "primary_color": "#FFFFFF",
        "secondary_color": "#FFD700",
        "accent_color": "#FF4444",
        "background_color": "#0E0E0E",
        "gradient_start": "#0E0E0E",
        "gradient_end": "#1A1A2E",
    },
    "ai_behavior": {
        "brand_voice": "autoridade amigável",
        "text_density": "media",
        "max_title_lines": 3,
        "max_subtitle_lines": 3,
        "language": "pt-BR",
    },
}
