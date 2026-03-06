"""
api/models/generation.py
Modelo SQLAlchemy para o histórico de gerações (vídeos criados pela IA).
"""

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from api.core.database import Base

class GenerationStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"

class Generation(Base):
    __tablename__ = "generations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    status = Column(Enum(GenerationStatus), default=GenerationStatus.PENDING)
    
    # "url" ou "file"
    input_type = Column(String(20), nullable=False)
    # Se for url, guarda a string da URL. Se for file, guarda o caminho no servidor.
    input_value = Column(Text, nullable=False)
    
    # Caminhos resultantes (após IA)
    result_media_path = Column(String(255), nullable=True)
    result_caption_path = Column(String(255), nullable=True)
    
    error_message = Column(Text, nullable=True)
    
    # Novos recursos
    is_favorite = Column(Boolean, default=False)
    tokens_used = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="generations")
