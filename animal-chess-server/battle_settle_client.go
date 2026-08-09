package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

type SettleBattleRequest struct {
	RoomID   string `json:"roomId"`
	Mode     string `json:"mode"`
	WinnerID int64  `json:"winnerId"`
	LoserID  int64  `json:"loserId"`
}

type SettleBattleResultData struct {
	RoomID              string `json:"roomId"`
	Mode                string `json:"mode"`
	WinnerID            int64  `json:"winnerId"`
	WinnerScoreChange   int    `json:"winnerScoreChange"`
	WinnerCurrentPoints int    `json:"winnerCurrentPoints"`
	WinnerNotice        string `json:"winnerNotice"`
	LoserID             int64  `json:"loserId"`
	LoserScoreChange    int    `json:"loserScoreChange"`
	LoserCurrentPoints  int    `json:"loserCurrentPoints"`
	LoserNotice         string `json:"loserNotice"`
}

type SettleBattleResponse struct {
	Code    int                    `json:"code"`
	Message string                 `json:"message"`
	Data    SettleBattleResultData `json:"data"`
	Error   string                 `json:"error"`
}

// SettleBattleScore 调用后端 API 进行积分结算
func SettleBattleScore(backendURL string, httpClient *http.Client, roomID string, mode string, winnerID, loserID int64, authToken string) (*SettleBattleResultData, error) {
	if backendURL == "" {
		backendURL = "http://127.0.0.1:8080"
	}
	backendURL = strings.TrimSuffix(backendURL, "/")

	reqBody := SettleBattleRequest{
		RoomID:   roomID,
		Mode:     mode,
		WinnerID: winnerID,
		LoserID:  loserID,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal settle req error: %w", err)
	}

	apiURL := backendURL + "/api/animal-chess/battle/settle"
	httpReq, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, fmt.Errorf("create http req error: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	if authToken != "" {
		if !strings.HasPrefix(authToken, "Bearer ") {
			authToken = "Bearer " + authToken
		}
		httpReq.Header.Set("Authorization", authToken)
	}

	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		log.Printf("[SettleBattle] 请求后端接口失败: url=%s, err=%v", apiURL, err)
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read resp body error: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Printf("[SettleBattle] 后端返回非200状态码: code=%d, body=%s", resp.StatusCode, string(respBytes))
		var errResp struct {
			Error string `json:"error"`
		}
		_ = json.Unmarshal(respBytes, &errResp)
		if errResp.Error != "" {
			return nil, fmt.Errorf("backend error (%d): %s", resp.StatusCode, errResp.Error)
		}
		return nil, fmt.Errorf("backend HTTP error: %d", resp.StatusCode)
	}

	var res SettleBattleResponse
	if err := json.Unmarshal(respBytes, &res); err != nil {
		return nil, fmt.Errorf("unmarshal resp error: %w", err)
	}

	return &res.Data, nil
}
