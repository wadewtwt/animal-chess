export interface BoardTransitionConfig {
    totalDurationSeconds: number;
    boardIntroScale: number;
    leafSweepCount: number;
    pieceDelayBaseSeconds: number;
    pieceDelayStepSeconds: number;
    pieceDelayMaxSeconds: number;
}

export const BOARD_TRANSITION_CONFIG: BoardTransitionConfig = {
    totalDurationSeconds: 0.92,
    boardIntroScale: 0.9,
    leafSweepCount: 10,
    pieceDelayBaseSeconds: 0.18,
    pieceDelayStepSeconds: 0.015,
    pieceDelayMaxSeconds: 0.645,
};

export function getPieceCascadeDelay(pieceIndex: number): number {
    const safeIndex = Number.isFinite(pieceIndex) ? Math.max(0, pieceIndex) : 0;
    const delay = BOARD_TRANSITION_CONFIG.pieceDelayBaseSeconds
        + safeIndex * BOARD_TRANSITION_CONFIG.pieceDelayStepSeconds;
    return Number(Math.min(delay, BOARD_TRANSITION_CONFIG.pieceDelayMaxSeconds).toFixed(3));
}

export function getTransitionTitle(isAIMode: boolean): string {
    return isAIMode ? '挑战开始' : '本地双人';
}
