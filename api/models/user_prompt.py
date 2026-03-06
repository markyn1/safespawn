"""
api/models/user_prompt.py
Per-user prompt overrides. When a user saves a prompt in the UI,
it's stored here. The pipeline reads from this table first and
falls back to the disk file if no override exists.
"""
from sqlalchemy import Column, Integer, String, Text, UniqueConstraint, ForeignKey
from sqlalchemy.orm import relationship
from api.core.database import Base


class UserPrompt(Base):
    __tablename__ = "user_prompts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    theme = Column(String(100), nullable=False, default="default")
    filename = Column(String(200), nullable=False)  # e.g. "copy.txt"
    content = Column(Text, nullable=False)

    user = relationship("User", backref="prompts")

    __table_args__ = (
        UniqueConstraint("user_id", "theme", "filename", name="uq_user_theme_prompt"),
    )
