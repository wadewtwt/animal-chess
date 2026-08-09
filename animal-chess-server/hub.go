package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Position 坐标点
type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// Room 房间，处理两个具体玩家的游戏状态与消息中转
type Room struct {
	ID            string              // 6 位房间代码
	PlayerRed     *Client             // 红方玩家 (先手)
	PlayerBlue    *Client             // 蓝方玩家 (后手)
	PlayerRedID   string              // 绑定的红方玩家 ID，用于重连识别
	PlayerBlueID  string              // 绑定的蓝方玩家 ID，用于重连识别
	BoardState    map[string]Position // 棋子位置快照，Key 为棋子 ID (例如 "RED_1")
	mu            sync.RWMutex        // 状态读写锁
	Hub           *Hub
	CurrentTurn   string              // "RED" | "BLUE"
	RemainingTime int                 // 回合剩余时间 (秒)
	timerStopChan chan struct{}       // 停止定时器协程信号
}

// NewRoom 创建一个新房间，并初始化经典的斗兽棋棋子布局
func NewRoom(id string, p1, p2 *Client, hub *Hub) *Room {
	r := &Room{
		ID:            id,
		BoardState:    make(map[string]Position),
		Hub:           hub,
		CurrentTurn:   "RED",
		RemainingTime: 30,
		timerStopChan: make(chan struct{}),
	}

	// 随机决定谁是红方 (RED)，谁是蓝方 (BLUE)
	rand.Seed(time.Now().UnixNano())
	if rand.Intn(2) == 0 {
		r.PlayerRed = p1
		r.PlayerBlue = p2
	} else {
		r.PlayerRed = p2
		r.PlayerBlue = p1
	}

	r.PlayerRedID = r.PlayerRed.ID
	r.PlayerBlueID = r.PlayerBlue.ID

	r.PlayerRed.Camp = "RED"
	r.PlayerRed.Room = r

	r.PlayerBlue.Camp = "BLUE"
	r.PlayerBlue.Room = r

	r.initBoardState()

	// 启动倒计时协程
	go r.startCountdownLoop()

	return r
}

// initBoardState 对应前端 LocalEngine 的初始棋盘设定
func (r *Room) initBoardState() {
	r.mu.Lock()
	defer r.mu.Unlock()

	// 红方 (RED) 初始位置
	r.BoardState["RED_6"] = Position{X: 0, Y: 0}  // 虎
	r.BoardState["RED_7"] = Position{X: 6, Y: 0}  // 狮
	r.BoardState["RED_2"] = Position{X: 1, Y: 1}  // 猫
	r.BoardState["RED_3"] = Position{X: 5, Y: 1}  // 狗
	r.BoardState["RED_8"] = Position{X: 0, Y: 2}  // 象
	r.BoardState["RED_4"] = Position{X: 2, Y: 2}  // 狼
	r.BoardState["RED_5"] = Position{X: 4, Y: 2}  // 豹
	r.BoardState["RED_1"] = Position{X: 6, Y: 2}  // 鼠

	// 蓝方 (BLUE) 初始位置
	r.BoardState["BLUE_7"] = Position{X: 0, Y: 8} // 狮
	r.BoardState["BLUE_6"] = Position{X: 6, Y: 8} // 虎
	r.BoardState["BLUE_3"] = Position{X: 1, Y: 7} // 狗
	r.BoardState["BLUE_2"] = Position{X: 5, Y: 7} // 猫
	r.BoardState["BLUE_1"] = Position{X: 0, Y: 6} // 鼠
	r.BoardState["BLUE_5"] = Position{X: 2, Y: 6} // 豹
	r.BoardState["BLUE_4"] = Position{X: 4, Y: 6} // 狼
	r.BoardState["BLUE_8"] = Position{X: 6, Y: 6} // 象
}

