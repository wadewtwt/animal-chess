package main

import (
	"database/sql"
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
	Config AppConfig
	DB     *sql.DB
	Hub    *Hub
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
