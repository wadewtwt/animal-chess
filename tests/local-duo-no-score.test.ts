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

class MemoryStorage {
    private readonly data = new Map<string, string>();

    getItem(key: string): string | null {
        return this.data.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.data.set(key, value);
    }
}

/**
 * 模拟在对局结束结算逻辑中，针对不同游戏模式计算并更新积分的辅助判断
 */
function handleGameOverScore(isNetworkMode: boolean, isAIMode: boolean, storage: MemoryStorage): { pointsUpdated: boolean; isLocalDuo: boolean } {
    const isLocalDuo = !isNetworkMode && !isAIMode;
    
    // 本地双人模式下无积分概念，禁止写入与变动
    if (isLocalDuo) {
        return { pointsUpdated: false, isLocalDuo: true };
    }

    // 非本地双人模式触发积分更新
    storage.setItem('animal_chess_total_points', '110');
    return { pointsUpdated: true, isLocalDuo: false };
}

// 验证本地双人模式逻辑
{
    const storage = new MemoryStorage();
    storage.setItem('animal_chess_total_points', '100');

    // 运行本地双人模式 (isNetworkMode=false, isAIMode=false)
    const result = handleGameOverScore(false, false, storage);

    assert.equal(result.isLocalDuo, true, '应当被判定为本地双人模式');
    assert.equal(result.pointsUpdated, false, '本地双人模式下不应触发积分更新');
    assert.equal(storage.getItem('animal_chess_total_points'), '100', '本地双人模式结算后积分存储必须保持原值不变');
}

// 验证网络模式逻辑
{
    const storage = new MemoryStorage();
    storage.setItem('animal_chess_total_points', '100');

    const result = handleGameOverScore(true, false, storage);

    assert.equal(result.isLocalDuo, false, '网络模式不应判定为本地双人');
    assert.equal(result.pointsUpdated, true, '网络模式应当触发积分更新');
    assert.equal(storage.getItem('animal_chess_total_points'), '110', '网络模式结算后积分存储应正确更新');
}

console.log('local-duo-no-score tests passed successfully');
