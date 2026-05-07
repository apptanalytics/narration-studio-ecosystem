package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/utils"
)

func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := CurrentUser(c)
		if user.Role != "admin" {
			utils.Error(c, http.StatusForbidden, "FORBIDDEN", "Admin access required", nil)
			c.Abort()
			return
		}
		c.Next()
	}
}
