package auth

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid or expired token")

type Claims struct {
	Subject    string   `json:"sub"`
	Workspaces []string `json:"workspaces,omitempty"`
	jwt.RegisteredClaims
}

func VerifyToken(tokenString string) (*Claims, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "change-me-in-production"
	}

	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}
