from __future__ import annotations

from fastapi import APIRouter, Depends

from auth_system.dependencies.auth import get_current_active_user, require_admin, require_roles
from auth_system.models.user import User
from auth_system.schemas.user import UserPublic

router = APIRouter(tags=["protected-examples"])


@router.get("/dashboard")
def dashboard(user: User = Depends(get_current_active_user)) -> dict[str, str]:
    return {"message": "Authenticated dashboard access.", "user_id": user.id}


@router.get("/admin/example", response_model=UserPublic)
def admin_example(admin: User = Depends(require_admin)) -> User:
    return admin


@router.get("/role-example")
def role_example(user: User = Depends(require_roles(["admin", "user"]))) -> dict[str, str]:
    return {"message": "Role accepted.", "role": user.role}
