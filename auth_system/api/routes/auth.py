from __future__ import annotations

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from auth_system.core.config import get_settings
from auth_system.core.cookies import REFRESH_COOKIE, clear_auth_cookies, set_access_cookie, set_auth_cookies
from auth_system.core.database import get_db
from auth_system.core.jwt import create_access_token, create_refresh_token, decode_token
from auth_system.dependencies.auth import get_current_active_user
from auth_system.models.user import User
from auth_system.repositories.users import get_user_by_id
from auth_system.schemas.user import AuthResponse, LoginRequest, RefreshResponse, RegisterRequest, UserPublic
from auth_system.services.auth_service import authenticate_user, register_user
from auth_system.services.google_oauth import build_google_login_url, consume_google_callback

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> dict[str, User]:
    user = register_user(db, payload)
    return {"user": user}


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> dict[str, User]:
    user = authenticate_user(db, payload)
    set_auth_cookies(response, create_access_token(user), create_refresh_token(user))
    return {"user": user}


@router.get("/google/login")
def google_login(response: Response) -> RedirectResponse:
    redirect = RedirectResponse(build_google_login_url(response), status_code=302)
    for header in response.raw_headers:
        redirect.raw_headers.append(header)
    return redirect


@router.get("/google/callback")
def google_callback(request: Request, response: Response, code: str, state: str, db: Session = Depends(get_db)) -> RedirectResponse:
    user = consume_google_callback(db, request, code, state)
    redirect = RedirectResponse(f"{get_settings().frontend_url}/dashboard/generate", status_code=302)
    set_auth_cookies(redirect, create_access_token(user), create_refresh_token(user))
    redirect.delete_cookie("google_oauth_state", path="/")
    return redirect


@router.post("/refresh", response_model=RefreshResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> dict[str, bool]:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token.")
    try:
        payload = decode_token(token, "refresh")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.") from exc
    user = get_user_by_id(db, str(payload.get("sub") or ""))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")
    set_access_cookie(response, create_access_token(user))
    return {"success": True}


@router.post("/logout", response_model=RefreshResponse)
def logout(response: Response) -> dict[str, bool]:
    clear_auth_cookies(response)
    return {"success": True}


@router.get("/me", response_model=UserPublic)
def me(user: User = Depends(get_current_active_user)) -> User:
    return user
