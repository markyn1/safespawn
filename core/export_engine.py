"""
core/export_engine.py
Exporta a variação escolhida para /output com nome automático.
Para imagens: PNG/JPEG otimizado.
Para vídeo: monta overlay sobre o vídeo original com ffmpeg.
"""

import os
import subprocess
import uuid
import shutil
from datetime import datetime

from PIL import Image, ImageOps

from core.config_loader import AppConfig
from core.design_engine import DesignResult
from core.context_engine import StructuredContext
from core.copy_engine import CopyObject


class ExportEngine:
    def __init__(self, config: AppConfig):
        self.config = config
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.output_dir = os.path.join(root, "output")
        self.previews_dir = os.path.join(self.output_dir, "previews")
        self.temp_dir = os.path.join(self.output_dir, "temp", f"export_{uuid.uuid4().hex}")
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.previews_dir, exist_ok=True)
        os.makedirs(self.temp_dir, exist_ok=True)

    # ─────────────────────────────────────────────
    # Save all 3 previews
    # ─────────────────────────────────────────────
    def save_previews(
        self,
        variations: list[DesignResult],
        context: StructuredContext,
    ) -> list[str]:
        """Saves all 3 variation previews to /output/previews/. Returns list of paths."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        tema_slug = _slugify(context.tema)
        paths = []

        for result in variations:
            filename = f"preview_{tema_slug}_{result.variation_id}_{timestamp}.png"
            path = os.path.join(self.previews_dir, filename)
            result.image.save(path, "PNG", optimize=True)
            result.preview_path = path
            paths.append(path)
            print(f"[ExportEngine] 🖼️  Saved preview [{result.variation_id.upper()}]: {filename}")

        return paths

    # ─────────────────────────────────────────────
    # Export chosen variation — Image
    # ─────────────────────────────────────────────
    def export_image(
        self,
        result: DesignResult,
        context: StructuredContext,
        input_path: str = None,
    ) -> str:
        """Saves the final chosen image to /output/."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        tema_slug = _slugify(context.tema)
        var_label = result.label or result.variation_id
        filename = f"{tema_slug}_{var_label}_{timestamp}.png"
        path = os.path.join(self.output_dir, filename)

        fmt = self.config.format_data
        res = fmt.get("resolution", [1080, 1920])
        blocks = fmt.get("blocks", [])
        media_block = next((b for b in blocks if b.get("type") == "media"), None)
        
        media_area = None
        scale_mode = "fill"
        
        if media_block:
            media_area = [
                int(media_block.get("x", 0)),
                int(media_block.get("y", 0)),
                int(media_block.get("w", res[0])),
                int(media_block.get("h", res[1]))
            ]
            scale_mode = media_block.get("scale_mode", media_block.get("scaleMode", "fill"))
        else:
            media_area = fmt.get("media_area")
        
        # Start with a copy of underlay to not mutate the original during exports
        final_img = result.underlay.copy()
        
        # If in template mode and we have an input image, paste it into the design
        if media_area and input_path and os.path.isfile(input_path):
            mx, my, mw, mh = media_area
            try:
                with Image.open(input_path) as input_img:
                    input_img = input_img.convert("RGBA")
                    
                    if scale_mode == "fit":
                        # Preserve aspect ratio, pad to fill mw/mh
                        input_img.thumbnail((mw, mh), Image.LANCZOS)
                        # Create a transparent target for centering
                        box = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
                        off_x = (mw - input_img.size[0]) // 2
                        off_y = (mh - input_img.size[1]) // 2
                        box.paste(input_img, (off_x, off_y), input_img)
                        final_img.paste(box, (mx, my), box)
                    else:
                        # Cover-fit (fill)
                        input_img = ImageOps.fit(input_img, (mw, mh), Image.LANCZOS)
                        final_img.paste(input_img, (mx, my), input_img)
            except Exception as e:
                print(f"[ExportEngine] ⚠️  Could not paste input image: {e}")

        # Finally, composite the overlay (texts, logos above media)
        final_img = Image.alpha_composite(final_img.convert("RGBA"), result.overlay).convert("RGB")
        final_img.save(path, "PNG", optimize=True)
        print(f"[ExportEngine] ✅ Final image exported: {filename}")
        return path


    # ─────────────────────────────────────────────
    # Export chosen variation — Video overlay
    # ─────────────────────────────────────────────
    def export_video(
        self,
        result: DesignResult,
        video_path: str,
        context: StructuredContext,
    ) -> str:
        """
        Composites the chosen design as an overlay on the source video using ffmpeg.
        The design image becomes a semi-transparent lower-third / full-overlay.
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        tema_slug = _slugify(context.tema)
        var_label = result.label or result.variation_id

        # Save underlay and overlay PNG to temp
        underlay_path = os.path.join(self.temp_dir, "underlay_final.png")
        overlay_path = os.path.join(self.temp_dir, "overlay_final.png")
        result.underlay.save(underlay_path, "PNG")
        result.overlay.save(overlay_path, "PNG")

        output_filename = f"{tema_slug}_{var_label}_{timestamp}.mp4"
        output_path = os.path.join(self.output_dir, output_filename)

        fmt = self.config.format_data
        res = fmt["resolution"]
        fps = self.config.export.get("fps", 30)
        bitrate = "4M" if self.config.export.get("bitrate") == "high" else "2M"
        max_dur = self.config.analysis.get("max_video_duration", 120)

        # ffmpeg filter depends on whether we have a specific media area (Phase 8/9 blocks)
        # Tenta pegar as coordenadas do bloco do tipo 'media' dentro da lista de blocos
        blocks = self.config.format_data.get("blocks", [])
        media_block = next((b for b in blocks if b.get("type") == "media"), None)
        
        # Fallback para o modo legado se não houver blocos
        media_area = None
        scale_mode = "fill"
        
        if media_block:
            media_area = [
                int(media_block.get("x", 0)),
                int(media_block.get("y", 0)),
                int(media_block.get("w", res[0])),
                int(media_block.get("h", res[1]))
            ]
            scale_mode = media_block.get("scale_mode", media_block.get("scaleMode", "fill"))
        else:
            media_area = fmt.get("media_area")
        
        if media_area:
            # Template Mode: Design underlay is base, Video is overlaid at specific area, Design overlay is on top
            mx, my, mw, mh = media_area
            
            # Ajuste de escala (Fit vs Fill) no FFMPEG
            if scale_mode == "fit":
                # Scale to fit inside area without cropping
                vid_filter = f"scale={mw}:{mh}:force_original_aspect_ratio=decrease,pad={mw}:{mh}:(ow-iw)/2:(oh-ih)/2"
            else:
                # Fill (crop)
                vid_filter = f"scale={mw}:{mh}:force_original_aspect_ratio=increase,crop={mw}:{mh}"

            filter_complex = (
                f"[1:v]scale={res[0]}:{res[1]}[underlay];"
                f"[0:v]{vid_filter},setsar=1[vid];"
                f"[2:v]scale={res[0]}:{res[1]}[overlay];"
                f"[underlay][vid]overlay={mx}:{my}[mixed];"
                f"[mixed][overlay]overlay=0:0[out]"
            )
        else:
            # Full Overlay Mode: Video is base, Design underlay is transparent (70%), Overlay is opaque
            filter_complex = (
                f"[0:v]scale={res[0]}:{res[1]},setsar=1[base];"
                f"[1:v]scale={res[0]}:{res[1]},format=rgba,colorchannelmixer=aa=0.70[underlay];"
                f"[2:v]scale={res[0]}:{res[1]},format=rgba[overlay];"
                f"[base][underlay]overlay=0:0[mixed];"
                f"[mixed][overlay]overlay=0:0[out]"
            )

        cmd = [
            "ffmpeg", "-y",
            "-t", str(max_dur),
            "-i", video_path,
            "-i", underlay_path,
            "-i", overlay_path,
            "-filter_complex", filter_complex,
            "-map", "[out]",
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "fast",
            "-b:v", bitrate,
            "-r", str(fps),
            "-c:a", "aac",
            "-b:a", "128k",
            output_path,
        ]

        print(f"[ExportEngine] 🎬 Rendering video overlay ({'Template' if media_area else 'Standard'} mode)...")

        try:
            subprocess.run(cmd, capture_output=True, check=True)
            print(f"[ExportEngine] ✅ Final video exported: {output_filename}")
        except FileNotFoundError:
            raise EnvironmentError(
                "\n\n❌ ffmpeg não encontrado no PATH.\n"
                "Para exportar vídeos, instale o ffmpeg:\n"
                "  1. Baixe em: https://www.gyan.dev/ffmpeg/builds/ (ffmpeg-release-essentials.zip)\n"
                "  2. Extraia e adicione a pasta 'bin' ao PATH do Windows.\n"
                "  3. Reinicie o terminal e rode novamente.\n\n"
                "👉 Alternativa rápida (Chocolatey):\n"
                "      choco install ffmpeg\n\n"
                "👉 Alternativa rápida (Winget):\n"
                "      winget install ffmpeg\n"
            )
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode(errors='replace') if e.stderr else str(e)
            print(f"[ExportEngine] ❌ ffmpeg error:\n{error_msg}")
            raise

        return output_path

    # ─────────────────────────────────────────────
    # Export caption (post description)
    # ─────────────────────────────────────────────
    def export_caption(
        self,
        copy_obj: CopyObject,
        context: StructuredContext,
        media_path: str,
    ) -> str:
        """
        Saves the post caption (hook, description, hashtags) to a .txt file
        with the same name as the media file.
        """
        # media_path example: "output/tema_var_timestamp.mp4"
        base_no_ext = os.path.splitext(media_path)[0]
        output_path = f"{base_no_ext}_caption.txt"

        content = []
        if copy_obj.hook:
            content.append(f"🪝 HOOK:\n{copy_obj.hook}\n")
        
        content.append(f"📝 CAPTION:\n{copy_obj.legenda}\n")
        
        if copy_obj.hashtags:
            content.append(f"🏷️ HASHTAGS:\n{' '.join(copy_obj.hashtags)}")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write("\n".join(content))

        print(f"[ExportEngine] 📄 Caption exported: {os.path.basename(output_path)}")
        return output_path

    # ─────────────────────────────────────────────
    # Cleanup
    # ─────────────────────────────────────────────
    def cleanup_temp(self):
        if not self.config.export.get("clean_temp_files", True):
            return
        try:
            shutil.rmtree(self.temp_dir)
        except Exception:
            pass
        print("[ExportEngine] 🧹 Temp files cleaned.")


def _slugify(text: str) -> str:
    """Convert text to a safe filename slug."""
    import re
    text = text.lower().strip()
    text = re.sub(r"[àáâãä]", "a", text)
    text = re.sub(r"[èéêë]", "e", text)
    text = re.sub(r"[ìíîï]", "i", text)
    text = re.sub(r"[òóôõö]", "o", text)
    text = re.sub(r"[ùúûü]", "u", text)
    text = re.sub(r"[ç]", "c", text)
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text[:40].strip("_")
