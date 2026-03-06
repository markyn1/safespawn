"""
api/models/format_config.py
Modelo SQLAlchemy para configurações dinâmicas de formato por usuário.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from api.core.database import Base

class UserFormatConfig(Base):
    __tablename__ = "user_format_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    format_name = Column(String(100), nullable=False)
    profile_name = Column(String(100), nullable=True)
    config_data = Column(JSON, nullable=False, default=dict)

    __table_args__ = (
        UniqueConstraint("user_id", "format_name", "profile_name", name="uq_user_format_profile"),
    )

    owner = relationship("User", back_populates="format_configs")
