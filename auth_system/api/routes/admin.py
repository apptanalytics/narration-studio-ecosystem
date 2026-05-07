from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth_system.core.database import get_db
from auth_system.dependencies.auth import require_admin
from auth_system.models.user import User
from auth_system.repositories import users as user_repo
from auth_system.schemas.user import RoleUpdateRequest, StatusUpdateRequest, UserPublic

router = APIRouter(prefix="/admin", tags=["admin-auth"])


@router.get("/users", response_model=list[UserPublic])
def list_admin_users(_admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[User]:
    return user_repo.list_users(db)


@router.get("/users/{user_id}", response_model=UserPublic)
def get_admin_user(user_id: str, _admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> User:
    user = user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.patch("/users/{user_id}/role", response_model=UserPublic)
def update_user_role(
    user_id: str,
    payload: RoleUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> User:
    user = user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    protected_roles = {"admin", "super_admin"}
    if (user.role in protected_roles or payload.role in protected_roles) and admin.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only super_admin can manage admin roles.")
    user.role = payload.role
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/status", response_model=UserPublic)
def update_user_status(
    user_id: str,
    payload: StatusUpdateRequest,
    _admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> User:
    user = user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = payload.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{user_id}", response_model=UserPublic)
def deactivate_user(user_id: str, _admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> User:
    user = user_repo.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.role in {"admin", "super_admin"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin users must be demoted before deletion.")
    user.is_active = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
