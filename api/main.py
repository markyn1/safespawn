"""
api/main.py
App FastAPI principal e roteamento.
"""
from pathlib import Path
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from api.routes import auth, generation, designs_manager, admin, user_routes, resolutions, uploads

logging.basicConfig(level=logging.INFO)

from contextlib import asynccontextmanager
import asyncio
from api.core.database import test_connection, init_tables, create_database_if_not_exists

from api.core.queue import generation_queue

from api.services.generation_service import process_queue_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Garante que o banco de dados existe no MySQL
    await create_database_if_not_exists()
    # 2. Roda o teste de conexão assim que a API inicia
    await test_connection()
    # 3. Cria as tabelas se elas não existirem
    await init_tables()
    
    # 4. Inicia o worker assíncrono para processar a fila sequencialmente
    worker_task = asyncio.create_task(process_queue_worker(generation_queue))
    
    yield
    
    # Encerramentos (opcional)
    worker_task.cancel()

app = FastAPI(
    title="Content Creator API",
    description="Engine Automática de Criação de Vídeos e Artes",
    version="1.0.0",
    lifespan=lifespan
)

from fastapi.staticfiles import StaticFiles

# CORS para o front-end em React/Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Ajustar em prod para ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Roteamento de Arquivos Estáticos (Entregando os Vídeos Gerados e Templates Visuais)
app.mount("/api/output", StaticFiles(directory="output"), name="output")
app.mount("/api/designs", StaticFiles(directory="designs"), name="designs")



app.include_router(auth.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(designs_manager.router, prefix="")
app.include_router(admin.router, prefix="/api")
app.include_router(user_routes.router, prefix="/api")
app.include_router(resolutions.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Content Creator API is running"}
