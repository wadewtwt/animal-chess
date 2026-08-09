package main

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// 写超时时间
	writeWait = 10 * time.Second

	// 读超时时间 (配合客户端发送 ping，服务端需要在 readDeadline 内收到 ping)
	pongWait = 60 * time.Second

	// 定时给客户端发 ping 的周期 (必须少于 pongWait)
	pingPeriod = (pongWait * 9) / 10

	// 客户端发送消息的最大字节限制
	maxMessageSize = 512
)

// Client 代表一个与玩家的长连接
type Client struct {
	ID          string          // 唯一玩家 ID
	UserIDInt64 int64           // 绑定的数据库数字用户 ID
	AuthToken   string          // 用户的 Bearer Token
	Hub         *Hub            // 关联的大厅
	Conn        *websocket.Conn // Websocket 连接
	Send        chan []byte     // 待发送给该客户端的消息队列

	Room *Room  // 当前所在的房间，没有则为 nil
	Camp string // 分配的阵营: "RED" | "BLUE"
}

// WSMessage 统一消息外壳
type WSMessage struct {
	Action string `json:"action"` // 消息指令
	Data   string `json:"data"`   // JSON 载荷
}

// ReadPump 循环读取客户端发送的消息
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// 也可以由客户端发自定义 ping 动作包，这里设置处理 gorilla 的 PingHandler
	c.Conn.SetPingHandler(func(string) error {
		_ = c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		// 回复 pong
		_ = c.Conn.WriteControl(websocket.PongMessage, []byte{}, time.Now().Add(writeWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[Client %s] 异常断开: %v", c.ID, err)
			}
			break
		}

		// 解析统一的消息格式
		var msg WSMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("[Client %s] JSON 解析失败: %v", c.ID, err)
			continue
		}

		// 分发处理消息
		c.handleMessage(msg)
	}
}

// WritePump 循环向客户端推送消息
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub 关闭了 Channel
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			_, _ = w.Write(message)
			
			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			// 定时发送 Ping 帧检测网络并保持连接活性
			_ = c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage 处理解析后的玩家上行消息
func (c *Client) handleMessage(msg WSMessage) {
	switch msg.Action {
	case "ping":
		// 自定义心跳消息支持
		c.sendAction("pong", "")

	case "match_seek":
		// 请求加入匹配房间，携带房间代码
		var req struct {
			RoomCode string `json:"room_code"`
			UserName string `json:"user_name"`
		}
		if err := json.Unmarshal([]byte(msg.Data), &req); err != nil {
			log.Printf("解析 match_seek 数据错误: %v", err)
			return
		}
		c.Hub.matchSeek <- matchRequest{
			client:   c,
			roomCode: req.RoomCode,
		}

	case "move":
		// 玩家走子，透传转发给对手
		if c.Room == nil {
			log.Printf("[Client %s] 尝试在未加入房间时移动棋子", c.ID)
			return
		}
		c.Room.handleMove(c, msg.Data)

	case "quick_chat":
		// 快捷短语/表情消息，透传转发给对手
		if c.Room == nil {
			return
		}
		c.Room.handleQuickChat(c, msg.Data)

	case "game_over":
		// 客户端判定游戏结束并上报
		if c.Room == nil {
			return
		}
		c.Room.handleGameOver(c, msg.Data)

	case "surrender":
		// 玩家认输
		if c.Room == nil {
			return
		}
		c.Room.handleSurrender(c)
	}
}

// sendAction 辅助方法，发送带动作的消息给当前客户端
func (c *Client) sendAction(action string, data string) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Client %s] 发送动作 %s panic 恢复: %v", c.ID, action, r)
		}
	}()

	msg := WSMessage{
		Action: action,
		Data:   data,
	}
	bytes, err := json.Marshal(msg)
	if err != nil {
		log.Printf("序列化消息失败: %v", err)
		return
	}
	select {
	case c.Send <- bytes:
	default:
		// 如果发送阻塞，可能玩家网络已死，安全丢弃消息
	}
}
