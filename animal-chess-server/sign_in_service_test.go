package main

import (
	"context"
	"testing"
	"time"
)

func TestSignInService_SameDayOnlyAwardsOnce(t *testing.T) {
	repo := newFakeSignInRepo()
	svc := NewSignInService(repo)

	first, err := svc.SignIn(SignInCommand{UserID: 1, Today: "2026-07-15"})
	if err != nil {
		t.Fatalf("first sign-in failed: %v", err)
	}

	second, err := svc.SignIn(SignInCommand{UserID: 1, Today: "2026-07-15"})
	if err != nil {
		t.Fatalf("second sign-in returned unexpected error: %v", err)
	}

	if !first.Awarded {
		t.Fatal("expected first sign-in awarded")
	}

	if second.Awarded {
		t.Fatal("expected second sign-in not awarded")
	}
}

func TestSignInService_WeekResetsOnMonday(t *testing.T) {
	repo := newFakeSignInRepo()
	svc := NewSignInService(repo)

	monday := weekStart(time.Date(2026, 7, 15, 0, 0, 0, 0, time.Local))
	sunday := monday.AddDate(0, 0, 6)
	nextMonday := monday.AddDate(0, 0, 7)

	first, err := svc.SignIn(SignInCommand{UserID: 2, Today: sunday.Format(dateLayout)})
	if err != nil {
		t.Fatalf("sunday sign-in failed: %v", err)
	}
	if first.WeekSignedDays != 1 || first.WeekContinuousDays != 1 {
		t.Fatalf("unexpected sunday status: %+v", first)
	}

	second, err := svc.SignIn(SignInCommand{UserID: 2, Today: nextMonday.Format(dateLayout)})
	if err != nil {
		t.Fatalf("next monday sign-in failed: %v", err)
	}

	if second.WeekSignedDays != 1 {
		t.Fatalf("expected week signed days reset to 1, got %d", second.WeekSignedDays)
	}
	if second.WeekContinuousDays != 1 {
		t.Fatalf("expected week continuous days reset to 1, got %d", second.WeekContinuousDays)
	}
}

func TestSignInService_ThirdConsecutiveDayAwardsBonusPoints(t *testing.T) {
	repo := newFakeSignInRepo()
	svc := NewSignInService(repo)

	days := []string{"2026-07-20", "2026-07-21", "2026-07-22"}
	var result *SignInResult
	var err error
	for _, day := range days {
		result, err = svc.SignIn(SignInCommand{UserID: 3, Today: day})
		if err != nil {
			t.Fatalf("sign-in failed, day=%s err=%v", day, err)
		}
	}

	if result.RewardPoints != 15 {
		t.Fatalf("expected third consecutive day reward points 15, got %d", result.RewardPoints)
	}
	if result.TotalPoints != 35 {
		t.Fatalf("expected total points 35, got %d", result.TotalPoints)
	}
	if result.WeekContinuousDays != 3 {
		t.Fatalf("expected continuous days 3, got %d", result.WeekContinuousDays)
	}
}

func TestSignInService_GetWeeklySummaryBuildsSevenDays(t *testing.T) {
	repo := newFakeSignInRepo()
	svc := NewSignInService(repo)

	for _, day := range []string{"2026-07-20", "2026-07-21"} {
		if _, err := svc.SignIn(SignInCommand{UserID: 4, Today: day}); err != nil {
			t.Fatalf("sign-in failed, day=%s err=%v", day, err)
		}
	}

	summary, err := svc.GetWeeklySummary(4, "2026-07-22")
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if summary.CurrentPoints != 20 {
		t.Fatalf("expected current points 20, got %d", summary.CurrentPoints)
	}
	if summary.CheckedInDaysThisWeek != 2 {
		t.Fatalf("expected checked in days 2, got %d", summary.CheckedInDaysThisWeek)
	}
	if summary.CurrentStreakDays != 2 {
		t.Fatalf("expected current streak days 2, got %d", summary.CurrentStreakDays)
	}
	if len(summary.WeeklyRecords) != 7 {
		t.Fatalf("expected 7 weekly records, got %d", len(summary.WeeklyRecords))
	}
	if summary.WeeklyRecords[0].Weekday != "周一" || !summary.WeeklyRecords[0].CheckedIn || summary.WeeklyRecords[0].AwardedPoints != 10 || summary.WeeklyRecords[0].Status != "checked_in" {
		t.Fatalf("unexpected monday record: %+v", summary.WeeklyRecords[0])
	}
	if summary.WeeklyRecords[2].Weekday != "周三" || summary.WeeklyRecords[2].CheckedIn || summary.WeeklyRecords[2].AwardedPoints != 0 || summary.WeeklyRecords[2].Status != "pending" {
		t.Fatalf("unexpected wednesday record: %+v", summary.WeeklyRecords[2])
	}
}

