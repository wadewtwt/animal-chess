package main

import (
	"context"
	"database/sql"
	"errors"
	"time"

	mysqlDriver "github.com/go-sql-driver/mysql"
)

type AnimalChessUser struct {
	ID                     int64  `json:"id"`
	OpenID                 string `json:"openId"`
	UnionID                string `json:"unionId"`
	Nickname               string `json:"nickname"`
	AvatarURL              string `json:"avatarUrl"`
	TotalPoints            int    `json:"totalPoints"`
	WeekContinuousSignDays int    `json:"weekContinuousSignDays"`
	LastSignInDate         *time.Time
	LastLoginAt            time.Time `json:"lastLoginAt"`
	CreatedAt              time.Time
	UpdatedAt              time.Time
}

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByOpenID(openID string) (*AnimalChessUser, error) {
	row := r.db.QueryRow(`
SELECT id, openid, unionid, nickname, avatar_url, total_points, week_continuous_sign_days,
       last_sign_in_date, last_login_at, created_at, updated_at
FROM animal_chess_user
WHERE openid = ?
`, openID)

	var user AnimalChessUser
	var unionID sql.NullString
	var lastSignInDate sql.NullTime
	if err := row.Scan(
		&user.ID,
		&user.OpenID,
		&unionID,
		&user.Nickname,
		&user.AvatarURL,
		&user.TotalPoints,
		&user.WeekContinuousSignDays,
		&lastSignInDate,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	); err != nil {
		return nil, err
	}

	if unionID.Valid {
		user.UnionID = unionID.String
	}
	if lastSignInDate.Valid {
		value := lastSignInDate.Time
		user.LastSignInDate = &value
	}

	return &user, nil
}

func (r *UserRepository) FindByID(userID int64) (*AnimalChessUser, error) {
	row := r.db.QueryRow(`
SELECT id, openid, unionid, nickname, avatar_url, total_points, week_continuous_sign_days,
       last_sign_in_date, last_login_at, created_at, updated_at
FROM animal_chess_user
WHERE id = ?
`, userID)

	return scanAnimalChessUser(row)
}

func (r *UserRepository) Create(openID, unionID string, now time.Time) (*AnimalChessUser, error) {
	result, err := r.db.Exec(`
INSERT INTO animal_chess_user (openid, unionid, nickname, avatar_url, total_points, week_continuous_sign_days, last_sign_in_date, last_login_at, created_at, updated_at)
VALUES (?, ?, '', '', 0, 0, NULL, ?, ?, ?)
`, openID, nullIfEmpty(unionID), now, now, now)
	if err != nil {
		return nil, err
	}

	userID, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &AnimalChessUser{
		ID:          userID,
		OpenID:      openID,
		UnionID:     unionID,
		Nickname:    "",
		AvatarURL:   "",
		LastLoginAt: now,
		CreatedAt:   now,
		UpdatedAt:   now,
	}, nil
}

func (r *UserRepository) TouchLogin(userID int64, unionID, nickname, avatarURL string, now time.Time) error {
	_, err := r.db.Exec(`
UPDATE animal_chess_user
SET unionid = COALESCE(NULLIF(?, ''), unionid),
    nickname = COALESCE(NULLIF(?, ''), nickname),
    avatar_url = COALESCE(NULLIF(?, ''), avatar_url),
    last_login_at = ?,
    updated_at = ?
WHERE id = ?
`, unionID, nickname, avatarURL, now, now, userID)
	return err
}

func (r *UserRepository) UpdateProfile(userID int64, nickname, avatarURL string, now time.Time) (*AnimalChessUser, error) {
	_, err := r.db.Exec(`
UPDATE animal_chess_user
SET nickname = COALESCE(NULLIF(?, ''), nickname),
    avatar_url = COALESCE(NULLIF(?, ''), avatar_url),
    updated_at = ?
WHERE id = ?
`, nickname, avatarURL, now, userID)
	if err != nil {
		return nil, err
	}
	return r.FindByID(userID)
}

func (r *UserRepository) FindByIDForUpdate(ctx context.Context, tx *sql.Tx, userID int64) (*AnimalChessUser, error) {
	row := tx.QueryRowContext(ctx, `
SELECT id, openid, unionid, nickname, avatar_url, total_points, week_continuous_sign_days,
       last_sign_in_date, last_login_at, created_at, updated_at
FROM animal_chess_user
WHERE id = ?
FOR UPDATE
`, userID)

	return scanAnimalChessUser(row)
}

func (r *UserRepository) UpdateSignInStats(ctx context.Context, tx *sql.Tx, userID int64, totalPoints int, weekContinuousSignDays int, lastSignInDate time.Time, now time.Time) error {
	_, err := tx.ExecContext(ctx, `
UPDATE animal_chess_user
SET total_points = ?,
    week_continuous_sign_days = ?,
    last_sign_in_date = ?,
    updated_at = ?
WHERE id = ?
`, totalPoints, weekContinuousSignDays, lastSignInDate, now, userID)

	return err
}

func (r *UserRepository) FindOrCreateByOpenID(openID, unionID, nickname, avatarURL string, now time.Time) (*AnimalChessUser, error) {
	user, err := r.FindByOpenID(openID)
	if err == nil {
		return r.touchAndMergeUser(user, unionID, nickname, avatarURL, now)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	user, err = r.Create(openID, unionID, now)
	if err == nil {
		if nickname != "" || avatarURL != "" {
			return r.UpdateProfile(user.ID, nickname, avatarURL, now)
		}
		return user, nil
	}
	if !isMySQLDuplicateEntryError(err) {
		return nil, err
	}

	user, err = r.FindByOpenID(openID)
	if err != nil {
		return nil, err
	}

	return r.touchAndMergeUser(user, unionID, nickname, avatarURL, now)
}

func (r *UserRepository) touchAndMergeUser(user *AnimalChessUser, unionID, nickname, avatarURL string, now time.Time) (*AnimalChessUser, error) {
	if updateErr := r.TouchLogin(user.ID, unionID, nickname, avatarURL, now); updateErr != nil {
		return nil, updateErr
	}
	user.LastLoginAt = now
	user.UpdatedAt = now
	if unionID != "" {
		user.UnionID = unionID
	}
	if nickname != "" {
		user.Nickname = nickname
	}
	if avatarURL != "" {
		user.AvatarURL = avatarURL
	}
	return user, nil
}


func isMySQLDuplicateEntryError(err error) bool {
	var mysqlErr *mysqlDriver.MySQLError
	if !errors.As(err, &mysqlErr) {
		return false
	}
	return mysqlErr.Number == 1062
}

func nullIfEmpty(value string) interface{} {
	if value == "" {
		return nil
	}
	return value
}

type animalChessUserScanner interface {
	Scan(dest ...interface{}) error
}

func scanAnimalChessUser(row animalChessUserScanner) (*AnimalChessUser, error) {
	var user AnimalChessUser
	var unionID sql.NullString
	var lastSignInDate sql.NullTime
	if err := row.Scan(
		&user.ID,
		&user.OpenID,
		&unionID,
		&user.Nickname,
		&user.AvatarURL,
		&user.TotalPoints,
		&user.WeekContinuousSignDays,
		&lastSignInDate,
		&user.LastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	); err != nil {
		return nil, err
	}

	if unionID.Valid {
		user.UnionID = unionID.String
	}
	if lastSignInDate.Valid {
		value := lastSignInDate.Time
		user.LastSignInDate = &value
	}

	return &user, nil
}
