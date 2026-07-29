# 签到用户隔离实施计划

**目标：** 防止多个测试用户复用本地签到状态，并确保接口失败不会被前端显示为签到成功。

**方案：** 服务端继续以 JWT 中的 `user_id` 和 `app_name` 查询签到状态。客户端将本地日期键按当前用户 ID 隔离；只有服务端请求成功才写入该键，接口失败保留错误状态，不生成模拟积分或模拟签到结果。

**技术：** Cocos Creator、TypeScript、Node.js 临时编译验证。

---

### 任务 1：本地签到状态按用户隔离

**文件：**
- 修改：`animal-chess-client/assets/scripts/utils/SignInLocalState.ts`
- 新增：`animal-chess-client/dev/sign-in-local-state.test.ts`

- [ ] 先写失败测试：用户 A 的签到日期不能让用户 B 显示已签到。
- [ ] 运行测试，确认现有全局键导致测试失败。
- [ ] 为本地状态函数增加 `userId` 参数，并用用户 ID 构造存储键。
- [ ] 再次运行测试，确认两个用户状态隔离。

### 任务 2：调用服务端状态时不覆盖其结果

**文件：**
- 修改：`animal-chess-client/assets/scripts/ui/MainMenuUI.ts`

- [ ] 将本地签到标记的读取与写入改为传入当前已登录用户 ID。
- [ ] 仅在服务端签到请求成功后写入本地标记。
- [ ] 删除初始化和签到失败后的模拟成功结果；失败时保留未签到状态并提示用户。

### 任务 3：验证

**文件：**
- 验证：`animal-chess-client/dev/sign-in-local-state.test.ts`
- 验证：`wt-blog-main/my-blog-gin/internal/service/animalChess/check_in.go`

- [ ] 运行客户端用户隔离测试。
- [ ] 运行后端签到模块的定向测试；若本机 Go 架构仍无法执行，记录实际错误。