// startCountdownLoop 服务端回合计时主循环
func (r *Room) startCountdownLoop() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			r.mu.Lock()
			r.RemainingTime--

			if r.RemainingTime <= 0 {
				r.RemainingTime = 0
				// 时间到，判定当前行棋对手获胜
				var winner string
				if r.CurrentTurn == "RED" {
					winner = "BLUE"
				} else {
					winner = "RED"
				}

				log.Printf("[Room %s] 回合超时: 行棋方 %s 超时, 胜者为 %s", r.ID, r.CurrentTurn, winner)
				r.settleAndBroadcastGameOver(winner, "TIMEOUT")
				r.mu.Unlock()

				// 销毁当前房间
				r.Hub.destroyRoom(r.ID)
				return
			}

			// 每秒向双方推送倒计时时间同步
			payload := fmt.Sprintf(`{"remaining_time":%d,"current_turn":"%s"}`, r.RemainingTime, r.CurrentTurn)
			if r.PlayerRed != nil {
				r.PlayerRed.sendAction("timer_sync", payload)
			}
			if r.PlayerBlue != nil {
				r.PlayerBlue.sendAction("timer_sync", payload)
			}
			r.mu.Unlock()

		case <-r.timerStopChan:
			log.Printf("[Room %s] 倒计时循环接收到停止信号，退出协程", r.ID)
			return
		}
	}
}

// handleMove 处理玩家走棋：更新本地状态并转发给对手
func (r *Room) handleMove(sender *Client, moveData string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// 解析走子信息
	var m struct {
		PieceID string   `json:"piece_id"`
		FromX   int      `json:"from_x"`
		FromY   int      `json:"from_y"`
		ToX     int      `json:"to_x"`
		ToY     int      `json:"to_y"`
	}

	if err := json.Unmarshal([]byte(moveData), &m); err != nil {
		log.Printf("[Room %s] 解析走棋数据出错: %v", r.ID, err)
		return
	}

	// 1. 如果目标格子有其他棋子，说明发生了“吃子”，从快照中移除被吃掉的棋子
	for id, pos := range r.BoardState {
		if id != m.PieceID && pos.X == m.ToX && pos.Y == m.ToY {
			delete(r.BoardState, id) // 移除被吃子
			log.Printf("[Room %s] 棋子被吃: %s 在 (%d, %d)", r.ID, id, m.ToX, m.ToY)
			break
		}
	}

	// 2. 更新发起者的棋子位置
	r.BoardState[m.PieceID] = Position{X: m.ToX, Y: m.ToY}
	log.Printf("[Room %s] 移动同步: 玩家 %s 移动 %s 到 (%d, %d)", r.ID, sender.ID, m.PieceID, m.ToX, m.ToY)

	// 3. 广播给对手
	opponent := r.getOpponent(sender)
	if opponent != nil {
		opponent.sendAction("opponent_move", moveData)
	}

	// 4. 切换回合且重设剩余时间为 30s
	if r.CurrentTurn == "RED" {
		r.CurrentTurn = "BLUE"
	} else {
		r.CurrentTurn = "RED"
	}
	r.RemainingTime = 30

	// 5. 立即广播最新的 timer_sync 状态
	timerPayload := fmt.Sprintf(`{"remaining_time":%d,"current_turn":"%s"}`, r.RemainingTime, r.CurrentTurn)
	if r.PlayerRed != nil {
		r.PlayerRed.sendAction("timer_sync", timerPayload)
	}
	if r.PlayerBlue != nil {
		r.PlayerBlue.sendAction("timer_sync", timerPayload)
	}
}

// handleQuickChat 处理玩家快捷短语/表情消息：透传转发给房间内的对手
func (r *Room) handleQuickChat(sender *Client, data string) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	opponent := r.getOpponent(sender)
	if opponent != nil {
		opponent.sendAction("quick_chat", data)
	}
}

// GameOverBroadcastPayload 给客户端广播的完整游戏结束载荷
type GameOverBroadcastPayload struct {
	Winner            string `json:"winner"`
	Reason            string `json:"reason"`
	WinnerScoreChange int    `json:"winner_score_change,omitempty"`
	LoserScoreChange  int    `json:"loser_score_change,omitempty"`
	WinnerTotalPoints int    `json:"winner_total_points,omitempty"`
	LoserTotalPoints  int    `json:"loser_total_points,omitempty"`
	WinnerNotice      string `json:"winner_notice,omitempty"`
	LoserNotice       string `json:"loser_notice,omitempty"`

	// 给接收客户端定制的专属字段
	MyScoreChange int    `json:"my_score_change"`
	MyTotalPoints int    `json:"my_total_points"`
	Notice        string `json:"notice"`
}

