"""
api/models/user.py
Modelo SQLAlchemy para a tabela de usuários.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, JSON
from sqlalchemy.orm import relationship
from api.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    has_access = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    plan = Column(String(50), default="gratuito")
    global_vars = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    generations = relationship("Generation", back_populates="owner")
    format_configs = relationship("UserFormatConfig", back_populates="owner", cascade="all, delete-orphan")
