from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


class Settings:
    repo_root = Path(__file__).resolve().parents[2]
    database_url: str = os.environ.get("DATABASE_URL", f"sqlite:///{repo_root / 'reader_outputs' / 'auth.db'}")
    jwt_secret_key: str = os.environ.get("JWT_SECRET_KEY", "change-me-before-production-with-at-least-32-bytes")
    jwt_algorithm: str = os.environ.get("JWT_ALGORITHM", "HS256")
    access_token_minutes: int = int(os.environ.get("JWT_ACCESS_TOKEN_MINUTES", "15"))
    refresh_token_days: int = int(os.environ.get("JWT_REFRESH_TOKEN_DAYS", "7"))
    frontend_url: str = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    app_env: str = os.environ.get("APP_ENV", os.environ.get("ENV", "development")).lower()
    google_client_id: str = os.environ.get("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.environ.get("GOOGLE_REDIRECT_URI", "")
    cookie_domain: str | None = os.environ.get("AUTH_COOKIE_DOMAIN") or None

    @property
    def secure_cookies(self) -> bool:
        return self.app_env in {"production", "prod"} or self.frontend_url.startswith("https://")


@lru_cache
def get_settings() -> Settings:
    return Settings()
