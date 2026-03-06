"""
core/config_loader.py
Carrega settings.yaml + perfil ativo (model.py) + formato JSON ativo.
Retorna AppConfig com tudo centralizado.
"""

import os
import json
import importlib.util
from dataclasses import dataclass, field
from typing import Any

import yaml


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@dataclass
class AppConfig:
    # Identifiers
    active_design: str
    active_format: str

    # Sub-configs
    analysis: dict = field(default_factory=dict)
    ai: dict = field(default_factory=dict)
    layout: dict = field(default_factory=dict)
    export: dict = field(default_factory=dict)

    # Profile & format data
    profile: dict = field(default_factory=dict)
    format_data: dict = field(default_factory=dict)

    # Paths
    prompts_dir: str = ""
    design_dir: str = ""

    @property
    def economical_mode(self) -> bool:
        return self.ai.get("economical_mode", True)

    @property
    def ai_model(self) -> str:
        if self.economical_mode:
            return "gpt-4o-mini"
        return self.ai.get("model", "gpt-4o")

    @property
    def max_frames(self) -> int:
        if self.economical_mode:
            return min(10, self.analysis.get("max_frames", 10))
        return self.analysis.get("max_frames", 16)


def load_config(settings_path: str | None = None) -> AppConfig:
    """
    Carrega config/settings.yaml e resolve perfil + formato ativos.
    """
    if settings_path is None:
        settings_path = os.path.join(ROOT, "config", "settings.yaml")

    with open(settings_path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    active_design = raw.get("active_design", "default")
    active_format = raw.get("active_format", "feed")

    design_dir = os.path.join(ROOT, "designs", active_design)
    prompts_dir = os.path.join(design_dir, "prompts")

    # Load profile (model.py) dynamically
    model_path = os.path.join(design_dir, "model.py")
    spec = importlib.util.spec_from_file_location("profile_model", model_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    profile = mod.profile

    # Load format JSON
    format_path = os.path.join(design_dir, "formats", f"{active_format}.json")
    with open(format_path, "r", encoding="utf-8") as f:
        format_data = json.load(f)

    return AppConfig(
        active_design=active_design,
        active_format=active_format,
        analysis=raw.get("analysis", {}),
        ai=raw.get("ai", {}),
        layout=raw.get("layout", {}),
        export=raw.get("export", {}),
        profile=profile,
        format_data=format_data,
        prompts_dir=prompts_dir,
        design_dir=design_dir,
    )
