package main

import (
	"database/sql"
	"net/http"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

func openDatabase(cfg AppConfig) (*sql.DB, error) {
	if cfg.MySQLDSN == "" {
		return nil, nil
	}

	db, err := sql.Open("mysql", cfg.MySQLDSN)
	if err != nil {
		return nil, err
	}

	return db, nil
}

func newApp() (*App, error) {
	cfg := loadConfig()
	db, err := openDatabase(cfg)
	if err != nil {
		return nil, err
	}

	httpClient := &http.Client{Timeout: 5 * time.Second}
	userRepository := NewUserRepository(db)
	pointsRepository := NewPointsRepository(db)
	signInRepository := NewSQLSignInStore(db, userRepository, pointsRepository)

	return &App{
		Config:            cfg,
		DB:                db,
		Hub:               NewHub(),
		HTTPClient:        httpClient,
		UserRepository:    userRepository,
		PointsRepository:  pointsRepository,
		SignInRepository:  signInRepository,
		SignInService:     NewSignInService(signInRepository),
		TokenService:      NewTokenService(cfg.TokenSigningSecret),
		WechatAuthService: NewWechatAuthService(cfg, httpClient),
	}, nil
}
