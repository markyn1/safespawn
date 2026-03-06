"""
api/schemas/resolutions.py
Schemas Pydantic para resoluções (formato de vídeo/arte).
"""
from pydantic import BaseModel, computed_field
from typing import Optional
from datetime import datetime


class ResolutionResponse(BaseModel):
    id: int
    name: str
    proportion: Optional[str] = None
    width: int
    height: int
    x: Optional[int] = None
    y: Optional[int] = None
    label: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    @computed_field
    @property
    def pixels(self) -> str:
        """Dimensões no formato 'LarguraxAltura' (ex: 1080x1920)."""
        return f"{self.width}x{self.height}"

    model_config = {"from_attributes": True}


class ResolutionUpdate(BaseModel):
    """Campos opcionais para alteração parcial de uma resolução."""

    name: Optional[str] = None
    proportion: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    x: Optional[int] = None
    y: Optional[int] = None
    label: Optional[str] = None
