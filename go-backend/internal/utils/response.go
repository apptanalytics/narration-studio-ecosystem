package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type APIError struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

func Success(c *gin.Context, status int, message string, data interface{}) {
	if message == "" {
		message = "Done"
	}
	if data == nil {
		data = gin.H{}
	}
	c.JSON(status, gin.H{"success": true, "message": message, "data": data})
}

func Error(c *gin.Context, status int, code, message string, details interface{}) {
	if code == "" {
		code = "INTERNAL_ERROR"
	}
	if message == "" {
		message = http.StatusText(status)
	}
	c.JSON(status, gin.H{"success": false, "error": APIError{Code: code, Message: message, Details: details}})
}
