import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

# JSONB в Postgres, обычный JSON в SQLite
JSONType = JSON().with_variant(JSONB(), "postgresql")


class User(Base):
    """Зарегистрированный пользователь. Регистрация — следующий этап."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    nickname: Mapped[str] = mapped_column(String(32), unique=True)
    email: Mapped[str | None] = mapped_column(String(254), unique=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AnonSession(Base):
    """Браузер без регистрации. При регистрации сюда проставляется user_id."""

    __tablename__ = "anon_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Result(Base):
    __tablename__ = "results"
    __table_args__ = (Index("ix_results_test_anon", "test_id", "anon_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    anon_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("anon_sessions.id"))
    test_id: Mapped[str] = mapped_column(String(32))
    metrics: Mapped[dict[str, float]] = mapped_column(JSONType)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
