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
assert.notEqual = function(actual: any, expected: any, message?: string) {
    if (actual === expected) {
        throw new Error(`${message || 'Assertion failed'}: expected not ${expected}, got ${actual}`);
    }
};

import {
    buildUserScopedSignInStorageKey,
    hasSignedTodayLocally,
    markSignedTodayLocally,
    shouldAutoPopupSignIn,
    type SignInStorageLike,
} from '../assets/scripts/utils/SignInLocalState';

class MemoryStorage implements SignInStorageLike {
    private readonly data = new Map<string, string>();

    getItem(key: string): string | null {
        return this.data.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.data.set(key, value);
    }
}

const today = new Date('2026-07-24T09:00:00');

assert.notEqual(
    buildUserScopedSignInStorageKey('animal_chess_total_points', 1001),
    buildUserScopedSignInStorageKey('animal_chess_total_points', 2002),
    'different users must use different cached points keys',
);

{
    const storage = new MemoryStorage();
    markSignedTodayLocally(storage, 1001, today);
    assert.equal(hasSignedTodayLocally(storage, 1001, today), true, 'user A should be signed in locally');
    assert.equal(hasSignedTodayLocally(storage, 2002, today), false, 'user B must not reuse user A sign-in state');
}

{
    const storage = new MemoryStorage();
    assert.equal(shouldAutoPopupSignIn(false, storage, today), true, '未签到时应自动弹出');
}

{
    const storage = new MemoryStorage();
    markSignedTodayLocally(storage, today);
    assert.equal(hasSignedTodayLocally(storage, today), true, '本地应记录今日已签到');
    assert.equal(shouldAutoPopupSignIn(false, storage, today), false, '今日已签到后不应再次自动弹出');
}

{
    const storage = new MemoryStorage();
    assert.equal(shouldAutoPopupSignIn(true, storage, today), false, '服务端已标记今日签到时不应自动弹出');
}

{
    // 测试从游戏退回主界面（重新初始化 UI 场景）：
    const storage = new MemoryStorage();
    const userId = 888;
    
    // 用户首次签到成功并写入本地
    markSignedTodayLocally(storage, userId, today);
    
    // 退回主界面后，即便后端返回未及到达或被预加载拦截，本地校验均保障不会自动弹出弹窗
    assert.equal(hasSignedTodayLocally(storage, userId, today), true, '退回主界面后应能读取出今日已签到');
    assert.equal(shouldAutoPopupSignIn(false, storage, userId, today), false, '退回主界面后不应再触发自动签到弹窗');
}

console.log('sign-in-local-state tests passed');
