package handlers

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/middleware"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

type registerRequest struct {
	Name     string `json:"name"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (a *App) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Email == "" || req.Password == "" {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Email and password are required", nil)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.TrimSpace(req.FullName)
	}
	if name == "" {
		name = strings.Split(req.Email, "@")[0]
	}
	var existing models.User
	if err := a.DB.Where("email = ?", strings.ToLower(req.Email)).First(&existing).Error; err == nil {
		utils.Error(c, http.StatusConflict, "DUPLICATE_EMAIL", "Email is already registered", nil)
		return
	}
	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not create account", nil)
		return
	}
	var free models.PricingPlan
	_ = a.DB.Where("slug = ?", "free").First(&free).Error
	user := models.User{Name: name, Email: strings.ToLower(req.Email), PasswordHash: hash, Role: "user", Status: "pending", Provider: "email", CreditsTotal: 5000, APIAccessEnabled: true, VoiceCloneLimit: 5}
	if free.ID != 0 {
		user.PlanID = &free.ID
		user.CreditsTotal = free.Credits
		user.VoiceCloneLimit = free.VoiceCloneLimit
		user.APIAccessEnabled = free.APIAccessEnabled
	}
	if err := a.DB.Create(&user).Error; err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not create account", nil)
		return
	}
	_ = a.OTP.Send(user, "email_verify")
	utils.Success(c, http.StatusCreated, "Account created. Verify email, then wait for admin approval.", gin.H{"user": user})
}

func (a *App) Login(c *gin.Context) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		TOTPCode string `json:"totp_code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid login request", nil)
		return
	}
	var user models.User
	if err := a.DB.Preload("Plan").Where("email = ?", strings.ToLower(req.Email)).First(&user).Error; err != nil || !utils.CheckPassword(user.PasswordHash, req.Password) {
		utils.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid email or password", nil)
		return
	}
	if user.Status == "disabled" {
		utils.Error(c, http.StatusForbidden, "ACCOUNT_DISABLED", "Account is disabled", nil)
		return
	}
	if user.Status == "rejected" {
		utils.Error(c, http.StatusForbidden, "FORBIDDEN", "Account was rejected", nil)
		return
	}
	if !user.EmailVerified {
		utils.Error(c, http.StatusForbidden, "EMAIL_NOT_VERIFIED", "Verify your email before logging in", nil)
		return
	}
	if !user.AdminVerified && user.Role != "admin" {
		utils.Error(c, http.StatusForbidden, "ADMIN_APPROVAL_REQUIRED", "Admin approval is required before login", nil)
		return
	}
	if user.TwoFactorEnabled && !a.TOTP.Validate(req.TOTPCode, user.TwoFactorSecret) {
		utils.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Two-factor code is required", nil)
		return
	}
	pair, err := a.Auth.CreateSession(user, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not create session", nil)
		return
	}
	now := time.Now()
	a.DB.Model(&user).Updates(map[string]interface{}{"last_login_at": now})
	a.Notify.Create(user.ID, "login", "New login", "Your account signed in.", nil)
	utils.SetAuthCookies(c, a.Cfg, pair.AccessToken, pair.RefreshToken)
	utils.Success(c, http.StatusOK, "Logged in", gin.H{"user": user})
}

func (a *App) Me(c *gin.Context) {
	utils.Success(c, http.StatusOK, "Done", gin.H{"user": middleware.CurrentUser(c)})
}

