# Piece Roar Impact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击棋子时播放每种动物专属的 10 帧咆哮动画及不拦截触摸的冲击环特效。

**Architecture:** `PieceActionConfig.ts` 提供 10 帧路径和时序；`BoardView.ts` 一次性预加载并在合法点击时分发；`PieceView.ts` 管理帧播放、本体震动和临时冲击节点，停止或销毁时负责清理。图片由生成脚本按现有静态动物图衍生，保持透明背景和资源路径稳定。

**Tech Stack:** Cocos Creator 3.8.7、TypeScript、Cocos `resources.load`、`tween`、`Graphics`、Node assert。

---

### Task 1: 扩展动作配置的帧数约定

**Files:**
- Modify: `animal-chess-client/assets/scripts/ui/PieceActionConfig.ts`
- Modify: `animal-chess-client/tests/piece_action_config_test.mjs`

- [ ] **Step 1: 写失败测试**

```js
assert.equal(ACTION_FRAME_COUNT, 10);
assert.deepEqual(getActionFramePaths('lion'), [
  'animal_actions/lion/roar_00/spriteFrame',
  'animal_actions/lion/roar_01/spriteFrame',
  'animal_actions/lion/roar_02/spriteFrame',
  'animal_actions/lion/roar_03/spriteFrame',
  'animal_actions/lion/roar_04/spriteFrame',
  'animal_actions/lion/roar_05/spriteFrame',
  'animal_actions/lion/roar_06/spriteFrame',
  'animal_actions/lion/roar_07/spriteFrame',
  'animal_actions/lion/roar_08/spriteFrame',
  'animal_actions/lion/roar_09/spriteFrame',
]);
```

- [ ] **Step 2: 验证测试失败**

Run: `node animal-chess-client/tests/piece_action_config_test.mjs`

Expected: `ACTION_FRAME_COUNT` 断言失败，当前实现仍是 8 帧。

- [ ] **Step 3: 实现最小配置变更**

```ts
export const ACTION_FRAME_COUNT = 10;

export function getActionFramePaths(animalName: string): string[] {
    return Array.from({ length: ACTION_FRAME_COUNT }, (_, index) => {
        return `animal_actions/${animalName}/roar_${String(index).padStart(2, '0')}/spriteFrame`;
    });
}
```

- [ ] **Step 4: 验证测试通过**

Run: `node animal-chess-client/tests/piece_action_config_test.mjs`

Expected: `piece_action_config_test passed`。

### Task 2: 生成 10 帧咆哮素材

**Files:**
- Modify: `animal-chess-client/tools/generate_action_frames.py`
- Create: `animal-chess-client/assets/resources/animal_actions/<animal>/roar_00.png` 至 `roar_09.png`

- [ ] **Step 1: 生成每种动物的 10 帧透明 PNG**

将输出前缀设为 `roar_`、帧数设为 `10`。每帧依次体现下压、抬头、张嘴、横向震动及回弹，保留原始静态棋子图的动物外观和透明背景。

- [ ] **Step 2: 验证资源完整**

Run: `find animal-chess-client/assets/resources/animal_actions -type f -name 'roar_*.png' | wc -l`

Expected: `80`。

### Task 3: 实现独立冲击环效果

**Files:**
- Modify: `animal-chess-client/assets/scripts/ui/PieceView.ts`

- [ ] **Step 1: 写可观察的清理契约**

在 `stopShowAction()` 和 `onDestroy()` 中调用私有 `clearRoarImpact()`，保证连续点击、取消选中、移动和节点销毁均移除临时特效节点。

- [ ] **Step 2: 实现冲击环与本体震动**

在 `playShowAction()` 播放前创建 `RoarImpact` 子节点，使用 `Graphics` 绘制圆环和三条音波；用并行 tween 扩大、淡出并销毁节点。对动物 Sprite 使用极短的交替 X 位移和缩放，保持帧播放与复位行为不变。

- [ ] **Step 3: 静态检查**

Run: `cd animal-chess-client && ./node_modules/.bin/tsc --noEmit`

Expected: 无 TypeScript 错误。

### Task 4: 接入预加载与点击播放

**Files:**
- Modify: `animal-chess-client/assets/scripts/ui/BoardView.ts`

- [ ] **Step 1: 保持加载容错**

继续通过 `getActionFramePaths()` 预加载；每个动物的部分帧失败只记录警告，并交由 `PieceView` 回退到静态图加程序化咆哮。

- [ ] **Step 2: 手动验收交互**

在 Cocos 预览中点击己方 8 种动物，确认动画为“蓄力—咆哮—冲击—回弹”；快速点击、取消选中、走子和吃子后没有残留冲击环，也不阻塞格子点击。

### Task 5: 回归验证

**Files:**
- Verify: `animal-chess-client/tests/piece_action_config_test.mjs`
- Verify: `animal-chess-client/assets/scripts/ui/PieceActionConfig.ts`
- Verify: `animal-chess-client/assets/scripts/ui/PieceView.ts`
- Verify: `animal-chess-client/assets/scripts/ui/BoardView.ts`

- [ ] **Step 1: 运行配置测试**

Run: `node animal-chess-client/tests/piece_action_config_test.mjs`

Expected: `piece_action_config_test passed`。

- [ ] **Step 2: 运行类型检查**

Run: `cd animal-chess-client && ./node_modules/.bin/tsc --noEmit`

Expected: 无 TypeScript 错误。
