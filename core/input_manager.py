"""
core/input_manager.py
Varre /input, detecta tipo de arquivo (video ou image),
valida e retorna InputObject normalizado.
"""

import os
from dataclasses import dataclass, field
from typing import Literal

VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


@dataclass
class InputObject:
    type: Literal["video", "image", "mixed"]
    files: list[str] = field(default_factory=list)
    primary_file: str = ""
    duration: float = 0.0  # seconds, video only
    has_audio: bool = False


def detect_input(input_dir: str, max_video_duration: int = 120) -> InputObject:
    """
    Varre input_dir e retorna InputObject descrevendo o conteúdo encontrado.
    """
    if not os.path.isdir(input_dir):
        raise FileNotFoundError(f"Input directory not found: {input_dir}")

    all_files = [
        os.path.join(input_dir, f)
        for f in os.listdir(input_dir)
        if os.path.isfile(os.path.join(input_dir, f))
    ]

    videos = [f for f in all_files if os.path.splitext(f)[1].lower() in VIDEO_EXTENSIONS]
    images = [f for f in all_files if os.path.splitext(f)[1].lower() in IMAGE_EXTENSIONS]

    if not videos and not images:
        raise ValueError(
            f"No supported files found in {input_dir}. "
            f"Supported: {VIDEO_EXTENSIONS | IMAGE_EXTENSIONS}"
        )

    # Prioritize video if both exist
    if videos:
        primary = videos[0]
        duration = _get_video_duration(primary)

        if duration > max_video_duration:
            print(
                f"[InputManager] ⚠️  Video duration {duration:.0f}s exceeds "
                f"max {max_video_duration}s. Will use first {max_video_duration}s."
            )

        has_audio = _check_audio_stream(primary)
        input_type = "video"
        return InputObject(
            type=input_type,
            files=videos,
            primary_file=primary,
            duration=duration,
            has_audio=has_audio,
        )
    else:
        return InputObject(
            type="image",
            files=images,
            primary_file=images[0],
            duration=0.0,
            has_audio=False,
        )

def detect_all_inputs(input_dir: str, max_video_duration: int = 120) -> list[InputObject]:
    """
    Varre input_dir e retorna uma lista de InputObject (um para cada vídeo,
    e um InputObject agrupando imagens se o modo for imagem).
    """
    if not os.path.isdir(input_dir):
        raise FileNotFoundError(f"Input directory not found: {input_dir}")

    all_files = [
        os.path.join(input_dir, f)
        for f in os.listdir(input_dir)
        if os.path.isfile(os.path.join(input_dir, f))
    ]

    videos = [f for f in all_files if os.path.splitext(f)[1].lower() in VIDEO_EXTENSIONS]
    images = [f for f in all_files if os.path.splitext(f)[1].lower() in IMAGE_EXTENSIONS]

    if not videos and not images:
        raise ValueError(
            f"No supported files found in {input_dir}. "
            f"Supported: {VIDEO_EXTENSIONS | IMAGE_EXTENSIONS}"
        )

    results = []

    # Se há vídeos, cada vídeo é uma peça separada para batch processing
    if videos:
        for vid in videos:
            duration = _get_video_duration(vid)
            if duration > max_video_duration:
                print(f"[InputManager] ⚠️  Video duration {duration:.0f}s exceeds max {max_video_duration}s.")
            has_audio = _check_audio_stream(vid)
            results.append(InputObject(
                type="video",
                files=[vid],
                primary_file=vid,
                duration=duration,
                has_audio=has_audio,
            ))
    # Se só tiver imagens, agrupamos todas como se fosse um carrossel/análise conjunta
    elif images:
        results.append(InputObject(
            type="image",
            files=images,
            primary_file=images[0],
            duration=0.0,
            has_audio=False,
        ))

    return results


def _get_video_duration(filepath: str) -> float:
    """Uses ffprobe to get video duration in seconds."""
    try:
        import subprocess, json as _json
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            filepath,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        data = _json.loads(result.stdout)
        for stream in data.get("streams", []):
            if "duration" in stream:
                return float(stream["duration"])
    except Exception as e:
        print(f"[InputManager] Could not get duration via ffprobe: {e}")
    return 0.0


def _check_audio_stream(filepath: str) -> bool:
    """Returns True if video has an audio stream."""
    try:
        import subprocess, json as _json
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            "-select_streams", "a",
            filepath,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        data = _json.loads(result.stdout)
        return len(data.get("streams", [])) > 0
    except Exception:
        return False