func (a *App) UpdateMe(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req struct {
		Name      string `json:"name"`
		FullName  string `json:"full_name"`
		FirstName string `json:"first_name"`
		LastName  string `json:"last_name"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid profile request", nil)
		return
	}
	updates := map[string]interface{}{}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = strings.TrimSpace(req.FullName)
	}
	if name == "" {
		name = strings.TrimSpace(strings.TrimSpace(req.FirstName) + " " + strings.TrimSpace(req.LastName))
	}
	if name != "" {
		updates["name"] = name
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	if email != "" && email != user.Email {
		var existing models.User
		if err := a.DB.Where("email = ? AND id <> ?", email, user.ID).First(&existing).Error; err == nil {
			utils.Error(c, http.StatusConflict, "DUPLICATE_EMAIL", "Email is already registered", nil)
			return
		}
		updates["email"] = email
		updates["email_verified"] = false
		_ = a.OTP.Send(models.User{ID: user.ID, Email: email, Name: name}, "email_verify")
	}
	if strings.TrimSpace(req.AvatarURL) != "" {
		updates["avatar_url"] = strings.TrimSpace(req.AvatarURL)
	}
	if len(updates) == 0 {
		utils.Success(c, http.StatusOK, "Profile updated", gin.H{"user": user})
		return
	}
	if err := a.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	a.DB.Preload("Plan").First(&user, user.ID)
	utils.Success(c, http.StatusOK, "Profile updated", gin.H{"user": user})
}

func (a *App) UpdatePassword(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
		Password        string `json:"password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid password request", nil)
		return
	}
	next := req.NewPassword
	if next == "" {
		next = req.Password
	}
	if len(next) < 8 {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Password must be at least 8 characters", nil)
		return
	}
	if user.Provider != "google" && !utils.CheckPassword(user.PasswordHash, req.CurrentPassword) {
		utils.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Current password is incorrect", nil)
		return
	}
	hash, err := utils.HashPassword(next)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not update password", nil)
		return
	}
	if err := a.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{"password_hash": hash, "provider": "email"}).Error; err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	a.Notify.Create(user.ID, "password_reset", "Password updated", "Your password was updated.", nil)
	utils.Success(c, http.StatusOK, "Password updated", nil)
}

func (a *App) Refresh(c *gin.Context) {
	refresh, err := c.Cookie("refresh_token")
	if err != nil {
		utils.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Refresh token missing", nil)
		return
	}
	pair, err := a.Auth.Refresh(refresh)
	if err != nil {
		utils.ClearAuthCookies(c, a.Cfg)
		utils.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Please login again", nil)
		return
	}
	utils.SetAuthCookies(c, a.Cfg, pair.AccessToken, pair.RefreshToken)
	utils.Success(c, http.StatusOK, "Token refreshed", nil)
}

func (a *App) Logout(c *gin.Context) {
	sessionID, _ := c.Get("session_id")
	if id, ok := sessionID.(string); ok && id != "" {
		_ = a.Auth.RevokeSession(id)
	}
	utils.ClearAuthCookies(c, a.Cfg)
	utils.Success(c, http.StatusOK, "Logged out", nil)
}

func (a *App) LogoutAll(c *gin.Context) {
	user := middleware.CurrentUser(c)
	_ = a.Auth.RevokeAll(user.ID)
	a.Notify.Create(user.ID, "logout_all", "Logged out from all devices", "All active sessions were revoked.", nil)
	utils.ClearAuthCookies(c, a.Cfg)
	utils.Success(c, http.StatusOK, "Logged out from all devices", nil)
}

func (a *App) Sessions(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var sessions []models.UserSession
	a.DB.Where("user_id = ?", user.ID).Order("created_at desc").Find(&sessions)
	utils.Success(c, http.StatusOK, "Done", gin.H{"sessions": sessions})
}

func (a *App) RevokeSession(c *gin.Context) {
	user := middleware.CurrentUser(c)
	id := c.Param("id")
	now := time.Now()
	res := a.DB.Model(&models.UserSession{}).Where("id = ? AND user_id = ?", id, user.ID).Updates(map[string]interface{}{"is_active": false, "revoked_at": now})
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Session not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Session revoked", nil)
}

