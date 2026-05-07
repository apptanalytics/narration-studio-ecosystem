from __future__ import annotations

import hashlib
import hmac
import json
import mimetypes
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth_system.core.brand import BRAND_NAME
from auth_system.core.config import get_settings
from auth_system.core.database import get_db
from auth_system.dependencies.auth import get_current_active_user, require_admin
from auth_system.models.admin import AuditLog, EmailLog, IdentityVerification, Notification
from auth_system.models.user import User

router = APIRouter(tags=["verification"])

SECURE_ROOT = Path(__file__).resolve().parents[3] / "reader_outputs" / "secure_verifications"
ALLOWED_TYPES = {"image/jpeg", "image/png", "application/pdf"}
MAX_FILE_BYTES = 10 * 1024 * 1024
DOCUMENT_TYPES = {"National ID card", "Passport", "Driver license"}


def _json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def _audit(db: Session, request: Request, admin_id: str, action: str, target_type: str, target_id: str, old: object = None, new: object = None) -> None:
    db.add(AuditLog(
        id=str(uuid4()),
        admin_id=admin_id,
        action_type=action,
        target_type=target_type,
        target_id=target_id,
        old_value=None if old is None else _json(old),
        new_value=None if new is None else _json(new),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    ))


def _notify(db: Session, user_id: str, title: str, message: str, kind: str = "verification") -> None:
    db.add(Notification(id=str(uuid4()), user_id=user_id, title=title, message=message, type=kind))


def _email_log(db: Session, user: User, subject: str, body: str) -> None:
    db.add(EmailLog(id=str(uuid4()), user_id=user.id, subject=subject, body=body, status="logged"))


def _sign(path: str, expires: int) -> str:
    secret = get_settings().jwt_secret_key.encode("utf-8")
    payload = f"{path}.{expires}".encode("utf-8")
    return hmac.new(secret, payload, hashlib.sha256).hexdigest()


def _signed_url(path: str) -> str:
    expires = int(time.time()) + 300
    token = f"{expires}.{_sign(path, expires)}"
    return f"/api/admin/verifications/file?path={path}&token={token}"


def _verify_token(path: str, token: str) -> None:
    try:
      expires_raw, signature = token.split(".", 1)
      expires = int(expires_raw)
    except ValueError as exc:
      raise HTTPException(status_code=403, detail="Invalid file token.") from exc
    if expires < int(time.time()):
        raise HTTPException(status_code=403, detail="File token expired.")
    if not hmac.compare_digest(signature, _sign(path, expires)):
        raise HTTPException(status_code=403, detail="Invalid file token.")


async def _save_upload(user_id: str, upload: UploadFile, slot: str) -> str:
    if upload.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and PDF files are supported.")
    data = await upload.read()
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="Verification files must be 10MB or smaller.")
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".pdf"}:
        suffix = mimetypes.guess_extension(upload.content_type or "") or ".bin"
    relative = f"{user_id}/{slot}-{secrets.token_hex(12)}{suffix}"
    target = SECURE_ROOT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return relative


def _verification_payload(item: IdentityVerification | None) -> dict[str, object]:
    if not item:
        return {"status": "not_submitted", "submission": None}
    return {
        "status": item.status,
        "submission": {
            "id": item.id,
            "legal_name": item.legal_name,
            "date_of_birth": item.date_of_birth,
            "country": item.country,
            "document_type": item.document_type,
            "document_number": item.document_number,
            "status": item.status,
            "rejection_reason": item.rejection_reason,
            "internal_note": item.internal_note,
            "reviewed_by": item.reviewed_by,
            "reviewed_at": item.reviewed_at,
            "created_at": item.created_at,
            "document_front_url": _signed_url(item.document_front),
            "document_back_url": _signed_url(item.document_back) if item.document_back else None,
            "selfie_url": _signed_url(item.selfie),
        },
    }


@router.get("/api/verification/status")
def verification_status(user: User = Depends(get_current_active_user), db: Session = Depends(get_db)) -> dict[str, object]:
    item = db.scalar(select(IdentityVerification).where(IdentityVerification.user_id == user.id).order_by(IdentityVerification.created_at.desc()))
    payload = _verification_payload(item)
    payload["user_status"] = user.verification_status
    return payload


@router.post("/api/verification/submit")
async def submit_verification(
    request: Request,
    legal_name: str = Form(...),
    date_of_birth: str = Form(...),
    country: str = Form(...),
    document_type: str = Form(...),
    document_number: str = Form(...),
    document_front: UploadFile = File(...),
    selfie: UploadFile = File(...),
    document_back: UploadFile | None = File(None),
    user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported document type.")
    front_path = await _save_upload(user.id, document_front, "front")
    back_path = await _save_upload(user.id, document_back, "back") if document_back else None
    selfie_path = await _save_upload(user.id, selfie, "selfie")
    item = IdentityVerification(
        id=str(uuid4()),
        user_id=user.id,
        legal_name=legal_name,
        date_of_birth=date_of_birth,
        country=country,
        document_type=document_type,
        document_number=document_number,
        document_front=front_path,
        document_back=back_path,
        selfie=selfie_path,
        status="pending_review",
    )
    user.verification_status = "pending_review"
    db.add(item)
    db.add(user)
    _audit(db, request, user.id, "USER_SUBMITTED_VERIFICATION", "identity_verification", item.id, None, {"status": "pending_review"})
    db.commit()
    return _verification_payload(item)


@router.get("/api/notifications")
def list_notifications(user: User = Depends(get_current_active_user), db: Session = Depends(get_db)) -> dict[str, object]:
    items = list(db.scalars(select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc()).limit(50)))
    return {"notifications": items, "unread": sum(1 for item in items if not item.is_read)}


