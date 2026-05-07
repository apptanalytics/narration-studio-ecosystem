package handlers

import (
	"net/http"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/middleware"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func (a *App) CreateSpeech(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req struct {
		Text  string `json:"text"`
		Voice string `json:"voice"`
		Model string `json:"model"`
		Wait  bool   `json:"wait"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.Text == "" {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Text is required", nil)
		return
	}
	textCredits := int64(utf8.RuneCountInString(req.Text))
	limit := 20000
	if user.Plan.MaxTextChars > 0 {
		limit = user.Plan.MaxTextChars
	}
	if textCredits > int64(limit) {
		utils.Error(c, http.StatusForbidden, "PLAN_LIMIT_EXCEEDED", "Text exceeds your plan limit", gin.H{"limit": limit})
		return
	}
	if req.Model == "" {
		req.Model = "khmer-tts"
	}
	if !a.canAccessVoice(c, req.Voice) {
		utils.Error(c, http.StatusForbidden, "FORBIDDEN", "This uploaded voice belongs to another user", nil)
		return
	}
	jobID := uuid.NewString()
	var apiKeyID *uint
	if value, ok := c.Get("api_key_id"); ok {
		id := value.(uint)
		apiKeyID = &id
	}
	job := models.GenerationJob{ID: jobID, UserID: user.ID, APIKeyID: apiKeyID, Text: req.Text, Voice: req.Voice, Model: req.Model, Status: "pending"}
	if err := a.DB.Transaction(func(tx *gorm.DB) error {
		var current models.User
		if err := tx.Preload("Plan").First(&current, user.ID).Error; err != nil {
			return err
		}
		var activeJobs []models.GenerationJob
		if err := tx.Where("user_id = ? AND status IN ?", user.ID, []string{"pending", "running", "merging"}).Find(&activeJobs).Error; err != nil {
			return err
		}
		var reserved int64
		for _, active := range activeJobs {
			reserved += int64(utf8.RuneCountInString(active.Text))
		}
		available := current.CreditsTotal - current.CreditsUsed - reserved
		if available < textCredits {
			return errInsufficientCredits{available: available, reserved: reserved, required: textCredits}
		}
		return tx.Create(&job).Error
	}); err != nil {
		if creditErr, ok := err.(errInsufficientCredits); ok {
			utils.Error(c, http.StatusForbidden, "INSUFFICIENT_CREDITS", "Not enough credits", gin.H{"available": creditErr.available, "reserved": creditErr.reserved, "required": creditErr.required})
			return
		}
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not create job", nil)
		return
	}
	if err := a.Queue.Enqueue(job.ID); err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not queue job", nil)
		return
	}
	utils.Success(c, http.StatusAccepted, "Speech generation queued", gin.H{"job_id": job.ID, "status": job.Status, "status_url": "/api/v1/jobs/" + job.ID, "job": job})
}

type errInsufficientCredits struct {
	available int64
	reserved  int64
	required  int64
}

func (e errInsufficientCredits) Error() string {
	return "not enough credits"
}

func (a *App) GetJob(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var job models.GenerationJob
	if err := a.DB.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).First(&job).Error; err != nil {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Job not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Done", gin.H{"job": job})
}

func (a *App) JobChunks(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var job models.GenerationJob
	if err := a.DB.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).First(&job).Error; err != nil {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Job not found", nil)
		return
	}
	var chunks []models.GenerationChunk
	a.DB.Where("job_id = ?", job.ID).Order("chunk_index asc").Find(&chunks)
	utils.Success(c, http.StatusOK, "Done", gin.H{"chunks": chunks})
}

func (a *App) CancelJob(c *gin.Context) {
	user := middleware.CurrentUser(c)
	res := a.DB.Model(&models.GenerationJob{}).Where("id = ? AND user_id = ? AND status IN ?", c.Param("id"), user.ID, []string{"pending", "running"}).Update("status", "cancelled")
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Cancelable job not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Job cancelled", nil)
}

func (a *App) DeleteJob(c *gin.Context) {
	user := middleware.CurrentUser(c)
	res := a.DB.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Delete(&models.GenerationJob{})
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Job not found", nil)
		return
	}
	a.DB.Where("job_id = ?", c.Param("id")).Delete(&models.GenerationChunk{})
	utils.Success(c, http.StatusOK, "Job deleted", gin.H{"deleted": c.Param("id")})
}

func (a *App) History(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var jobs []models.GenerationJob
	a.DB.Where("user_id = ?", user.ID).Order("created_at desc").Limit(100).Find(&jobs)
	utils.Success(c, http.StatusOK, "Done", gin.H{"jobs": jobs})
}
