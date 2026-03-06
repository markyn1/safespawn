"""
api/schemas/blocks.py
Schemas Pydantic para a arquitetura de blocos unificada (Phase 8).
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Any

BlockType = Literal['text', 'image', 'media']
BlockSubtype = Literal['dynamic', 'static']

class BlockData(BaseModel):
    id: str
    type: BlockType
    subtype: Optional[BlockSubtype] = 'static'
    label: str
    description: Optional[str] = None
    x: float
    y: float
    w: float
    h: float
    zIndex: int
    visible: bool = True
    locked: bool = False
    
    # Text specific
    fontSize: Optional[int] = None
    fontColor: Optional[str] = None
    fontFamily: Optional[str] = None
    aiEnabled: Optional[bool] = None
    promptTemplateId: Optional[Any] = None # Can be int or string depending on source
    promptOverride: Optional[str] = None
    value: Optional[str] = None # static text content
    
    # Image specific
    src: Optional[str] = None
    opacity: Optional[float] = 1.0
    
    # Media specific
    scaleMode: Optional[Literal['fit', 'fill']] = 'fill'

    class Config:
        from_attributes = True

class FormatBlocksUpdate(BaseModel):
    blocks: List[BlockData]