// settleAndBroadcastGameOver 处理胜负积分结算并广播给双方
func (r *Room) settleAndBroadcastGameOver(winnerCamp string, reason string) {
	var winnerClient, loserClient *Client
	if winnerCamp == "RED" {
		winnerClient = r.PlayerRed
		loserClient = r.PlayerBlue
	} else if winnerCamp == "BLUE" {
		winnerClient = r.PlayerBlue
		loserClient = r.PlayerRed
	}

	mode := "match"
	if len(r.ID) == 6 && !strings.HasPrefix(r.ID, "MATCH_") {
		mode = "room"
	}

	var resData *SettleBattleResultData
	var err error

	if winnerClient != nil && loserClient != nil && winnerClient.UserIDInt64 > 0 && loserClient.UserIDInt64 > 0 {
		authToken := winnerClient.AuthToken
		if authToken == "" {
			authToken = loserClient.AuthToken
		}

		log.Printf("[Room %s] 触发对战积分结算: winnerId=%d, loserId=%d, mode=%s", r.ID, winnerClient.UserIDInt64, loserClient.UserIDInt64, mode)
		resData, err = SettleBattleScore(r.Hub.BlogBackendURL, r.Hub.HTTPClient, r.ID, mode, winnerClient.UserIDInt64, loserClient.UserIDInt64, authToken)
		if err != nil {
			log.Printf("[Room %s] 积分结算接口调用失败: %v", r.ID, err)
		} else {
			log.Printf("[Room %s] 积分结算成功: winnerGain=%d, loserDeduct=%d", r.ID, resData.WinnerScoreChange, resData.LoserScoreChange)
		}
	} else {
		log.Printf("[Room %s] 跳过后端结算 API (存在非注册数字 ID 玩家或局内信息未满)", r.ID)
	}

	sendPayloadToClient := func(c *Client) {
		if c == nil {
			return
		}
		p := GameOverBroadcastPayload{
			Winner: winnerCamp,
			Reason: reason,
		}

		if resData != nil {
			p.WinnerScoreChange = resData.WinnerScoreChange
			p.LoserScoreChange = resData.LoserScoreChange
			p.WinnerTotalPoints = resData.WinnerCurrentPoints
			p.LoserTotalPoints = resData.LoserCurrentPoints
			p.WinnerNotice = resData.WinnerNotice
			p.LoserNotice = resData.LoserNotice

			if c.Camp == winnerCamp {
				p.MyScoreChange = resData.WinnerScoreChange
				p.MyTotalPoints = resData.WinnerCurrentPoints
				p.Notice = resData.WinnerNotice
			} else {
				p.MyScoreChange = resData.LoserScoreChange
				p.MyTotalPoints = resData.LoserCurrentPoints
				p.Notice = resData.LoserNotice
			}
		} else {
			if c.Camp == winnerCamp {
				p.MyScoreChange = 10
			} else {
				p.MyScoreChange = -10
			}
		}

		jsonBytes, _ := json.Marshal(p)
		c.sendAction("game_over", string(jsonBytes))
	}

	sendPayloadToClient(r.PlayerRed)
	sendPayloadToClient(r.PlayerBlue)
}

// handleGameOver 客户端通知对局结束
func (r *Room) handleGameOver(sender *Client, data string) {
	var req struct {
		Winner string `json:"winner"`
		Reason string `json:"reason"`
	}
	_ = json.Unmarshal([]byte(data), &req)
	winner := req.Winner
	reason := req.Reason
	if reason == "" {
		reason = "DEN_CAPTURED"
	}
	r.settleAndBroadcastGameOver(winner, reason)
	r.Hub.destroyRoom(r.ID)
}

