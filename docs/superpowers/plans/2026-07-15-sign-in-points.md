# Animal Chess Sign-In Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build WeChat-based sign-in points for `animal-chess`, including login, weekly sign-in tracking, concurrency-safe point awarding, main-menu sign-in UI, and success celebration animation.

**Architecture:** Keep the existing WebSocket room service intact and add a parallel HTTP business layer inside `animal-chess-server` for WeChat login, token auth, sign-in status, and point updates. On the client, add a small auth/API layer plus a focused main-menu sign-in UI flow that auto-opens for unsigned users and reuses the existing menu visual language.

**Tech Stack:** Go 1.23, Gorilla WebSocket, new HTTP handlers and SQL-backed persistence in `animal-chess-server`; Cocos Creator 3.8 TypeScript UI scripts in `animal-chess-client`.

---

## File Map

### Server

- Modify: `animal-chess-server/go.mod`
- Modify: `animal-chess-server/main.go`
- Create: `animal-chess-server/config.go`
- Create: `animal-chess-server/database.go`
- Create: `animal-chess-server/schema.sql`
- Create: `animal-chess-server/auth_http.go`
- Create: `animal-chess-server/auth_middleware.go`
- Create: `animal-chess-server/wechat_auth_service.go`
- Create: `animal-chess-server/token_service.go`
- Create: `animal-chess-server/user_repository.go`
- Create: `animal-chess-server/sign_in_repository.go`
- Create: `animal-chess-server/points_repository.go`
- Create: `animal-chess-server/sign_in_service.go`
- Create: `animal-chess-server/sign_in_http.go`
- Test: `animal-chess-server/sign_in_service_test.go`
- Test: `animal-chess-server/token_service_test.go`

### Client

- Modify: `animal-chess-client/assets/scripts/ui/MainMenuUI.ts`
- Modify: `animal-chess-client/assets/scripts/utils/NetworkManager.ts`
- Create: `animal-chess-client/assets/scripts/utils/AuthManager.ts`
- Create: `animal-chess-client/assets/scripts/utils/HttpClient.ts`
- Create: `animal-chess-client/assets/scripts/utils/SignInApi.ts`
- Create: `animal-chess-client/assets/scripts/ui/MainMenuSignInOverlay.ts`
- Create: `animal-chess-client/assets/scripts/ui/SignInSuccessAnimation.ts`

### Docs

- Modify: `animal-chess/docs/superpowers/specs/2026-07-15-sign-in-points-design.md`
- Create: `animal-chess/docs/superpowers/verification/2026-07-15-sign-in-points-checklist.md`

## Task 1: Prepare Server Dependencies and HTTP Bootstrap

**Files:**
- Modify: `animal-chess-server/go.mod`
- Modify: `animal-chess-server/main.go`
- Create: `animal-chess-server/config.go`
- Create: `animal-chess-server/database.go`
- Create: `animal-chess-server/schema.sql`

- [ ] **Step 1: Write the failing server bootstrap test**

```go
package main

import "testing"

func TestBuildHTTPHandler_NotNil(t *testing.T) {
	hub := NewHub()
	handler, err := buildHTTPHandler(hub)
	if err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}
	if handler == nil {
		t.Fatal("expected handler, got nil")
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./...`
Expected: FAIL with `undefined: buildHTTPHandler`

- [ ] **Step 3: Add minimal server bootstrap implementation**

```go
func buildHTTPHandler(hub *Hub) (http.Handler, error) {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	return mux, nil
}
```

- [ ] **Step 4: Expand bootstrap to load config and DB**

```go
type AppConfig struct {
	ListenAddr         string
	MySQLDSN           string
	WechatAppID        string
	WechatAppSecret    string
	TokenSigningSecret string
}

type App struct {
	Config AppConfig
	DB     *sql.DB
	Hub    *Hub
}
```

- [ ] **Step 5: Add schema for sign-in tables**

```sql
CREATE TABLE IF NOT EXISTS animal_chess_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(128) NOT NULL,
  unionid VARCHAR(128) DEFAULT NULL,
  nickname VARCHAR(128) NOT NULL DEFAULT '',
  avatar_url VARCHAR(512) NOT NULL DEFAULT '',
  total_points INT NOT NULL DEFAULT 0,
  week_continuous_sign_days INT NOT NULL DEFAULT 0,
  last_sign_in_date DATE DEFAULT NULL,
  last_login_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uk_animal_chess_user_openid (openid)
);
```

