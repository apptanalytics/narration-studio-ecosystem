package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"nstudio/go-backend/internal/utils"
)

func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		utils.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error", recovered)
	})
}
