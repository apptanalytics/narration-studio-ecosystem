package handlers

import (
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/config"
	"nstudio/go-backend/internal/services"
)

type App struct {
	DB       *gorm.DB
	Redis    *redis.Client
	Cfg      config.Config
	Auth     *services.AuthService
	OTP      *services.OTPService
	Email    *services.EmailService
	TOTP     *services.TOTPService
	Queue    *services.QueueService
	Notify   *services.NotificationService
	Webhooks *services.WebhookService
	Audit    *services.AuditService
}

func NewApp(db *gorm.DB, redis *redis.Client, cfg config.Config) *App {
	email := services.NewEmailService(cfg)
	notify := services.NewNotificationService(db)
	webhooks := services.NewWebhookService(db)
	return &App{
		DB:       db,
		Redis:    redis,
		Cfg:      cfg,
		Auth:     services.NewAuthService(db, redis, cfg),
		OTP:      services.NewOTPService(db, redis, email),
		Email:    email,
		TOTP:     services.NewTOTPService(),
		Notify:   notify,
		Webhooks: webhooks,
		Audit:    services.NewAuditService(db),
		Queue:    services.NewQueueService(db, redis, cfg, notify, webhooks),
	}
}
