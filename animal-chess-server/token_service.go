package main

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrTokenSigningSecretMissing = errors.New("token signing secret missing")

type UserClaims struct {
	UserID int64
	OpenID string
}

type tokenClaims struct {
	UserID int64  `json:"user_id"`
	OpenID string `json:"openid"`
	jwt.RegisteredClaims
}

type TokenService struct {
	secret []byte
}

func NewTokenService(secret string) *TokenService {
	return &TokenService{secret: []byte(secret)}
}

func (s *TokenService) Issue(claims UserClaims) (string, error) {
	if len(s.secret) == 0 {
		return "", ErrTokenSigningSecretMissing
	}

	now := time.Now()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, tokenClaims{
		UserID: claims.UserID,
		OpenID: claims.OpenID,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(7 * 24 * time.Hour)),
		},
	})

	return token.SignedString(s.secret)
}

func (s *TokenService) Parse(token string) (*UserClaims, error) {
	if len(s.secret) == 0 {
		return nil, ErrTokenSigningSecretMissing
	}

	parsedToken, err := jwt.ParseWithClaims(token, &tokenClaims{}, func(t *jwt.Token) (interface{}, error) {
		if t.Method == nil || t.Method.Alg() != jwt.SigningMethodHS256.Alg() {
			return nil, errors.New("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := parsedToken.Claims.(*tokenClaims)
	if !ok || !parsedToken.Valid {
		return nil, errors.New("invalid token claims")
	}

	return &UserClaims{
		UserID: claims.UserID,
		OpenID: claims.OpenID,
	}, nil
}
