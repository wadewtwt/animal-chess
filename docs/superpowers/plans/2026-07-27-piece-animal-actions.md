# Piece Animal Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击斗兽棋棋子时，棋子播放专属动物展示动作，形成类似魔法棋子的生命感。

**Architecture:** 动作配置集中在 `PieceActionConfig.ts`，`BoardView` 负责预加载序列帧并在点击时分发，`PieceView` 负责播放序列帧或程序化降级动作。素材放在 `assets/resources/animal_actions/<animal>/show_00.png` 到 `show_07.png`，缺失时不影响对局。

**Tech Stack:** Cocos Creator 3.8.7、TypeScript、Cocos `resources.load`、`SpriteFrame`、`tween`。

---

### Task 1: 动作配置与资源约定

**Files:**
- Create: `animal-chess-client/assets/scripts/ui/PieceActionConfig.ts`
- Create: `animal-chess-client/tests/piece_action_config_test.mjs`

- [x] **Step 1: 写失败测试**

```js
import assert from 'node:assert/strict';
import {
  ACTION_FRAME_COUNT,
  ANIMAL_ACTION_CONFIGS,
  getActionFramePaths,
} from '../dist-test/PieceActionConfig.js';

assert.equal(ACTION_FRAME_COUNT, 8);
assert.equal(ANIMAL_ACTION_CONFIGS.length, 8);
assert.deepEqual(getActionFramePaths('lion'), [
  'animal_actions/lion/show_00/spriteFrame',
  'animal_actions/lion/show_01/spriteFrame',
  'animal_actions/lion/show_02/spriteFrame',
  'animal_actions/lion/show_03/spriteFrame',
  'animal_actions/lion/show_04/spriteFrame',
  'animal_actions/lion/show_05/spriteFrame',
  'animal_actions/lion/show_06/spriteFrame',
  'animal_actions/lion/show_07/spriteFrame',
]);
```

- [x] **Step 2: 运行测试确认失败**

Run: `node animal-chess-client/tests/piece_action_config_test.mjs`
Expected: FAIL，因为 `dist-test/PieceActionConfig.js` 尚不存在。

- [x] **Step 3: 实现配置模块**

定义 8 种动物的名称、展示动作风格、路径生成函数和程序化降级曲线。

### Task 2: PieceView 播放展示动作

**Files:**
- Modify: `animal-chess-client/assets/scripts/ui/PieceView.ts`

- [x] **Step 1: 增加展示动作 API**

新增 `playShowAction(frames, motion)`：优先播放序列帧；如果帧缺失，则执行抬头、前扑、震动、蓄力等程序化动作。

- [x] **Step 2: 状态互斥**

移动、攻击、被吃、取消选中时调用 `stopShowAction()`，防止动画状态互相覆盖。

### Task 3: BoardView 加载和触发

**Files:**
- Modify: `animal-chess-client/assets/scripts/ui/BoardView.ts`

- [x] **Step 1: 预加载动作帧**

`start()` 中并行加载棋子静态图和动作图。动作帧失败只 `console.warn`，保留程序化降级。

- [x] **Step 2: 点击触发**

`onPieceClicked()` 在播放动物音效后，调用 `playPieceShowAction(piece)`。敌方吃子点击仍保持规则优先。

### Task 4: 首批动作素材

**Files:**
- Create: `animal-chess-client/assets/resources/animal_actions/**`
- Create: `animal-chess-client/tools/generate_action_frames.py`

- [x] **Step 1: 生成可用序列帧**

当前环境没有可直接调用的图片生成工具，因此先用已有 `assets/textures/animals/*.png` 和 Pillow 生成 8 帧程序化 PNG 序列，确保 Cocos 可加载和播放。

- [x] **Step 2: 后续 AI 替换约定**

保持相同文件名即可无代码替换：`show_00.png` 到 `show_07.png`。

### Task 5: 验证

**Files:**
- Verify: `animal-chess-client/assets/scripts/ui/*.ts`
- Verify: `animal-chess-client/assets/resources/animal_actions/**`

- [x] **Step 1: 运行配置测试**

Run: `node animal-chess-client/tests/piece_action_config_test.mjs`
Expected: PASS。

- [x] **Step 2: 运行 TypeScript 类型检查**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: PASS。
