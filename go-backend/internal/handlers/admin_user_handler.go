package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/middleware"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func (a *App) AdminListUsers(c *gin.Context) {
	var users []models.User
	a.DB.Preload("Plan").Order("created_at desc").Find(&users)
	utils.Success(c, http.StatusOK, "Done", gin.H{"users": users})
}

func (a *App) AdminGetUser(c *gin.Context) {
	user, err := a.FindUserByID(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "User not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Done", gin.H{"user": user})
}

func (a *App) AdminCreateUser(c *gin.Context) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	_ = c.ShouldBindJSON(&req)
	hash, _ := utils.HashPassword(req.Password)
	role := req.Role
	if role == "" {
		role = "user"
	}
	user := models.User{Name: req.Name, Email: req.Email, PasswordHash: hash, Role: role, Status: "active", EmailVerified: true, AdminVerified: true, Provider: "email", CreditsTotal: 5000, APIAccessEnabled: true, VoiceCloneLimit: 5}
	if err := a.DB.Create(&user).Error; err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	actor := middleware.CurrentUser(c).ID
	a.Audit.Log(&actor, &user.ID, "admin.user.create", nil, c.ClientIP(), c.GetHeader("User-Agent"))
	utils.Success(c, http.StatusCreated, "User created", gin.H{"user": user})
}

func (a *App) AdminPatchUser(c *gin.Context) {
	var req map[string]interface{}
	_ = c.ShouldBindJSON(&req)
	updates := map[string]interface{}{}
	allowed := map[string]bool{
		"name": true, "email": true, "avatar_url": true, "role": true, "status": true,
		"credits_total": true, "credits_used": true, "api_access_enabled": true,
		"voice_clone_limit": true, "email_verified": true, "admin_verified": true,
	}
	if value, ok := req["full_name"]; ok {
		if _, hasName := req["name"]; !hasName {
			req["name"] = value
		}
		delete(req, "full_name")
	}
	if first, ok := req["first_name"].(string); ok {
		last, _ := req["last_name"].(string)
		if strings.TrimSpace(first) != "" || strings.TrimSpace(last) != "" {
			req["name"] = strings.TrimSpace(strings.TrimSpace(first) + " " + strings.TrimSpace(last))
		}
	}
	delete(req, "first_name")
	delete(req, "last_name")
	for key, value := range req {
		if allowed[key] {
			updates[key] = value
		}
	}
	if role, ok := updates["role"].(string); ok && !validUserRole(role) {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid role", nil)
		return
	}
	if status, ok := updates["status"].(string); ok && !validUserStatus(status) {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid status", nil)
		return
	}
	if len(updates) == 0 {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "No editable fields provided", nil)
		return
	}
	res := a.DB.Model(&models.User{}).Where("id = ?", c.Param("id")).Updates(updates)
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "User not found", nil)
		return
	}
	actor := middleware.CurrentUser(c).ID
	target, _ := parseUintParam(c.Param("id"))
	a.Audit.Log(&actor, &target, "admin.user.update", updates, c.ClientIP(), c.GetHeader("User-Agent"))
	utils.Success(c, http.StatusOK, "User updated", nil)
}

func (a *App) AdminDeleteUser(c *gin.Context) {
	a.DB.Delete(&models.User{}, c.Param("id"))
	utils.Success(c, http.StatusOK, "User deleted", nil)
}

func (a *App) AdminApproveUser(c *gin.Context) {
	a.updateUserFields(c, map[string]interface{}{"status": "active", "admin_verified": true}, "admin.user.approve")
}

func (a *App) AdminRejectUser(c *gin.Context) {
	a.updateUserFields(c, map[string]interface{}{"status": "rejected", "admin_verified": false}, "admin.user.reject")
}

func (a *App) AdminUserStatus(c *gin.Context) {
	var req struct {
		Status string `json:"status"`
	}
	_ = c.ShouldBindJSON(&req)
	if !validUserStatus(req.Status) {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid status", nil)
		return
	}
	if req.Status == "disabled" {
		target, _ := parseUintParam(c.Param("id"))
		_ = a.Auth.RevokeAll(target)
	}
	a.updateUserFields(c, map[string]interface{}{"status": req.Status}, "admin.user.status")
}

func (a *App) AdminUserRole(c *gin.Context) {
	var req struct {
		Role string `json:"role"`
	}
	_ = c.ShouldBindJSON(&req)
	if !validUserRole(req.Role) {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid role", nil)
		return
	}
	a.updateUserFields(c, map[string]interface{}{"role": req.Role}, "admin.user.role")
}

func validUserRole(value string) bool {
	switch value {
	case "user", "admin", "super_admin":
		return true
	default:
		return false
	}
}

func validUserStatus(value string) bool {
	switch value {
	case "pending", "active", "disabled", "rejected", "suspended", "banned":
		return true
	default:
		return false
	}
}

