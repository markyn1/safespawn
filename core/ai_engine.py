"""
core/ai_engine.py
Wrapper central para todas as chamadas à OpenAI API.
Rastreia tokens, custos e respeita economical_mode.
"""

import os
import base64
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from openai import OpenAI

# Auto-load .env from project root (python-dotenv)
try:
    from dotenv import load_dotenv
    _ENV_PATH = Path(__file__).parent.parent / ".env"
    load_dotenv(dotenv_path=_ENV_PATH)
except ImportError:
    pass  # dotenv not installed — rely on system env vars

# Price per 1K tokens (USD) — gpt-4o-mini / gpt-4o
_PRICE_TABLE = {
    "gpt-4o-mini": {"input": 0.000150, "output": 0.000600},
    "gpt-4o":       {"input": 0.002500, "output": 0.010000},
    "whisper-1":    {"per_minute": 0.006},
}


@dataclass
class UsageStats:
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_calls: int = 0
    whisper_minutes: float = 0.0
    estimated_cost_usd: float = 0.0
    model_used: str = ""
    mode: str = "economical"

    def to_dict(self) -> dict:
        return {
            "total_prompt_tokens": self.total_prompt_tokens,
            "total_completion_tokens": self.total_completion_tokens,
            "total_calls": self.total_calls,
            "whisper_minutes": round(self.whisper_minutes, 2),
            "estimated_cost_usd": round(self.estimated_cost_usd, 6),
            "model_used": self.model_used,
            "mode": self.mode,
        }


class AIEngine:
    def __init__(self, config):
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "OPENAI_API_KEY not set. "
                "Set it via: set OPENAI_API_KEY=sk-..."
            )
        self.client = OpenAI(api_key=api_key)
        self.config = config
        self.model = config.ai_model
        self.temperature = config.ai.get("temperature", 0.7)
        self.max_tokens = config.ai.get("max_tokens", 1200)
        self.economical = config.economical_mode
        self.stats = UsageStats(
            model_used=self.model,
            mode="economical" if self.economical else "premium",
        )

        if self.economical:
            self.max_tokens = min(self.max_tokens, 800)

    # ─────────────────────────────────────────────
    # Text / Vision completion
    # ─────────────────────────────────────────────
    def complete(
        self,
        prompt: str,
        system: str = "Você é um assistente especializado em marketing digital.",
        images: list[str] | None = None,
        as_json: bool = True,
    ) -> dict | str:
        """
        Chama GPT com prompt de texto (+ imagens opcionais em base64/URL).
        Retorna dict se as_json=True, string caso contrário.
        """
        messages = [{"role": "system", "content": system}]

        if images:
            user_content = [{"type": "text", "text": prompt}]
            for img_path in images:
                b64 = _encode_image(img_path)
                user_content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
                })
            messages.append({"role": "user", "content": user_content})
        else:
            messages.append({"role": "user", "content": prompt})

        kwargs = dict(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )
        if as_json:
            kwargs["response_format"] = {"type": "json_object"}

        response = self.client.chat.completions.create(**kwargs)
        self._track_usage(response.usage)

        content = response.choices[0].message.content
        if as_json:
            return json.loads(content)
        return content

    # ─────────────────────────────────────────────
    # Whisper transcription
    # ─────────────────────────────────────────────
    def transcribe(self, audio_path: str) -> str:
        """Transcreve áudio usando Whisper API."""
        print(f"[AIEngine] Transcribing {Path(audio_path).name}...")
        with open(audio_path, "rb") as f:
            response = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="pt",
            )

        # Estimate duration for cost tracking (size-based approximation)
        size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        est_minutes = size_mb / 1.0  # ~1MB per minute at 128kbps
        self.stats.whisper_minutes += est_minutes
        cost = est_minutes * _PRICE_TABLE["whisper-1"]["per_minute"]
        self.stats.estimated_cost_usd += cost

        return response.text

    # ─────────────────────────────────────────────
    # Internal
    # ─────────────────────────────────────────────
    def _track_usage(self, usage):
        if not usage:
            return
        pt = usage.prompt_tokens or 0
        ct = usage.completion_tokens or 0
        self.stats.total_prompt_tokens += pt
        self.stats.total_completion_tokens += ct
        self.stats.total_calls += 1

        prices = _PRICE_TABLE.get(self.model, {"input": 0, "output": 0})
        cost = (pt / 1000) * prices["input"] + (ct / 1000) * prices["output"]
        self.stats.estimated_cost_usd += cost


def _encode_image(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")