// handleSurrender 一方玩家认输
func (r *Room) handleSurrender(sender *Client) {
	opponent := r.getOpponent(sender)
	winnerCamp := ""
	if opponent != nil {
		winnerCamp = opponent.Camp
	} else {
		if sender.Camp == "RED" {
			winnerCamp = "BLUE"
		} else {
			winnerCamp = "RED"
		}
	}
	r.settleAndBroadcastGameOver(winnerCamp, "SURRENDER")
	r.Hub.destroyRoom(r.ID)
}

// syncStateToClient 向特定重连的客户端同步当前棋盘最新状态
func (r *Room) syncStateToClient(c *Client) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	stateBytes, err := json.Marshal(r.BoardState)
	if err != nil {
		return
	}

	// 下发状态同步指令，带上自己的阵营、当前的棋盘坐标 Map、剩余倒计时和行棋方
	payload := fmt.Sprintf(`{"camp":"%s","board_state":%s,"remaining_time":%d,"current_turn":"%s"}`, c.Camp, string(stateBytes), r.RemainingTime, r.CurrentTurn)
	c.sendAction("reconnect_success", payload)
}

func (r *Room) getOpponent(c *Client) *Client {
	if r.PlayerRed != nil && r.PlayerRed.ID == c.ID {
		return r.PlayerBlue
	}
	if r.PlayerBlue != nil && r.PlayerBlue.ID == c.ID {
		return r.PlayerRed
	}
	if r.PlayerRedID == c.ID {
		return r.PlayerBlue
	}
	return r.PlayerRed
}

// matchRequest 匹配请求
type matchRequest struct {
	client   *Client
	roomCode string
}

// Hub 管理所有的在线连接与对局匹配
type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	matchSeek  chan matchRequest
	rooms      map[string]*Room
	mu         sync.Mutex

	// 房间匹配等待池 (房间号 -> 正在等待的第一个玩家)
	pendingMatch map[string]*Client

	BlogBackendURL string
	HTTPClient     *http.Client
}

func NewHub() *Hub {
	return &Hub{
		clients:        make(map[*Client]bool),
		register:       make(chan *Client),
		unregister:     make(chan *Client),
		matchSeek:      make(chan matchRequest),
		rooms:          make(map[string]*Room),
		pendingMatch:   make(map[string]*Client),
		BlogBackendURL: "http://127.0.0.1:8080",
		HTTPClient:     &http.Client{Timeout: 5 * time.Second},
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("[Hub] 玩家连入: %s (在线总数: %d)", client.ID, len(h.clients))
			// 在连入第一时间，向客户端同步其唯一玩家 ID，支持刷新不退出和重连
			client.sendAction("init_user", client.ID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)

				// 清理玩家在大厅中的匹配挂起状态
				for code, pending := range h.pendingMatch {
					if pending.ID == client.ID {
						delete(h.pendingMatch, code)
						log.Printf("[Hub] 匹配取消: 玩家 %s 掉线，注销房间号 %s", client.ID, code)
						break
					}
				}

				// 清理房间状态，断线不立即解散，保留 30 秒重连时间
				if client.Room != nil {
					roomID := client.Room.ID
					room := client.Room
					
					room.mu.Lock()
					if room.PlayerRed == client {
						room.PlayerRed = nil
					} else if room.PlayerBlue == client {
						room.PlayerBlue = nil
					}
					room.mu.Unlock()

					opponent := room.getOpponent(client)
					// 判定对方掉线并发送掉线通知，让对手稍作等待
					if opponent != nil {
						opponent.sendAction("opponent_left", "")
					}
					
					log.Printf("[Hub] 玩家 %s 断线，对局房间 %s 进入 30 秒重连等待期", client.ID, roomID)

					// 开启一个协程在 30 秒后如果未连回则销毁房间
					go func(r *Room, cID string) {
						time.Sleep(30 * time.Second)
						h.mu.Lock()
						defer h.mu.Unlock()
						
						currentRoom, ok := h.rooms[r.ID]
						if ok {
							currentRoom.mu.Lock()
							if (cID == currentRoom.PlayerRedID && currentRoom.PlayerRed == nil) || 
							   (cID == currentRoom.PlayerBlueID && currentRoom.PlayerBlue == nil) {
								currentRoom.mu.Unlock()
								h.destroyRoom(r.ID)
								log.Printf("[Hub] 房间 %s 的玩家 %s 重连超时，注销房间", r.ID, cID)
							} else {
								currentRoom.mu.Unlock()
							}
						}
					}(room, client.ID)
				}
			}
			h.mu.Unlock()
			log.Printf("[Hub] 玩家离开: %s (在线总数: %d)", client.ID, len(h.clients))

		case req := <-h.matchSeek:
			h.handleMatchSeek(req)
		}
	}
}

