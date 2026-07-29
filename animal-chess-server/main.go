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

func buildHTTPHandler(app *App) (http.Handler, error) {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWs(app.Hub, w, r)
	})
	RegisterAuthRoutes(mux, app)
	RegisterSignInRoutes(mux, app)
	return mux, nil
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

	app, err := newApp()
	if err != nil {
		log.Printf("main newApp error: %v", err)
		return
	}
	if app.DB != nil {
		defer app.DB.Close()
	}

	go app.Hub.Run()

	handler, err := buildHTTPHandler(app)
	if err != nil {
		log.Printf("main buildHTTPHandler error: %v", err)
		return
	}

	server := &http.Server{
		Addr:    app.Config.ListenAddr,
		Handler: handler,
	}

	log.Printf("斗兽棋联机服务器已启动，正在监听端口 %s...", app.Config.ListenAddr)
	err = server.ListenAndServe()
	if err != nil {
		log.Fatalf("main ListenAndServe error: %v", err)
	}
}
