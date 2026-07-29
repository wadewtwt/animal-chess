import { AuthManager } from './AuthManager';
import { HttpClient } from './HttpClient';
import { mapWeeklySummaryToSignInStatus } from './SignInWeeklySummaryMapper';
import type { SignInStatusResponse, WeeklySummaryResponse } from './SignInWeeklySummaryMapper';

export type { SignInStatusResponse, WeeklyRecordResponse, WeeklySummaryResponse } from './SignInWeeklySummaryMapper';

export interface SignInResponse extends SignInStatusResponse {
    awarded: boolean;
}

export interface PointsSummaryResponse {
    totalPoints: number;
    signedToday: boolean;
    weekSignedDays: number;
    weekContinuousDays: number;
    rewardPoints: number;
}

export interface CheckInResponse {
    success: boolean;
    checkInDate: string;
    streakDays: number;
    awardedPoints: number;
}

export class SignInApi {
    public static async fetchStatus(): Promise<SignInStatusResponse> {
        const summary = await this.fetchWeeklySummary();
        return mapWeeklySummaryToSignInStatus(summary);
    }

    public static async signIn(): Promise<SignInResponse> {
        const result = await HttpClient.post<CheckInResponse>('/api/animal-chess/check-in', {}, AuthManager.getToken());
        const summary = await this.fetchWeeklySummary();
        return {
            ...mapWeeklySummaryToSignInStatus(summary, result.awardedPoints),
            awarded: result.success,
        };
    }

    public static async fetchPointsSummary(): Promise<PointsSummaryResponse> {
        const summary = await this.fetchWeeklySummary();
        const status = mapWeeklySummaryToSignInStatus(summary);
        return {
            totalPoints: status.totalPoints,
            signedToday: status.signedToday,
            weekSignedDays: status.weekSignedDays,
            weekContinuousDays: status.weekContinuousDays,
            rewardPoints: status.rewardPoints,
        };
    }

    private static async fetchWeeklySummary(): Promise<WeeklySummaryResponse> {
        return HttpClient.get<WeeklySummaryResponse>('/api/animal-chess/checkin/weekly-summary', AuthManager.getToken());
    }
}
