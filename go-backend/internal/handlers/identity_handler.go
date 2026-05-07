package handlers

import (
	"net/http"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/middleware"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func (a *App) MyIdentity(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user.Role == "admin" || user.Role == "super_admin" {
		utils.Success(c, http.StatusOK, "Done", gin.H{"status": "verified", "verification": gin.H{"status": "verified", "legal_name": user.Name, "country": "admin"}})
		return
	}
	var item models.IdentityVerification
	if err := a.DB.Where("user_id = ?", user.ID).First(&item).Error; err != nil {
		utils.Success(c, http.StatusOK, "Done", gin.H{"status": "not_submitted"})
		return
	}
	utils.Success(c, http.StatusOK, "Done", gin.H{"verification": item, "status": item.Status})
}

func (a *App) SubmitIdentity(c *gin.Context) {
	user := middleware.CurrentUser(c)
	item := models.IdentityVerification{
		UserID:         user.ID,
		LegalName:      c.PostForm("legal_name"),
		DateOfBirth:    c.PostForm("date_of_birth"),
		Country:        c.PostForm("country"),
		DocumentType:   c.PostForm("document_type"),
		DocumentNumber: c.PostForm("document_number"),
		Status:         "pending",
	}
	item.DocumentFrontURL = saveUpload(c, "document_front", a.Cfg.AudioStorageDir, "identity")
	item.DocumentBackURL = saveUpload(c, "document_back", a.Cfg.AudioStorageDir, "identity")
	item.SelfieURL = saveUpload(c, "selfie", a.Cfg.AudioStorageDir, "identity")
	var existing models.IdentityVerification
	if err := a.DB.Where("user_id = ?", user.ID).First(&existing).Error; err == nil {
		item.ID = existing.ID
		a.DB.Save(&item)
	} else {
		a.DB.Create(&item)
	}
	a.Notify.Create(user.ID, "identity_submitted", "Identity verification submitted", "Your identity verification is pending review.", nil)
	utils.Success(c, http.StatusOK, "Identity verification submitted", gin.H{"verification": item})
}

func (a *App) AdminIdentityList(c *gin.Context) {
	var items []models.IdentityVerification
	a.DB.Order("created_at desc").Find(&items)
	utils.Success(c, http.StatusOK, "Done", gin.H{"items": items})
}

func (a *App) AdminIdentityGet(c *gin.Context) {
	var item models.IdentityVerification
	if err := a.DB.First(&item, c.Param("id")).Error; err != nil {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Verification not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Done", gin.H{"verification": item})
}

func (a *App) AdminIdentityApprove(c *gin.Context) {
	a.reviewIdentity(c, "approved")
}

func (a *App) AdminIdentityReject(c *gin.Context) {
	a.reviewIdentity(c, "rejected")
}

func (a *App) reviewIdentity(c *gin.Context, status string) {
	admin := middleware.CurrentUser(c)
	var req struct {
		Note string `json:"note"`
	}
	_ = c.ShouldBindJSON(&req)
	var item models.IdentityVerification
	if err := a.DB.First(&item, c.Param("id")).Error; err != nil {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Verification not found", nil)
		return
	}
	now := time.Now()
	item.Status = status
	item.ReviewedByAdminID = &admin.ID
	item.ReviewNote = req.Note
	item.ReviewedAt = &now
	a.DB.Save(&item)
	if status == "approved" {
		a.Notify.Create(item.UserID, "identity_approved", "Identity approved", "Voice cloning is now available.", nil)
		a.Webhooks.Trigger(item.UserID, "identity.approved", item)
	} else {
		a.Notify.Create(item.UserID, "identity_rejected", "Identity rejected", req.Note, nil)
		a.Webhooks.Trigger(item.UserID, "identity.rejected", item)
	}
	a.Audit.Log(&admin.ID, &item.UserID, "admin.identity."+status, item, c.ClientIP(), c.GetHeader("User-Agent"))
	utils.Success(c, http.StatusOK, "Identity verification reviewed", gin.H{"verification": item})
}

func saveUpload(c *gin.Context, field, baseDir, subdir string) string {
	file, err := c.FormFile(field)
	if err != nil || file == nil {
		return ""
	}
	if file.Size > 10*1024*1024 {
		return ""
	}
	dir := filepath.Join(baseDir, subdir)
	name := time.Now().Format("20060102150405") + "_" + filepath.Base(file.Filename)
	path := filepath.Join(dir, name)
	if err := c.SaveUploadedFile(file, path); err != nil {
		return ""
	}
	return path
}
