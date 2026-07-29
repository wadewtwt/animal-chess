package main

import (
	"context"
	"database/sql"
	"time"
)

type PointsRepository struct {
	db *sql.DB
}

func NewPointsRepository(db *sql.DB) *PointsRepository {
	return &PointsRepository{db: db}
}

// CreateSignInLog 创建签到积分流水。
func (r *PointsRepository) CreateSignInLog(ctx context.Context, tx *sql.Tx, userID int64, pointsDelta int, balanceAfter int, relatedRecordID int64, createdAt time.Time) error {
	_, err := tx.ExecContext(ctx, `
INSERT INTO animal_chess_points_log (user_id, change_type, points_delta, balance_after, remark, related_record_id, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
`, userID, "SIGN_IN", pointsDelta, balanceAfter, "daily sign-in reward", relatedRecordID, createdAt)

	return err
}
