from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

UserRole = Literal["user", "creator", "developer", "support", "admin", "super_admin"]
PlanName = Literal["Free", "Starter", "Pro", "Studio", "Studio Max", "Enterprise"]


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    provider: str
    google_id: str | None = None
    role: UserRole
    is_active: bool
    is_verified: bool
    verification_status: str = "not_submitted"
    created_at: datetime
    updated_at: datetime
    last_login_at: datetime | None = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=180)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class RoleUpdateRequest(BaseModel):
    role: UserRole


class StatusUpdateRequest(BaseModel):
    is_active: bool


class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=180)
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = "user"
    plan: PlanName = "Free"
    is_verified: bool = True


class AdminUserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=180)
    email: EmailStr | None = None
    role: UserRole | None = None
    plan: PlanName | None = None
    account_status: Literal["active", "suspended", "banned", "locked"] | None = None
    is_active: bool | None = None
    is_verified: bool | None = None
    login_enabled: bool | None = None


class CreditAdjustmentRequest(BaseModel):
    amount: int
    reason: str = Field(..., min_length=1, max_length=500)


class ApiAccessUpdateRequest(BaseModel):
    enabled: bool | None = None
    monthly_limit: int | None = Field(default=None, ge=0)
    daily_limit: int | None = Field(default=None, ge=0)
    rate_limit_per_minute: int | None = Field(default=None, ge=0)
    allowed_origins: list[str] | None = None
    allowed_ips: list[str] | None = None
    blocked_ips: list[str] | None = None


class PurchaseRequest(BaseModel):
    user_id: str | None = None
    plan: PlanName = "Free"
    amount_cents: int = Field(default=0, ge=0)
    status: Literal["pending", "paid", "failed", "refunded", "cancelled"] = "pending"
    credits_added: int = Field(default=0, ge=0)
    payment_method: str = Field(default="manual", max_length=80)
    invoice: str | None = Field(default=None, max_length=120)
    admin_note: str | None = None


class PurchaseUpdateRequest(BaseModel):
    user_id: str | None = None
    plan: PlanName | None = None
    amount_cents: int | None = Field(default=None, ge=0)
    status: Literal["pending", "paid", "failed", "refunded", "cancelled"] | None = None
    credits_added: int | None = Field(default=None, ge=0)
    payment_method: str | None = Field(default=None, max_length=80)
    invoice: str | None = Field(default=None, max_length=120)
    admin_note: str | None = None


class VoiceCloneUpdateRequest(BaseModel):
    status: Literal["pending", "approved", "rejected", "disabled", "unsafe"] | None = None
    enabled: bool | None = None
    unsafe: bool | None = None
    moderation_notes: str | None = None


class AdminNoteRequest(BaseModel):
    note: str = Field(..., min_length=1)


class AuthResponse(BaseModel):
    user: UserPublic


class RefreshResponse(BaseModel):
    success: bool = True
