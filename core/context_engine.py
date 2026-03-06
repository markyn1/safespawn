"""
core/context_engine.py
Recebe RawContext do Analyzer e usa IA para gerar StructuredContext.
"""

import json
from dataclasses import dataclass, field

from core.ai_engine import AIEngine
from core.analyzer import RawContext
from core.config_loader import AppConfig


@dataclass
class StructuredContext:
    tema: str = ""
    emocao: str = ""
    intencao: str = ""
    publico_detectado: str = ""
    pontos_chave: list[str] = field(default_factory=list)
    palavras_impacto: list[str] = field(default_factory=list)
    chamada_para_acao_sugerida: str = ""
    obra_original: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "tema": self.tema,
            "emocao": self.emocao,
            "intencao": self.intencao,
            "publico_detectado": self.publico_detectado,
            "pontos_chave": self.pontos_chave,
            "palavras_impacto": self.palavras_impacto,
            "chamada_para_acao_sugerida": self.chamada_para_acao_sugerida,
            "obra_original": self.obra_original,
        }


class ContextEngine:
    def __init__(self, config: AppConfig, ai_engine: AIEngine):
        self.config = config
        self.ai = ai_engine
        self._prompt_cache: dict[str, str] = {}

    def build(self, raw: RawContext) -> StructuredContext:
        """Transforms RawContext into StructuredContext using AI analysis prompt."""
        system_prompt = self._load_prompt("analysis.txt")

        # Build the user message with all raw content
        parts = []
        if raw.transcription:
            parts.append(f"=== TRANSCRIÇÃO DE ÁUDIO ===\n{raw.transcription}")
        if raw.frame_descriptions:
            descs = "\n\n".join(raw.frame_descriptions)
            parts.append(f"=== DESCRIÇÃO DOS FRAMES ===\n{descs}")
        if raw.image_descriptions:
            descs = "\n\n".join(raw.image_descriptions)
            parts.append(f"=== DESCRIÇÃO DAS IMAGENS ===\n{descs}")

        if not parts:
            raise ValueError("No raw content to build context from.")

        user_message = "\n\n".join(parts)
        print("[ContextEngine] 🧠 Building structured context...")

        result = self.ai.complete(
            prompt=user_message,
            system=system_prompt,
            as_json=True,
        )

        return StructuredContext(
            tema=result.get("tema", "conteúdo"),
            emocao=result.get("emocao", "inspiracao"),
            intencao=result.get("intencao", "engajar"),
            publico_detectado=result.get("publico_detectado", "público geral"),
            pontos_chave=result.get("pontos_chave", []),
            palavras_impacto=result.get("palavras_impacto", []),
            chamada_para_acao_sugerida=result.get("chamada_para_acao_sugerida", ""),
            obra_original=result.get("obra_original", {}),
        )

    def _load_prompt(self, filename: str) -> str:
        if filename not in self._prompt_cache:
            import os
            path = os.path.join(self.config.prompts_dir, filename)
            with open(path, "r", encoding="utf-8") as f:
                self._prompt_cache[filename] = f.read()
        return self._prompt_cache[filename]
