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

import { resolveBattleScoreDisplay } from '../animal-chess-client/assets/scripts/utils/BattleScoreDisplay.ts';

{
    const result = resolveBattleScoreDisplay({
        isLocalDuo: false,
        isNetworkMode: true,
        isAIMode: false,
        isMeWinner: true,
        currentPoints: 70,
        winner: 'RED',
        networkData: { winner: 'RED', reason: 'DEN_CAPTURED' },
    });

    assert.equal(result.shouldShowPointsCard, false, '网络对战没有服务端积分结果时不应展示结算积分卡片');
    assert.equal(result.shouldUpdateCache, false, '网络对战没有服务端总积分时不应更新本地积分缓存');
}

{
    const result = resolveBattleScoreDisplay({
        isLocalDuo: false,
        isNetworkMode: true,
        isAIMode: false,
        isMeWinner: true,
        currentPoints: 70,
        winner: 'RED',
        networkData: { my_score_change: 10, my_total_points: 80 },
    });

    assert.equal(result.shouldShowPointsCard, true, '网络对战有服务端积分结果时应展示结算积分卡片');
    assert.equal(result.shouldUpdateCache, true, '网络对战有服务端总积分时应更新本地积分缓存');
    assert.equal(result.deltaPoints, 10, '积分变动应来自服务端 my_score_change');
    assert.equal(result.newPoints, 80, '最新总积分应来自服务端 my_total_points');
}

{
    const result = resolveBattleScoreDisplay({
        isLocalDuo: false,
        isNetworkMode: false,
        isAIMode: true,
        isMeWinner: true,
        currentPoints: 70,
        winner: 'RED',
    });

    assert.equal(result.shouldShowPointsCard, false, '人机模式没有后端积分结果时不应展示结算积分卡片');
    assert.equal(result.shouldUpdateCache, false, '人机模式没有后端积分结果时不应更新本地积分缓存');
}

{
    const result = resolveBattleScoreDisplay({
        isLocalDuo: false,
        isNetworkMode: false,
        isAIMode: true,
        isMeWinner: true,
        currentPoints: 70,
        winner: 'RED',
        networkData: { my_score_change: 10, my_total_points: 30 },
    });

    assert.equal(result.shouldShowPointsCard, true, '人机模式应展示后端结算积分');
    assert.equal(result.shouldUpdateCache, true, '人机模式应使用后端总积分更新缓存');
    assert.equal(result.newPoints, 30, '人机模式总积分必须以后端返回为准');
}

console.log('battle-score-cache tests passed');
