package models

import "time"

type User struct {
	ID                    uint        `gorm:"primaryKey" json:"id"`
	Name                  string      `json:"name"`
	Email                 string      `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash          string      `json:"-"`
	AvatarURL             string      `json:"avatar_url"`
	Role                  string      `gorm:"default:user" json:"role"`
	PlanID                *uint       `json:"plan_id"`
	Plan                  PricingPlan `json:"plan"`
	CreditsTotal          int64       `gorm:"default:5000" json:"credits_total"`
	CreditsUsed           int64       `gorm:"default:0" json:"credits_used"`
	CreditPeriodStartedAt *time.Time  `json:"credit_period_started_at"`
	CreditsResetAt        *time.Time  `json:"credits_reset_at"`
	APIAccessEnabled      bool        `gorm:"default:true" json:"api_access_enabled"`
	VoiceCloneLimit       int         `gorm:"default:5" json:"voice_clone_limit"`
	VoiceClonesUsed       int         `gorm:"default:0" json:"voice_clones_used"`
	Status                string      `gorm:"default:pending" json:"status"`
	EmailVerified         bool        `gorm:"default:false" json:"email_verified"`
	AdminVerified         bool        `gorm:"default:false" json:"admin_verified"`
	Provider              string      `gorm:"default:email" json:"provider"`
	GoogleID              string      `gorm:"index" json:"google_id"`
	TwoFactorEnabled      bool        `gorm:"default:false" json:"two_factor_enabled"`
	TwoFactorSecret       string      `json:"-"`
	LastLoginAt           *time.Time  `json:"last_login_at"`
	CreatedAt             time.Time   `json:"created_at"`
	UpdatedAt             time.Time   `json:"updated_at"`
}

type PricingPlan struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Name             string    `json:"name"`
	Slug             string    `gorm:"uniqueIndex" json:"slug"`
	PriceMonthly     float64   `json:"price_monthly"`
	Credits          int64     `json:"credits"`
	APIRequestsLimit int64     `json:"api_requests_limit"`
	APIAccessEnabled bool      `json:"api_access_enabled"`
	VoiceCount       int       `json:"voice_count"`
	VoiceCloneLimit  int       `json:"voice_clone_limit"`
	MaxTextChars     int       `json:"max_text_chars"`
	FeaturesJSON     string    `json:"features_json"`
	IsPopular        bool      `json:"is_popular"`
	IsStudent        bool      `json:"is_student"`
	IsActive         bool      `gorm:"default:true" json:"is_active"`
	SortOrder        int       `json:"sort_order"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type UserSession struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	UserID           uint       `gorm:"index;not null" json:"user_id"`
	SessionID        string     `gorm:"uniqueIndex;not null" json:"session_id"`
	RefreshTokenHash string     `json:"-"`
	RefreshJTI       string     `gorm:"index" json:"-"`
	DeviceName       string     `json:"device_name"`
	IPAddress        string     `json:"ip_address"`
	UserAgent        string     `json:"user_agent"`
	IsActive         bool       `gorm:"default:true" json:"is_active"`
	RevokedAt        *time.Time `json:"revoked_at"`
	ExpiresAt        time.Time  `json:"expires_at"`
	CreatedAt        time.Time  `json:"created_at"`
	LastUsedAt       time.Time  `json:"last_used_at"`
}

type VerificationCode struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"index" json:"user_id"`
	Email     string     `gorm:"index" json:"email"`
	CodeHash  string     `json:"-"`
	Type      string     `gorm:"index" json:"type"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at"`
	Attempts  int        `json:"attempts"`
	CreatedAt time.Time  `json:"created_at"`
}

