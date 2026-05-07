package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"nstudio/go-backend/internal/middleware"
	"nstudio/go-backend/internal/models"
	"nstudio/go-backend/internal/utils"
)

func (a *App) Notifications(c *gin.Context) {
	user := middleware.CurrentUser(c)
	var items []models.Notification
	a.DB.Where("user_id = ?", user.ID).Order("created_at desc").Limit(100).Find(&items)
	var unread int64
	a.DB.Model(&models.Notification{}).Where("user_id = ? AND read_at IS NULL", user.ID).Count(&unread)
	utils.Success(c, http.StatusOK, "Done", gin.H{"notifications": items, "unread": unread})
}

func (a *App) ReadNotification(c *gin.Context) {
	user := middleware.CurrentUser(c)
	now := time.Now()
	res := a.DB.Model(&models.Notification{}).Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Update("read_at", now)
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Notification not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Notification read", nil)
}

func (a *App) ReadAllNotifications(c *gin.Context) {
	user := middleware.CurrentUser(c)
	now := time.Now()
	a.DB.Model(&models.Notification{}).Where("user_id = ? AND read_at IS NULL", user.ID).Update("read_at", now)
	utils.Success(c, http.StatusOK, "Notifications read", nil)
}

func (a *App) DeleteNotification(c *gin.Context) {
	user := middleware.CurrentUser(c)
	res := a.DB.Where("id = ? AND user_id = ?", c.Param("id"), user.ID).Delete(&models.Notification{})
	if res.RowsAffected == 0 {
		utils.Error(c, http.StatusNotFound, "NOT_FOUND", "Notification not found", nil)
		return
	}
	utils.Success(c, http.StatusOK, "Notification cleared", nil)
}

func (a *App) ClearNotifications(c *gin.Context) {
	user := middleware.CurrentUser(c)
	a.DB.Where("user_id = ?", user.ID).Delete(&models.Notification{})
	utils.Success(c, http.StatusOK, "Notifications cleared", nil)
}

func (a *App) NotificationWebSocket(c *gin.Context) {
	user := middleware.CurrentUser(c)
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	a.Notify.AddClient(user.ID, conn)
	defer a.Notify.RemoveClient(user.ID, conn)
	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			return
		}
	}
}
