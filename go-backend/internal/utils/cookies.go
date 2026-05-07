package utils

import (
	"time"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/config"
)

func SetAuthCookies(c *gin.Context, cfg config.Config, accessToken, refreshToken string) {
	secure := cfg.IsProduction()
	c.SetSameSite(2)
	c.SetCookie("access_token", accessToken, int((15 * time.Minute).Seconds()), "/", cfg.CookieDomain, secure, true)
	c.SetCookie("refresh_token", refreshToken, int((time.Duration(cfg.RefreshTokenDays) * 24 * time.Hour).Seconds()), "/", cfg.CookieDomain, secure, true)
}

func ClearAuthCookies(c *gin.Context, cfg config.Config) {
	secure := cfg.IsProduction()
	c.SetSameSite(2)
	c.SetCookie("access_token", "", -1, "/", cfg.CookieDomain, secure, true)
	c.SetCookie("refresh_token", "", -1, "/", cfg.CookieDomain, secure, true)
}
