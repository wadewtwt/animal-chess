package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
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
	ID         string              // 6 位房间代码
	PlayerRed  *Client             // 红方玩家 (先手)
	PlayerBlue *Client             // 蓝方玩家 (后手)
	BoardState map[string]Position // 棋子位置快照，Key 为棋子 ID (例如 "RED_1")
	mu         sync.RWMutex        // 状态读写锁
	Hub        *Hub
}

// NewRoom 创建一个新房间，并初始化经典的斗兽棋棋子布局
func NewRoom(id string, p1, p2 *Client, hub *Hub) *Room {
	r := &Room{
		ID:         id,
		BoardState: make(map[string]Position),
		Hub:        hub,
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

	r.PlayerRed.Camp = "RED"
	r.PlayerRed.Room = r

	r.PlayerBlue.Camp = "BLUE"
	r.PlayerBlue.Room = r

	r.initBoardState()
	return r
}

// initBoardState 对应前端 LocalEngine 的初始棋盘设定
func (r *Room) initBoardState() {
	r.mu.Lock()
	defer r.mu.Unlock()

	// 红方 (RED) 初始位置
	r.BoardState["RED_1"] = Position{X: 0, Y: 0}  // 鼠
	r.BoardState["RED_8"] = Position{X: 6, Y: 0}  // 象
	r.BoardState["RED_2"] = Position{X: 1, Y: 1}  // 猫
	r.BoardState["RED_3"] = Position{X: 5, Y: 1}  // 狗
	r.BoardState["RED_4"] = Position{X: 0, Y: 2}  // 狼
	r.BoardState["RED_5"] = Position{X: 2, Y: 2}  // 豹
	r.BoardState["RED_6"] = Position{X: 4, Y: 2}  // 虎
	r.BoardState["RED_7"] = Position{X: 6, Y: 2}  // 狮

	// 蓝方 (BLUE) 初始位置
	r.BoardState["BLUE_8"] = Position{X: 0, Y: 8} // 象
	r.BoardState["BLUE_1"] = Position{X: 6, Y: 8} // 鼠
	r.BoardState["BLUE_3"] = Position{X: 1, Y: 7} // 狗
	r.BoardState["BLUE_2"] = Position{X: 5, Y: 7} // 猫
	r.BoardState["BLUE_7"] = Position{X: 0, Y: 6} // 狮
	r.BoardState["BLUE_6"] = Position{X: 2, Y: 6} // 虎
	r.BoardState["BLUE_5"] = Position{X: 4, Y: 6} // 豹
	r.BoardState["BLUE_4"] = Position{X: 6, Y: 6} // 狼
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
}

// handleGameOver 客户端通知对局结束
func (r *Room) handleGameOver(sender *Client, data string) {
	// 转发游戏结束消息给对手并解散房间
	opponent := r.getOpponent(sender)
	if opponent != nil {
		opponent.sendAction("game_over", data)
	}
	r.Hub.destroyRoom(r.ID)
}

// handleSurrender 一方玩家认输
func (r *Room) handleSurrender(sender *Client) {
	opponent := r.getOpponent(sender)
	if opponent != nil {
		// 向对方发送游戏结束包，指定胜者
		payload := fmt.Sprintf(`{"winner":"%s","reason":"SURRENDER"}`, opponent.Camp)
		opponent.sendAction("game_over", payload)
	}
	sender.sendAction("game_over", fmt.Sprintf(`{"winner":"%s","reason":"SURRENDER"}`, opponent.Camp))
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

	// 下发状态同步指令，带上自己的阵营和当前的棋盘坐标 Map
	payload := fmt.Sprintf(`{"camp":"%s","board_state":%s}`, c.Camp, string(stateBytes))
	c.sendAction("reconnect_success", payload)
}

func (r *Room) getOpponent(c *Client) *Client {
	if r.PlayerRed.ID == c.ID {
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
}

func NewHub() *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		matchSeek:    make(chan matchRequest),
		rooms:        make(map[string]*Room),
		pendingMatch: make(map[string]*Client),
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

				// 清理房间状态
				if client.Room != nil {
					roomID := client.Room.ID
					opponent := client.Room.getOpponent(client)

					// 判定对方掉线
					if opponent != nil {
						opponent.sendAction("opponent_left", "")
					}
					// 销毁房间
					delete(h.rooms, roomID)
					log.Printf("[Hub] 房间解散: 玩家 %s 离开，销毁房间 %s", client.ID, roomID)
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

	// 1. 如果该玩家已在其他房间中，且尝试重新连接该房间
	if client.Room != nil && client.Room.ID == code {
		// 执行重连同步
		client.Room.syncStateToClient(client)
		log.Printf("[Hub] 玩家重连: %s 重返房间 %s", client.ID, code)
		return
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

	if room.PlayerRed != nil {
		room.PlayerRed.Room = nil
	}
	if room.PlayerBlue != nil {
		room.PlayerBlue.Room = nil
	}

	delete(h.rooms, roomID)
	log.Printf("[Hub] 销毁房间 %s", roomID)
}
