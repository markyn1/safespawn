print("DEBUG: Starting verification script...")
import os
import sys
print(f"DEBUG: Python version: {sys.version}")
import json
import asyncio
from typing import List

# Adicionar o root do projeto ao sys.path
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.append(ROOT)
print(f"DEBUG: ROOT is {ROOT}")

from core.config_loader import load_config
print("DEBUG: Config loader imported")
from core.ai_engine import AIEngine
print("DEBUG: AI Engine imported")
from core.copy_engine import CopyEngine
from core.design_engine import DesignEngine
from core.context_engine import StructuredContext
from core.variable_resolver import VariableResolver

async def test_batch_generation():
    print("\n--- [TEST] Phase 10: Batch Generation & Variable Resolution ---")
    config = load_config()
    ai = AIEngine(config)
    copy_engine = CopyEngine(config, ai)
    
    mock_profile = {
        "username": "@test_user",
        "display_name": "Test User",
        "genre": "Tecnologia",
        "custom_vars": {"canal": "Tech channel"}
    }
    
    mock_context = StructuredContext(
        tema="Inteligência Artificial",
        emocao="Curiosidade",
        intencao="Educar",
        obra_original={"tipo": "artigo", "titulo": "Futuro da IA"}
    )
    
    blocks = [
        {
            "id": "b1",
            "type": "text",
            "subtype": "dynamic",
            "label": "Titulo",
            "ai_enabled": True,
            "prompt_override": "Gere um título sobre !{tema} para !{username}. Max !{max_chars} chars.",
            "w": 500, "fontSize": 50
        },
        {
            "id": "b2",
            "type": "text",
            "subtype": "dynamic",
            "label": "Hook",
            "ai_enabled": True,
            "prompt_override": "Gere um hook impactante sobre !{tema}.",
            "w": 800, "fontSize": 40
        },
        {
            "id": "b3",
            "type": "text",
            "subtype": "static",
            "label": "Rodape",
            "ai_enabled": False,
            "value": "Siga !{username} no !{canal}",
        }
    ]
    
    print("Running generate_blocks...")
    results = copy_engine.generate_blocks(blocks, mock_profile, mock_context)
    print("Results:", json.dumps(results, indent=2, ensure_ascii=False))
    
    assert "Titulo" in results, "Missing Titulo"
    assert "Hook" in results, "Missing Hook"
    assert results["Rodape"] == "Siga @test_user no Tech channel", "Static variable resolution failed"
    print("✅ Phase 10 Test Passed!")

def test_design_engine_layers():
    print("\n--- [TEST] Phase 8/9: Unified Design Engine & Media Z-Index ---")
    config = load_config()
    engine = DesignEngine(config)
    
    # Simular blocos com z-index variados
    blocks = [
        {"id": "bg", "type": "media", "label": "Video", "zIndex": 10},
        {"id": "text_behind", "type": "text", "label": "Atras", "zIndex": 5, "value": "Texto Atras"},
        {"id": "text_front", "type": "text", "label": "Frente", "zIndex": 15, "value": "Texto Frente"}
    ]
    
    block_texts = {
        "Atras": "Texto Atras",
        "Frente": "Texto Frente"
    }
    
    # O generate_with_blocks deve processar e retornar variações
    print("Running design_engine.generate_with_blocks...")
    variations = engine.generate_with_blocks(blocks, block_texts)
    
    print(f"Generated {len(variations)} variations.")
    assert len(variations) > 0, "No variations generated"
    print("✅ Phase 8/9 Logic Test Passed!")

async def main():
    try:
        await test_batch_generation()
        test_design_engine_layers()
        print("\n🏆 ALL BACKEND TESTS PASSED!")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
