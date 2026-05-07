from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from auth_system.models.user import User


def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def get_user_by_google_id(db: Session, google_id: str) -> User | None:
    return db.scalar(select(User).where(User.google_id == google_id))


def list_users(db: Session) -> list[User]:
    return list(db.scalars(select(User).order_by(User.created_at.desc())))


def create_user(
    db: Session,
    *,
    email: str,
    full_name: str | None,
    password_hash: str | None,
    provider: str = "email",
    google_id: str | None = None,
    avatar_url: str | None = None,
    role: str = "user",
    is_verified: bool = False,
) -> User:
    user = User(
        id=str(uuid4()),
        email=email.lower(),
        full_name=full_name,
        password_hash=password_hash,
        provider=provider,
        google_id=google_id,
        avatar_url=avatar_url,
        role=role,
        is_active=True,
        is_verified=is_verified,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def mark_last_login(db: Session, user: User) -> User:
    user.last_login_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def link_google_user(db: Session, user: User, *, google_id: str, avatar_url: str | None, full_name: str | None) -> User:
    user.provider = "google" if not user.password_hash else user.provider
    user.google_id = google_id
    user.avatar_url = avatar_url or user.avatar_url
    user.full_name = full_name or user.full_name
    user.is_verified = True
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
