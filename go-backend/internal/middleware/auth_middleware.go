package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/config"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func AuthRequired(db *gorm.DB, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := ""
		if cookie, err := c.Cookie("access_token"); err == nil {
			token = cookie
		}
		if token == "" {
			auth := c.GetHeader("Authorization")
			if strings.HasPrefix(auth, "Bearer ") && !strings.HasPrefix(strings.TrimPrefix(auth, "Bearer "), "nstudio_live_") {
				token = strings.TrimPrefix(auth, "Bearer ")
			}
		}
		if token == "" {
			utils.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Please login again", nil)
			c.Abort()
			return
		}
		claims, err := utils.ParseJWT(cfg.JWTSecret, token, "access")
		if err != nil {
			utils.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Please login again", nil)
			c.Abort()
			return
		}
		var user models.User
		if err := db.Preload("Plan").First(&user, claims.UserID).Error; err != nil {
			utils.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Please login again", nil)
			c.Abort()
			return
		}
		user = ensureMonthlyCreditWindow(db, user)
		c.Set("user", user)
		c.Set("session_id", claims.SessionID)
		c.Next()
	}
}

func ensureMonthlyCreditWindow(db *gorm.DB, user models.User) models.User {
	now := time.Now()
	start := user.CreditPeriodStartedAt
	reset := user.CreditsResetAt
	updates := map[string]interface{}{}
	if start == nil || reset == nil {
		periodStart := now
		nextReset := now.AddDate(0, 1, 0)
		updates["credit_period_started_at"] = periodStart
		updates["credits_reset_at"] = nextReset
		user.CreditPeriodStartedAt = &periodStart
		user.CreditsResetAt = &nextReset
	} else if !now.Before(*reset) {
		periodStart := now
		nextReset := now.AddDate(0, 1, 0)
		updates["credits_used"] = 0
		updates["credit_period_started_at"] = periodStart
		updates["credits_reset_at"] = nextReset
		user.CreditsUsed = 0
		user.CreditPeriodStartedAt = &periodStart
		user.CreditsResetAt = &nextReset
	}
	if len(updates) > 0 {
		_ = db.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error
	}
	return user
}

func AuthOrExistingUser(db *gorm.DB, cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if _, ok := c.Get("user"); ok {
			c.Next()
			return
		}
		AuthRequired(db, cfg)(c)
	}
}

func CurrentUser(c *gin.Context) models.User {
	value, _ := c.Get("user")
	user, _ := value.(models.User)
	return user
}
