import os
import json
import shutil
import ast
import pprint
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from api.core.database import get_db
from api.routes.auth import get_current_user
from api.models.user_prompt import UserPrompt
from api.models.user import User

router = APIRouter(prefix="/api/designs_manager", tags=["Designs Manager"])

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DESIGNS_DIR = os.path.join(ROOT_DIR, "designs")


class PromptUpdatePayload(BaseModel):
    content: str


# Human-readable descriptions for each style preset
STYLE_META = {
    "copy": {
        "Persuasivo":    "Gatilhos psicológicos e jornada emocional — foca em converter o passivo em ativo.",
        "Informativo":   "Jornalístico e educativo — entrega fatos, contexto e aprendizado real.",
        "Provocador":    "Toma posições ousadas e levanta questionamentos — gera debate e polarização inteligente.",
        "Storytelling":  "Narrativa cinematográfica com começo, clímax e virada — prende do início ao fim.",
        "Direto":        "Zero enrolação, máximo soco — cada palavra ganha seu espaço.",
    },
    "analysis": {
        "Contextual":    "Foca no PORQUÊ da cena — contexto, progressão narrativa e consequências.",
        "Emocional":     "Mapeia a emoção profunda — o que o espectador SENTE, não apenas o que vê.",
        "Viral":         "Lente de viralidade — identifica o potencial de espalhamento e o elemento inesperado.",
        "Técnico":       "Análise de produção — fotografia, som, atuação e decisões criativas.",
    },
    "hooks": {
        "Chocante":      "Usa o elemento mais perturbador ou inesperado para parar o scroll.",
        "Curioso":       "Abre um gap de informação que só o vídeo fecha — gera o 'preciso ver isso'.",
        "Emocional":     "Toca em experiências universais — a pessoa para porque SE RECONHECE.",
        "Humorístico":   "Ironia e absurdo inteligente — para porque riu ou quer rir.",
    },
}


@router.get("/{theme_name}/prompt-styles")
async def get_prompt_styles(theme_name: str, current_user: User = Depends(get_current_user)):
    """Returns the catalog of available named style presets per category."""
    styles_dir = os.path.join(DESIGNS_DIR, theme_name, "prompts", "styles")
    catalog = {}
    for category in ["copy", "analysis", "hooks"]:
        cat_dir = os.path.join(styles_dir, category)
        if os.path.isdir(cat_dir):
            files = [f.replace(".txt", "") for f in os.listdir(cat_dir) if f.endswith(".txt")]
            meta = STYLE_META.get(category, {})
            catalog[category] = [
                {
                    "id": name,
                    "label": name.capitalize(),
                    "description": meta.get(name.capitalize(), ""),
                }
                for name in sorted(files)
            ]
        else:
            catalog[category] = []
    return catalog


@router.get("/themes", response_model=List[str])
async def list_themes(current_user: dict = Depends(get_current_user)):
    """List all available design themes (folders inside /designs)."""
    if not os.path.isdir(DESIGNS_DIR):
        raise HTTPException(status_code=404, detail="Designs directory not found.")
    
    themes = []
    for entry in os.listdir(DESIGNS_DIR):
        if os.path.isdir(os.path.join(DESIGNS_DIR, entry)) and entry != "__pycache__":
            themes.append(entry)
    return themes


@router.get("/{theme_name}/structure")
async def get_theme_structure(theme_name: str, current_user: dict = Depends(get_current_user)):
    """Get the full folder and file structure of a specific theme."""
    theme_dir = os.path.join(DESIGNS_DIR, theme_name)
    if not os.path.isdir(theme_dir):
        raise HTTPException(status_code=404, detail="Theme not found.")

    structure = {}
    for sub_dir in ["assets", "fonts", "formats", "prompts"]:
        folder_path = os.path.join(theme_dir, sub_dir)
        if os.path.isdir(folder_path):
            files = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
            structure[sub_dir] = files
        else:
            structure[sub_dir] = []
    
    # Check for model.py
    structure["model"] = ["model.py"] if os.path.isfile(os.path.join(theme_dir, "model.py")) else []

    return structure


