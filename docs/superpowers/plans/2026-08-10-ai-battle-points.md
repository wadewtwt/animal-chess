# 人机对局积分结算 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让人机对局以博客后端的结算结果更新积分，并使人机、匹配和房间对局共用每日赢分与输分各 100 分上限。

**Architecture:** 后端在现有 `animal_chess_battle_record` 中用 `mode=ai` 和占位 AI 用户 ID `0` 记录人机对局。新增独立的 AI 结算动作路由，由登录用户身份决定唯一真实玩家；客户端在 AI 对局结束后调用该接口，并仅使用成功响应更新积分卡片和缓存。

**Tech Stack:** Go、Gin、GORM、PostgreSQL、Cocos Creator、TypeScript、Fetch API。

---

### Task 1: 后端 AI 积分规则测试

**Files:**
- Modify: `D:/work/ai/wt-blog-main/my-blog-gin/internal/service/animalChess/battle_test.go`
- Modify: `D:/work/ai/wt-blog-main/my-blog-gin/internal/service/animalChess/points_test.go`

- [ ] **Step 1: 写入失败测试**

为 `SettleAIBattle` 增加四个用例：AI 胜利给用户加 10 分、AI 失败扣用户 10 分但不低于 0、同一 `roomID` 重复结算返回 `ErrAnimalChessRoomAlreadySettled`、跨 `room`/`match`/`ai` 的当日累计赢分和输分分别不超过 100。

```go
result, err := SettleAIBattle(appName, "ai_room_1", userID, true, now)
if err != nil || result.PlayerScoreChange != 10 || result.PlayerCurrentPoints != 10 {
    t.Fatalf("unexpected AI win settlement: result=%+v err=%v", result, err)
}
```

- [ ] **Step 2: 运行失败测试**

Run: `GOOS=windows GOARCH=amd64 go test ./internal/service/animalChess -run 'Test(SettleAIBattle|DailyBattlePoints)' -count=1`

Expected: FAIL，因为 `SettleAIBattle` 与统一双向额度尚未实现。

- [ ] **Step 3: 实现 AI 结算与统一额度**

在 `battle.go` 增加 `ModeAI = "ai"`、`SettleAIBattle(appName, roomID, userID, playerWon, now)` 和每日赢分/输分统计方法。AI 胜利写入 `winner_id=userID, loser_id=0, winner_score_change=+N`；AI 失败写入 `winner_id=0, loser_id=userID, loser_score_change=-N`。`N` 受用户当前积分、当日同一应用的总赢分或总输分剩余额度限制。

房间和匹配结算改为使用同一统计方法，而非现有按 `mode` 的每日赢分统计；写入记录、明细和汇总继续使用一个数据库事务。

- [ ] **Step 4: 运行服务层测试**

Run: `GOOS=windows GOARCH=amd64 go test ./internal/service/animalChess -count=1`

Expected: PASS。

### Task 2: 后端 AI 结算接口测试与实现

**Files:**
- Modify: `D:/work/ai/wt-blog-main/my-blog-gin/internal/controller/animalChess/battle.go`
- Modify: `D:/work/ai/wt-blog-main/my-blog-gin/internal/controller/animalChess/battle_test.go`
- Modify: `D:/work/ai/wt-blog-main/my-blog-gin/internal/router/router.go`

- [ ] **Step 1: 写入失败测试**

添加 `POST /api/animal-chess/battle/settle-ai` 控制器测试：从上下文读取 `userId` 和 `userAppName`，成功时返回 `playerScoreChange` 和 `playerCurrentPoints`；缺少 `roomId` 返回 400；service 返回重复结算错误时返回 409。

- [ ] **Step 2: 运行失败测试**

Run: `GOOS=windows GOARCH=amd64 go test ./internal/controller/animalChess -run TestSettleAIBattle -count=1`

Expected: FAIL，因为路由和控制器尚未定义。

- [ ] **Step 3: 实现显式 AI 动作接口**

增加 `SettleAIBattleRequest{RoomID string, PlayerWon bool}` 与 controller 方法；该方法只使用当前登录用户 ID 调用 service，保留现有错误日志格式。注册 POST `/animal-chess/battle/settle-ai`，不修改既有对战路由。

- [ ] **Step 4: 运行控制器测试**

Run: `GOOS=windows GOARCH=amd64 go test ./internal/controller/animalChess -count=1`

Expected: PASS。

### Task 3: 客户端以服务端 AI 结算结果更新积分

**Files:**
- Create: `D:/work/ai/animal-chess/animal-chess-client/assets/scripts/utils/AIBattleApi.ts`
- Modify: `D:/work/ai/animal-chess/animal-chess-client/assets/scripts/ui/BoardView.ts`
- Modify: `D:/work/ai/animal-chess/tests/battle-score-cache.test.ts`

- [ ] **Step 1: 写入失败测试**

扩展积分显示测试：AI 模式在没有服务端 `my_total_points` 时隐藏积分卡且不写缓存；收到 AI 接口返回的 `playerScoreChange` 与 `playerCurrentPoints` 后展示并以返回总积分更新缓存。

- [ ] **Step 2: 运行失败测试**

Run: `npx tsx tests/battle-score-cache.test.ts`

Expected: FAIL，因为 AI 模式仍按本地 `currentPoints + deltaPoints` 计算。

- [ ] **Step 3: 实现客户端 API 与结算调用**

`AIBattleApi.ts` 使用 `HttpClient.post` 与 `AuthManager.getToken()` 调用 `/api/animal-chess/battle/settle-ai`。`BoardView` 在 AI 对局结束时生成唯一 `roomId`，等待 API 成功响应后展示结算卡；失败时记录错误且不修改 `animal_chess_total_points`。

- [ ] **Step 4: 运行客户端测试**

Run: `npx tsx tests/battle-score-cache.test.ts`

Expected: PASS。

### Task 4: 全量验证与交接

**Files:**
- Modify: `D:/work/ai/animal-chess/MEMORY.md`

- [ ] **Step 1: 运行后端完整测试与构建**

Run: `GOOS=windows GOARCH=amd64 go test ./internal/service/animalChess ./internal/controller/animalChess -count=1`

Run: `GOOS=windows GOARCH=amd64 go build ./...`

Expected: PASS。

- [ ] **Step 2: 记录长期约束**

在 `MEMORY.md` 记录：AI 对局积分必须以后端 AI 结算响应为唯一来源；每日赢分、输分上限跨 AI、匹配和房间模式共享。

- [ ] **Step 3: 检查差异**

Run: `git diff --check`

Expected: 无空白错误。按用户要求，不创建 Git 提交。
