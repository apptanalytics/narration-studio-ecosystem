package services

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"gorm.io/gorm"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

type WebhookService struct {
	db *gorm.DB
}

func NewWebhookService(db *gorm.DB) *WebhookService {
	return &WebhookService{db: db}
}

func (s *WebhookService) Trigger(userID uint, event string, payload interface{}) {
	var hooks []models.Webhook
	if err := s.db.Where("user_id = ? AND is_active = ?", userID, true).Find(&hooks).Error; err != nil {
		return
	}
	raw, _ := json.Marshal(map[string]interface{}{"event": event, "data": payload, "created_at": time.Now().UTC()})
	for _, hook := range hooks {
		if !containsEvent(hook.Events, event) {
			continue
		}
		req, err := http.NewRequest(http.MethodPost, hook.URL, bytes.NewReader(raw))
		if err != nil {
			continue
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Narration-Signature", utils.HMACSHA256(hook.Secret, raw))
		go func() {
			client := &http.Client{Timeout: 10 * time.Second}
			resp, err := client.Do(req)
			if err == nil && resp != nil {
				_ = resp.Body.Close()
			}
		}()
	}
}

func containsEvent(events, event string) bool {
	for _, item := range strings.Split(events, ",") {
		if strings.TrimSpace(item) == event {
			return true
		}
	}
	return false
}
