package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var (
	ErrWechatConfigMissing = errors.New("wechat config missing")
	ErrWechatCodeMissing   = errors.New("wechat code missing")
	ErrWechatCodeInvalid   = errors.New("wechat code invalid")
)

type WechatSession struct {
	OpenID  string `json:"openid"`
	UnionID string `json:"unionid"`
}

type wechatCode2SessionResponse struct {
	OpenID  string `json:"openid"`
	UnionID string `json:"unionid"`
	ErrCode int    `json:"errcode"`
	ErrMsg  string `json:"errmsg"`
}

type WechatAuthService struct {
	appID     string
	appSecret string
	client    *http.Client
}

func NewWechatAuthService(cfg AppConfig, client *http.Client) *WechatAuthService {
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}

	return &WechatAuthService{
		appID:     cfg.WechatAppID,
		appSecret: cfg.WechatAppSecret,
		client:    client,
	}
}

func (s *WechatAuthService) ExchangeCode(code string) (*WechatSession, error) {
	if strings.TrimSpace(code) == "" {
		return nil, ErrWechatCodeMissing
	}
	if strings.TrimSpace(s.appID) == "" || strings.TrimSpace(s.appSecret) == "" {
		return nil, ErrWechatConfigMissing
	}

	query := url.Values{}
	query.Set("appid", s.appID)
	query.Set("secret", s.appSecret)
	query.Set("js_code", strings.TrimSpace(code))
	query.Set("grant_type", "authorization_code")

	requestURL := "https://api.weixin.qq.com/sns/jscode2session?" + query.Encode()
	resp, err := s.client.Get(requestURL)
	if err != nil {
		return nil, fmt.Errorf("request wechat code2session failed: %w", err)
	}
	defer resp.Body.Close()

	var result wechatCode2SessionResponse
	if err = json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode wechat code2session response failed: %w", err)
	}

	if result.ErrCode != 0 {
		if result.ErrCode == 40029 || result.ErrCode == 40163 {
			return nil, ErrWechatCodeInvalid
		}
		return nil, fmt.Errorf("wechat code2session error: errcode=%d errmsg=%s", result.ErrCode, result.ErrMsg)
	}
	if result.OpenID == "" {
		return nil, errors.New("wechat code2session missing openid")
	}

	return &WechatSession{
		OpenID:  result.OpenID,
		UnionID: result.UnionID,
	}, nil
}
