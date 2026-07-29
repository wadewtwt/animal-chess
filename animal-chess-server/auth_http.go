package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"
)

type WxLoginRequest struct {
	AppName   string `json:"app_name"`
	Code      string `json:"code"`
	Nickname  string `json:"nickname,omitempty"`
	AvatarURL string `json:"avatarUrl,omitempty"`
}

type WxLoginResponse struct {
	Token string             `json:"token"`
	User  WxLoginUserSummary `json:"user"`
}

type WxLoginUserSummary struct {
	ID        int64  `json:"id"`
	AppName   string `json:"appName,omitempty"`
	OpenID    string `json:"openId"`
	UnionID   string `json:"unionId,omitempty"`
	Nickname  string `json:"nickname"`
	AvatarURL string `json:"avatarUrl"`
}

func RegisterAuthRoutes(mux *http.ServeMux, app *App) {
	mux.HandleFunc("/api/wx/login", func(w http.ResponseWriter, r *http.Request) {
		handleWechatLogin(app, w, r)
	})
	mux.HandleFunc("/api/auth/wx/login", func(w http.ResponseWriter, r *http.Request) {
		handleWechatLogin(app, w, r)
	})
}

func handleWechatLogin(app *App, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		log.Printf("AuthHTTP handleWechatLogin error invalid method: method=%s", r.Method)
		writeJSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if app.DB == nil {
		log.Printf("AuthHTTP handleWechatLogin error database not initialized")
		writeJSONError(w, http.StatusInternalServerError, "database not initialized")
		return
	}

	var request WxLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		log.Printf("AuthHTTP handleWechatLogin error invalid request body: %v", err)
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	request.Code = strings.TrimSpace(request.Code)
	if request.Code == "" {
		log.Printf("AuthHTTP handleWechatLogin error code is empty")
		writeJSONError(w, http.StatusBadRequest, "code is required")
		return
	}

	session, err := app.WechatAuthService.ExchangeCode(request.Code)
	if err != nil {
		switch {
		case errors.Is(err, ErrWechatCodeMissing):
			log.Printf("AuthHTTP handleWechatLogin error code is empty")
			writeJSONError(w, http.StatusBadRequest, "code is required")
			return
		case errors.Is(err, ErrWechatConfigMissing):
			log.Printf("AuthHTTP handleWechatLogin error wechat config missing")
			writeJSONError(w, http.StatusInternalServerError, "wechat config missing")
			return
		case errors.Is(err, ErrWechatCodeInvalid):
			log.Printf("AuthHTTP handleWechatLogin error invalid wechat code")
			writeJSONError(w, http.StatusUnauthorized, "invalid wechat code")
			return
		default:
			log.Printf("AuthHTTP handleWechatLogin error exchange wechat code failed: %v", err)
			writeJSONError(w, http.StatusInternalServerError, "failed to login with wechat")
			return
		}
	}

	user, err := app.UserRepository.FindOrCreateByOpenID(session.OpenID, session.UnionID, time.Now())
	if err != nil {
		log.Printf("AuthHTTP handleWechatLogin error persist user failed, openid=%s: %v", session.OpenID, err)
		writeJSONError(w, http.StatusInternalServerError, "failed to persist user")
		return
	}

	token, err := app.TokenService.Issue(UserClaims{UserID: user.ID, OpenID: user.OpenID})
	if err != nil {
		log.Printf("AuthHTTP handleWechatLogin error issue token failed, userID=%d openid=%s: %v", user.ID, user.OpenID, err)
		writeJSONError(w, http.StatusInternalServerError, "failed to issue token")
		return
	}

	writeJSON(w, http.StatusOK, WxLoginResponse{
		Token: token,
		User: WxLoginUserSummary{
			ID:        user.ID,
			OpenID:    user.OpenID,
			Nickname:  user.Nickname,
			AvatarURL: user.AvatarURL,
		},
	})
}

func writeJSON(w http.ResponseWriter, statusCode int, value interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(value); err != nil {
		log.Printf("AuthHTTP writeJSON error encode response failed: %v", err)
	}
}

func writeJSONError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, map[string]string{"error": message})
}
