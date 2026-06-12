import { log, sys } from 'cc';

export interface WSMessage {
    action: string;
    data: string;
}

export class NetworkManager {
    private static instance: NetworkManager | null = null;

    private ws: WebSocket | null = null;
    private serverUrl: string = 'ws://localhost:8083/ws';
    private listeners: Map<string, Set<Function>> = new Map();
    
    private isConnected: boolean = false;
    private pingTimer: number | null = null;
    private reconnectTimer: number | null = null;
    private autoReconnect: boolean = true;

    // 当前的对局房间与阵营信息暂存
    public currentRoomId: string = '';
    public myCamp: string = ''; // "RED" | "BLUE"
    public opponentId: string = '';

    private constructor() {
        // 监听并持久化唯一玩家 ID，用于支持刷新页面不退出和断线重连
        this.on('init_user', (userId: string) => {
            sys.localStorage.setItem('animal_chess_user_id', userId);
            log(`[Network] 本地保存/更新玩家 ID: ${userId}`);
        });
    }

    public static getInstance(): NetworkManager {
        if (!NetworkManager.instance) {
            NetworkManager.instance = new NetworkManager();
        }
        return NetworkManager.instance;
    }

    /**
     * 开始连接服务器
     */
    public connect(url?: string): Promise<void> {
        if (url) {
            this.serverUrl = url;
        }

        return new Promise((resolve, reject) => {
            if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
                resolve();
                return;
            }

            // 获取本地持久化的唯一玩家 ID 并作为 Query 参数连入，以便服务端识别重连身份
            const savedUserId = sys.localStorage.getItem('animal_chess_user_id') || '';
            let finalUrl = this.serverUrl;
            if (savedUserId) {
                finalUrl += (finalUrl.indexOf('?') >= 0 ? '&' : '?') + `user_id=${savedUserId}`;
            }

            log(`[Network] 正在连接服务器: ${finalUrl}`);
            this.autoReconnect = true;
            this.ws = new WebSocket(finalUrl);

            this.ws.onopen = () => {
                log('[Network] WebSocket 连接成功！');
                this.isConnected = true;
                this.startPing();
                this.clearReconnect();
                resolve();
                this.emit('connected', null);
            };

            this.ws.onerror = (ev) => {
                log(`[Network] WebSocket 发生错误: ${ev}`);
                reject(ev);
                this.emit('error', ev);
            };

            this.ws.onclose = (ev) => {
                log(`[Network] WebSocket 连接已关闭. 状态码: ${ev.code}, 原因: ${ev.reason}`);
                this.isConnected = false;
                this.stopPing();
                this.emit('disconnected', ev);

                if (this.autoReconnect) {
                    this.triggerReconnect();
                }
            };

            this.ws.onmessage = (ev) => {
                try {
                    const dataStr = ev.data as string;
                    const lines = dataStr.split('\n');
                    for (const line of lines) {
                        if (!line.trim()) continue;
                        
                        // 解析统一消息包
                        const rawMsg: WSMessage = JSON.parse(line);
                        
                        // 特殊处理心跳回复
                        if (rawMsg.action === 'pong') {
                            continue;
                        }

                        // 分发事件
                        this.emit(rawMsg.action, rawMsg.data);
                    }
                } catch (e) {
                    log(`[Network] 解析服务端消息异常: ${e}, 原始内容: ${ev.data}`);
                }
            };
        });
    }

    /**
     * 发送网络请求消息
     */
    public send(action: string, data: any) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            log(`[Network] 无法发送消息，WebSocket 未连接: action=${action}`);
            return;
        }

        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        const msg: WSMessage = {
            action: action,
            data: dataStr
        };

        this.ws.send(JSON.stringify(msg));
    }

    /**
     * 断开连接
     */
    public disconnect() {
        this.autoReconnect = false;
        this.clearReconnect();
        this.stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        log('[Network] 已主动断开 WebSocket 连接');
    }

    /**
     * 订阅网络消息事件
     */
    public on(action: string, callback: Function) {
        if (!this.listeners.has(action)) {
            this.listeners.set(action, new Set());
        }
        this.listeners.get(action)!.add(callback);
    }

    /**
     * 取消订阅网络消息事件
     */
    public off(action: string, callback: Function) {
        const set = this.listeners.get(action);
        if (set) {
            set.delete(callback);
            if (set.size === 0) {
                this.listeners.delete(action);
            }
        }
    }

    private emit(action: string, data: any) {
        const set = this.listeners.get(action);
        if (set) {
            set.forEach(cb => {
                try {
                    cb(data);
                } catch (err) {
                    log(`[Network] 执行回调出错 action=${action}: ${err}`);
                }
            });
        }
    }

    /**
     * 前端发起的心跳定时器，防止长连接被中间路由静默回收
     */
    private startPing() {
        this.stopPing();
        this.pingTimer = setInterval(() => {
            this.send('ping', '');
        }, 15000) as unknown as number; // 每 15s 发送一次心跳
    }

    private stopPing() {
        if (this.pingTimer !== null) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    private triggerReconnect() {
        if (this.reconnectTimer !== null) return;
        
        log('[Network] 3秒后尝试重新连接...');
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch(() => {
                this.triggerReconnect();
            });
        }, 3000) as unknown as number;
    }

    private clearReconnect() {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}