func (a *App) ResendEmailOTP(c *gin.Context) {
	user := middleware.CurrentUser(c)
	if user.ID == 0 {
		var req struct {
			Email string `json:"email"`
		}
		_ = c.ShouldBindJSON(&req)
		if err := a.DB.Where("email = ?", strings.ToLower(req.Email)).First(&user).Error; err != nil {
			utils.Success(c, http.StatusOK, "If the email exists, a code was sent", nil)
			return
		}
	}
	if err := a.OTP.Send(user, "email_verify"); err != nil {
		utils.Error(c, http.StatusTooManyRequests, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	utils.Success(c, http.StatusOK, "Verification code sent", nil)
}

func (a *App) VerifyEmailOTP(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	_ = c.ShouldBindJSON(&req)
	if user.ID == 0 {
		if err := a.DB.Where("email = ?", strings.ToLower(req.Email)).First(&user).Error; err != nil {
			utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid verification request", nil)
			return
		}
	}
	if err := a.OTP.Verify(user, "email_verify", req.Code); err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	a.DB.Model(&user).Update("email_verified", true)
	a.Notify.Create(user.ID, "email_verified", "Email verified", "Your email address has been verified.", nil)
	utils.Success(c, http.StatusOK, "Email verified", nil)
}

func (a *App) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	_ = c.ShouldBindJSON(&req)
	var user models.User
	if err := a.DB.Where("email = ?", strings.ToLower(req.Email)).First(&user).Error; err == nil {
		_ = a.OTP.Send(user, "password_reset")
		a.Notify.Create(user.ID, "password_reset", "Password reset requested", "A password reset code was sent.", nil)
	}
	utils.Success(c, http.StatusOK, "If the email exists, a reset code was sent", nil)
}

func (a *App) ResetPassword(c *gin.Context) {
	var req struct {
		Email       string `json:"email"`
		Code        string `json:"code"`
		NewPassword string `json:"new_password"`
		Password    string `json:"password"`
	}
	_ = c.ShouldBindJSON(&req)
	password := req.NewPassword
	if password == "" {
		password = req.Password
	}
	var user models.User
	if err := a.DB.Where("email = ?", strings.ToLower(req.Email)).First(&user).Error; err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid reset request", nil)
		return
	}
	if err := a.OTP.Verify(user, "password_reset", req.Code); err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", err.Error(), nil)
		return
	}
	hash, _ := utils.HashPassword(password)
	a.DB.Model(&user).Update("password_hash", hash)
	_ = a.Auth.RevokeAll(user.ID)
	a.Notify.Create(user.ID, "password_reset", "Password reset completed", "Your password was reset.", nil)
	utils.Success(c, http.StatusOK, "Password reset", nil)
}

func (a *App) TOTPSetup(c *gin.Context) {
	user := middleware.CurrentUser(c)
	secret, url, err := a.TOTP.Generate(user.Email)
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not create authenticator secret", nil)
		return
	}
	a.DB.Model(&user).Update("two_factor_secret", secret)
	utils.Success(c, http.StatusOK, "Authenticator secret created", gin.H{"secret": secret, "url": url})
}

func (a *App) TOTPEnable(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var req struct {
		Code string `json:"code"`
	}
	_ = c.ShouldBindJSON(&req)
	if !a.TOTP.Validate(req.Code, user.TwoFactorSecret) {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid authenticator code", nil)
		return
	}
	a.DB.Model(&user).Updates(map[string]interface{}{"two_factor_enabled": true})
	a.Notify.Create(user.ID, "2fa_enabled", "Two-factor enabled", "Authenticator app protection is now enabled.", nil)
	utils.Success(c, http.StatusOK, "Two-factor enabled", nil)
}

func (a *App) TOTPDisable(c *gin.Context) {
	user := middleware.CurrentUser(c)
	a.DB.Model(&user).Updates(map[string]interface{}{"two_factor_enabled": false, "two_factor_secret": ""})
	a.Notify.Create(user.ID, "2fa_disabled", "Two-factor disabled", "Authenticator app protection is now disabled.", nil)
	utils.Success(c, http.StatusOK, "Two-factor disabled", nil)
}

func (a *App) GoogleLogin(c *gin.Context) {
	if a.Cfg.GoogleClientID == "" {
		utils.Error(c, http.StatusNotImplemented, "VALIDATION_ERROR", "Google OAuth is not configured", nil)
		return
	}
	oauthCfg := a.googleOAuthConfig()
	state, _ := utils.RandomHex(16)
	c.SetCookie("google_oauth_state", state, 600, "/", a.Cfg.CookieDomain, a.Cfg.IsProduction(), true)
	c.Redirect(http.StatusFound, oauthCfg.AuthCodeURL(state, oauth2.AccessTypeOffline))
}

