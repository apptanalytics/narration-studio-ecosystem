package database

import (
	"context"
	"errors"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/config"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

type Store struct {
	DB    *gorm.DB
	Redis *redis.Client
}

func Connect(cfg config.Config) (*Store, error) {
	db, err := openDB(cfg)
	if err != nil {
		return nil, err
	}
	if err := migrate(db); err != nil {
		return nil, err
	}
	if err := seedPlans(db); err != nil {
		return nil, err
	}
	if err := seedAdmin(db, cfg); err != nil {
		return nil, err
	}
	return &Store{DB: db, Redis: connectRedis(cfg)}, nil
}

func seedAdmin(db *gorm.DB, cfg config.Config) error {
	if cfg.AdminEmail == "" || cfg.AdminPassword == "" {
		return nil
	}
	var existing models.User
	err := db.Where("email = ?", cfg.AdminEmail).First(&existing).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	hash, err := utils.HashPassword(cfg.AdminPassword)
	if err != nil {
		return err
	}
	admin := models.User{
		Name:             "Narration Studio Admin",
		Email:            cfg.AdminEmail,
		PasswordHash:     hash,
		Role:             "admin",
		Status:           "active",
		EmailVerified:    true,
		AdminVerified:    true,
		Provider:         "email",
		CreditsTotal:     600000,
		APIAccessEnabled: true,
		VoiceCloneLimit:  -1,
	}
	return db.Create(&admin).Error
}

func openDB(cfg config.Config) (*gorm.DB, error) {
	if cfg.DatabaseDriver == "postgres" {
		return gorm.Open(postgres.Open(cfg.DatabaseDSN), &gorm.Config{})
	}
	if err := os.MkdirAll(filepath.Dir(cfg.DatabaseDSN), 0755); err != nil {
		return nil, err
	}
	return gorm.Open(sqlite.Open(cfg.DatabaseDSN), &gorm.Config{})
}

func migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.PricingPlan{},
		&models.User{},
		&models.UserSession{},
		&models.VerificationCode{},
		&models.APIKey{},
		&models.UsageLog{},
		&models.GenerationJob{},
		&models.GenerationChunk{},
		&models.IdentityVerification{},
		&models.VoiceClone{},
		&models.Notification{},
		&models.Webhook{},
		&models.AuditLog{},
		&models.AppSetting{},
	)
}

func connectRedis(cfg config.Config) *redis.Client {
	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Printf("redis disabled: %v", err)
		return nil
	}
	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("redis unavailable; using in-memory fallbacks: %v", err)
		return nil
	}
	return client
}

func seedPlans(db *gorm.DB) error {
	plans := []models.PricingPlan{
		{Name: "Free", Slug: "free", PriceMonthly: 0, Credits: 5000, APIRequestsLimit: 500, APIAccessEnabled: true, VoiceCount: 5, VoiceCloneLimit: 5, MaxTextChars: 20000, FeaturesJSON: `["5,000 credits","500 API requests/month","5 voices","5 voice clones"]`, SortOrder: 1, IsActive: true},
		{Name: "Basic", Slug: "basic", PriceMonthly: 2.99, Credits: 30000, APIRequestsLimit: 10000, APIAccessEnabled: true, VoiceCount: 15, VoiceCloneLimit: 10, MaxTextChars: 60000, FeaturesJSON: `["30,000 credits","10,000 API requests/month","15 voices","10 voice clones"]`, SortOrder: 2, IsActive: true},
		{Name: "Starter", Slug: "starter", PriceMonthly: 6.99, Credits: 70000, APIRequestsLimit: 50000, APIAccessEnabled: true, VoiceCount: 30, VoiceCloneLimit: 20, MaxTextChars: 120000, FeaturesJSON: `["70,000 credits","50,000 API requests/month","30 voices","20 voice clones"]`, SortOrder: 3, IsActive: true},
		{Name: "Studio", Slug: "studio", PriceMonthly: 11.99, Credits: 150000, APIRequestsLimit: 150000, APIAccessEnabled: true, VoiceCount: -1, VoiceCloneLimit: -1, MaxTextChars: 300000, FeaturesJSON: `["150,000 credits","150,000 API requests/month","Unlimited voices","Unlimited voice cloning"]`, IsPopular: true, SortOrder: 4, IsActive: true},
		{Name: "Studio Max", Slug: "studio-max", PriceMonthly: 49.99, Credits: 600000, APIRequestsLimit: 500000, APIAccessEnabled: true, VoiceCount: -1, VoiceCloneLimit: -1, MaxTextChars: 750000, FeaturesJSON: `["600,000 credits","500,000 API requests/month","Unlimited voices","Unlimited voice cloning"]`, SortOrder: 5, IsActive: true},
		{Name: "Student", Slug: "student", PriceMonthly: 1.99, Credits: 30000, APIRequestsLimit: 10000, APIAccessEnabled: true, VoiceCount: 15, VoiceCloneLimit: 10, MaxTextChars: 60000, FeaturesJSON: `["1 month access","Basic-like features","10,000 API requests/month","requires student verification"]`, IsStudent: true, SortOrder: 6, IsActive: true},
	}
	for _, plan := range plans {
		var existing models.PricingPlan
		err := db.Where("slug = ?", plan.Slug).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := db.Create(&plan).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else if existing.ID != 0 {
			plan.ID = existing.ID
			plan.CreatedAt = existing.CreatedAt
			if err := db.Model(&existing).Updates(map[string]interface{}{
				"name":               plan.Name,
				"price_monthly":      plan.PriceMonthly,
				"credits":            plan.Credits,
				"api_requests_limit": plan.APIRequestsLimit,
				"api_access_enabled": plan.APIAccessEnabled,
				"voice_count":        plan.VoiceCount,
				"voice_clone_limit":  plan.VoiceCloneLimit,
				"max_text_chars":     plan.MaxTextChars,
				"features_json":      plan.FeaturesJSON,
				"is_popular":         plan.IsPopular,
				"is_student":         plan.IsStudent,
				"is_active":          plan.IsActive,
				"sort_order":         plan.SortOrder,
			}).Error; err != nil {
				return err
			}
		}
	}
	return nil
}
