/**
 * 斗兽棋核心游戏引擎 (纯逻辑，不依赖 Cocos 引擎)
 */

export enum Camp {
    RED = 'RED',
    BLUE = 'BLUE'
}

export enum AnimalType {
    RAT = 1,      // 鼠
    CAT = 2,      // 猫
    DOG = 3,      // 狗
    WOLF = 4,     // 狼
    LEOPARD = 5,  // 豹
    TIGER = 6,    // 虎
    LION = 7,     // 狮
    ELEPHANT = 8  // 象
}

export interface Position {
    x: number; // 0..6
    y: number; // 0..8
}

export interface Piece {
    id: string; // 唯一ID
    type: AnimalType;
    camp: Camp;
    x: number;
    y: number;
}

export enum GameOverReason {
    DEN_CAPTURED = 'DEN_CAPTURED',   // 占领兽穴
    ELIMINATED = 'ELIMINATED',       // 全军覆没
    NO_MOVE = 'NO_MOVE',             // 无路可走 (困毙)
    REPETITION_DRAW = 'REPETITION_DRAW' // 5次相同局面判和
}

export interface GameOverStatus {
    isGameOver: boolean;
    winner: Camp | null;
    reason: GameOverReason | null;
}

export class LocalEngine {
    // 棋盘大小
    public static readonly COLS = 7;
    public static readonly ROWS = 9;

    // 棋盘数据 (二维数组：[x][y])
    private board: (Piece | null)[][] = [];

    // 当前行动方
    private currentTurn: Camp = Camp.RED;

    // 所有活着的棋子列表
    private pieces: Piece[] = [];

    // 局面历史记录 (用于判定5次重复局面)
    // 键为局面签名序列化字符串，值为出现次数
    private historyStates: Map<string, number> = new Map();

    constructor() {
        this.resetGame();
    }

    /**
     * 重置/初始化游戏
     */
    public resetGame(): void {
        this.board = Array.from({ length: LocalEngine.COLS }, () => 
            Array.from({ length: LocalEngine.ROWS }, () => null)
        );
        this.pieces = [];
        this.currentTurn = Camp.RED;
        this.historyStates.clear();

        // 初始化红方 (下方，y=0..2)
        this.addPiece(AnimalType.RAT, Camp.RED, 0, 0);
        this.addPiece(AnimalType.ELEPHANT, Camp.RED, 6, 0);
        this.addPiece(AnimalType.CAT, Camp.RED, 1, 1);
        this.addPiece(AnimalType.DOG, Camp.RED, 5, 1);
        this.addPiece(AnimalType.WOLF, Camp.RED, 0, 2);
        this.addPiece(AnimalType.LEOPARD, Camp.RED, 2, 2);
        this.addPiece(AnimalType.TIGER, Camp.RED, 4, 2);
        this.addPiece(AnimalType.LION, Camp.RED, 6, 2);

        // 初始化蓝方 (上方，y=6..8)
        this.addPiece(AnimalType.ELEPHANT, Camp.BLUE, 0, 8);
        this.addPiece(AnimalType.RAT, Camp.BLUE, 6, 8);
        this.addPiece(AnimalType.DOG, Camp.BLUE, 1, 7);
        this.addPiece(AnimalType.CAT, Camp.BLUE, 5, 7);
        this.addPiece(AnimalType.LION, Camp.BLUE, 0, 6);
        this.addPiece(AnimalType.TIGER, Camp.BLUE, 2, 6);
        this.addPiece(AnimalType.LEOPARD, Camp.BLUE, 4, 6);
        this.addPiece(AnimalType.WOLF, Camp.BLUE, 6, 6);

        // 记录初始局面
        this.recordHistoryState();
    }

    private addPiece(type: AnimalType, camp: Camp, x: number, y: number): void {
        const id = `${camp}_${type}`;
        const piece: Piece = { id, type, camp, x, y };
        this.board[x][y] = piece;
        this.pieces.push(piece);
    }