@router.get("/{theme_name}/prompts/{filename}")
async def get_prompt_content(
    theme_name: str,
    filename: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns user's saved prompt override, or the default disk file as fallback."""
    # 1. Check if user has a saved override in DB
    result = await db.execute(
        select(UserPrompt)
        .where(UserPrompt.user_id == current_user.id)
        .where(UserPrompt.theme == theme_name)
        .where(UserPrompt.filename == filename)
    )
    user_prompt = result.scalars().first()
    if user_prompt:
        return {"content": user_prompt.content, "source": "user"}

    # 2. Fall back to disk default
    prompt_path = os.path.join(DESIGNS_DIR, theme_name, "prompts", filename)
    if not os.path.isfile(prompt_path):
        raise HTTPException(status_code=404, detail="Prompt file not found.")
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content, "source": "default"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{theme_name}/prompts/{filename}")
async def update_prompt_content(
    theme_name: str,
    filename: str,
    payload: PromptUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Saves the user's custom prompt to the DB (never overwrites the shared default on disk)."""
    result = await db.execute(
        select(UserPrompt)
        .where(UserPrompt.user_id == current_user.id)
        .where(UserPrompt.theme == theme_name)
        .where(UserPrompt.filename == filename)
    )
    user_prompt = result.scalars().first()

    if user_prompt:
        user_prompt.content = payload.content
    else:
        user_prompt = UserPrompt(
            user_id=current_user.id,
            theme=theme_name,
            filename=filename,
            content=payload.content
        )
        db.add(user_prompt)

    await db.commit()
    return {"status": "success", "message": "Prompt saved to your personal overrides."}


@router.delete("/{theme_name}/prompts/{filename}")
async def reset_prompt_to_default(
    theme_name: str,
    filename: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Resets the user's prompt override, reverting to the global default."""
    result = await db.execute(
        select(UserPrompt)
        .where(UserPrompt.user_id == current_user.id)
        .where(UserPrompt.theme == theme_name)
        .where(UserPrompt.filename == filename)
    )
    user_prompt = result.scalars().first()
    if user_prompt:
        await db.delete(user_prompt)
        await db.commit()
    return {"status": "success", "message": "Prompt reset to default."}


@router.post("/{theme_name}/upload/{folder}")
async def upload_asset(theme_name: str, folder: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload an asset to a specific folder (assets, fonts, etc) within a theme."""
    if folder not in ["assets", "fonts"]:
        raise HTTPException(status_code=400, detail="Invalid target folder for upload.")

    target_dir = os.path.join(DESIGNS_DIR, theme_name, folder)
    if not os.path.isdir(target_dir):
        os.makedirs(target_dir, exist_ok=True)
        
    file_path = os.path.join(target_dir, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"status": "success", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{theme_name}/model")
async def get_theme_model(theme_name: str, current_user: dict = Depends(get_current_user)):
    """Read the profile dictionary from model.py."""
    model_path = os.path.join(DESIGNS_DIR, theme_name, "model.py")
    if not os.path.isfile(model_path):
        raise HTTPException(status_code=404, detail="model.py not found.")
        
    try:
        with open(model_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Safe extraction using ast
        module = ast.parse(content)
        profile_dict = {}
        
        for node in module.body:
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == "profile":
                        # Simplistic evaluation for primitive dicts (won't eval os.path.join)
                        # So we execute it in a clean namespace with os mocked if needed
                        pass
        
        # Because model.py uses os.path.join dynamically, compiling it is better
        import importlib.util
        spec = importlib.util.spec_from_file_location("profile_model", model_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        
        # Resolve the absolute paths to relative ones for the UI
        profile = mod.profile
        if "branding" in profile:
            for k, v in profile["branding"].items():
                if isinstance(v, str) and "designs" in v:
                    # e.g C:\...\designs\default\assets\logo.png -> assets/logo.png
                    if "assets" in v:
                        profile["branding"][k] = "assets/" + os.path.basename(v)
                    elif "fonts" in v:
                        profile["branding"][k] = "fonts/" + os.path.basename(v)
                        
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ModelUpdatePayload(BaseModel):
    profile: Dict[str, Any]

@router.put("/{theme_name}/model")
async def update_theme_model(theme_name: str, payload: ModelUpdatePayload, current_user: dict = Depends(get_current_user)):
    """Re-write the model.py injecting the new profile dictionary."""
    model_path = os.path.join(DESIGNS_DIR, theme_name, "model.py")
    if not os.path.isfile(model_path):
        raise HTTPException(status_code=404, detail="model.py not found.")
        
    profile_data = payload.profile
    
    # We dynamically create the model.py string to maintain os.path.join where needed
    new_model_content = f'''"""
designs/{theme_name}/model.py
Perfil dinâmico gerado pelo Sistema Web.
"""

import os

_BASE = os.path.dirname(os.path.abspath(__file__))

profile = {{
    "branding": {{
'''
    
    # Loop branding items and detect if they are paths
    branding = profile_data.get("branding", {})
    for k, v in branding.items():
        if isinstance(v, str) and ("assets/" in v or "fonts/" in v):
            folder, filename = v.split("/")
            new_model_content += f'        "{k}": os.path.join(_BASE, "{folder}", "{filename}"),\n'
        elif isinstance(v, str):
            new_model_content += f'        "{k}": "{v}",\n'
        else:
            new_model_content += f'        "{k}": {v},\n'
            
    new_model_content += '    },\n    "ai_behavior": {\n'
    
    ai_beh = profile_data.get("ai_behavior", {})
    for k, v in ai_beh.items():
        if isinstance(v, str):
            new_model_content += f'        "{k}": "{v}",\n'
        else:
            new_model_content += f'        "{k}": {v},\n'
            
    new_model_content += '    },\n}\n'
    
    try:
        with open(model_path, "w", encoding="utf-8") as f:
            f.write(new_model_content)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
