import os
import shutil
from pathlib import Path
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from api.models.user import User
from api.routes.auth import get_current_user

router = APIRouter(prefix="/uploads", tags=["Uploads"])
UPLOAD_DIR = "uploads"

# Garante que o diretório base existe
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Recebe um arquivo de imagem, salva na pasta `uploads/{user_id}` e retorna a URL pública gerada.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Apenas imagens são permitidas.")

    # Cria pasta especifica do usuario
    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    os.makedirs(user_dir, exist_ok=True)
    
    # Previne colisão básica (ideal seria usar uuid, mas vamos manter o nome do arquivo limpo por agora)
    safe_filename = file.filename.replace(" ", "_")
    file_path = os.path.join(user_dir, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    full_url = f"{request.base_url}api/uploads/{current_user.id}/{safe_filename}"
    return {"url": full_url}

@router.get("")
async def list_uploads(
    request: Request,
    current_user: User = Depends(get_current_user)
):
    """
    Retorna a lista de todas as URLs de imagens que o usuário já enviou para o servidor.
    As URLs passam pela rota autenticada /api/uploads/{user_id}/{filename}.
    """
    user_dir = os.path.join(UPLOAD_DIR, str(current_user.id))
    if not os.path.exists(user_dir):
        return []

    files = [
        f for f in os.listdir(user_dir)
        if os.path.isfile(os.path.join(user_dir, f))
    ]

    # Ordena do mais recente para o mais antigo
    files.sort(
        key=lambda f: os.path.getmtime(os.path.join(user_dir, f)),
        reverse=True
    )

    # URLs passam pela rota protegida, não mais pelo mount estatico publico
    urls = [
        f"{request.base_url}api/uploads/{current_user.id}/{filename}"
        for filename in files
    ]
    return urls


@router.get("/{user_id}/{filename}")
async def serve_upload(
    user_id: int,
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """
    Serve um arquivo de upload de forma protegida.
    Requer JWT via header Authorization: Bearer <token>.
    O frontend usa blob URLs via axios para nunca expor o token em URLs.
    """
    # Verifica posse: usuário autenticado deve ser o dono da pasta
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Acesso negado: este arquivo não pertence a você."
        )

    # Constrói o caminho de forma segura (evita path traversal)
    safe_dir = Path(UPLOAD_DIR).resolve() / str(user_id)
    file_path = (safe_dir / filename).resolve()

    # Verifica que o path resolvido ainda está dentro da pasta do usuário (anti path-traversal)
    if not str(file_path).startswith(str(safe_dir)):
        raise HTTPException(status_code=400, detail="Caminho inválido.")

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado.")

    return FileResponse(str(file_path))
