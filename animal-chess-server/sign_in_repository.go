package main

import (
	"context"
	"database/sql"
	"time"
)

type SignInDataStore interface {
	GetStatus(ctx context.Context, userID int64, today time.Time) (*signInSnapshot, error)
	SignIn(ctx context.Context, userID int64, today time.Time) (*signInSnapshot, error)
	GetPointsSummary(ctx context.Context, userID int64, today time.Time) (*PointsSummaryResult, error)
	GetWeeklySummary(ctx context.Context, userID int64, today time.Time) (*WeeklySummaryResult, error)
}

type SQLSignInStore struct {
	db               *sql.DB
	userRepository   *UserRepository
	pointsRepository *PointsRepository
}

func NewSQLSignInStore(db *sql.DB, userRepository *UserRepository, pointsRepository *PointsRepository) *SQLSignInStore {
	return &SQLSignInStore{
		db:               db,
		userRepository:   userRepository,
		pointsRepository: pointsRepository,
	}
}

func (s *SQLSignInStore) GetStatus(ctx context.Context, userID int64, today time.Time) (*signInSnapshot, error) {
	user, err := s.userRepository.FindByID(userID)
	if err != nil {
		return nil, err
	}

	weekStartDate := weekStart(today)
	records, err := s.listWeekSignInDates(ctx, userID, weekStartDate)
	if err != nil {
		return nil, err
	}

	weekContinuousDays := normalizeWeekContinuousDays(user.LastSignInDate, user.WeekContinuousSignDays, weekStartDate)

	return &signInSnapshot{
		Awarded:            false,
		SignedToday:        containsDate(records, today),
		RewardPoints:       rewardPointsForStreak(nextWeekContinuousDays(user.LastSignInDate, user.WeekContinuousSignDays, today, weekStartDate)),
		TotalPoints:        user.TotalPoints,
		WeekSignedDays:     len(records),
		WeekContinuousDays: weekContinuousDays,
		SignedDates:        formatDates(records),
	}, nil
}

func (s *SQLSignInStore) SignIn(ctx context.Context, userID int64, today time.Time) (*signInSnapshot, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	user, err := s.userRepository.FindByIDForUpdate(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	weekStartDate := weekStart(today)
	now := time.Now()
	nextWeekContinuousDays := nextWeekContinuousDays(user.LastSignInDate, user.WeekContinuousSignDays, today, weekStartDate)
	rewardPoints := rewardPointsForStreak(nextWeekContinuousDays)
	recordID, err := s.createSignInRecord(ctx, tx, userID, weekStartDate, today, rewardPoints, now)
	if err != nil {
		if isMySQLDuplicateEntryError(err) {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				return nil, rollbackErr
			}
			committed = true
			status, statusErr := s.GetStatus(ctx, userID, today)
			if statusErr != nil {
				return nil, statusErr
			}
			return status, nil
		}
		return nil, err
	}

	totalPoints := user.TotalPoints + rewardPoints
	if err := s.pointsRepository.CreateSignInLog(ctx, tx, userID, rewardPoints, totalPoints, recordID, now); err != nil {
		return nil, err
	}
	if err := s.userRepository.UpdateSignInStats(ctx, tx, userID, totalPoints, nextWeekContinuousDays, today, now); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	committed = true

	status, err := s.GetStatus(ctx, userID, today)
	if err != nil {
		return nil, err
	}
	status.Awarded = true
	status.SignedToday = true
	return status, nil
}

func (s *SQLSignInStore) GetPointsSummary(ctx context.Context, userID int64, today time.Time) (*PointsSummaryResult, error) {
	status, err := s.GetStatus(ctx, userID, today)
	if err != nil {
		return nil, err
	}

	return &PointsSummaryResult{
		TotalPoints:        status.TotalPoints,
		SignedToday:        status.SignedToday,
		WeekSignedDays:     status.WeekSignedDays,
		WeekContinuousDays: status.WeekContinuousDays,
		RewardPoints:       status.RewardPoints,
	}, nil
}

