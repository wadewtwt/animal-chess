package main

import (
	"database/sql"
	"net/http"
	"os"
)

type AppConfig struct {
	ListenAddr         string
	MySQLDSN           string
	WechatAppID        string
	WechatAppSecret    string
	TokenSigningSecret string
}

type App struct {
	Config            AppConfig
	DB                *sql.DB
	Hub               *Hub
	HTTPClient        *http.Client
	UserRepository    *UserRepository
	PointsRepository  *PointsRepository
	SignInRepository  *SQLSignInStore
	SignInService     *SignInService
	TokenService      *TokenService
	WechatAuthService *WechatAuthService
}

func loadConfig() AppConfig {
	listenAddr := os.Getenv("ANIMAL_CHESS_LISTEN_ADDR")
	if listenAddr == "" {
		listenAddr = ":8083"
	}

	return AppConfig{
		ListenAddr:         listenAddr,
		MySQLDSN:           os.Getenv("ANIMAL_CHESS_MYSQL_DSN"),
		WechatAppID:        os.Getenv("ANIMAL_CHESS_WECHAT_APP_ID"),
		WechatAppSecret:    os.Getenv("ANIMAL_CHESS_WECHAT_APP_SECRET"),
		TokenSigningSecret: os.Getenv("ANIMAL_CHESS_TOKEN_SIGNING_SECRET"),
	}
}
