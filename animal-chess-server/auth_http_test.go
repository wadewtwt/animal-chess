package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

type dummyUserStore struct {
	users map[int64]*AnimalChessUser
}

func newDummyUserStore() *dummyUserStore {
	return &dummyUserStore{users: make(map[int64]*AnimalChessUser)}
}

func (s *dummyUserStore) FindByID(userID int64) (*AnimalChessUser, error) {
	u, ok := s.users[userID]
	if !ok {
		return &AnimalChessUser{ID: userID, OpenID: "dummy-openid", Nickname: ""}, nil
	}
	return u, nil
}

func (s *dummyUserStore) UpdateProfile(userID int64, nickname, avatarURL string) (*AnimalChessUser, error) {
	u, ok := s.users[userID]
	if !ok {
		u = &AnimalChessUser{ID: userID, OpenID: "dummy-openid"}
		s.users[userID] = u
	}
	u.Nickname = nickname
	u.AvatarURL = avatarURL
	return u, nil
}

func TestUpdateUserProfile_Success(t *testing.T) {
	tokenService := NewTokenService("test-secret")
	token, err := tokenService.Issue(UserClaims{UserID: 100, OpenID: "test-openid-100"})
	if err != nil {
		t.Fatalf("failed to issue token: %v", err)
	}

	app := &App{
		TokenService: tokenService,
	}

	mux := http.NewServeMux()
	authMiddleware := AuthMiddleware(app.TokenService)
	store := newDummyUserStore()

	mux.Handle("/api/wx/profile", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, _ := GetUserClaims(r)
		var req UpdateProfileRequest
		_ = json.NewDecoder(r.Body).Decode(&req)
		u, _ := store.UpdateProfile(claims.UserID, req.Nickname, req.AvatarURL)
		writeJSON(w, http.StatusOK, UpdateProfileResponse{
			User: WxLoginUserSummary{
				ID:        u.ID,
				OpenID:    u.OpenID,
				Nickname:  u.Nickname,
				AvatarURL: u.AvatarURL,
			},
		})
	})))

	reqBody, _ := json.Marshal(UpdateProfileRequest{
		Nickname:  "森林勇士",
		AvatarURL: "https://example.com/avatar.png",
	})
	req := httptest.NewRequest(http.MethodPut, "/api/wx/profile", bytes.NewReader(reqBody))
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body: %s", rec.Code, rec.Body.String())
	}

	var resp UpdateProfileResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if resp.User.Nickname != "森林勇士" {
		t.Fatalf("expected nickname '森林勇士', got '%s'", resp.User.Nickname)
	}
}

func TestAnimalChessCheckIn_WithoutNickname_Blocks(t *testing.T) {
	tokenService := NewTokenService("test-secret")
	token, err := tokenService.Issue(UserClaims{UserID: 200, OpenID: "no-nick-openid"})
	if err != nil {
		t.Fatalf("failed to issue token: %v", err)
	}

	fakeRepo := newFakeSignInRepo()
	signInService := NewSignInService(fakeRepo)

	app := &App{
		TokenService:  tokenService,
		SignInService: signInService,
	}

	store := newDummyUserStore()

	mux := http.NewServeMux()
	authMiddleware := AuthMiddleware(app.TokenService)
	mux.Handle("/api/animal-chess/check-in", authMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, _ := GetUserClaims(r)
		u, _ := store.FindByID(claims.UserID)
		if u == nil || u.Nickname == "" {
			writeJSONError(w, http.StatusBadRequest, "nickname is required for check-in")
			return
		}
		handleAnimalChessCheckIn(app, w, r)
	})))

	req := httptest.NewRequest(http.MethodPost, "/api/animal-chess/check-in", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	mux.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 when nickname is empty, got %d, body: %s", rec.Code, rec.Body.String())
	}
}