    public getPieceAt(x: number, y: number): Piece | null {
        if (!this.isValidCoords(x, y)) return null;
        return this.board[x][y];
    }

    public getPieces(): Piece[] {
        return this.pieces;
    }

    public getCurrentTurn(): Camp {
        return this.currentTurn;
    }

    /**
     * 判断坐标是否在棋盘内
     */
    public isValidCoords(x: number, y: number): boolean {
        return x >= 0 && x < LocalEngine.COLS && y >= 0 && y < LocalEngine.ROWS;
    }

    /**
     * 判断是否是河道格子
     */
    public isRiver(x: number, y: number): boolean {
        // 左河道: col 1,2; row 3,4,5
        // 右河道: col 4,5; row 3,4,5
        const inY = y === 3 || y === 4 || y === 5;
        const inLeftX = x === 1 || x === 2;
        const inRightX = x === 4 || x === 5;
        return inY && (inLeftX || inRightX);
    }

    /**
     * 判断是否是兽穴
     */
    public isDen(x: number, y: number): boolean {
        return (x === 3 && y === 0) || (x === 3 && y === 8);
    }

    /**
     * 获取指定坐标是哪一方的兽穴
     */
    public getDenCamp(x: number, y: number): Camp | null {
        if (x === 3 && y === 0) return Camp.RED;
        if (x === 3 && y === 8) return Camp.BLUE;
        return null;
    }

    /**
     * 判断是否是陷阱，并返回是哪一方的陷阱
     */
    public getTrapCamp(x: number, y: number): Camp | null {
        // 红方陷阱：(2,0), (4,0), (3,1)
        if ((x === 2 && y === 0) || (x === 4 && y === 0) || (x === 3 && y === 1)) {
            return Camp.RED;
        }
        // 蓝方陷阱：(2,8), (4,8), (3,7)
        if ((x === 2 && y === 8) || (x === 4 && y === 8) || (x === 3 && y === 7)) {
            return Camp.BLUE;
        }
        return null;
    }

    /**
     * 核心校验：玩家一步移动是否合法
     */
    public validateMove(fromX: number, fromY: number, toX: number, toY: number): boolean {
        // 1. 基础范围检查
        if (!this.isValidCoords(fromX, fromY) || !this.isValidCoords(toX, toY)) {
            return false;
        }

        // 2. 起点必须有己方棋子
        const piece = this.board[fromX][fromY];
        if (!piece || piece.camp !== this.currentTurn) {
            return false;
        }

        // 3. 终点不能是己方棋子
        const destPiece = this.board[toX][toY];
        if (destPiece && destPiece.camp === this.currentTurn) {
            return false;
        }

        // 4. 终点绝对不能是己方的兽穴
        if (this.isDen(toX, toY) && this.getDenCamp(toX, toY) === piece.camp) {
            return false;
        }

        // 距离计算
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);

        // 5. 狮、虎跳河判定
        if ((piece.type === AnimalType.LION || piece.type === AnimalType.TIGER) && !this.isRiver(fromX, fromY)) {
            // 如果是跳河，dx/dy 必须要跨过河道
            // 纵向跳河：跨过 row 3,4,5；从 row 2 到 row 6，或者从 row 6 到 row 2。且 x 必须在河道列里。
            const isVerticalJump = dx === 0 && dy === 4 && ((fromY === 2 && toY === 6) || (fromY === 6 && toY === 2)) && (fromX === 1 || fromX === 2 || fromX === 4 || fromX === 5);
            // 横向跳河：跨过 col 1,2 或 col 4,5；从 0 到 3 / 3 到 0，或从 3 到 6 / 6 到 3。且 y 必须在河道行。
            const isHorizontalLeftJump = dy === 0 && dx === 3 && ((fromX === 0 && toX === 3) || (fromX === 3 && toX === 0)) && (fromY === 3 || fromY === 4 || fromY === 5);
            const isHorizontalRightJump = dy === 0 && dx === 3 && ((fromX === 3 && toX === 6) || (fromX === 6 && toX === 3)) && (fromY === 3 || fromY === 4 || fromY === 5);

            if (isVerticalJump || isHorizontalLeftJump || isHorizontalRightJump) {
                // 检查跳跃路径上是否有任何一方的老鼠
                if (isVerticalJump) {
                    const step = toY > fromY ? 1 : -1;
                    for (let currY = fromY + step; currY !== toY; currY += step) {
                        const midPiece = this.board[fromX][currY];
                        if (midPiece && midPiece.type === AnimalType.RAT) {
                            return false; // 被老鼠挡住，无法跳河
                        }
                    }
                } else {
                    const step = toX > fromX ? 1 : -1;
                    for (let currX = fromX + step; currX !== toX; currX += step) {
                        const midPiece = this.board[currX][fromY];
                        if (midPiece && midPiece.type === AnimalType.RAT) {
                            return false; // 被老鼠挡住，无法跳河
                        }
                    }
                }

                // 路径通畅，继续校验目标点吃子逻辑
                if (destPiece) {
                    return this.canEat(piece, destPiece, fromX, fromY, toX, toY);
                }
                return true;
            }
        }

