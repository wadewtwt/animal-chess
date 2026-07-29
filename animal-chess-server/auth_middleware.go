package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
)

type authContextKey string

const userClaimsContextKey authContextKey = "user_claims"

var ErrAuthorizationHeaderMissing = errors.New("authorization header missing")

func AuthMiddleware(tokenService *TokenService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token, err := extractBearerToken(r.Header.Get("Authorization"))
			if err != nil {
				log.Printf("AuthMiddleware middleware error extract bearer token failed: %v", err)
				writeJSONError(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			claims, err := tokenService.Parse(token)
			if err != nil {
				log.Printf("AuthMiddleware middleware error parse token failed: %v", err)
				writeJSONError(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			ctx := context.WithValue(r.Context(), userClaimsContextKey, *claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserClaims(r *http.Request) (*UserClaims, bool) {
	claims, ok := r.Context().Value(userClaimsContextKey).(UserClaims)
	if !ok {
		return nil, false
	}
	return &claims, true
}

func extractBearerToken(authorization string) (string, error) {
	if strings.TrimSpace(authorization) == "" {
		return "", ErrAuthorizationHeaderMissing
	}

	const prefix = "Bearer "
	if !strings.HasPrefix(authorization, prefix) {
		return "", errors.New("invalid authorization header")
	}

	token := strings.TrimSpace(strings.TrimPrefix(authorization, prefix))
	if token == "" {
		return "", errors.New("bearer token missing")
	}

	return token, nil
}
