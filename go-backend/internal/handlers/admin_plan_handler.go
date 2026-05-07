package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func (a *App) Plans(c *gin.Context) {
	var plans []models.PricingPlan
	a.DB.Where("is_active = ?", true).Order("sort_order asc").Find(&plans)
	utils.Success(c, http.StatusOK, "Done", gin.H{"plans": plans})
}

func (a *App) AdminPlans(c *gin.Context) {
	var plans []models.PricingPlan
	a.DB.Order("sort_order asc").Find(&plans)
	utils.Success(c, http.StatusOK, "Done", gin.H{"plans": plans})
}

func (a *App) AdminCreatePlan(c *gin.Context) {
	var plan models.PricingPlan
	if err := c.ShouldBindJSON(&plan); err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid plan", nil)
		return
	}
	if err := a.DB.Create(&plan).Error; err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	utils.Success(c, http.StatusCreated, "Plan created", gin.H{"plan": plan})
}

func (a *App) AdminPatchPlan(c *gin.Context) {
	var req map[string]interface{}
	_ = c.ShouldBindJSON(&req)
	res := a.DB.Model(&models.PricingPlan{}).Where("id = ?", c.Param("id")).Updates(req)
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Plan not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Plan updated", nil)
}

func (a *App) AdminDeletePlan(c *gin.Context) {
	res := a.DB.Model(&models.PricingPlan{}).Where("id = ?", c.Param("id")).Update("is_active", false)
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Plan not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Plan deactivated", nil)
}
