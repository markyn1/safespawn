"""
api/models/resolutions.py
Modelo SQLAlchemy para resoluções (formato de vídeo/arte).
"""

from sqlalchemy import Column, Integer, String, DateTime, func
from api.core.database import Base


class Resolution(Base):
    __tablename__ = "resolutions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    proportion = Column(String(20), nullable=True)   # ex: "9:16", "1:1", "4:3"
    width = Column(Integer, nullable=False)          # pixels (eixo x)
    height = Column(Integer, nullable=False)         # pixels (eixo y)
    x = Column(Integer, nullable=True, default=0)    # posição ou uso customizado
    y = Column(Integer, nullable=True, default=0)    # posição ou uso customizado
    label = Column(String(200), nullable=True)       # ex: "Instagram Reels", "Stories"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    @property
    def pixels(self) -> str:
        """Retorna dimensões no formato 'LarguraxAltura' (ex: 1080x1920)."""
        return f"{self.width}x{self.height}"

    def __repr__(self) -> str:
        return f"<Resolution(id={self.id}, name={self.name!r}, pixels={self.pixels})>"