type APIKey struct {
	ID             uint       `gorm:"primaryKey" json:"id"`
	UserID         uint       `gorm:"index;not null" json:"user_id"`
	Name           string     `json:"name"`
	TokenHash      string     `gorm:"uniqueIndex;not null" json:"-"`
	TokenPreview   string     `json:"token_preview"`
	AllowedOrigins string     `json:"allowed_origins"`
	AllowedMethods string     `json:"allowed_methods"`
	Status         string     `gorm:"default:active" json:"status"`
	ExpiresAt      *time.Time `json:"expires_at"`
	LastUsedAt     *time.Time `json:"last_used_at"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type UsageLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	APIKeyID  *uint     `gorm:"index" json:"api_key_id"`
	Action    string    `json:"action"`
	Units     int64     `json:"units"`
	CreatedAt time.Time `json:"created_at"`
}

type GenerationJob struct {
	ID              string     `gorm:"primaryKey" json:"id"`
	UserID          uint       `gorm:"index" json:"user_id"`
	APIKeyID        *uint      `gorm:"index" json:"api_key_id"`
	Text            string     `json:"text"`
	Voice           string     `json:"voice"`
	Model           string     `json:"model"`
	Status          string     `gorm:"index" json:"status"`
	TotalChunks     int        `json:"total_chunks"`
	CompletedChunks int        `json:"completed_chunks"`
	AudioURL        string     `json:"audio_url"`
	ErrorMessage    string     `json:"error_message"`
	CreditsUsed     int64      `json:"credits_used"`
	CreatedAt       time.Time  `json:"created_at"`
	StartedAt       *time.Time `json:"started_at"`
	CompletedAt     *time.Time `json:"completed_at"`
}

type GenerationChunk struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	JobID        string     `gorm:"index" json:"job_id"`
	ChunkIndex   int        `json:"chunk_index"`
	TextChunk    string     `json:"text_chunk"`
	Status       string     `gorm:"index" json:"status"`
	AudioURL     string     `json:"audio_url"`
	ErrorMessage string     `json:"error_message"`
	DurationMS   int64      `json:"duration_ms"`
	CreatedAt    time.Time  `json:"created_at"`
	StartedAt    *time.Time `json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at"`
}

type IdentityVerification struct {
	ID                uint       `gorm:"primaryKey" json:"id"`
	UserID            uint       `gorm:"uniqueIndex" json:"user_id"`
	LegalName         string     `json:"legal_name"`
	DateOfBirth       string     `json:"date_of_birth"`
	Country           string     `json:"country"`
	DocumentType      string     `json:"document_type"`
	DocumentNumber    string     `json:"document_number"`
	DocumentFrontURL  string     `json:"document_front_url"`
	DocumentBackURL   string     `json:"document_back_url"`
	SelfieURL         string     `json:"selfie_url"`
	Status            string     `gorm:"default:pending" json:"status"`
	ReviewedByAdminID *uint      `json:"reviewed_by_admin_id"`
	ReviewNote        string     `json:"review_note"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	ReviewedAt        *time.Time `json:"reviewed_at"`
}

type VoiceClone struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Name      string    `json:"name"`
	Gender    string    `json:"gender"`
	Language  string    `json:"language"`
	AudioURL  string    `json:"audio_url"`
	Agreement bool      `json:"agreement"`
	CreatedAt time.Time `json:"created_at"`
}

type Notification struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"index" json:"user_id"`
	Type      string     `gorm:"index" json:"type"`
	Title     string     `json:"title"`
	Message   string     `json:"message"`
	DataJSON  string     `json:"data_json"`
	ReadAt    *time.Time `json:"read_at"`
	CreatedAt time.Time  `json:"created_at"`
}

type Webhook struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	URL       string    `json:"url"`
	Secret    string    `json:"secret"`
	Events    string    `json:"events"`
	IsActive  bool      `gorm:"default:true" json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AuditLog struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	ActorUserID  *uint     `gorm:"index" json:"actor_user_id"`
	TargetUserID *uint     `gorm:"index" json:"target_user_id"`
	Action       string    `gorm:"index" json:"action"`
	MetadataJSON string    `json:"metadata_json"`
	IPAddress    string    `json:"ip_address"`
	UserAgent    string    `json:"user_agent"`
	CreatedAt    time.Time `json:"created_at"`
}

type AppSetting struct {
	Key       string    `gorm:"primaryKey" json:"key"`
	ValueJSON string    `json:"value_json"`
	UpdatedAt time.Time `json:"updated_at"`
}