// handleMatchSeek 处理玩家匹配请求
func (h *Hub) handleMatchSeek(req matchRequest) {
	h.mu.Lock()
	defer h.mu.Unlock()

	code := req.roomCode
	client := req.client

	// 1. 尝试在现有房间中查找是否是断线重连的玩家 (认领原房间席位)
	if existingRoom, exists := h.rooms[code]; exists {
		existingRoom.mu.Lock()
		isReconnector := false
		if existingRoom.PlayerRedID == client.ID {
			existingRoom.PlayerRed = client
			client.Room = existingRoom
			client.Camp = "RED"
			isReconnector = true
		} else if existingRoom.PlayerBlueID == client.ID {
			existingRoom.PlayerBlue = client
			client.Room = existingRoom
			client.Camp = "BLUE"
			isReconnector = true
		}
		existingRoom.mu.Unlock()

		if isReconnector {
			// 执行重连同步并下发重连棋局包
			existingRoom.syncStateToClient(client)
			log.Printf("[Hub] 玩家 %s 成功重连并认领房间 %s", client.ID, code)
			
			// 通知对手连接已恢复
			opponent := existingRoom.getOpponent(client)
			if opponent != nil {
				opponent.sendAction("reconnect_success", "") 
			}
			return
		}
	}

	// 2. 检查当前是否有人在该房间代码中等候
	pendingClient, exists := h.pendingMatch[code]
	if !exists {
		// 没人等候，自己作为第一个等候者
		h.pendingMatch[code] = client
		log.Printf("[Hub] 房间等待: 玩家 %s 创建并等待房间 %s", client.ID, code)
		client.sendAction("match_wait", "")
	} else {
		// 已经有人等候，开始成对匹配
		if pendingClient.ID == client.ID {
			// 重复请求匹配，忽略
			return
		}

		// 移除挂起状态
		delete(h.pendingMatch, code)

		// 实例化房间
		room := NewRoom(code, pendingClient, client, h)
		h.rooms[code] = room

		log.Printf("[Hub] 配对成功: 房间 %s 已满 (红方: %s, 蓝方: %s)", code, room.PlayerRed.ID, room.PlayerBlue.ID)

		// 通知双方匹配成功，并下发各自的 Camp 阵营
		redPayload := fmt.Sprintf(`{"camp":"RED","room_id":"%s","opponent_id":"%s"}`, code, room.PlayerBlue.ID)
		bluePayload := fmt.Sprintf(`{"camp":"BLUE","room_id":"%s","opponent_id":"%s"}`, code, room.PlayerRed.ID)

		room.PlayerRed.sendAction("match_success", redPayload)
		room.PlayerBlue.sendAction("match_success", bluePayload)
	}
}

// destroyRoom 安全解散房间
func (h *Hub) destroyRoom(roomID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	room, ok := h.rooms[roomID]
	if !ok {
		return
	}

	// 停止计时协程并释放资源
	if room.timerStopChan != nil {
		close(room.timerStopChan)
		room.timerStopChan = nil
	}

	if room.PlayerRed != nil {
		room.PlayerRed.Room = nil
	}
	if room.PlayerBlue != nil {
		room.PlayerBlue.Room = nil
	}

	delete(h.rooms, roomID)
	log.Printf("[Hub] 销毁房间 %s", roomID)
}
