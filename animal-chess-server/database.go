package main

import (
	"database/sql"

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

	return &App{
		Config: cfg,
		DB:     db,
		Hub:    NewHub(),
	}, nil
}
