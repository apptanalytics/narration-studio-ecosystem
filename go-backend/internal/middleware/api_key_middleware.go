package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func APIKeyOptional(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if !strings.HasPrefix(auth, "Bearer nstudio_live_") {
			c.Next()
			return
		}
		raw := strings.TrimPrefix(auth, "Bearer ")
		var key models.APIKey
		if err := db.Where("token_hash = ? AND status = ?", utils.HashToken(raw), "active").First(&key).Error; err != nil {
			utils.Error(c, http.StatusUnauthorized, "API_KEY_INVALID", "Invalid API key", nil)
			c.Abort()
			return
		}
		if key.ExpiresAt != nil && time.Now().After(*key.ExpiresAt) {
			utils.Error(c, http.StatusUnauthorized, "API_KEY_INVALID", "API key expired", nil)
			c.Abort()
			return
		}
		if key.AllowedMethods != "" && !containsCSV(key.AllowedMethods, c.Request.Method) {
			utils.Error(c, http.StatusForbidden, "METHOD_NOT_ALLOWED", "API key cannot use this method", nil)
			c.Abort()
			return
		}
		origin := c.GetHeader("Origin")
		if origin != "" && key.AllowedOrigins != "" && !containsCSV(key.AllowedOrigins, origin) {
			utils.Error(c, http.StatusForbidden, "ORIGIN_NOT_ALLOWED", "API key origin is not allowed", nil)
			c.Abort()
			return
		}
		now := time.Now()
		_ = db.Model(&key).Update("last_used_at", now).Error
		var user models.User
		if err := db.Preload("Plan").First(&user, key.UserID).Error; err != nil || !user.APIAccessEnabled {
			utils.Error(c, http.StatusForbidden, "FORBIDDEN", "API access is disabled", nil)
			c.Abort()
			return
		}
		c.Set("user", user)
		c.Set("api_key_id", key.ID)
		c.Next()
	}
}

func containsCSV(csv, value string) bool {
	for _, item := range strings.Split(csv, ",") {
		if strings.EqualFold(strings.TrimSpace(item), value) || strings.TrimSpace(item) == "*" {
			return true
		}
	}
	return false
}
