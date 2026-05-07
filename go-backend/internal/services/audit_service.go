package services

import (
	"encoding/json"

	"gorm.io/gorm"
	"nstudio/go-backend/internal/models"
)

type AuditService struct {
	db *gorm.DB
}

func NewAuditService(db *gorm.DB) *AuditService {
	return &AuditService{db: db}
}

func (s *AuditService) Log(actorID *uint, targetID *uint, action string, metadata interface{}, ip, ua string) {
	raw, _ := json.Marshal(metadata)
	_ = s.db.Create(&models.AuditLog{ActorUserID: actorID, TargetUserID: targetID, Action: action, MetadataJSON: string(raw), IPAddress: ip, UserAgent: ua}).Error
}
