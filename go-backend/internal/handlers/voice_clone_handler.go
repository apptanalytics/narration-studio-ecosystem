package handlers

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/middleware"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func (a *App) CreateVoiceClone(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user.Role != "admin" && user.Role != "super_admin" {
		var verification models.IdentityVerification
		if err := a.DB.Where("user_id = ? AND status = ?", user.ID, "approved").First(&verification).Error; err != nil {
			utils.Error(c, http.StatusForbidden, "IDENTITY_VERIFICATION_REQUIRED", "Identity verification is required before voice cloning.", nil)
			return
		}
	}
	if user.VoiceCloneLimit >= 0 && user.VoiceClonesUsed >= user.VoiceCloneLimit {
		utils.Error(c, http.StatusForbidden, "VOICE_CLONE_LIMIT_REACHED", "Voice clone limit reached", nil)
		return
	}
	agreement := c.PostForm("legal_agreement") == "true" || c.PostForm("agreement") == "true"
	if !agreement {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Voice cloning requires permission and legal agreement.", nil)
		return
	}
	audioURL, err := saveVoiceCloneAudio(c, "audio")
	if err != nil {
		audioURL, err = saveVoiceCloneAudio(c, "file")
	}
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	clone := models.VoiceClone{
		UserID:    user.ID,
		Name:      c.PostForm("name"),
		Gender:    c.PostForm("gender"),
		Language:  c.PostForm("language"),
		Agreement: agreement,
		AudioURL:  audioURL,
	}
	if err := a.DB.Create(&clone).Error; err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	a.DB.Model(&models.User{}).Where("id = ?", user.ID).UpdateColumn("voice_clones_used", gorm.Expr("voice_clones_used + ?", 1))
	a.Notify.Create(user.ID, "voice_clone_created", "Voice clone created", "Your voice clone was created.", gin.H{"voice_clone_id": clone.ID})
	a.Webhooks.Trigger(user.ID, "voice_clone.created", clone)
	utils.Success(c, http.StatusCreated, "Voice clone created", gin.H{"voice_clone": clone})
}

func (a *App) ListVoiceClones(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var clones []models.VoiceClone
	a.DB.Where("user_id = ?", user.ID).Order("created_at desc").Find(&clones)
	utils.Success(c, http.StatusOK, "Done", gin.H{"voice_clones": clones})
}

func (a *App) PatchVoiceClone(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req struct {
		Name     string `json:"name"`
		Gender   string `json:"gender"`
		Language string `json:"language"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid voice clone request", nil)
		return
	}
	updates := map[string]interface{}{}
	if strings.TrimSpace(req.Name) != "" {
		updates["name"] = strings.TrimSpace(req.Name)
	}
	if strings.TrimSpace(req.Gender) != "" {
		updates["gender"] = strings.TrimSpace(req.Gender)
	}
	if strings.TrimSpace(req.Language) != "" {
		updates["language"] = strings.TrimSpace(req.Language)
	}
	if len(updates) == 0 {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "No changes provided", nil)
		return
	}
	res := a.DB.Model(&models.VoiceClone{}).Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Updates(updates)
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Voice clone not found", nil)
		return
	}
	var clone models.VoiceClone
	a.DB.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).First(&clone)
	utils.Success(c, http.StatusOK, "Voice clone updated", gin.H{"voice_clone": clone})
}

func (a *App) DeleteVoiceClone(c *gin.Context) {
	user := middleware.CurrentUser(c)
	res := a.DB.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Delete(&models.VoiceClone{})
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Voice clone not found", nil)
		return
	}
	a.DB.Model(&models.User{}).Where("id = ? AND voice_clones_used > 0", user.ID).UpdateColumn("voice_clones_used", gorm.Expr("voice_clones_used - ?", 1))
	utils.Success(c, http.StatusOK, "Voice clone deleted", nil)
}

func saveVoiceCloneAudio(c *gin.Context, field string) (string, error) {
	file, err := c.FormFile(field)
	if err != nil || file == nil {
		return "", fmt.Errorf("audio file is required")
	}
	if file.Size > 50*1024*1024 {
		return "", fmt.Errorf("audio file is too large")
	}
	uploadDir := filepath.Join("..", "voice_clone_dataset", "uploads")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return "", fmt.Errorf("could not prepare voice storage")
	}
	stem := sanitizeVoiceStem(strings.TrimSuffix(filepath.Base(file.Filename), filepath.Ext(file.Filename)))
	if stem == "" {
		stem = "voice"
	}
	filename := time.Now().Format("20060102150405") + "_" + stem + ".mp3"
	target := filepath.Join(uploadDir, filename)
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == ".mp3" {
		if err := c.SaveUploadedFile(file, target); err != nil {
			return "", fmt.Errorf("could not save voice audio")
		}
		return "uploads/" + filename, nil
	}
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		return "", fmt.Errorf("audio conversion is not available on this server")
	}
	temp := filepath.Join(os.TempDir(), time.Now().Format("20060102150405")+"_"+stem+ext)
	if err := c.SaveUploadedFile(file, temp); err != nil {
		return "", fmt.Errorf("could not save uploaded audio")
	}
	defer os.Remove(temp)
	cmd := exec.Command("ffmpeg", "-y", "-i", temp, "-vn", "-acodec", "libmp3lame", "-ar", "24000", "-ac", "1", "-b:a", "128k", target)
	if output, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(target)
		return "", fmt.Errorf("could not convert audio to MP3: %s", strings.TrimSpace(string(output)))
	}
	return "uploads/" + filename, nil
}

func sanitizeVoiceStem(value string) string {
	value = strings.TrimSpace(value)
	value = regexp.MustCompile(`[^A-Za-z0-9_.-]+`).ReplaceAllString(value, "_")
	return strings.Trim(value, "._-")
}
