from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, PrimaryKeyConstraint, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from core.db import Base


class Collaborator(Base):
    __tablename__ = "collaborators"
    __table_args__ = (PrimaryKeyConstraint("experiment_id", "user_id"),)

    experiment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="viewer", server_default="viewer")
