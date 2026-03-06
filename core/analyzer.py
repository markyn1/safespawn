"""
core/analyzer.py
Extrai frames e áudio de vídeos, descreve imagens via GPT-4o Vision,
transcreve áudio via Whisper e retorna RawContext.
"""

import os
import subprocess
import json
import uuid
import shutil
from dataclasses import dataclass, field
from pathlib import Path

from core.ai_engine import AIEngine
from core.input_manager import InputObject
from core.config_loader import AppConfig


@dataclass
class RawContext:
    transcription: str = ""
    frame_descriptions: list[str] = field(default_factory=list)
    image_descriptions: list[str] = field(default_factory=list)
    frames_analyzed: int = 0


class Analyzer:
    def __init__(self, config: AppConfig, ai_engine: AIEngine):
        self.config = config
        self.ai = ai_engine
        self.temp_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "output", "temp", f"analyzer_{uuid.uuid4().hex}"
        )
        os.makedirs(self.temp_dir, exist_ok=True)

    def analyze(self, input_obj: InputObject) -> RawContext:
        """Entry point: dispatch to video or image analysis."""
        if input_obj.type == "video":
            return self._analyze_video(input_obj)
        else:
            return self._analyze_images(input_obj)

    # ─────────────────────────────────────────────
    # VIDEO
    # ─────────────────────────────────────────────
    def _analyze_video(self, input_obj: InputObject) -> RawContext:
        ctx = RawContext()

        # 1. Extract + transcribe audio (if available and enabled)
        if input_obj.has_audio and self.config.analysis.get("analyze_audio", True):
            audio_path = self._extract_audio(input_obj.primary_file)
            if audio_path:
                print("[Analyzer] 🎙️  Transcribing audio...")
                ctx.transcription = self.ai.transcribe(audio_path)
                print(f"[Analyzer] Transcription ({len(ctx.transcription)} chars) done.")

        # 2. Extract strategic frames
        frames = self._extract_frames(
            input_obj.primary_file,
            interval=self.config.analysis.get("frame_interval_seconds", 5),
            max_frames=self.config.max_frames,
        )
        print(f"[Analyzer] 🎞️  Extracted {len(frames)} frames. Describing via Vision...")

        # 3. Describe frames in a single GPT call (batch)
        if frames:
            ctx.frame_descriptions = self._describe_frames(frames)
            ctx.frames_analyzed = len(frames)

        return ctx

    # ─────────────────────────────────────────────
    # IMAGES
    # ─────────────────────────────────────────────
    def _analyze_images(self, input_obj: InputObject) -> RawContext:
        ctx = RawContext()
        images = input_obj.files[:self.config.max_frames]
        print(f"[Analyzer] 🖼️  Analyzing {len(images)} image(s) via Vision...")
        ctx.image_descriptions = self._describe_frames(images)
        ctx.frames_analyzed = len(images)
        return ctx

    # ─────────────────────────────────────────────
    # HELPERS
    # ─────────────────────────────────────────────
    def _extract_audio(self, video_path: str) -> str | None:
        """Extracts audio track as MP3 using ffmpeg."""
        out = os.path.join(self.temp_dir, "audio_extracted.mp3")
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vn",
            "-acodec", "libmp3lame",
            "-ab", "128k",
            out,
        ]
        try:
            subprocess.run(cmd, capture_output=True, check=True)
            return out if os.path.isfile(out) else None
        except FileNotFoundError:
            print("[Analyzer] ⚠️  ffmpeg não encontrado — pulando extração de áudio.")
            print("           Instale via: winget install ffmpeg")
            return None
        except Exception as e:
            print(f"[Analyzer] ⚠️  Audio extraction failed: {e}")
            return None

    def _extract_frames(self, video_path: str, interval: int, max_frames: int) -> list[str]:
        """Extracts frames at regular intervals using ffmpeg."""
        frames = []
        out_pattern = os.path.join(self.temp_dir, "frame_%03d.jpg")
        cmd = [
            "ffmpeg", "-y",
            "-i", video_path,
            "-vf", f"fps=1/{interval}",
            "-frames:v", str(max_frames),
            "-q:v", "3",
            out_pattern,
        ]
        try:
            subprocess.run(cmd, capture_output=True, check=True)
            frames = sorted([
                os.path.join(self.temp_dir, f)
                for f in os.listdir(self.temp_dir)
                if f.startswith("frame_") and f.endswith(".jpg")
            ])[:max_frames]
        except FileNotFoundError:
            raise EnvironmentError(
                "\n\n❌ ffmpeg não encontrado no PATH.\n"
                "Para processar vídeos, instale o ffmpeg:\n"
                "  winget install ffmpeg   (ou: choco install ffmpeg)\n"
                "Depois reinicie o terminal e rode novamente.\n"
            )
        except Exception as e:
            print(f"[Analyzer] ⚠️  Frame extraction failed: {e}")
        return frames

    def _describe_frames(self, image_paths: list[str]) -> list[str]:
        """
        Sends frames to GPT-4o Vision in batches of up to 4 images per call.
        Returns list of description strings (one per call).
        """
        descriptions = []
        batch_size = 4
        for i in range(0, len(image_paths), batch_size):
            batch = image_paths[i:i + batch_size]
            prompt = (
                "Descreva objetivamente o conteúdo de cada imagem fornecida. "
                "Para cada imagem, identifique: "
                "1) tema visual principal, "
                "2) texto visível na tela (se houver), "
                "3) ambiente/contexto, "
                "4) emoção transmitida. "
                "Seja direto e objetivo em português."
            )
            result = self.ai.complete(
                prompt=prompt,
                system="Você é um especialista em análise visual de conteúdo para marketing.",
                images=batch,
                as_json=False,
            )
            descriptions.append(result)
        return descriptions

    def cleanup_temp(self):
        """Remove temporary files from temp dir."""
        try:
            shutil.rmtree(self.temp_dir)
        except Exception:
            pass
