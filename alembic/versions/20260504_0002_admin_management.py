"""admin management tables

Revision ID: 20260504_0002
Revises: 20260503_0001
Create Date: 2026-05-04
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260504_0002"
down_revision = "20260503_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("verification_status", sa.String(30), nullable=False, server_default="not_submitted"))
        batch.add_column(sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True))
        batch.add_column(sa.Column("banned_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "user_admin_profiles",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("plan", sa.String(40), nullable=False, server_default="Free"),
        sa.Column("account_status", sa.String(30), nullable=False, server_default="active"),
        sa.Column("login_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("credits_balance", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("monthly_credit_limit", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("monthly_request_limit", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("voice_clone_limit", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("max_text_length", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("api_access_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "api_access_settings",
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("monthly_limit", sa.Integer(), nullable=False, server_default="500"),
        sa.Column("daily_limit", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("rate_limit_per_minute", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("allowed_origins", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("allowed_ips", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("blocked_ips", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "credits_history",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("admin_id", sa.String(36), nullable=False),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(500), nullable=False),
        sa.Column("old_balance", sa.Integer(), nullable=False),
        sa.Column("new_balance", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_credits_history_user_id", "credits_history", ["user_id"])
    op.create_table(
        "purchases",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("plan", sa.String(40), nullable=False, server_default="Free"),
        sa.Column("amount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("credits_added", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payment_method", sa.String(80), nullable=False, server_default="manual"),
        sa.Column("invoice", sa.String(120), nullable=True),
        sa.Column("admin_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_purchases_user_id", "purchases", ["user_id"])
    op.create_table(
        "voice_clones",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("filename", sa.String(1000), nullable=False),
        sa.Column("voice_name", sa.String(180), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("consent", sa.String(40), nullable=False, server_default="confirmed"),
        sa.Column("identity", sa.String(40), nullable=False, server_default="unverified"),
        sa.Column("unsafe", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("moderation_notes", sa.Text(), nullable=True),
        sa.Column("verification_id", sa.String(36), nullable=True),
        sa.Column("consent_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consent_ip", sa.String(80), nullable=True),
        sa.Column("risk_status", sa.String(30), nullable=False, server_default="normal"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_voice_clones_user_id", "voice_clones", ["user_id"])
    op.create_table(
        "user_sessions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("ip_address", sa.String(80), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])
    op.create_table(
        "admin_notes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("admin_id", sa.String(36), nullable=False),
        sa.Column("target_type", sa.String(60), nullable=False),
        sa.Column("target_id", sa.String(120), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("admin_id", sa.String(36), nullable=False),
        sa.Column("action_type", sa.String(100), nullable=False),
        sa.Column("target_type", sa.String(60), nullable=False),
        sa.Column("target_id", sa.String(120), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(80), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "identity_verifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("legal_name", sa.String(180), nullable=False),
        sa.Column("date_of_birth", sa.String(20), nullable=False),
        sa.Column("country", sa.String(120), nullable=False),
        sa.Column("document_type", sa.String(40), nullable=False),
        sa.Column("document_number", sa.String(120), nullable=False),
        sa.Column("document_front", sa.String(1000), nullable=False),
        sa.Column("document_back", sa.String(1000), nullable=True),
        sa.Column("selfie", sa.String(1000), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending_review"),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("internal_note", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.String(36), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_identity_verifications_user_id", "identity_verifications", ["user_id"])
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("type", sa.String(40), nullable=False, server_default="info"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_table(
        "email_logs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("subject", sa.String(300), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="logged"),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_email_logs_user_id", "email_logs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_email_logs_user_id", table_name="email_logs")
    op.drop_table("email_logs")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.drop_index("ix_identity_verifications_user_id", table_name="identity_verifications")
    op.drop_table("identity_verifications")
    op.drop_table("audit_logs")
    op.drop_table("admin_notes")
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_index("ix_voice_clones_user_id", table_name="voice_clones")
    op.drop_table("voice_clones")
    op.drop_index("ix_purchases_user_id", table_name="purchases")
    op.drop_table("purchases")
    op.drop_index("ix_credits_history_user_id", table_name="credits_history")
    op.drop_table("credits_history")
    op.drop_table("api_access_settings")
    op.drop_table("user_admin_profiles")
    with op.batch_alter_table("users") as batch:
        batch.drop_column("banned_at")
        batch.drop_column("suspended_at")
        batch.drop_column("verification_status")
