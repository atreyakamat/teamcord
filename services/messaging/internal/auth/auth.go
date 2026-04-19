package auth

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sync"
	"strconv"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid or expired token")

type Claims struct {
	Subject           string   `json:"sub"`
	Workspaces        []string `json:"workspaces,omitempty"`
	Email             string   `json:"email,omitempty"`
	PreferredUsername string   `json:"preferred_username,omitempty"`
	Name              string   `json:"name,omitempty"`
	jwt.RegisteredClaims
}

func CreateToken(userID int64, workspaceIDs []int64) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "change-me-in-production"
	}

	workspaceStrings := make([]string, 0, len(workspaceIDs))
	for _, workspaceID := range workspaceIDs {
		workspaceStrings = append(workspaceStrings, strconv.FormatInt(workspaceID, 10))
	}

	now := time.Now()
	claims := Claims{
		Subject:    strconv.FormatInt(userID, 10),
		Workspaces: workspaceStrings,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(30 * 24 * time.Hour)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func VerifyToken(tokenString string) (*Claims, error) {
	tokenString = strings.TrimSpace(strings.TrimPrefix(tokenString, "Bearer "))
	if tokenString == "" {
		return nil, ErrInvalidToken
	}

	if legacyClaims, err := verifyLegacyToken(tokenString); err == nil {
		return legacyClaims, nil
	}

	verifier, err := getOIDCVerifier()
	if err != nil {
		return nil, err
	}

	verifiedToken, err := verifier.Verify(context.Background(), tokenString)
	if err != nil {
		return nil, err
	}

	var verifiedClaims Claims
	if err := verifiedToken.Claims(&verifiedClaims); err != nil {
		return nil, err
	}
	if strings.TrimSpace(verifiedClaims.Subject) == "" {
		return nil, ErrInvalidToken
	}
	return &verifiedClaims, nil
}

func verifyLegacyToken(tokenString string) (*Claims, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "change-me-in-production"
	}

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

var (
	oidcInit sync.Once
	verifier *oidc.IDTokenVerifier
	initErr  error
)

func getOIDCVerifier() (*oidc.IDTokenVerifier, error) {
	oidcInit.Do(func() {
		issuer := strings.TrimSpace(os.Getenv("KEYCLOAK_ISSUER"))
		if issuer == "" {
			initErr = errors.New("KEYCLOAK_ISSUER is not configured")
			return
		}

		provider, err := oidc.NewProvider(context.Background(), strings.TrimRight(issuer, "/"))
		if err != nil {
			initErr = err
			return
		}

		clientID := strings.TrimSpace(os.Getenv("KEYCLOAK_CLIENT_ID"))
		verifier = provider.Verifier(&oidc.Config{
			ClientID:          clientID,
			SkipClientIDCheck: clientID == "",
		})
	})
	return verifier, initErr
}