func (a *App) GoogleCallback(c *gin.Context) {
	if a.Cfg.GoogleClientID == "" || a.Cfg.GoogleClientSecret == "" {
		utils.Error(c, http.StatusNotImplemented, "VALIDATION_ERROR", "Google OAuth is not configured", nil)
		return
	}
	stateCookie, _ := c.Cookie("google_oauth_state")
	if stateCookie == "" || stateCookie != c.Query("state") {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid OAuth state", nil)
		return
	}
	token, err := a.googleOAuthConfig().Exchange(context.Background(), c.Query("code"))
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Google token exchange failed", nil)
		return
	}
	client := a.googleOAuthConfig().Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Could not load Google profile", nil)
		return
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var profile struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	_ = json.Unmarshal(raw, &profile)
	if profile.Email == "" {
		utils.Error(c, http.StatusBadRequest, "VALIDATION_ERROR", "Google email is required", nil)
		return
	}
	var user models.User
	err = a.DB.Where("email = ?", strings.ToLower(profile.Email)).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		randomPassword, _ := utils.RandomHex(32)
		passwordHash, _ := utils.HashPassword(randomPassword)
		var free models.PricingPlan
		_ = a.DB.Where("slug = ?", "free").First(&free).Error
		user = models.User{Name: profile.Name, Email: strings.ToLower(profile.Email), PasswordHash: passwordHash, AvatarURL: profile.Picture, GoogleID: profile.ID, Provider: "google", Role: "user", Status: "active", EmailVerified: true, AdminVerified: true, CreditsTotal: 5000, APIAccessEnabled: true, VoiceCloneLimit: 5}
		if free.ID != 0 {
			user.PlanID = &free.ID
			user.CreditsTotal = free.Credits
			user.VoiceCloneLimit = free.VoiceCloneLimit
			user.APIAccessEnabled = free.APIAccessEnabled
		}
		if err := a.DB.Create(&user).Error; err != nil {
			utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not create Google user", nil)
			return
		}
	} else if err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not load user", nil)
		return
	} else {
		updates := map[string]interface{}{
			"google_id":      profile.ID,
			"avatar_url":     profile.Picture,
			"email_verified": true,
			"admin_verified": true,
			"status":         "active",
			"provider":       "google",
		}
		if strings.TrimSpace(user.Name) == "" && strings.TrimSpace(profile.Name) != "" {
			updates["name"] = strings.TrimSpace(profile.Name)
		}
		if user.PasswordHash == "" {
			randomPassword, _ := utils.RandomHex(32)
			passwordHash, _ := utils.HashPassword(randomPassword)
			updates["password_hash"] = passwordHash
		}
		if err := a.DB.Model(&user).Updates(updates).Error; err != nil {
			utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not update Google user", nil)
			return
		}
		a.DB.Preload("Plan").First(&user, user.ID)
	}
	pair, err := a.Auth.CreateSession(user, c.ClientIP(), c.GetHeader("User-Agent"))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Could not create session", nil)
		return
	}
	now := time.Now()
	a.DB.Model(&user).Updates(map[string]interface{}{"last_login_at": now})
	a.Notify.Create(user.ID, "login", "Google login", "Your account signed in with Google.", nil)
	utils.SetAuthCookies(c, a.Cfg, pair.AccessToken, pair.RefreshToken)
	c.Redirect(http.StatusFound, a.Cfg.FrontendURL+"/dashboard")
}

func (a *App) googleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     a.Cfg.GoogleClientID,
		ClientSecret: a.Cfg.GoogleClientSecret,
		RedirectURL:  a.Cfg.GoogleRedirectURL,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

func (a *App) FindUserByID(id string) (models.User, error) {
	var user models.User
	err := a.DB.Preload("Plan").First(&user, id).Error
	if err == gorm.ErrRecordNotFound {
		return user, err
	}
	return user, err
}
