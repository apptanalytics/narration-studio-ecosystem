from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from auth_system.core.passwords import hash_password, verify_password
from auth_system.models.user import User
from auth_system.models.admin import UserAdminProfile
from auth_system.repositories import users as user_repo
from auth_system.schemas.user import LoginRequest, RegisterRequest


def register_user(db: Session, payload: RegisterRequest) -> User:
    if user_repo.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")
    return user_repo.create_user(
        db,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        provider="email",
        role="user",
        is_verified=False,
    )


def authenticate_user(db: Session, payload: LoginRequest) -> User:
    user = user_repo.get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive.")
    profile = db.get(UserAdminProfile, user.id)
    if user.banned_at or user.suspended_at or profile and not profile.login_enabled:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account login is disabled.")
    return user_repo.mark_last_login(db, user)
