from __future__ import annotations

import secrets
from urllib.parse import urlencode

import requests
from fastapi import HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from auth_system.core.config import get_settings
from auth_system.repositories import users as user_repo

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
STATE_COOKIE = "google_oauth_state"


def build_google_login_url(response: Response) -> str:
    settings = get_settings()
    if not settings.google_client_id or not settings.google_redirect_uri:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured.")
    state = secrets.token_urlsafe(32)
    response.set_cookie(
        STATE_COOKIE,
        state,
        max_age=600,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/",
    )
    query = urlencode(
        {
            "client_id": settings.google_client_id,
            "redirect_uri": settings.google_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
            "prompt": "select_account",
        }
    )
    return f"{GOOGLE_AUTH_URL}?{query}"


def consume_google_callback(db: Session, request: Request, code: str, state: str):
    settings = get_settings()
    cookie_state = request.cookies.get(STATE_COOKIE)
    if not cookie_state or not secrets.compare_digest(cookie_state, state):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Google OAuth state.")
    token_response = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
            "code": code,
        },
        timeout=10,
    )
    if token_response.status_code >= 400:
        raise HTTPException(status_code=400, detail="Google token exchange failed.")
    access_token = token_response.json().get("access_token")
    userinfo_response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if userinfo_response.status_code >= 400:
        raise HTTPException(status_code=400, detail="Google user verification failed.")
    profile = userinfo_response.json()
    email = str(profile.get("email") or "").lower()
    google_id = str(profile.get("sub") or "")
    if not email or not google_id:
        raise HTTPException(status_code=400, detail="Google profile is missing email or subject.")

    user = user_repo.get_user_by_google_id(db, google_id) or user_repo.get_user_by_email(db, email)
    if user:
        user = user_repo.link_google_user(
            db,
            user,
            google_id=google_id,
            avatar_url=profile.get("picture"),
            full_name=profile.get("name"),
        )
    else:
        user = user_repo.create_user(
            db,
            email=email,
            full_name=profile.get("name"),
            password_hash=None,
            provider="google",
            google_id=google_id,
            avatar_url=profile.get("picture"),
            role="user",
            is_verified=bool(profile.get("email_verified", True)),
        )
    return user_repo.mark_last_login(db, user)