func (a *App) AdminUserPlan(c *gin.Context) {
	var req struct {
		PlanID *uint `json:"plan_id"`
	}
	_ = c.ShouldBindJSON(&req)
	target, _ := parseUintParam(c.Param("id"))
	fields := map[string]interface{}{"plan_id": nil}
	var planID interface{}
	if req.PlanID != nil && *req.PlanID != 0 {
		var plan models.PricingPlan
		if err := a.DB.Where("id = ? AND is_active = ?", *req.PlanID, true).First(&plan).Error; err != nil {
			utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Plan not found", nil)
			return
		}
		fields["plan_id"] = plan.ID
		fields["credits_total"] = plan.Credits
		fields["credits_used"] = 0
		fields["credit_period_started_at"] = time.Now()
		fields["credits_reset_at"] = time.Now().AddDate(0, 1, 0)
		fields["api_access_enabled"] = plan.APIAccessEnabled
		fields["voice_clone_limit"] = plan.VoiceCloneLimit
		planID = plan.ID
	}
	res := a.DB.Model(&models.User{}).Where("id = ?", target).Updates(fields)
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "User not found", nil)
		return
	}
	actor := middleware.CurrentUser(c).ID
	a.Audit.Log(&actor, &target, "admin.user.plan", fields, c.ClientIP(), c.GetHeader("User-Agent"))
	a.Notify.Create(target, "plan_changed", "Plan changed", "Your plan was updated.", gin.H{"plan_id": planID})
	utils.Success(c, http.StatusOK, "User updated", nil)
}

func (a *App) AdminUserCredits(c *gin.Context) {
	var req struct {
		CreditsTotal int64 `json:"credits_total"`
		CreditsUsed  int64 `json:"credits_used"`
	}
	_ = c.ShouldBindJSON(&req)
	a.updateUserFields(c, map[string]interface{}{"credits_total": req.CreditsTotal, "credits_used": req.CreditsUsed}, "admin.user.credits")
}

func (a *App) AdminUserAPIAccess(c *gin.Context) {
	var req struct {
		Enabled bool `json:"enabled"`
	}
	_ = c.ShouldBindJSON(&req)
	a.updateUserFields(c, map[string]interface{}{"api_access_enabled": req.Enabled}, "admin.user.api_access")
}

func (a *App) AdminUserVoiceClones(c *gin.Context) {
	var req struct {
		Limit int `json:"voice_clone_limit"`
	}
	_ = c.ShouldBindJSON(&req)
	a.updateUserFields(c, map[string]interface{}{"voice_clone_limit": req.Limit}, "admin.user.voice_clones")
}

func (a *App) AdminUserIdentityVerification(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	var item models.IdentityVerification
	if err := a.DB.Where("user_id = ?", target).First(&item).Error; err != nil {
		utils.Success(c, http.StatusOK, "Done", gin.H{"verification": nil})
		return
	}
	utils.Success(c, http.StatusOK, "Done", gin.H{"verification": item})
}

func (a *App) AdminPatchUserIdentityVerification(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	var req struct {
		Status     string `json:"status"`
		ReviewNote string `json:"review_note"`
	}
	_ = c.ShouldBindJSON(&req)
	switch req.Status {
	case "pending", "approved", "rejected":
	default:
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid verification status", nil)
		return
	}
	var item models.IdentityVerification
	if err := a.DB.Where("user_id = ?", target).First(&item).Error; err != nil {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Verification not found", nil)
		return
	}
	now := time.Now()
	adminID := middleware.CurrentUser(c).ID
	updates := map[string]interface{}{"status": req.Status, "review_note": req.ReviewNote, "reviewed_by_admin_id": adminID, "reviewed_at": now}
	if err := a.DB.Model(&item).Updates(updates).Error; err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	if req.Status == "approved" {
		a.DB.Model(&models.User{}).Where("id = ?", target).Updates(map[string]interface{}{"admin_verified": true})
	}
	if req.Status == "rejected" {
		a.DB.Model(&models.User{}).Where("id = ?", target).Updates(map[string]interface{}{"admin_verified": false})
	}
	a.DB.Where("user_id = ?", target).First(&item)
	a.Audit.Log(&adminID, &target, "admin.user.identity_verification", updates, c.ClientIP(), c.GetHeader("User-Agent"))
	utils.Success(c, http.StatusOK, "Verification updated", gin.H{"verification": item})
}

func (a *App) AdminResetPasswordEmail(c *gin.Context) {
	user, err := a.FindUserByID(c.Param("id"))
	if err != nil {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "User not found", nil)
		return
	}
	_ = a.OTP.Send(user, "password_reset")
	utils.Success(c, http.StatusOK, "Password reset email sent", nil)
}

func (a *App) AdminLogoutAllUserDevices(c *gin.Context) {
	target, _ := parseUintParam(c.Param("id"))
	_ = a.Auth.RevokeAll(target)
	utils.Success(c, http.StatusOK, "User sessions revoked", nil)
}

func (a *App) AdminAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	a.DB.Order("created_at desc").Limit(500).Find(&logs)
	utils.Success(c, http.StatusOK, "Done", gin.H{"logs": logs})
}

func (a *App) updateUserFields(c *gin.Context, fields map[string]interface{}, action string) {
	target, _ := parseUintParam(c.Param("id"))
	res := a.DB.Model(&models.User{}).Where("id = ?", target).Updates(fields)
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "User not found", nil)
		return
	}
	actor := middleware.CurrentUser(c).ID
	a.Audit.Log(&actor, &target, action, fields, c.ClientIP(), c.GetHeader("User-Agent"))
	if action == "admin.user.approve" {
		a.Notify.Create(target, "admin_approved", "Account approved", "Your account is approved.", nil)
	}
	if action == "admin.user.reject" {
		a.Notify.Create(target, "admin_rejected", "Account rejected", "Your account was rejected.", nil)
	}
	utils.Success(c, http.StatusOK, "User updated", nil)
}

func parseUintParam(value string) (uint, error) {
	var id uint
	_, err := fmt.Sscanf(value, "%d", &id)
	return id, err
}