func (s *SQLSignInStore) GetWeeklySummary(ctx context.Context, userID int64, today time.Time) (*WeeklySummaryResult, error) {
	user, err := s.userRepository.FindByID(userID)
	if err != nil {
		return nil, err
	}

	weekStartDate := weekStart(today)
	records, err := s.listWeekRecords(ctx, userID, weekStartDate)
	if err != nil {
		return nil, err
	}

	return buildWeeklySummaryResult(
		user.TotalPoints,
		len(records),
		normalizeWeekContinuousDays(user.LastSignInDate, user.WeekContinuousSignDays, weekStartDate),
		records,
		weekStartDate,
	), nil
}

func (s *SQLSignInStore) createSignInRecord(ctx context.Context, tx *sql.Tx, userID int64, weekStartDate time.Time, signInDate time.Time, rewardPoints int, createdAt time.Time) (int64, error) {
	result, err := tx.ExecContext(ctx, `
INSERT INTO animal_chess_sign_in_record (user_id, week_start_date, sign_in_date, points_awarded, created_at)
VALUES (?, ?, ?, ?, ?)
`, userID, weekStartDate, signInDate, rewardPoints, createdAt)
	if err != nil {
		return 0, err
	}

	recordID, err := result.LastInsertId()
	if err != nil {
		return 0, err
	}
	return recordID, nil
}

func (s *SQLSignInStore) listWeekSignInDates(ctx context.Context, userID int64, weekStartDate time.Time) ([]time.Time, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT sign_in_date
FROM animal_chess_sign_in_record
WHERE user_id = ? AND week_start_date = ?
ORDER BY sign_in_date ASC
`, userID, weekStartDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dates []time.Time
	for rows.Next() {
		var signInDate time.Time
		if err := rows.Scan(&signInDate); err != nil {
			return nil, err
		}
		dates = append(dates, signInDate)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return dates, nil
}

func (s *SQLSignInStore) listWeekRecords(ctx context.Context, userID int64, weekStartDate time.Time) ([]weeklySignInRecord, error) {
	rows, err := s.db.QueryContext(ctx, `
SELECT sign_in_date, points_awarded
FROM animal_chess_sign_in_record
WHERE user_id = ? AND week_start_date = ?
ORDER BY sign_in_date ASC
`, userID, weekStartDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records := make([]weeklySignInRecord, 0, 7)
	for rows.Next() {
		var record weeklySignInRecord
		if err := rows.Scan(&record.SignInDate, &record.PointsAwarded); err != nil {
			return nil, err
		}
		records = append(records, record)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	sortWeeklyRecords(records)
	return records, nil
}

func normalizeWeekContinuousDays(lastSignInDate *time.Time, currentWeekContinuousDays int, weekStartDate time.Time) int {
	if lastSignInDate == nil {
		return 0
	}
	if truncateDate(*lastSignInDate).Before(weekStartDate) {
		return 0
	}
	return currentWeekContinuousDays
}

func nextWeekContinuousDays(lastSignInDate *time.Time, currentWeekContinuousDays int, today time.Time, weekStartDate time.Time) int {
	if lastSignInDate == nil {
		return 1
	}

	lastDate := truncateDate(*lastSignInDate)
	if lastDate.Before(weekStartDate) {
		return 1
	}
	if sameDate(lastDate, today.AddDate(0, 0, -1)) {
		return currentWeekContinuousDays + 1
	}
	if sameDate(lastDate, today) {
		return currentWeekContinuousDays
	}
	return 1
}

func weekStart(day time.Time) time.Time {
	day = truncateDate(day)
	weekday := int(day.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return day.AddDate(0, 0, -(weekday - 1))
}

func truncateDate(day time.Time) time.Time {
	return time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, day.Location())
}

func sameDate(left time.Time, right time.Time) bool {
	left = truncateDate(left)
	right = truncateDate(right)
	return left.Equal(right)
}

func containsDate(days []time.Time, target time.Time) bool {
	for _, day := range days {
		if sameDate(day, target) {
			return true
		}
	}
	return false
}

func formatDates(days []time.Time) []string {
	result := make([]string, 0, len(days))
	for _, day := range days {
		result = append(result, truncateDate(day).Format(dateLayout))
	}
	return result
}
