package main

import (
	"context"
	"errors"
	"sort"
	"time"
)

const (
	dailySignInRewardPoints = 10
	bonusSignInRewardPoints = 15
	dateLayout              = "2006-01-02"
)

type SignInCommand struct {
	UserID int64
	Today  string
}

type SignInStatusResult struct {
	SignedToday        bool     `json:"signedToday"`
	RewardPoints       int      `json:"rewardPoints"`
	TotalPoints        int      `json:"totalPoints"`
	WeekSignedDays     int      `json:"weekSignedDays"`
	WeekContinuousDays int      `json:"weekContinuousDays"`
	SignedDates        []string `json:"signedDates"`
}

type SignInResult struct {
	Awarded bool `json:"awarded"`
	SignInStatusResult
}

type PointsSummaryResult struct {
	TotalPoints        int  `json:"totalPoints"`
	SignedToday        bool `json:"signedToday"`
	WeekSignedDays     int  `json:"weekSignedDays"`
	WeekContinuousDays int  `json:"weekContinuousDays"`
	RewardPoints       int  `json:"rewardPoints"`
}

type WeeklySummaryResult struct {
	Success             bool                 `json:"success"`
	CurrentPoints       int                  `json:"currentPoints"`
	CheckedInDaysThisWeek int                `json:"checkedInDaysThisWeek"`
	CurrentStreakDays   int                  `json:"currentStreakDays"`
	WeeklyRecords       []WeeklyRecordResult `json:"weeklyRecords"`
}

type WeeklyRecordResult struct {
	Weekday       string `json:"weekday"`
	CheckedIn     bool   `json:"checkedIn"`
	AwardedPoints int    `json:"awardedPoints"`
	Status        string `json:"status"`
}

type CheckInResponse struct {
	Success       bool   `json:"success"`
	CheckInDate   string `json:"checkInDate"`
	StreakDays    int    `json:"streakDays"`
	AwardedPoints int    `json:"awardedPoints"`
}

type weeklySignInRecord struct {
	SignInDate    time.Time
	PointsAwarded int
}

type signInSnapshot struct {
	Awarded            bool
	SignedToday        bool
	RewardPoints       int
	TotalPoints        int
	WeekSignedDays     int
	WeekContinuousDays int
	SignedDates        []string
}

type SignInService struct {
	store SignInDataStore
}

func NewSignInService(store SignInDataStore) *SignInService {
	return &SignInService{store: store}
}

func (s *SignInService) GetStatus(userID int64, today string) (*SignInStatusResult, error) {
	day, err := parseSignInDay(today)
	if err != nil {
		return nil, err
	}

	snapshot, err := s.store.GetStatus(context.Background(), userID, day)
	if err != nil {
		return nil, err
	}

	return &SignInStatusResult{
		SignedToday:        snapshot.SignedToday,
		RewardPoints:       snapshot.RewardPoints,
		TotalPoints:        snapshot.TotalPoints,
		WeekSignedDays:     snapshot.WeekSignedDays,
		WeekContinuousDays: snapshot.WeekContinuousDays,
		SignedDates:        snapshot.SignedDates,
	}, nil
}

func (s *SignInService) SignIn(command SignInCommand) (*SignInResult, error) {
	day, err := parseSignInDay(command.Today)
	if err != nil {
		return nil, err
	}

	snapshot, err := s.store.SignIn(context.Background(), command.UserID, day)
	if err != nil {
		return nil, err
	}

	return &SignInResult{
		Awarded: snapshot.Awarded,
		SignInStatusResult: SignInStatusResult{
			SignedToday:        snapshot.SignedToday,
			RewardPoints:       snapshot.RewardPoints,
			TotalPoints:        snapshot.TotalPoints,
			WeekSignedDays:     snapshot.WeekSignedDays,
			WeekContinuousDays: snapshot.WeekContinuousDays,
			SignedDates:        snapshot.SignedDates,
		},
	}, nil
}

func (s *SignInService) CheckIn(command SignInCommand) (*CheckInResponse, error) {
	result, err := s.SignIn(command)
	if err != nil {
		return nil, err
	}

	return &CheckInResponse{
		Success:       result.Awarded,
		CheckInDate:   command.Today,
		StreakDays:    result.WeekContinuousDays,
		AwardedPoints: result.RewardPoints,
	}, nil
}

func (s *SignInService) GetPointsSummary(userID int64, today string) (*PointsSummaryResult, error) {
	day, err := parseSignInDay(today)
	if err != nil {
		return nil, err
	}
	return s.store.GetPointsSummary(context.Background(), userID, day)
}

func (s *SignInService) GetWeeklySummary(userID int64, today string) (*WeeklySummaryResult, error) {
	day, err := parseSignInDay(today)
	if err != nil {
		return nil, err
	}
	return s.store.GetWeeklySummary(context.Background(), userID, day)
}

func parseSignInDay(today string) (time.Time, error) {
	day, err := time.ParseInLocation(dateLayout, today, time.Local)
	if err != nil {
		return time.Time{}, errors.New("invalid sign-in date")
	}
	return truncateDate(day), nil
}

func rewardPointsForStreak(streakDays int) int {
	if streakDays >= 3 {
		return bonusSignInRewardPoints
	}
	return dailySignInRewardPoints
}

func extractRecordDates(records []weeklySignInRecord) []time.Time {
	result := make([]time.Time, 0, len(records))
	for _, record := range records {
		result = append(result, record.SignInDate)
	}
	return result
}

func buildWeeklySummaryResult(currentPoints int, checkedInDaysThisWeek int, currentStreakDays int, records []weeklySignInRecord, weekStartDate time.Time) *WeeklySummaryResult {
	recordsByDate := make(map[string]weeklySignInRecord, len(records))
	for _, record := range records {
		recordsByDate[truncateDate(record.SignInDate).Format(dateLayout)] = record
	}

	weeklyRecords := make([]WeeklyRecordResult, 0, 7)
	for offset := 0; offset < 7; offset++ {
		day := weekStartDate.AddDate(0, 0, offset)
		record, exists := recordsByDate[day.Format(dateLayout)]
		weeklyRecords = append(weeklyRecords, WeeklyRecordResult{
			Weekday:       weekdayLabel(day),
			CheckedIn:     exists,
			AwardedPoints: awardedPointsValue(record, exists),
			Status:        weeklyRecordStatus(exists),
		})
	}

	return &WeeklySummaryResult{
		Success:               true,
		CurrentPoints:         currentPoints,
		CheckedInDaysThisWeek: checkedInDaysThisWeek,
		CurrentStreakDays:     currentStreakDays,
		WeeklyRecords:         weeklyRecords,
	}
}

func sortWeeklyRecords(records []weeklySignInRecord) {
	sort.Slice(records, func(i, j int) bool {
		return records[i].SignInDate.Before(records[j].SignInDate)
	})
}

func weekdayLabel(day time.Time) string {
	switch day.Weekday() {
	case time.Monday:
		return "周一"
	case time.Tuesday:
		return "周二"
	case time.Wednesday:
		return "周三"
	case time.Thursday:
		return "周四"
	case time.Friday:
		return "周五"
	case time.Saturday:
		return "周六"
	default:
		return "周日"
	}
}

func awardedPointsValue(record weeklySignInRecord, exists bool) int {
	if !exists {
		return 0
	}
	return record.PointsAwarded
}

func weeklyRecordStatus(checkedIn bool) string {
	if checkedIn {
		return "checked_in"
	}
	return "pending"
}