- [ ] **Step 6: Run server tests**

Run: `go test ./...`
Expected: PASS or next failing test only from future tasks

- [ ] **Step 7: Commit**

```bash
git -C D:\work\ai\animal-chess add animal-chess-server/go.mod animal-chess-server/main.go animal-chess-server/config.go animal-chess-server/database.go animal-chess-server/schema.sql
git -C D:\work\ai\animal-chess commit -m "feat: bootstrap sign-in http server"
```

## Task 2: Implement WeChat Login and Token Auth

**Files:**
- Create: `animal-chess-server/auth_http.go`
- Create: `animal-chess-server/auth_middleware.go`
- Create: `animal-chess-server/wechat_auth_service.go`
- Create: `animal-chess-server/token_service.go`
- Create: `animal-chess-server/user_repository.go`
- Test: `animal-chess-server/token_service_test.go`

- [ ] **Step 1: Write the failing token service test**

```go
func TestTokenService_IssueAndParse(t *testing.T) {
	svc := NewTokenService("test-secret")
	token, err := svc.Issue(UserClaims{UserID: 1, OpenID: "openid-1"})
	if err != nil {
		t.Fatalf("issue token failed: %v", err)
	}
	claims, err := svc.Parse(token)
	if err != nil {
		t.Fatalf("parse token failed: %v", err)
	}
	if claims.OpenID != "openid-1" {
		t.Fatalf("expected openid-1, got %s", claims.OpenID)
	}
}
```

- [ ] **Step 2: Run token test to verify it fails**

Run: `go test ./... -run TestTokenService_IssueAndParse -v`
Expected: FAIL with `undefined: NewTokenService`

- [ ] **Step 3: Write minimal token implementation**

```go
type UserClaims struct {
	UserID int64  `json:"user_id"`
	OpenID string `json:"openid"`
}
```

- [ ] **Step 4: Implement WeChat login handler contract**

```go
type WxLoginRequest struct {
	Code string `json:"code"`
}

type WxLoginResponse struct {
	Token string      `json:"token"`
	User  UserSummary `json:"user"`
}
```

- [ ] **Step 5: Register login route**

```go
mux.HandleFunc("/api/auth/wx/login", app.handleWxLogin)
```

- [ ] **Step 6: Run all server tests**

Run: `go test ./...`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git -C D:\work\ai\animal-chess add animal-chess-server/auth_http.go animal-chess-server/auth_middleware.go animal-chess-server/wechat_auth_service.go animal-chess-server/token_service.go animal-chess-server/user_repository.go animal-chess-server/token_service_test.go animal-chess-server/main.go
git -C D:\work\ai\animal-chess commit -m "feat: add wechat login and token auth"
```

## Task 3: Implement Concurrency-Safe Sign-In and Points Services

**Files:**
- Create: `animal-chess-server/sign_in_repository.go`
- Create: `animal-chess-server/points_repository.go`
- Create: `animal-chess-server/sign_in_service.go`
- Create: `animal-chess-server/sign_in_http.go`
- Test: `animal-chess-server/sign_in_service_test.go`
- Modify: `animal-chess-server/schema.sql`

- [ ] **Step 1: Write the failing sign-in idempotency test**

```go
func TestSignInService_SameDayOnlyAwardsOnce(t *testing.T) {
	repo := newFakeSignInRepo()
	svc := NewSignInService(repo)
	first, err := svc.SignIn(SignInCommand{UserID: 1, Today: "2026-07-15"})
	if err != nil {
		t.Fatalf("first sign-in failed: %v", err)
	}
	second, err := svc.SignIn(SignInCommand{UserID: 1, Today: "2026-07-15"})
	if err != nil {
		t.Fatalf("second sign-in returned unexpected error: %v", err)
	}
	if !first.Awarded {
		t.Fatal("expected first sign-in awarded")
	}
	if second.Awarded {
		t.Fatal("expected second sign-in not awarded")
	}
}
```

- [ ] **Step 2: Run sign-in test to verify it fails**

Run: `go test ./... -run TestSignInService_SameDayOnlyAwardsOnce -v`
Expected: FAIL with `undefined: NewSignInService`

- [ ] **Step 3: Add sign-in domain types**

```go
type SignInCommand struct {
	UserID int64
	Today  string
}

