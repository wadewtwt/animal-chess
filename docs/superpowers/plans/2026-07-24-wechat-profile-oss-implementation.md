# 微信头像昵称与阿里云 OSS 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在微信小游戏中采集用户昵称与头像，将头像经后端转存阿里云 OSS 后保存并展示用户资料。

**Architecture:** 客户端在用户主动点击微信原生授权按钮后将昵称和微信头像 URL 提交给已鉴权接口。`my-blog-gin` 后端将 OSS 能力封装为公共工具，资料服务负责调用该工具并以 OSS URL 原子更新当前用户资料。

**Tech Stack:** Cocos Creator 3.8 TypeScript、微信小游戏 API、Go、Gin、GORM、阿里云 OSS SDK。

---

### Task 1: 后端公共 OSS 工具与配置

**Files:**
- Create: `D:/work/ai/wt-blog-main/my-blog-gin/internal/pkg/objectstorage/oss.go`
- Create: `D:/work/ai/wt-blog-main/my-blog-gin/internal/pkg/objectstorage/oss_test.go`
- Modify: `D:/work/ai/wt-blog-main/my-blog-gin/go.mod`

- [ ] **Step 1: 写入 OSS 配置缺失的失败测试**

```go
func TestNewOSSClient_ReturnsConfigErrorWhenEndpointMissing(t *testing.T) {
    _, err := NewOSSClient(Config{})
    if !errors.Is(err, ErrConfigMissing) {
        t.Fatalf("expected ErrConfigMissing, got %v", err)
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./internal/pkg/objectstorage -run TestNewOSSClient_ReturnsConfigErrorWhenEndpointMissing -v`

Expected: FAIL，因为 `NewOSSClient` 与 `ErrConfigMissing` 尚不存在。

- [ ] **Step 3: 实现独立 OSS 客户端**

```go
type Config struct {
    Endpoint        string
    Bucket          string
    AccessKeyID     string
    AccessKeySecret string
}

type Client interface {
    UploadImage(ctx context.Context, objectKey, contentType string, body io.Reader) (string, error)
}
```

从环境变量创建 `Config`；对象键由服务端生成，禁止业务层或客户端传入 Access Key、Secret 或 Bucket。

- [ ] **Step 4: 运行工具测试**

Run: `go test ./internal/pkg/objectstorage -v`

Expected: PASS，测试使用假 Bucket 客户端，不访问真实 OSS。

- [ ] **Step 5: 提交公共工具改动**

```bash
git add internal/pkg/objectstorage go.mod go.sum
git commit -m "feat: add reusable aliyun oss client"
```

### Task 2: 后端资料更新和头像转存

**Files:**
- Modify: `D:/work/ai/wt-blog-main/my-blog-gin/internal/service/wx_user_profile.go`
- Modify: `D:/work/ai/wt-blog-main/my-blog-gin/internal/controller/wx_user_profile.go`
- Modify: `D:/work/ai/wt-blog-main/my-blog-gin/internal/router/router.go`
- Test: `D:/work/ai/wt-blog-main/my-blog-gin/internal/service/wx_user_profile_test.go`
- Test: `D:/work/ai/wt-blog-main/my-blog-gin/internal/controller/wx_user_profile_test.go`

- [ ] **Step 1: 写入“当前用户头像 URL 转存成功”的失败测试**