@router.post("/api/notifications/read")
def mark_notifications_read(user: User = Depends(get_current_active_user), db: Session = Depends(get_db)) -> dict[str, bool]:
    items = list(db.scalars(select(Notification).where(Notification.user_id == user.id, Notification.is_read == False)))  # noqa: E712
    for item in items:
        item.is_read = True
        db.add(item)
    db.commit()
    return {"success": True}


@router.get("/api/admin/verifications")
@router.get("/admin/verifications")
def admin_list_verifications(_admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, object]:
    rows = []
    items = list(db.scalars(select(IdentityVerification).order_by(IdentityVerification.created_at.desc())))
    for item in items:
        user = db.get(User, item.user_id)
        payload = _verification_payload(item)["submission"]
        rows.append({**payload, "user": user.email if user else item.user_id, "user_id": item.user_id})
    return {"items": rows}


@router.get("/api/admin/verifications/{verification_id}")
@router.get("/admin/verifications/{verification_id}")
def admin_get_verification(verification_id: str, _admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, object]:
    item = db.get(IdentityVerification, verification_id)
    if not item:
        raise HTTPException(status_code=404, detail="Verification not found.")
    user = db.get(User, item.user_id)
    return {"verification": _verification_payload(item)["submission"], "user": {"id": user.id, "email": user.email, "full_name": user.full_name} if user else None}


@router.get("/api/admin/verifications/file")
@router.get("/admin/verifications/file")
def admin_file(path: str, token: str, _admin: User = Depends(require_admin)) -> FileResponse:
    _verify_token(path, token)
    target = (SECURE_ROOT / path).resolve()
    if not str(target).startswith(str(SECURE_ROOT.resolve())) or not target.exists():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(target)


@router.post("/api/admin/verifications/approve")
@router.post("/admin/verifications/approve")
def admin_approve(payload: dict[str, str], request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, object]:
    item = db.get(IdentityVerification, payload.get("id", ""))
    if not item:
        raise HTTPException(status_code=404, detail="Verification not found.")
    user = db.get(User, item.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    old = {"status": item.status}
    item.status = "verified"
    item.reviewed_by = admin.id
    item.reviewed_at = datetime.now(timezone.utc)
    user.verification_status = "verified"
    subject = "Your identity verification has been approved"
    body = f"Hi {user.full_name or user.email},\n\nYour identity verification has been approved.\n\nYou can now create voice clones from your dashboard on {BRAND_NAME}.\n\nThank you,\n{BRAND_NAME} Team"
    _email_log(db, user, subject, body)
    _notify(db, user.id, subject, f"You can now create voice clones from your dashboard on {BRAND_NAME}.")
    _audit(db, request, admin.id, "ADMIN_APPROVED_VERIFICATION", "identity_verification", item.id, old, {"status": "verified"})
    _audit(db, request, admin.id, "VERIFICATION_EMAIL_SENT", "email", user.id, None, {"subject": subject})
    _audit(db, request, admin.id, "USER_NOTIFICATION_CREATED", "notification", user.id, None, {"title": subject})
    db.commit()
    return _verification_payload(item)


@router.post("/api/admin/verifications/reject")
@router.post("/admin/verifications/reject")
def admin_reject(payload: dict[str, str], request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, object]:
    item = db.get(IdentityVerification, payload.get("id", ""))
    reason = payload.get("reason") or "Verification requirements were not met."
    if not item:
        raise HTTPException(status_code=404, detail="Verification not found.")
    user = db.get(User, item.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    old = {"status": item.status}
    item.status = "rejected"
    item.rejection_reason = reason
    item.reviewed_by = admin.id
    item.reviewed_at = datetime.now(timezone.utc)
    user.verification_status = "rejected"
    subject = "Your identity verification was not approved"
    body = f"Hi {user.full_name or user.email},\n\nYour identity verification was not approved.\n\nReason: {reason}\n\nPlease resubmit your verification.\n\nThank you,\n{BRAND_NAME} Team"
    _email_log(db, user, subject, body)
    _notify(db, user.id, subject, f"Reason: {reason}. Please resubmit your verification.", "warning")
    _audit(db, request, admin.id, "ADMIN_REJECTED_VERIFICATION", "identity_verification", item.id, old, {"status": "rejected", "reason": reason})
    _audit(db, request, admin.id, "VERIFICATION_EMAIL_SENT", "email", user.id, None, {"subject": subject})
    _audit(db, request, admin.id, "USER_NOTIFICATION_CREATED", "notification", user.id, None, {"title": subject})
    db.commit()
    return _verification_payload(item)


@router.post("/api/admin/verifications/suspicious")
@router.post("/admin/verifications/suspicious")
def admin_suspicious(payload: dict[str, str], request: Request, admin: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, object]:
    item = db.get(IdentityVerification, payload.get("id", ""))
    if not item:
        raise HTTPException(status_code=404, detail="Verification not found.")
    user = db.get(User, item.user_id)
    old = {"status": item.status}
    item.status = "suspicious"
    item.internal_note = payload.get("note") or item.internal_note
    item.reviewed_by = admin.id
    item.reviewed_at = datetime.now(timezone.utc)
    if user:
        user.verification_status = "suspicious"
        db.add(user)
    _audit(db, request, admin.id, "ADMIN_MARKED_SUSPICIOUS", "identity_verification", item.id, old, {"status": "suspicious", "note": item.internal_note})
    db.add(item)
    db.commit()
    return _verification_payload(item)
