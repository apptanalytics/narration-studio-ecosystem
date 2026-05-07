package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/middleware"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

var adminRoles = []gin.H{
	{"name": "user", "permissions": "Dashboard, speech generation, own voices, own history"},
	{"name": "creator", "permissions": "User permissions, higher clone limit, priority generation"},
	{"name": "developer", "permissions": "User permissions, API keys, API logs"},
	{"name": "support", "permissions": "View users, payments, jobs. Cannot delete users or change admin roles"},
	{"name": "admin", "permissions": "Manage users, voices, credits, plans, payments, API access"},
	{"name": "super_admin", "permissions": "Full access, admin roles, security settings, delete users, audit logs"},
}

type securitySettingsPayload struct {
	RequireEmailVerification             bool `json:"require_email_verification"`
	RequireIdentityVerificationForClones bool `json:"require_identity_verification_for_clones"`
	Require2FAForAdmins                  bool `json:"require_2fa_for_admins"`
	RequirePasskeyForAdmins              bool `json:"require_passkey_for_admins"`
	AllowRegistration                    bool `json:"allow_registration"`
	LoginAlertEmails                     bool `json:"login_alert_emails"`
	PasswordResetEnabled                 bool `json:"password_reset_enabled"`
	GoogleLoginEnabled                   bool `json:"google_login_enabled"`
	SessionExpirationMinutes             int  `json:"session_expiration_minutes"`
	OTPExpiryMinutes                     int  `json:"otp_expiry_minutes"`
	OTPMaxAttempts                       int  `json:"otp_max_attempts"`
	SessionsTracked                      bool `json:"sessions_tracked"`
	TwoFAReady                           bool `json:"two_fa_ready"`
	PasskeysReady                        bool `json:"passkeys_ready"`
	EmailAlertsReady                     bool `json:"email_alerts_ready"`
}

func defaultSecuritySettings() securitySettingsPayload {
	return securitySettingsPayload{
		RequireEmailVerification:             true,
		RequireIdentityVerificationForClones: true,
		Require2FAForAdmins:                  false,
		RequirePasskeyForAdmins:              false,
		AllowRegistration:                    true,
		LoginAlertEmails:                     true,
		PasswordResetEnabled:                 true,
		GoogleLoginEnabled:                   false,
		SessionExpirationMinutes:             60 * 24 * 7,
		OTPExpiryMinutes:                     10,
		OTPMaxAttempts:                       5,
		SessionsTracked:                      true,
		TwoFAReady:                           true,
		PasskeysReady:                        false,
		EmailAlertsReady:                     false,
	}
}

func (a *App) AdminResendVerification(c *gin.Context) {
	user, err := a.FindUserByID(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "User not found", nil)
		return
	}
	_ = a.OTP.Send(user, "email_verify")
	utils.Success(c, http.StatusOK, "Verification email sent", nil)
}

func (a *App) AdminMarkEmailVerified(c *gin.Context) {
	a.updateUserFields(c, map[string]interface{}{"email_verified": true}, "admin.user.email_verified")
}

func (a *App) AdminUserSessions(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	var sessions []models.UserSession
	a.DB.Where("user_id = ?", target).Order("created_at desc").Find(&sessions)
	utils.Success(c, http.StatusOK, "Done", gin.H{"sessions": sessions})
}

func (a *App) AdminRevokeUserSession(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	now := time.Now()
	res := a.DB.Model(&models.UserSession{}).Where("id = ? AND user_id = ?", c.Param("sessionId"), target).Updates(map[string]interface{}{"is_active": false, "revoked_at": now})
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Session not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Session revoked", nil)
}

func (a *App) AdminUserAPIKeys(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	var keys []models.APIKey
	a.DB.Where("user_id = ?", target).Order("created_at desc").Find(&keys)
	utils.Success(c, http.StatusOK, "Done", gin.H{"api_keys": keys})
}

func (a *App) AdminRevokeUserAPIKey(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	res := a.DB.Model(&models.APIKey{}).Where("id = ? AND user_id = ?", c.Param("keyId"), target).Update("status", "revoked")
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "API key not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "API key revoked", nil)
}

func (a *App) AdminUserActivityLogs(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	var logs []models.AuditLog
	a.DB.Where("target_user_id = ? OR actor_user_id = ?", target, target).Order("created_at desc").Limit(200).Find(&logs)
	utils.Success(c, http.StatusOK, "Done", gin.H{"logs": logs})
}

