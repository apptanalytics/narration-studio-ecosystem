package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/middleware"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func (a *App) ListAPIKeys(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var keys []models.APIKey
	a.DB.Where("user_id = ?", user.ID).Order("created_at desc").Find(&keys)
	utils.Success(c, http.StatusOK, "Done", gin.H{"api_keys": keys})
}

func (a *App) CreateAPIKey(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if !user.APIAccessEnabled {
		utils.Error(c, http.StatusForbidden, "FORBIDDEN", "API access is disabled", nil)
		return
	}
	var req struct {
		Name           string     `json:"name"`
		AllowedOrigins string     `json:"allowed_origins"`
		AllowedMethods string     `json:"allowed_methods"`
		ExpiresAt      *time.Time `json:"expires_at"`
	}
	_ = c.ShouldBindJSON(&req)
	token, err := utils.NewAPIKey()
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not create API key", nil)
		return
	}
	key := models.APIKey{UserID: user.ID, Name: req.Name, TokenHash: utils.HashToken(token), TokenPreview: utils.TokenPreview(token), AllowedOrigins: utils.CleanCSV(req.AllowedOrigins), AllowedMethods: utils.CleanCSV(req.AllowedMethods), Status: "active", ExpiresAt: req.ExpiresAt}
	if err := a.DB.Create(&key).Error; err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	a.Notify.Create(user.ID, "api_key_created", "API key created", "A new API key was created.", gin.H{"key_id": key.ID})
	utils.Success(c, http.StatusCreated, "API key created", gin.H{"api_key": key, "token": token})
}

func (a *App) PatchAPIKey(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req map[string]interface{}
	_ = c.ShouldBindJSON(&req)
	res := a.DB.Model(&models.APIKey{}).Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Updates(req)
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "API key not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "API key updated", nil)
}

func (a *App) DeleteAPIKey(c *gin.Context) {
	user := middleware.CurrentUser(c)
	res := a.DB.Model(&models.APIKey{}).Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Update("status", "revoked")
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "API key not found", nil)
		return
	}
	a.Notify.Create(user.ID, "api_key_revoked", "API key revoked", "An API key was revoked.", gin.H{"key_id": c.Param("id")})
	utils.Success(c, http.StatusOK, "API key revoked", nil)
}

func (a *App) RegenerateAPIKey(c *gin.Context) {
	user := middleware.CurrentUser(c)
	token, _ := utils.NewAPIKey()
	res := a.DB.Model(&models.APIKey{}).Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Updates(map[string]interface{}{"token_hash": utils.HashToken(token), "token_preview": utils.TokenPreview(token), "status": "active"})
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "API key not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "API key regenerated", gin.H{"token": token})
}

func (a *App) AdminAPIKeys(c *gin.Context) {
	var keys []models.APIKey
	a.DB.Order("created_at desc").Find(&keys)
	utils.Success(c, http.StatusOK, "Done", gin.H{"api_keys": keys})
}

func (a *App) AdminAPILogs(c *gin.Context) {
	var logs []models.UsageLog
	a.DB.Order("created_at desc").Limit(500).Find(&logs)
	utils.Success(c, http.StatusOK, "Done", gin.H{"logs": logs})
}

func (a *App) UserAPILogs(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var logs []models.UsageLog
	a.DB.Where("user_id = ?", user.ID).Order("created_at desc").Limit(500).Find(&logs)
	utils.Success(c, http.StatusOK, "Done", gin.H{"logs": logs})
}

func (a *App) UserAPIUsage(c *gin.Context) {
	user := middleware.CurrentUser(c)
	now := time.Now()
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	var requestsUsed int64
	var creditsUsed int64
	a.DB.Model(&models.UsageLog{}).Where("user_id = ? AND created_at >= ?", user.ID, monthStart).Count(&requestsUsed)
	a.DB.Model(&models.UsageLog{}).Where("user_id = ? AND created_at >= ?", user.ID, monthStart).Select("COALESCE(SUM(units), 0)").Scan(&creditsUsed)
	utils.Success(c, http.StatusOK, "Done", gin.H{
		"requests_used":       requestsUsed,
		"credits_used":        creditsUsed,
		"successful_requests": requestsUsed,
		"failed_requests":     0,
	})
}
