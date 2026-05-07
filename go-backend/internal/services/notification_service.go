package services

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
	"gorm.io/gorm"
	"nstudio/go-backend/internal/models"
)

type NotificationService struct {
	db      *gorm.DB
	clients map[uint]map[*websocket.Conn]bool
	mu      sync.RWMutex
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{db: db, clients: map[uint]map[*websocket.Conn]bool{}}
}

func (s *NotificationService) Create(userID uint, typ, title, message string, data interface{}) {
	dataJSON := "{}"
	if data != nil {
		if raw, err := json.Marshal(data); err == nil {
			dataJSON = string(raw)
		}
	}
	notification := models.Notification{UserID: userID, Type: typ, Title: title, Message: message, DataJSON: dataJSON}
	if err := s.db.Create(&notification).Error; err != nil {
		return
	}
	s.Push(userID, notification)
}

func (s *NotificationService) Push(userID uint, payload interface{}) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for conn := range s.clients[userID] {
		_ = conn.WriteJSON(payload)
	}
}

func (s *NotificationService) AddClient(userID uint, conn *websocket.Conn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.clients[userID] == nil {
		s.clients[userID] = map[*websocket.Conn]bool{}
	}
	s.clients[userID][conn] = true
}

func (s *NotificationService) RemoveClient(userID uint, conn *websocket.Conn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.clients[userID], conn)
	_ = conn.Close()
}
