package handlers

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func (a *App) Health(c *gin.Context) {
	redis := "disabled"
	if a.Redis != nil {
		redis = "connected"
	}
	utils.Success(c, http.StatusOK, "OK", gin.H{"status": "ok", "product": "Narration Studio", "backend": "go", "fastapi_tts_url": a.Cfg.FastAPITTSURL, "redis": redis})
}

func (a *App) AudioFile(c *gin.Context) {
	relative := strings.TrimPrefix(filepath.ToSlash(c.Param("path")), "/")
	if relative == "" || strings.Contains(relative, "..") {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid audio path", nil)
		return
	}
	path := filepath.Join(a.Cfg.AudioStorageDir, filepath.FromSlash(relative))
	if _, err := os.Stat(path); err != nil && strings.HasSuffix(strings.ToLower(path), ".mp3") {
		wavPath := strings.TrimSuffix(path, filepath.Ext(path)) + ".wav"
		if info, wavErr := os.Stat(wavPath); wavErr == nil && !info.IsDir() {
			if convertErr := convertWAVToMP3(wavPath, path); convertErr != nil {
				utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", convertErr.Error(), nil)
				return
			}
		}
	}
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Audio file not found", nil)
		return
	}
	switch strings.ToLower(filepath.Ext(path)) {
	case ".mp3":
		c.Header("Content-Type", "audio/mpeg")
	case ".wav":
		c.Header("Content-Type", "audio/wav")
	}
	c.File(path)
}

func convertWAVToMP3(input, output string) error {
	cmd := exec.Command("ffmpeg", "-y", "-i", input, "-vn", "-acodec", "libmp3lame", "-ar", "24000", "-ac", "1", "-b:a", "128k", output)
	if data, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(output)
		return fmt.Errorf("could not convert audio to MP3: %s", strings.TrimSpace(string(data)))
	}
	if info, err := os.Stat(output); err != nil {
		return err
	} else if info.Size() == 0 {
		return fmt.Errorf("converted MP3 is empty")
	}
	return nil
}

var publicStandardVoiceAllowlist = []string{
	"Arun-Male.mp3",
	"Bora-Male.mp3",
	"Chanda-Male.mp3",
	"Maly-Female.mp3",
	"Neary-Female.mp3",
	"Oudom-Male.mp3",
	"Phanin-Female.mp3",
	"Rithy-Male.mp3",
	"Setha-Male.mp3",
	"Theary-Female.mp3",
}

func (a *App) Voices(c *gin.Context) {
	if strings.EqualFold(c.Query("scope"), "public") {
		voices := []string{}
		for _, name := range publicStandardVoiceAllowlist {
			if publicVoiceFileExists(name) {
				voices = append(voices, name)
			}
		}
		if len(voices) == 0 {
			voices = append(voices, publicStandardVoiceAllowlist...)
		}
		utils.Success(c, http.StatusOK, "Done", gin.H{"voices": voices})
		return
	}

	voices := []string{}
	seen := map[string]bool{}
	for _, dir := range []string{"../voice_clone_dataset", "voice_clone_dataset"} {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			name := entry.Name()
			lower := strings.ToLower(name)
			if strings.HasSuffix(lower, ".mp3") || strings.HasSuffix(lower, ".wav") || strings.HasSuffix(lower, ".ogg") || strings.HasSuffix(lower, ".m4a") || strings.HasSuffix(lower, ".webm") {
				if !seen[name] {
					voices = append(voices, name)
					seen[name] = true
				}
			}
		}
		break
	}
	user, authed := a.optionalCurrentUser(c)
	query := a.DB.Model(&models.VoiceClone{}).Select("audio_url")
	if !authed {
		query = query.Where("1 = 0")
	} else if user.Role != "admin" && user.Role != "super_admin" {
		query = query.Where("user_id = ?", user.ID)
	}
	var clones []struct {
		AudioURL string
	}
	query.Find(&clones)
	for _, clone := range clones {
		name := normalizeVoiceName(clone.AudioURL)
		if name != "" && !seen[name] {
			voices = append(voices, name)
			seen[name] = true
		}
	}
	if len(voices) == 0 {
		voices = []string{"Maly-Female.mp3", "Rithy-Male.mp3"}
	}
	utils.Success(c, http.StatusOK, "Done", gin.H{"voices": voices})
}