type SignInResult struct {
	Awarded            bool `json:"awarded"`
	SignedToday        bool `json:"signedToday"`
	TotalPoints        int  `json:"totalPoints"`
	WeekSignedDays     int  `json:"weekSignedDays"`
	WeekContinuousDays int  `json:"weekContinuousDays"`
}
```

- [ ] **Step 4: Implement weekly reset and continuity logic**

```go
func weekStart(day time.Time) time.Time {
	weekday := int(day.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return time.Date(day.Year(), day.Month(), day.Day()-(weekday-1), 0, 0, 0, 0, day.Location())
}
```

- [ ] **Step 5: Add DB uniqueness and transaction flow**

```sql
CREATE TABLE IF NOT EXISTS animal_chess_sign_in_record (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  week_start_date DATE NOT NULL,
  sign_in_date DATE NOT NULL,
  points_awarded INT NOT NULL DEFAULT 10,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_animal_chess_sign_once (user_id, sign_in_date),
  KEY idx_animal_chess_sign_week (user_id, week_start_date)
);
```

- [ ] **Step 6: Register sign-in routes**

```go
mux.Handle("/api/sign-in/status", app.requireAuth(http.HandlerFunc(app.handleSignInStatus)))
mux.Handle("/api/sign-in", app.requireAuth(http.HandlerFunc(app.handleSignIn)))
mux.Handle("/api/points/summary", app.requireAuth(http.HandlerFunc(app.handlePointsSummary)))
```

- [ ] **Step 7: Run all server tests**

Run: `go test ./...`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git -C D:\work\ai\animal-chess add animal-chess-server/sign_in_repository.go animal-chess-server/points_repository.go animal-chess-server/sign_in_service.go animal-chess-server/sign_in_http.go animal-chess-server/sign_in_service_test.go animal-chess-server/schema.sql animal-chess-server/main.go
git -C D:\work\ai\animal-chess commit -m "feat: add concurrency-safe weekly sign-in service"
```

## Task 4: Add Client Auth and Sign-In API Layer

**Files:**
- Create: `animal-chess-client/assets/scripts/utils/HttpClient.ts`
- Create: `animal-chess-client/assets/scripts/utils/AuthManager.ts`
- Create: `animal-chess-client/assets/scripts/utils/SignInApi.ts`
- Modify: `animal-chess-client/assets/scripts/utils/NetworkManager.ts`

- [ ] **Step 1: Write the failing type-check target**

```ts
export interface SignInStatusResponse {
  signedToday: boolean;
  totalPoints: number;
  weekSignedDays: number;
  weekContinuousDays: number;
  recent7Days: string[];
}
```

- [ ] **Step 2: Run TypeScript check to verify current baseline**

Run: `npx tsc --noEmit -p D:\work\ai\animal-chess\animal-chess-client\tsconfig.json`
Expected: CURRENTLY FAILS with existing `MainMenuUI.ts` label property errors; no new errors should be introduced by this task

- [ ] **Step 3: Add minimal HTTP client**

```ts
export class HttpClient {
  public static async post<T>(url: string, body: unknown, token?: string): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return response.json() as Promise<T>;
  }
}
```

- [ ] **Step 4: Add auth manager for WeChat code login**

```ts
export class AuthManager {
  private static readonly TOKEN_KEY = 'animal_chess_token';

  public static getToken(): string {
    return sys.localStorage.getItem(this.TOKEN_KEY) || '';
  }
}
```

- [ ] **Step 5: Add sign-in API wrapper**

```ts
export class SignInApi {
  public static async fetchStatus(): Promise<SignInStatusResponse> {
    return HttpClient.get<SignInStatusResponse>('/api/sign-in/status', AuthManager.getToken());
  }
}
```

- [ ] **Step 6: Re-run TypeScript check**

Run: `npx tsc --noEmit -p D:\work\ai\animal-chess\animal-chess-client\tsconfig.json`
Expected: same existing `MainMenuUI.ts` baseline errors only

- [ ] **Step 7: Commit**

```bash
git -C D:\work\ai\animal-chess add animal-chess-client/assets/scripts/utils/HttpClient.ts animal-chess-client/assets/scripts/utils/AuthManager.ts animal-chess-client/assets/scripts/utils/SignInApi.ts animal-chess-client/assets/scripts/utils/NetworkManager.ts
git -C D:\work\ai\animal-chess commit -m "feat: add client auth and sign-in api layer"
```

## Task 5: Build Main Menu Sign-In Overlay and Auto-Open Flow

**Files:**
- Modify: `animal-chess-client/assets/scripts/ui/MainMenuUI.ts`
- Create: `animal-chess-client/assets/scripts/ui/MainMenuSignInOverlay.ts`

- [ ] **Step 1: Add a failing UI integration checkpoint**

```ts
type MainMenuSignInState = {
  totalPoints: number;
  signedToday: boolean;
  weekSignedDays: number;
  weekContinuousDays: number;
};
```

- [ ] **Step 2: Add main-menu state and boot flow**

```ts
private signInState: MainMenuSignInState | null = null;

private async initializeSignInFlow(): Promise<void> {
  await AuthManager.ensureLogin();
  this.signInState = await SignInApi.fetchStatus();
  if (this.signInState && !this.signInState.signedToday) {
    this.showSignInOverlay();
  }
}
```

- [ ] **Step 3: Add always-visible points entry**

```ts
const pointsChip = this.createRectNode('PointsChip', '#f6ebbf', 220 * scaleFactor, 64 * scaleFactor, 32 * scaleFactor);
```

- [ ] **Step 4: Add sign-in overlay component**

```ts
export class MainMenuSignInOverlay extends Component {
  public bind(data: SignInStatusResponse, onConfirm: () => Promise<void>): void {
    // render signed state, week state, and action button
  }
}
```

- [ ] **Step 5: Wire overlay confirm button to sign-in API**

```ts
private async onSignInConfirm(): Promise<void> {
  const result = await SignInApi.signIn();
  this.refreshPoints(result.totalPoints);
}
```

- [ ] **Step 6: Re-run TypeScript check**

Run: `npx tsc --noEmit -p D:\work\ai\animal-chess\animal-chess-client\tsconfig.json`
Expected: same baseline errors or fewer if touched area fixed

- [ ] **Step 7: Manual verification**

Run: open the Cocos project, enter main menu, confirm unsigned user sees overlay automatically
Expected: sign-in panel auto-opens, points chip visible, no overlap with start button

- [ ] **Step 8: Commit**

```bash
git -C D:\work\ai\animal-chess add animal-chess-client/assets/scripts/ui/MainMenuUI.ts animal-chess-client/assets/scripts/ui/MainMenuSignInOverlay.ts
git -C D:\work\ai\animal-chess commit -m "feat: add main menu sign-in overlay"
```

## Task 6: Add Sign-In Success Celebration Animation and Verification Notes

**Files:**
- Create: `animal-chess-client/assets/scripts/ui/SignInSuccessAnimation.ts`
- Modify: `animal-chess-client/assets/scripts/ui/MainMenuUI.ts`
- Create: `animal-chess/docs/superpowers/verification/2026-07-15-sign-in-points-checklist.md`

- [ ] **Step 1: Add success animation component shell**

```ts
export class SignInSuccessAnimation extends Component {
  public play(points: number): void {
    // badge pop, particle burst, and fade out
  }
}
```

- [ ] **Step 2: Wire success animation only for first awarded sign-in**

```ts
if (result.awarded) {
  this.playSignInSuccessAnimation(10);
}
```

- [ ] **Step 3: Add manual verification checklist**

```md
# Sign-In Points Verification Checklist

- Unsigned user enters main menu and auto-sees sign-in overlay
- Successful sign-in awards exactly 10 points
- Same-day repeated sign-in does not award again
- New week resets weekly counters on Monday
```

- [ ] **Step 4: Re-run verification commands**

Run: `go test ./...`
Expected: PASS

Run: `npx tsc --noEmit -p D:\work\ai\animal-chess\animal-chess-client\tsconfig.json`
Expected: no new TypeScript errors beyond known baseline unless fixed in touched code

- [ ] **Step 5: Manual smoke test**

Run: use WeChat devtools or Cocos preview with mocked API and verify login, overlay, sign-in, repeat sign-in, and success animation
Expected: flow matches spec and points remain idempotent

- [ ] **Step 6: Commit**

```bash
git -C D:\work\ai\animal-chess add animal-chess-client/assets/scripts/ui/SignInSuccessAnimation.ts animal-chess-client/assets/scripts/ui/MainMenuUI.ts animal-chess/docs/superpowers/verification/2026-07-15-sign-in-points-checklist.md
git -C D:\work\ai\animal-chess commit -m "feat: add sign-in celebration flow"
```
