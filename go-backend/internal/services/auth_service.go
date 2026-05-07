package services

import (
	"context"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/config"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

type AuthService struct {
	db    *gorm.DB
	redis *redis.Client
	cfg   config.Config
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	Session      models.UserSession
}

func NewAuthService(db *gorm.DB, redis *redis.Client, cfg config.Config) *AuthService {
	return &AuthService{db: db, redis: redis, cfg: cfg}
}

func (s *AuthService) CreateSession(user models.User, ip, userAgent string) (TokenPair, error) {
	sessionID, err := utils.RandomHex(16)
	if err != nil {
		return TokenPair{}, err
	}
	access, _, _, err := utils.SignJWT(s.cfg.JWTSecret, user.ID, sessionID, "access", time.Duration(s.cfg.AccessTokenMinutes)*time.Minute)
	if err != nil {
		return TokenPair{}, err
	}
	refresh, refreshJTI, refreshExpires, err := utils.SignJWT(s.cfg.JWTSecret, user.ID, sessionID, "refresh", time.Duration(s.cfg.RefreshTokenDays)*24*time.Hour)
	if err != nil {
		return TokenPair{}, err
	}
	now := time.Now()
	session := models.UserSession{
		UserID:           user.ID,
		SessionID:        sessionID,
		RefreshTokenHash: utils.HashToken(refresh),
		RefreshJTI:       refreshJTI,
		DeviceName:       "Web",
		IPAddress:        ip,
		UserAgent:        userAgent,
		IsActive:         true,
		ExpiresAt:        refreshExpires,
		LastUsedAt:       now,
	}
	if err := s.db.Create(&session).Error; err != nil {
		return TokenPair{}, err
	}
	if s.redis != nil {
		_ = s.redis.Set(context.Background(), "session:"+sessionID, user.ID, time.Until(refreshExpires)).Err()
	}
	return TokenPair{AccessToken: access, RefreshToken: refresh, Session: session}, nil
}

func (s *AuthService) Refresh(oldRefresh string) (TokenPair, error) {
	claims, err := utils.ParseJWT(s.cfg.JWTSecret, oldRefresh, "refresh")
	if err != nil {
		return TokenPair{}, err
	}
	ctx := context.Background()
	if s.redis != nil {
		if exists, _ := s.redis.Exists(ctx, "blacklist:refresh:"+claims.ID).Result(); exists > 0 {
			_ = s.RevokeSession(claims.SessionID)
			return TokenPair{}, errors.New("refresh token reused")
		}
	}
	var session models.UserSession
	if err := s.db.Where("session_id = ? AND is_active = ?", claims.SessionID, true).First(&session).Error; err != nil {
		return TokenPair{}, err
	}
	if session.RefreshTokenHash != utils.HashToken(oldRefresh) || time.Now().After(session.ExpiresAt) {
		_ = s.RevokeSession(claims.SessionID)
		return TokenPair{}, errors.New("invalid refresh token")
	}
	var user models.User
	if err := s.db.First(&user, session.UserID).Error; err != nil {
		return TokenPair{}, err
	}
	access, _, _, err := utils.SignJWT(s.cfg.JWTSecret, user.ID, session.SessionID, "access", time.Duration(s.cfg.AccessTokenMinutes)*time.Minute)
	if err != nil {
		return TokenPair{}, err
	}
	refresh, refreshJTI, refreshExpires, err := utils.SignJWT(s.cfg.JWTSecret, user.ID, session.SessionID, "refresh", time.Duration(s.cfg.RefreshTokenDays)*24*time.Hour)
	if err != nil {
		return TokenPair{}, err
	}
	if s.redis != nil {
		_ = s.redis.Set(ctx, "blacklist:refresh:"+claims.ID, "1", time.Until(claims.ExpiresAt.Time)).Err()
	}
	session.RefreshTokenHash = utils.HashToken(refresh)
	session.RefreshJTI = refreshJTI
	session.ExpiresAt = refreshExpires
	session.LastUsedAt = time.Now()
	if err := s.db.Save(&session).Error; err != nil {
		return TokenPair{}, err
	}
	return TokenPair{AccessToken: access, RefreshToken: refresh, Session: session}, nil
}

func (s *AuthService) RevokeSession(sessionID string) error {
	now := time.Now()
	return s.db.Model(&models.UserSession{}).Where("session_id = ?", sessionID).Updates(map[string]interface{}{"is_active": false, "revoked_at": now}).Error
}

func (s *AuthService) RevokeAll(userID uint) error {
	now := time.Now()
	return s.db.Model(&models.UserSession{}).Where("user_id = ? AND is_active = ?", userID, true).Updates(map[string]interface{}{"is_active": false, "revoked_at": now}).Error
}