```go
func TestUpdateWxUserProfile_StoresUploadedAvatarURL(t *testing.T) {
    syncWxAvatarFromURLFunc = func(userID int64, appName, sourceURL string) (string, error) {
        return "https://cdn.example.com/avatars/1/avatar.jpg", nil
    }
    avatarURL := "https://wx.qlogo.cn/mmopen/example/0"
    user, err := UpdateWxUserProfile(1, "animal_chess", SaveWxUserProfileRequest{AvatarURL: &avatarURL})
    if err != nil || user.AvatarURL != "https://cdn.example.com/avatars/1/avatar.jpg" {
        t.Fatalf("unexpected result: user=%+v err=%v", user, err)
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `go test ./internal/service -run TestUpdateWxUserProfile_StoresUploadedAvatarURL -v`

Expected: FAIL，因为头像同步尚未在资料更新路径中调用。

- [ ] **Step 3: 实现最小资料更新流程**

```go
// userID 和 appName 仅由 JWT middleware 上下文提供。
func UpdateWxUserProfile(userID int64, appName string, req SaveWxUserProfileRequest) (*model.WxUser, error) {
    // 校验昵称、HTTPS 微信头像 URL、大小和图片 MIME。
    // 转存成功后再调用 SaveWxUserProfile，失败时不写数据库。
}
```

接口固定为 `PUT /api/wx/profile`，不接收 `userId`。OSS 未配置返回 503；无鉴权返回 401；无有效字段或非法 URL 返回 400。

- [ ] **Step 4: 运行服务与控制器测试**

Run: `go test ./internal/service ./internal/controller -v`

Expected: PASS，覆盖未鉴权、空字段、非法来源 URL、OSS 配置缺失、上传失败与成功响应。

- [ ] **Step 5: 提交资料接口改动**

```bash
git add internal/service/wx_user_profile.go internal/controller/wx_user_profile.go internal/router/router.go internal/service/wx_user_profile_test.go internal/controller/wx_user_profile_test.go
git commit -m "feat: save wechat profile avatars to oss"
```

### Task 3: 客户端资料 API 与本地缓存

**Files:**
- Modify: `D:/work/ai/animal-chess/animal-chess-client/assets/scripts/utils/AuthManager.ts`
- Create: `D:/work/ai/animal-chess/animal-chess-client/assets/scripts/utils/UserProfileApi.ts`

- [ ] **Step 1: 写入资料 API 的失败调用测试或开发环境请求断言**

```ts
await UserProfileApi.update({ nickname: '玩家', avatarUrl: 'https://wx.qlogo.cn/mmopen/example/0' });
// 断言请求为 PUT /api/wx/profile，且 Authorization 来自 AuthManager.getToken()。
```

- [ ] **Step 2: 确认当前 HttpClient 不支持 PUT**

Run: `rg -n "'GET' \| 'POST'" animal-chess-client/assets/scripts/utils/HttpClient.ts`

Expected: 命中当前方法类型定义，说明需要最小扩展 PUT 支持。

- [ ] **Step 3: 实现最小客户端 API**

```ts
public static async updateProfile(profile: { nickname: string; avatarUrl: string }): Promise<LoginUserSummary> {
    const response = await HttpClient.put<{ user: LoginUserSummary }>('/api/wx/profile', profile, this.getToken());
    sys.localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
    return response.user;
}
```

`HttpClient` 仅增加 `PUT`，保持现有请求头、错误映射和微信/浏览器分支不变。

- [ ] **Step 4: 在 Cocos Creator 中编译并确认无 TypeScript 错误**

Run: 使用 Cocos Creator 打开 `animal-chess-client` 并执行脚本编译。

Expected: 无 `HttpClient.put` 或接口类型错误。

- [ ] **Step 5: 提交客户端 API 改动**

```bash
git add animal-chess-client/assets/scripts/utils/HttpClient.ts animal-chess-client/assets/scripts/utils/AuthManager.ts animal-chess-client/assets/scripts/utils/UserProfileApi.ts
git commit -m "feat: add wechat profile update api"
```

### Task 4: 主菜单首次资料授权弹层

**Files:**
- Create: `D:/work/ai/animal-chess/animal-chess-client/assets/scripts/ui/MainMenuProfileOverlay.ts`
- Modify: `D:/work/ai/animal-chess/animal-chess-client/assets/scripts/ui/MainMenuUI.ts`

- [ ] **Step 1: 写入授权完成后的失败交互验证**

```ts
// 模拟 createUserInfoButton 的 onTap 回调返回 userInfo。
// 断言调用 UserProfileApi.update，并将返回资料写回 AuthManager 缓存。
```

- [ ] **Step 2: 在微信开发者工具确认授权按钮尚不存在**

Run: 进入主菜单并检查原生层。

Expected: 不出现“完善游戏资料”弹层和 `wx.createUserInfoButton`。

- [ ] **Step 3: 实现可跳过的授权弹层与原生按钮生命周期**

```ts
// show 时创建并显示 wx.createUserInfoButton；hide、destroy 与场景退出时调用 button.destroy()。
// 授权成功后 await AuthManager.updateProfile(...)；失败仅提示并保留重试入口。
```

仅在微信环境创建原生按钮；首次资料为空时展示弹层；跳过不影响签到、登录或开始游戏。

- [ ] **Step 4: 微信开发者工具和真机验证**

Run: 授权、拒绝授权、跳过、OSS 未配置、OSS 成功五种流程。

Expected: 游戏均可继续；成功后主菜单显示服务端返回的昵称与 OSS 头像 URL。

- [ ] **Step 5: 提交主菜单改动**

```bash
git add animal-chess-client/assets/scripts/ui/MainMenuProfileOverlay.ts animal-chess-client/assets/scripts/ui/MainMenuUI.ts
git commit -m "feat: request wechat profile from main menu"
```
