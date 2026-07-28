export const MATCH_DURATION_MIN_SECONDS = 3;
export const MATCH_DURATION_MAX_SECONDS = 5;

export function getMatchDuration(random: () => number = Math.random): number {
    const range = MATCH_DURATION_MAX_SECONDS - MATCH_DURATION_MIN_SECONDS + 1;
    const randomValue = Math.min(Math.max(random(), 0), 0.999999);
    return MATCH_DURATION_MIN_SECONDS + Math.floor(randomValue * range);
}

export function getMatchStatusText(elapsedSeconds: number): string {
    if (elapsedSeconds >= 4) {
        return '即将进入对局';
    }

    if (elapsedSeconds >= 2) {
        return '正在确认对手信息';
    }

    return '正在搜寻合适的对手';
}
