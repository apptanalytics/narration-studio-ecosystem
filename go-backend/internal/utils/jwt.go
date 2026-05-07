package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID    uint   `json:"user_id"`
	SessionID string `json:"session_id,omitempty"`
	TokenType string `json:"token_type"`
	jwt.RegisteredClaims
}

func SignJWT(secret string, userID uint, sessionID, tokenType string, ttl time.Duration) (string, string, time.Time, error) {
	jti, err := RandomHex(16)
	if err != nil {
		return "", "", time.Time{}, err
	}
	expires := time.Now().Add(ttl)
	claims := Claims{
		UserID:    userID,
		SessionID: sessionID,
		TokenType: tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			ExpiresAt: jwt.NewNumericDate(expires),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "nstudio",
		},
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	return token, jti, expires, err
}

func ParseJWT(secret, tokenString, tokenType string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil || !token.Valid || claims.TokenType != tokenType {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}