        // 6. 常规单格移动限制
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            // 老鼠之外的动物不能进小河
            if (piece.type !== AnimalType.RAT && this.isRiver(toX, toY)) {
                return false;
            }

            // 目标点有敌方棋子，判定是否能吃
            if (destPiece) {
                return this.canEat(piece, destPiece, fromX, fromY, toX, toY);
            }
            return true;
        }

        return false;
    }

    /**
     * 吃子逻辑校验
     */
    public canEat(attacker: Piece, defender: Piece, fromX: number, fromY: number, toX: number, toY: number): boolean {
        // 1. 跨界吃子判定 (河岸限制)
        const isAttackerInRiver = this.isRiver(fromX, fromY);
        const isDefenderInRiver = this.isRiver(toX, toY);

        if (isAttackerInRiver && !isDefenderInRiver) {
            // 河里的老鼠不能吃岸上的任何棋子
            return false;
        }
        if (!isAttackerInRiver && isDefenderInRiver) {
            // 岸上的任何棋子不能吃河里的老鼠
            return false;
        }

        // 2. 陷阱削减机制：如果防守方在攻击方的陷阱中，攻击方可以无条件吃掉它
        const trapCamp = this.getTrapCamp(toX, toY);
        if (trapCamp && trapCamp === attacker.camp) {
            return true; // 敌方掉入己方陷阱，战力归0，无条件吃
        }

        // 3. 特殊克制关系：鼠吃象，象避鼠
        if (attacker.type === AnimalType.RAT && defender.type === AnimalType.ELEPHANT) {
            // 只有当老鼠在陆地上攻击大象时，才能吃（前文跨界校验已排除了河里吃岸上的情况）
            return true;
        }
        if (attacker.type === AnimalType.ELEPHANT && defender.type === AnimalType.RAT) {
            // 大象永远吃不掉老鼠
            return false;
        }

        // 4. 常规大吃小：攻击者等级 >= 防守者等级
        return attacker.type >= defender.type;
    }

    /**
     * 执行行棋操作 (注意：在此方法前必须调用 validateMove)
     * @returns 返回被吃掉的棋子 (若有)
     */
    public makeMove(fromX: number, fromY: number, toX: number, toY: number): Piece | null {
        const piece = this.board[fromX][fromY];
        if (!piece) return null;

        const destPiece = this.board[toX][toY];

        // 如果终点有子，则是吃子
        if (destPiece) {
            this.pieces = this.pieces.filter(p => p.id !== destPiece.id);
            this.board[toX][toY] = null;
        }

        // 物理移动
        this.board[fromX][fromY] = null;
        piece.x = toX;
        piece.y = toY;
        this.board[toX][toY] = piece;

        // 轮换回合
        this.currentTurn = this.currentTurn === Camp.RED ? Camp.BLUE : Camp.RED;

        // 记录局面哈希并查重
        this.recordHistoryState();

        return destPiece;
    }

    /**
     * 判定当前游戏状态 (胜负 / 和棋)
     */
    public checkGameOver(): GameOverStatus {
        // 1. 直捣黄龙：检查是否有棋子占领了对方兽穴
        // 蓝方兽穴 (3,8)，若有红方棋子，则红方胜
        const blueDenPiece = this.board[3][8];
        if (blueDenPiece && blueDenPiece.camp === Camp.RED) {
            return { isGameOver: true, winner: Camp.RED, reason: GameOverReason.DEN_CAPTURED };
        }
        // 红方兽穴 (3,0)，若有蓝方棋子，则蓝方胜
        const redDenPiece = this.board[3][0];
        if (redDenPiece && redDenPiece.camp === Camp.BLUE) {
            return { isGameOver: true, winner: Camp.BLUE, reason: GameOverReason.DEN_CAPTURED };
        }

        // 2. 全军覆没：检查双方剩余棋子数
        const redPieces = this.pieces.filter(p => p.camp === Camp.RED);
        const bluePieces = this.pieces.filter(p => p.camp === Camp.BLUE);
        if (redPieces.length === 0) {
            return { isGameOver: true, winner: Camp.BLUE, reason: GameOverReason.ELIMINATED };
        }
        if (bluePieces.length === 0) {
            return { isGameOver: true, winner: Camp.RED, reason: GameOverReason.ELIMINATED };
        }

        // 3. 困毙判定：当前行动方是否无路可走
        if (!this.hasValidMoves(this.currentTurn)) {
            const winner = this.currentTurn === Camp.RED ? Camp.BLUE : Camp.RED;
            return { isGameOver: true, winner, reason: GameOverReason.NO_MOVE };
        }

        // 4. 5次重复局面判定和棋
        const currentHash = this.serializeBoardState();
        const count = this.historyStates.get(currentHash) || 0;
        if (count >= 5) {
            return { isGameOver: true, winner: null, reason: GameOverReason.REPETITION_DRAW };
        }

        return { isGameOver: false, winner: null, reason: null };
    }

    /**
     * 判断某一方是否有合法的走步
     */
    private hasValidMoves(camp: Camp): boolean {
        const campPieces = this.pieces.filter(p => p.camp === camp);
        for (const piece of campPieces) {
            // 狮、虎除了单步，还可以跳河 (最多移动4格)
            const maxStep = (piece.type === AnimalType.LION || piece.type === AnimalType.TIGER) ? 4 : 1;
            
            // 扫描周围所有可能的目标格
            for (let dx = -maxStep; dx <= maxStep; dx++) {
                for (let dy = -maxStep; dy <= maxStep; dy++) {
                    if (Math.abs(dx) + Math.abs(dy) === 0) continue;
                    
                    // 只能横着或竖着移动
                    if (dx !== 0 && dy !== 0) continue;

                    const toX = piece.x + dx;
                    const toY = piece.y + dy;

                    if (this.validateMove(piece.x, piece.y, toX, toY)) {
                        return true; // 只要找到一步合法走子，就没有被困毙
                    }
                }
            }
        }
        return false;
    }

    /**
     * 序列化当前局面，生成唯一签名，用于重复局面查重
     */
    private serializeBoardState(): string {
        // 格式：TURN:RED;PIECES:RED_1_0_0,BLUE_8_6_8...
        // 为确保哈希唯一性，棋子按 ID 排序
        const sortedPieces = [...this.pieces].sort((a, b) => a.id.localeCompare(b.id));
        const piecesStr = sortedPieces
            .map(p => `${p.id}_${p.x}_${p.y}`)
            .join(',');
        return `TURN:${this.currentTurn};PIECES:${piecesStr}`;
    }

    /**
     * 记录当前局面哈希
     */
    private recordHistoryState(): void {
        const hash = this.serializeBoardState();
        const count = this.historyStates.get(hash) || 0;
        this.historyStates.set(hash, count + 1);
    }
}
