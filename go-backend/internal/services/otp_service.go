package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

type OTPService struct {
	db    *gorm.DB
	redis *redis.Client
	email *EmailService
}

func NewOTPService(db *gorm.DB, redis *redis.Client, email *EmailService) *OTPService {
	return &OTPService{db: db, redis: redis, email: email}
}

func (s *OTPService) Send(user models.User, typ string) error {
	ctx := context.Background()
	if s.redis != nil {
		cooldownKey := fmt.Sprintf("otp_resend:%s:%d", typ, user.ID)
		ok, err := s.redis.SetNX(ctx, cooldownKey, "1", time.Minute).Result()
		if err == nil && !ok {
			return errors.New("please wait before requesting another code")
		}
	}
	code, err := utils.OTPCode()
	if err != nil {
		return err
	}
	hash := utils.HashToken(code)
	expires := time.Now().Add(10 * time.Minute)
	record := models.VerificationCode{UserID: user.ID, Email: user.Email, CodeHash: hash, Type: typ, ExpiresAt: expires}
	if err := s.db.Create(&record).Error; err != nil {
		return err
	}
	if s.redis != nil {
		key := fmt.Sprintf("otp:%s:%d", typ, user.ID)
		_ = s.redis.Set(ctx, key, hash, 10*time.Minute).Err()
	}
	s.email.SendOTP(user.Email, code, typ)
	return nil
}

func (s *OTPService) Verify(user models.User, typ, code string) error {
	ctx := context.Background()
	attemptKey := fmt.Sprintf("otp_attempts:%s:%d", typ, user.ID)
	if s.redis != nil {
		attempts, _ := s.redis.Incr(ctx, attemptKey).Result()
		_ = s.redis.Expire(ctx, attemptKey, 10*time.Minute).Err()
		if attempts > 5 {
			return errors.New("too many attempts")
		}
	}
	hash := utils.HashToken(code)
	if s.redis != nil {
		key := fmt.Sprintf("otp:%s:%d", typ, user.ID)
		cached, _ := s.redis.Get(ctx, key).Result()
		if cached != "" && cached != hash {
			return errors.New("invalid code")
		}
	}
	var record models.VerificationCode
	err := s.db.Where("user_id = ? AND type = ? AND used_at IS NULL", user.ID, typ).Order("id desc").First(&record).Error
	if err != nil {
		return errors.New("code not found")
	}
	if time.Now().After(record.ExpiresAt) {
		return errors.New("code expired")
	}
	record.Attempts++
	if record.Attempts > 5 {
		_ = s.db.Save(&record).Error
		return errors.New("too many attempts")
	}
	if record.CodeHash != hash {
		_ = s.db.Save(&record).Error
		return errors.New("invalid code")
	}
	now := time.Now()
	record.UsedAt = &now
	return s.db.Save(&record).Error
}
