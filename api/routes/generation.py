"""
api/routes/generation.py
Rotas para enviar URLs ou Arquivos para a Inteligência Artificial.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
import os

from api.core.database import get_db
from api.models.user import User
from api.schemas.generation import GenerationResponse, GenerationCreateURL, TestPromptsRequest
from api.routes.auth import get_current_user
from api.services.generation_service import GenerationService
from api.repositories.generation_repository import GenerationRepository

router = APIRouter(prefix="/generate", tags=["generation"])

@router.post("/url", response_model=GenerationResponse)
async def generate_from_url(
    payload: GenerationCreateURL, 
    format_override: str = None,
    profile_name: str = "default",
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)):
    
    service = GenerationService(db)
    return await service.create_from_url(current_user, str(payload.url), format_override, profile_name)

@router.post("/upload", response_model=GenerationResponse)
async def generate_from_upload(
    file: UploadFile = File(...),
    format_override: str = Form(None),
    profile_name: str = Form("default"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)):
    
    service = GenerationService(db)
    return await service.create_from_upload(current_user, file.file, file.filename, format_override, profile_name)

@router.get("/status/{gen_id}", response_model=GenerationResponse)
async def get_generation_status(gen_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    repo = GenerationRepository(db)
    gen = await repo.get_generation_by_id(gen_id, current_user.id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")
    return gen

@router.get("/history", response_model=list[GenerationResponse])
async def get_history(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    repo = GenerationRepository(db)
    return await repo.get_history(current_user.id)

@router.delete("/history/{gen_id}")
async def delete_generation(gen_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    repo = GenerationRepository(db)
    gen = await repo.get_generation_by_id(gen_id, current_user.id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    # Excluir mídia física (opcional)
    if gen.result_media_path and os.path.exists(gen.result_media_path):
        try: os.remove(gen.result_media_path)
        except: pass
    if gen.result_caption_path and os.path.exists(gen.result_caption_path):
        try: os.remove(gen.result_caption_path)
        except: pass

    await repo.delete_generation(gen)
    return {"status": "deleted"}

@router.put("/history/{gen_id}/favorite", response_model=GenerationResponse)
async def toggle_favorite(gen_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    repo = GenerationRepository(db)
    gen = await repo.get_generation_by_id(gen_id, current_user.id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    gen.is_favorite = not gen.is_favorite
    return await repo.update_generation(gen)

@router.post("/history/{gen_id}/retry", response_model=GenerationResponse)
async def retry_generation(
    gen_id: int, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    service = GenerationService(db)
    try:
        return await service.retry_generation(current_user, gen_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

from pydantic import BaseModel
class ExportZipRequest(BaseModel):
    generation_ids: list[int]

import zipfile
import uuid

@router.post("/history/export/zip")
async def export_generations_zip(
    payload: ExportZipRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from api.models.generation import GenerationStatus
    repo = GenerationRepository(db)
    if not payload.generation_ids:
        raise HTTPException(status_code=400, detail="Nenhum ID fornecido.")

    generations = await repo.get_generations_by_ids(payload.generation_ids, current_user.id, GenerationStatus.COMPLETED)

    if not generations:
        raise HTTPException(status_code=404, detail="Nenhum arquivo completado foi encontrado para os IDs informados.")

    # Prepara o ZIP
    ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    output_dir = os.path.join(ROOT, "output")
    os.makedirs(output_dir, exist_ok=True)
    zip_filename = f"export_{uuid.uuid4().hex[:8]}.zip"
    zip_filepath = os.path.join(output_dir, zip_filename)

    with zipfile.ZipFile(zip_filepath, 'w') as zipf:
        for gen in generations:
            base_name = f"generation_{gen.id}"
            if gen.result_media_path and os.path.exists(gen.result_media_path):
                ext = os.path.splitext(gen.result_media_path)[1]
                zipf.write(gen.result_media_path, f"{base_name}_video{ext}")
            
            if gen.result_caption_path and os.path.exists(gen.result_caption_path):
                ext = os.path.splitext(gen.result_caption_path)[1]
                zipf.write(gen.result_caption_path, f"{base_name}_caption{ext}")

    return {"download_url": f"http://localhost:8000/api/output/{zip_filename}"}

@router.post("/test-prompts")
async def test_prompts(
    payload: TestPromptsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = GenerationService(db)
    try:
        return await service.test_prompts(payload.blocks, payload.profile_vars)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