type fakeSignInRepo struct {
	users map[int64]*fakeUserState
}

type fakeUserState struct {
	totalPoints        int
	weekContinuousDays int
	lastSignInDate     *time.Time
	records            map[string]int
}

func newFakeSignInRepo() *fakeSignInRepo {
	return &fakeSignInRepo{
		users: map[int64]*fakeUserState{},
	}
}

func (r *fakeSignInRepo) GetStatus(_ context.Context, userID int64, today time.Time) (*signInSnapshot, error) {
	state := r.ensureUser(userID)
	weekStartDate := weekStart(today)
	weekDays := r.weekRecords(state.records, weekStartDate)

	return &signInSnapshot{
		RewardPoints:       rewardPointsForStreak(nextWeekContinuousDays(state.lastSignInDate, state.weekContinuousDays, today, weekStartDate)),
		TotalPoints:        state.totalPoints,
		SignedToday:        containsDate(extractRecordDates(weekDays), today),
		WeekSignedDays:     len(weekDays),
		WeekContinuousDays: normalizeWeekContinuousDays(state.lastSignInDate, state.weekContinuousDays, weekStartDate),
		SignedDates:        formatDates(extractRecordDates(weekDays)),
	}, nil
}

func (r *fakeSignInRepo) SignIn(_ context.Context, userID int64, today time.Time) (*signInSnapshot, error) {
	state := r.ensureUser(userID)
	dayKey := truncateDate(today).Format(dateLayout)
	if _, exists := state.records[dayKey]; exists {
		return r.GetStatus(context.Background(), userID, today)
	}

	weekStartDate := weekStart(today)
	state.weekContinuousDays = nextWeekContinuousDays(state.lastSignInDate, state.weekContinuousDays, today, weekStartDate)
	rewardPoints := rewardPointsForStreak(state.weekContinuousDays)
	state.totalPoints += rewardPoints
	state.records[dayKey] = rewardPoints
	lastDate := truncateDate(today)
	state.lastSignInDate = &lastDate

	status, err := r.GetStatus(context.Background(), userID, today)
	if err != nil {
		return nil, err
	}
	status.Awarded = true
	status.SignedToday = true
	return status, nil
}

func (r *fakeSignInRepo) GetPointsSummary(_ context.Context, userID int64, today time.Time) (*PointsSummaryResult, error) {
	status, err := r.GetStatus(context.Background(), userID, today)
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

func (r *fakeSignInRepo) GetWeeklySummary(_ context.Context, userID int64, today time.Time) (*WeeklySummaryResult, error) {
	state := r.ensureUser(userID)
	return buildWeeklySummaryResult(
		state.totalPoints,
		len(r.weekRecords(state.records, weekStart(today))),
		normalizeWeekContinuousDays(state.lastSignInDate, state.weekContinuousDays, weekStart(today)),
		r.weekRecords(state.records, weekStart(today)),
		weekStart(today),
	), nil
}

func (r *fakeSignInRepo) ensureUser(userID int64) *fakeUserState {
	state, ok := r.users[userID]
	if ok {
		return state
	}

	state = &fakeUserState{
		records: map[string]int{},
	}
	r.users[userID] = state
	return state
}

func (r *fakeSignInRepo) weekRecords(records map[string]int, weekStartDate time.Time) []weeklySignInRecord {
	result := make([]weeklySignInRecord, 0, len(records))
	for dayKey, points := range records {
		day, err := time.ParseInLocation(dateLayout, dayKey, time.Local)
		if err != nil {
			continue
		}
		if sameDate(weekStart(day), weekStartDate) {
			result = append(result, weeklySignInRecord{
				SignInDate:     day,
				PointsAwarded:  points,
			})
		}
	}
	return result
}
