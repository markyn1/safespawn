"""
api/schemas/generation.py
Schemas Pydantic para histórico de gerações.
"""
from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

class GenerationCreateURL(BaseModel):
    url: HttpUrl

class TestPromptsRequest(BaseModel):
    blocks: list[dict]
    profile_vars: dict
    config_data: Optional[dict] = None

class GenerationResponse(BaseModel):
    id: int
    user_id: int
    status: str
    input_type: str
    input_value: str
    result_media_path: Optional[str]
    result_caption_path: Optional[str]
    error_message: Optional[str]
    is_favorite: bool
    tokens_used: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
