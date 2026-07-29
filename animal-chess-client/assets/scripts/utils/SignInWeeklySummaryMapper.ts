export interface SignInStatusResponse {
    signedToday: boolean;
    rewardPoints: number;
    totalPoints: number;
    weekSignedDays: number;
    weekContinuousDays: number;
    signedDates: string[];
    weeklyRecords?: WeeklyRecordResponse[];
}

export interface WeeklyRecordResponse {
    weekday: string;
    checkedIn: boolean;
    awardedPoints: number;
    status: string;
}

export interface WeeklySummaryResponse {
    success: boolean;
    currentPoints: number;
    checkedInDaysThisWeek: number;
    currentStreakDays: number;
    weeklyRecords: WeeklyRecordResponse[];
}

export function mapWeeklySummaryToSignInStatus(summary: WeeklySummaryResponse, latestAwardedPoints: number = 0, today: Date = new Date()): SignInStatusResponse {
    const todayRecord = getTodayWeeklyRecord(summary.weeklyRecords, today);
    const signedToday = todayRecord?.checkedIn === true;

    return {
        signedToday,
        rewardPoints: signedToday ? (latestAwardedPoints || todayRecord?.awardedPoints || 0) : 0,
        totalPoints: summary.currentPoints,
        weekSignedDays: summary.checkedInDaysThisWeek,
        weekContinuousDays: summary.currentStreakDays,
        signedDates: [],
        weeklyRecords: summary.weeklyRecords,
    };
}

function getTodayWeeklyRecord(records: WeeklyRecordResponse[], today: Date): WeeklyRecordResponse | null {
    const index = getMondayBasedWeekdayIndex(today);
    return records[index] ?? null;
}

function getMondayBasedWeekdayIndex(today: Date): number {
    const weekday = today.getDay();
    return weekday === 0 ? 6 : weekday - 1;
}
