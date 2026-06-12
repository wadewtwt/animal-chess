package main

import (
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// 允许跨域连接，用于 Cocos 本地预览调试
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("长连接升级失败:", err)
		return
	}

	// 优先从客户端 Query 参数中提取已有的玩家 ID，无则重新生成，以支持页面刷新重连
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		rand.Seed(time.Now().UnixNano())
		userID = fmt.Sprintf("user_%d_%04d", time.Now().Unix(), rand.Intn(10000))
	}

	client := &Client{
		ID:   userID,
		Hub:  hub,
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	client.Hub.register <- client

	// 启动写入协程和读取协程
	go client.WritePump()
	go client.ReadPump()
}

func main() {
	log.Println("正在初始化斗兽棋大厅管理器...")
	hub := NewHub()
	go hub.Run()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	// 端口按照用户要求修改为 8083
	port := "8083"
	log.Printf("斗兽棋联机服务器已启动，正在监听端口 :%s...", port)
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatal("服务器启动失败: ", err)
	}
}