func publicVoiceFileExists(name string) bool {
	for _, dir := range []string{"../voice_clone_dataset", "voice_clone_dataset"} {
		info, err := os.Stat(filepath.Join(dir, name))
		if err == nil && !info.IsDir() {
			return true
		}
	}
	return false
}

func (a *App) VoicePreview(c *gin.Context) {
	rawVoice := strings.TrimSpace(c.Query("voice"))
	voice := normalizeRequestedVoice(rawVoice)
	if voice == "" {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Voice is required", nil)
		return
	}
	if !a.canAccessVoice(c, voice) {
		utils.Error(c, http.StatusForbidden, "FORBIDDEN", "This uploaded voice belongs to another user", nil)
		return
	}
	base := filepath.Base(voice)
	candidates := []string{
		filepath.Join("../voice_clone_dataset", voice),
		filepath.Join("voice_clone_dataset", voice),
		filepath.Join("../voice_clone_dataset/uploads", base),
		filepath.Join("voice_clone_dataset/uploads", base),
		filepath.Join("../reader_outputs/audio/voice-clones", base),
		filepath.Join("reader_outputs/audio/voice-clones", base),
		filepath.Join(a.Cfg.AudioStorageDir, "voice-clones", base),
	}
	for _, path := range candidates {
		if info, err := os.Stat(path); err == nil && !info.IsDir() {
			if file, err := os.Open(path); err == nil {
				header := make([]byte, 4)
				_, _ = file.Read(header)
				_ = file.Close()
				if string(header) == "RIFF" {
					c.Header("Content-Type", "audio/wav")
				}
			}
			c.File(path)
			return
		}
	}
	utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Voice preview not found", nil)
}

func (a *App) optionalCurrentUser(c *gin.Context) (models.User, bool) {
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
		return models.User{}, false
	}
	claims, err := utils.ParseJWT(a.Cfg.JWTSecret, token, "access")
	if err != nil {
		return models.User{}, false
	}
	var user models.User
	if err := a.DB.Preload("Plan").First(&user, claims.UserID).Error; err != nil {
		return models.User{}, false
	}
	return user, true
}

func normalizeRequestedVoice(value string) string {
	value = strings.TrimSpace(filepath.ToSlash(value))
	value = strings.TrimPrefix(value, "/")
	if value == "" || value == "." || strings.Contains(value, "..") {
		return ""
	}
	if strings.HasPrefix(value, "uploads/") || strings.HasPrefix(value, "voice-clones/") {
		base := filepath.Base(value)
		if base == "." || base == "/" || base == "" {
			return ""
		}
		return strings.TrimSuffix(strings.TrimPrefix(value, "/"), "/")
	}
	base := filepath.Base(value)
	if base == "." || base == "/" || base == "" {
		return ""
	}
	return base
}

func (a *App) canAccessVoice(c *gin.Context, voice string) bool {
	voice = normalizeRequestedVoice(voice)
	if voice == "" {
		return false
	}
	if !strings.HasPrefix(voice, "uploads/") && !strings.HasPrefix(voice, "voice-clones/") {
		return true
	}
	user, authed := a.optionalCurrentUser(c)
	if authed && (user.Role == "admin" || user.Role == "super_admin") {
		return true
	}
	base := filepath.Base(voice)
	query := a.DB.Model(&models.VoiceClone{}).
		Where("(voice_clones.audio_url = ? OR voice_clones.audio_url = ? OR voice_clones.audio_url LIKE ?)", voice, base, "%/"+base)
	if authed {
		query = query.Where("voice_clones.user_id = ?", user.ID)
	} else {
		query = query.Where("1 = 0")
	}
	var count int64
	query.Count(&count)
	return count > 0
}

func normalizeVoiceName(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	value = filepath.ToSlash(value)
	if strings.HasPrefix(value, "uploads/") {
		return value
	}
	base := filepath.Base(value)
	if base == "." || base == "/" || base == "" {
		return ""
	}
	for _, dir := range []string{"../voice_clone_dataset/uploads", "voice_clone_dataset/uploads"} {
		if _, err := os.Stat(filepath.Join(dir, base)); err == nil {
			return "uploads/" + base
		}
	}
	return "voice-clones/" + base
}

func (a *App) Visitor(c *gin.Context) {
	utils.Success(c, http.StatusOK, "Done", gin.H{"visitor_id": c.ClientIP()})
}
