
import os
import sys

# Add project root to path
ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)

from core.export_engine import ExportEngine
from core.copy_engine import CopyObject
from core.context_engine import StructuredContext
from core.config_loader import load_config

def test_export_caption():
    print("Testing ExportEngine.export_caption...")
    config = load_config()
    export_engine = ExportEngine(config)
    
    copy_obj = CopyObject(
        hook="Este é um hook de teste!",
        legenda="Esta é uma legenda de teste.\n\nCom parágrafos e emojis! 🚀\n\n#socialmedia",
        hashtags=["#teste", "#automacao"]
    )
    
    context = StructuredContext(tema="teste")
    media_path = os.path.join(export_engine.output_dir, "test_file.png")
    
    # Ensure output dir exists
    os.makedirs(export_engine.output_dir, exist_ok=True)
    
    caption_path = export_engine.export_caption(copy_obj, context, media_path)
    
    if os.path.exists(caption_path):
        print(f"✅ Success! Caption file created: {caption_path}")
        with open(caption_path, "r", encoding="utf-8") as f:
            content = f.read()
            print("\nContent of caption file:")
            print("-" * 20)
            print(content)
            print("-" * 20)
            
            assert "🪝 HOOK:" in content
            assert "📝 CAPTION:" in content
            assert "🏷️ HASHTAGS:" in content
            assert "Este é um hook de teste!" in content
            assert "🚀" in content
            assert "#teste #automacao" in content
    else:
        print("❌ Failed! Caption file not created.")
        sys.exit(1)

if __name__ == "__main__":
    test_export_caption()
