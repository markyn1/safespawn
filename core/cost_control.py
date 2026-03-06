"""
core/cost_control.py
Agrega estatísticas de uso de IA e persiste cost_log no /output.
"""

import os
import json
from datetime import datetime

from core.ai_engine import AIEngine, UsageStats
from core.config_loader import AppConfig


class CostController:
    def __init__(self, config: AppConfig, ai_engine: AIEngine):
        self.config = config
        self.ai = ai_engine
        self.run_metadata: dict = {}
        self.output_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "output"
        )

    def record_run_metadata(self, **kwargs):
        """Store extra info to include in the cost log (e.g. input type, format)."""
        self.run_metadata.update(kwargs)

    def print_summary(self):
        stats = self.ai.stats
        print("\n" + "─" * 50)
        print("💰 COST SUMMARY")
        print("─" * 50)
        print(f"  Model          : {stats.model_used}")
        print(f"  Mode           : {stats.mode}")
        print(f"  API Calls      : {stats.total_calls}")
        print(f"  Prompt tokens  : {stats.total_prompt_tokens:,}")
        print(f"  Completion tkns: {stats.total_completion_tokens:,}")
        if stats.whisper_minutes > 0:
            print(f"  Whisper (min)  : {stats.whisper_minutes:.2f}")
        print(f"  Estimated cost : ${stats.estimated_cost_usd:.4f} USD")
        print("─" * 50 + "\n")

    def save_log(self) -> str:
        """Saves cost_log_{date}.json to /output and returns the path."""
        os.makedirs(self.output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"cost_log_{timestamp}.json"
        filepath = os.path.join(self.output_dir, filename)

        log = {
            "timestamp": datetime.now().isoformat(),
            "run_metadata": self.run_metadata,
            "usage": self.ai.stats.to_dict(),
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(log, f, indent=2, ensure_ascii=False)

        print(f"[CostControl] 📊 Cost log saved: {filename}")
        return filepath
