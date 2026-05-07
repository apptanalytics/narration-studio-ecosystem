package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/middleware"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func (a *App) ListWebhooks(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var hooks []models.Webhook
	a.DB.Where("user_id = ?", user.ID).Order("created_at desc").Find(&hooks)
	utils.Success(c, http.StatusOK, "Done", gin.H{"webhooks": hooks})
}

func (a *App) CreateWebhook(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req models.Webhook
	_ = c.ShouldBindJSON(&req)
	secret, _ := utils.RandomHex(24)
	hook := models.Webhook{UserID: user.ID, URL: req.URL, Secret: secret, Events: req.Events, IsActive: true}
	if err := a.DB.Create(&hook).Error; err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	utils.Success(c, http.StatusCreated, "Webhook created", gin.H{"webhook": hook})
}

func (a *App) PatchWebhook(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req map[string]interface{}
	_ = c.ShouldBindJSON(&req)
	res := a.DB.Model(&models.Webhook{}).Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Updates(req)
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Webhook not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Webhook updated", nil)
}

func (a *App) DeleteWebhook(c *gin.Context) {
	user := middleware.CurrentUser(c)
	res := a.DB.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Delete(&models.Webhook{})
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Webhook not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Webhook deleted", nil)
}

func (a *App) TestWebhook(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var hook models.Webhook
	if err := a.DB.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).First(&hook).Error; err != nil {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Webhook not found", nil)
		return
	}
	a.Webhooks.Trigger(user.ID, "generation.completed", gin.H{"test": true})
	utils.Success(c, http.StatusOK, "Webhook test queued", nil)
}