func (a *App) AdminUserPurchases(c *gin.Context) {
	utils.Success(c, http.StatusOK, "Done", gin.H{"purchases": []gin.H{}})
}

func (a *App) AdminUserVoiceClonesList(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	var clones []models.VoiceClone
	a.DB.Where("user_id = ?", target).Order("created_at desc").Find(&clones)
	utils.Success(c, http.StatusOK, "Done", gin.H{"voice_clones": clones})
}

func (a *App) AdminDeleteUserVoiceClone(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	res := a.DB.Where("id = ? AND user_id = ?", c.Param("cloneId"), target).Delete(&models.VoiceClone{})
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Voice clone not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Voice clone deleted", nil)
}

func (a *App) AdminSecuritySettings(c *gin.Context) {
	settings := defaultSecuritySettings()
	var row models.AppSetting
	if err := a.DB.Where("key = ?", "admin_security_settings").First(&row).Error; err == nil && row.ValueJSON != "" {
		_ = json.Unmarshal([]byte(row.ValueJSON), &settings)
	}
	utils.Success(c, http.StatusOK, "Done", gin.H{"settings": settings})
}

func (a *App) AdminPatchSecuritySettings(c *gin.Context) {
	settings := defaultSecuritySettings()
	_ = c.ShouldBindJSON(&settings)
	raw, _ := json.Marshal(settings)
	row := models.AppSetting{Key: "admin_security_settings", ValueJSON: string(raw), UpdatedAt: time.Now()}
	if err := a.DB.Save(&row).Error; err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not save settings", nil)
		return
	}
	actor := middleware.CurrentUser(c).ID
	a.Audit.Log(&actor, nil, "admin.security.update", settings, c.ClientIP(), c.GetHeader("User-Agent"))
	utils.Success(c, http.StatusOK, "Security settings saved", gin.H{"settings": settings})
}

func (a *App) AdminSecurityLogs(c *gin.Context) {
	var logs []models.AuditLog
	a.DB.Where("action LIKE ?", "admin.security.%").Order("created_at desc").Limit(200).Find(&logs)
	utils.Success(c, http.StatusOK, "Done", gin.H{"logs": logs})
}

func (a *App) AdminSummary(c *gin.Context) {
	var users, apiKeys, auditLogs int64
	a.DB.Model(&models.User{}).Count(&users)
	a.DB.Model(&models.APIKey{}).Count(&apiKeys)
	a.DB.Model(&models.AuditLog{}).Count(&auditLogs)
	utils.Success(c, http.StatusOK, "Done", gin.H{"items": []gin.H{
		{"area": "Users", "status": users, "owner": "Admin", "lastUpdate": "live"},
		{"area": "API Keys", "status": apiKeys, "owner": "Admin", "lastUpdate": "live"},
		{"area": "Audit Logs", "status": auditLogs, "owner": "Admin", "lastUpdate": "live"},
	}})
}

func (a *App) AdminRoles(c *gin.Context) {
	utils.Success(c, http.StatusOK, "Done", gin.H{"items": adminRoles})
}

func (a *App) AdminCredits(c *gin.Context) {
	var users []models.User
	a.DB.Preload("Plan").Order("credits_total desc").Find(&users)
	rows := make([]gin.H, 0, len(users))
	for _, user := range users {
		rows = append(rows, gin.H{
			"id":        user.ID,
			"user":      user.Name,
			"email":     user.Email,
			"amount":    user.CreditsTotal - user.CreditsUsed,
			"type":      "balance",
			"reason":    "Current available credits",
			"admin":     "system",
			"createdAt": user.UpdatedAt,
		})
	}
	utils.Success(c, http.StatusOK, "Done", gin.H{"items": rows})
}

func (a *App) AdminPurchases(c *gin.Context) {
	utils.Success(c, http.StatusOK, "Done", gin.H{"purchases": []gin.H{}})
}

func (a *App) AdminVoices(c *gin.Context) {
	voices := []gin.H{}
	for _, name := range []string{"Maly-Female.mp3", "Rithy-Male.mp3"} {
		voices = append(voices, gin.H{"name": name, "gender": "Voice", "language": "Khmer", "enabled": "Yes", "createdAt": "live"})
	}
	utils.Success(c, http.StatusOK, "Done", gin.H{"voices": voices})
}

func (a *App) AdminVoiceClones(c *gin.Context) {
	var clones []models.VoiceClone
	a.DB.Order("created_at desc").Find(&clones)
	utils.Success(c, http.StatusOK, "Done", gin.H{"items": clones})
}
