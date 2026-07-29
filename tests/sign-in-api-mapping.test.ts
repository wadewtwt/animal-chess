function assert(condition: any, message?: string) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}
assert.equal = function(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
        throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
};

import { mapWeeklySummaryToSignInStatus, type WeeklySummaryResponse } from '../animal-chess-client/assets/scripts/utils/SignInWeeklySummaryMapper';

const summary: WeeklySummaryResponse = {
    success: true,
    currentPoints: 10,
    checkedInDaysThisWeek: 1,
    currentStreakDays: 1,
    weeklyRecords: [
        { weekday: '周一', checkedIn: false, awardedPoints: 0, status: 'pending' },
        { weekday: '周二', checkedIn: false, awardedPoints: 0, status: 'pending' },
        { weekday: '周三', checkedIn: false, awardedPoints: 0, status: 'pending' },
        { weekday: '周四', checkedIn: false, awardedPoints: 0, status: 'pending' },
        { weekday: '周五', checkedIn: true, awardedPoints: 10, status: 'checked_in' },
        { weekday: '周六', checkedIn: false, awardedPoints: 0, status: 'pending' },
        { weekday: '周日', checkedIn: false, awardedPoints: 0, status: 'pending' },
    ],
};

const status = mapWeeklySummaryToSignInStatus(summary, 0, new Date('2026-07-24T09:00:00'));

assert.equal(status.signedToday, true, '周五记录已签时，今天应为已签到');
assert.equal(status.weeklyRecords?.[0].checkedIn, false, '周一不应被错误标记为已签到');
assert.equal(status.weeklyRecords?.[4].checkedIn, true, '周五应保留后端已签到状态');
assert.equal(status.rewardPoints, 10, '签到奖励应来自后端周五记录');

console.log('sign-in-api mapping tests passed');
