import { _decorator, Component, Node, Sprite, SpriteFrame, Button, Prefab, instantiate, Vec3, Color, Label, UITransform, tween, Tween, UIOpacity, view, CCFloat, resources, EffectAsset, Material, Graphics, Texture2D, ImageAsset, Mask, AudioClip, AudioSource, sys } from 'cc';
import { LocalEngine, Camp, Piece, GameOverReason, AnimalType } from '../engine/LocalEngine';
import { PieceView } from './PieceView';
import { MainMenuUI } from './MainMenuUI';
import { LoadingScene } from '../LoadingScene';
import { ModeSelectionUI } from './ModeSelectionUI';
import { AudioSynth } from '../utils/AudioSynth';

const { ccclass, property } = _decorator;

@ccclass('BoardView')
export class BoardView extends Component {
    // === 游戏配置属性 ===
    @property({ type: CCFloat, tooltip: '单元格宽度' })
    public cellWidth: number = 100;

    @property({ type: CCFloat, tooltip: '单元格高度' })
    public cellHeight: number = 100;

    // === 预制体 (Prefabs) ===
    @property(Prefab)
    public piecePrefab: Prefab = null!; // 棋子预制体

    @property(Prefab)
    public cellHighlightPrefab: Prefab = null!; // 移动提示光圈预制体

    @property(Prefab)
    public gridCellPrefab: Prefab = null!; // 背景格子预制体 (用于动态生成棋盘)

    // === 美术贴图 (SpriteFrames) ===
    @property({ type: SpriteFrame, tooltip: '鼠,猫,狗,狼,豹,虎,狮,象 的图片，按战力升序排列 (共8张)' })
    public animalSprites: SpriteFrame[] = [];



    @property(SpriteFrame)
    public redBaseSF: SpriteFrame = null!; // 红方棋子底座

    @property(SpriteFrame)
    public blueBaseSF: SpriteFrame = null!; // 蓝方棋子底座

    @property(SpriteFrame)
    public grass1SF: SpriteFrame = null!; // 草地贴图1 (caoping1)

    @property(SpriteFrame)
    public grass2SF: SpriteFrame = null!; // 草地贴图2 (caoping2)

    // === UI 节点 ===
    @property(Label)
    public turnIndicator: Label = null!; // 回合提示文本

    @property(Node)
    public gameOverPanel: Node = null!; // 游戏结束弹窗

    @property(Label)
    public gameOverText: Label = null!; // 游戏结束文本

    // === 容器节点 ===
    @property(Node)
    public boardContainer: Node = null!; // 棋子与格子容器

    // === 运行时数据 ===
    private engine!: LocalEngine;
    private pieceViews: Map<string, PieceView> = new Map(); // id -> PieceView
    private highlightNodes: Node[] = []; // 当前高亮节点列表
    private selectedPiece: Piece | null = null; // 当前选中的棋子数据
    
    // 音效与音乐播放器
    private audioSource: AudioSource | null = null;
    private bgmSource: AudioSource | null = null;
    private walkFramesByType: Map<number, SpriteFrame[]> = new Map(); // Removed
    private pieceArtByCampAndType: Map<string, SpriteFrame> = new Map();
    private riverSprites: Sprite[] = []; // 存储小河格子 Sprite 引用以动态设置着色器材质
    
    // === 悔棋、返回、倒计时与人机AI 运行时状态 ===
    private isAIMode: boolean = false;
    private remainingTime: number = 30;
    private isAIMoving: boolean = false;
    private backButtonNode: Node | null = null;
    private undoButtonNode: Node | null = null;
    private undoRequestPanel: Node | null = null;
    private turnIndicatorBgNode: Node | null = null;
    private customGameOverPanel: Node | null = null;
    private gameOverWinner: Camp | null = null;
    private gameOverReason: GameOverReason | null = null;
    private bgNode: Node | null = null;
    private bgWashNode: Node | null = null;

    onLoad() {
        // 监听画布大小变化事件进行自适应缩放
        view.on('canvas-resize', this.adjustBoardScale, this);
    }

    onDestroy() {
        view.off('canvas-resize', this.adjustBoardScale, this);
        this.stopTurnTimer();
        if (this.undoRequestPanel) {
            this.undoRequestPanel.destroy();
            this.undoRequestPanel = null;
        }
        if (this.turnIndicatorBgNode) {
            this.turnIndicatorBgNode.destroy();
            this.turnIndicatorBgNode = null;
        }
        if (this.backButtonNode) {
            this.backButtonNode.destroy();
            this.backButtonNode = null;
        }
        if (this.undoButtonNode) {
            this.undoButtonNode.destroy();
            this.undoButtonNode = null;
        }
        if (this.bgNode) {
            this.bgNode.destroy();
            this.bgNode = null;
        }
        if (this.bgWashNode) {
            this.bgWashNode.destroy();
            this.bgWashNode = null;
        }
    }

    start() {
        console.log("BoardView: start() called.");
        this.node.active = false;
        this.engine = new LocalEngine();
        this.initBoardBackground();
        this.adjustBoardScale(); // ???????????????
        this.showLoadingScene();
        this.loadPieceArt().then(() => {
            this.restartGame();
            this.initAudioSource();
        });
    }

    private loadingNode: Node | null = null;

    private showLoadingScene() {
        if (!this.loadingNode) {
            this.loadingNode = new Node('LoadingContainer');
            this.loadingNode.layer = 33554432; // UI_2D
            this.loadingNode.addComponent(UITransform).setContentSize(view.getVisibleSize());
            this.loadingNode.addComponent(LoadingScene);
            this.node.parent!.addChild(this.loadingNode); // Add to Canvas directly
            
            // Hide the board
            this.node.active = false;
            
            // Listen for loading complete
            this.loadingNode.on('loading-complete', () => {
                this.loadingNode!.destroy();
                this.loadingNode = null;
                
                const roomCode = this.getRoomFromLaunch();
                if (roomCode) {
                    console.log("Directly joining room from launch:", roomCode);
                    this.node.active = true;
                    this.isAIMode = false;
                    this.restartGame(); // 直接进入对局
                } else {
                    this.showMainMenu();
                }
            });
        }
    }

    private getRoomFromLaunch(): string {
        let roomCode = '';
        if (sys.isBrowser) {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                roomCode = urlParams.get('room') || '';
            } catch (e) {
                console.warn("Browser query parsing failed:", e);
            }
        }
        const wxObj = (window as any).wx;
        if (typeof wxObj !== 'undefined') {
            try {
                const launchOpts = wxObj.getLaunchOptionsSync();
                if (launchOpts && launchOpts.query && launchOpts.query.room) {
                    roomCode = launchOpts.query.room;
                }
            } catch (e) {
                console.warn("wx.getLaunchOptionsSync error:", e);
            }
        }
        return roomCode;
    }

    private mainMenuNode: Node | null = null;

    private showMainMenu() {
        this.unschedule(this.makeAIMove);
        this.node.active = false;
        if (this.turnIndicator) this.turnIndicator.node.active = false;
        if (this.turnIndicatorBgNode) this.turnIndicatorBgNode.active = false;
        if (this.backButtonNode) this.backButtonNode.active = false;
        if (this.undoButtonNode) this.undoButtonNode.active = false;

        // Ensure clean recreation
        if (this.mainMenuNode) {
            this.mainMenuNode.destroy();
            this.mainMenuNode = null;
        }

        this.mainMenuNode = new Node('MainMenuContainer');
        this.mainMenuNode.layer = 33554432; // UI_2D
        this.mainMenuNode.addComponent(UITransform).setContentSize(view.getVisibleSize());
        this.mainMenuNode.addComponent(MainMenuUI);
        this.node.parent!.addChild(this.mainMenuNode); // Add to Canvas directly
        
        // Listen for start game event
        this.mainMenuNode.on('start-game', () => {
            if (this.mainMenuNode) {
                this.mainMenuNode.destroy();
                this.mainMenuNode = null;
            }
            this.showModeSelection();
        });

        // Listen for music toggle event
        this.mainMenuNode.on('music-toggle', (enabled: boolean) => {
            if (enabled) {
                this.playBGM();
            } else {
                if (this.bgmSource) {
                    this.bgmSource.stop();
                }
            }
        });
    }

    private modeSelectionNode: Node | null = null;

    private showModeSelection() {
        this.unschedule(this.makeAIMove);
        this.node.active = false;
        if (this.turnIndicator) this.turnIndicator.node.active = false;
        if (this.turnIndicatorBgNode) this.turnIndicatorBgNode.active = false;
        if (this.backButtonNode) this.backButtonNode.active = false;
        if (this.undoButtonNode) this.undoButtonNode.active = false;

        // Ensure clean recreation
        if (this.modeSelectionNode) {
            this.modeSelectionNode.destroy();
            this.modeSelectionNode = null;
        }

        this.modeSelectionNode = new Node('ModeSelectionContainer');
        this.modeSelectionNode.layer = 33554432; // UI_2D
        this.modeSelectionNode.addComponent(UITransform).setContentSize(view.getVisibleSize());
        this.modeSelectionNode.addComponent(ModeSelectionUI);
        this.node.parent!.addChild(this.modeSelectionNode); // Add to Canvas directly
        
        // Listen for go back event
        this.modeSelectionNode.on('go-back', () => {
            if (this.modeSelectionNode) {
                this.modeSelectionNode.destroy();
                this.modeSelectionNode = null;
            }
            this.showMainMenu();
        });

        // Listen for start local game event
        this.modeSelectionNode.on('start-local-duo', () => {
            if (this.modeSelectionNode) {
                this.modeSelectionNode.destroy();
                this.modeSelectionNode = null;
            }
            this.node.active = true;
            this.isAIMode = false;
            this.restartGame(); // 开启并重置对局
        });

        // Listen for AI practice start
        this.modeSelectionNode.on('start-ai-practice', (difficulty: string) => {
            sys.localStorage.setItem('jungle_ai_difficulty', difficulty);
            if (this.modeSelectionNode) {
                this.modeSelectionNode.destroy();
                this.modeSelectionNode = null;
            }
            this.node.active = true;
            this.isAIMode = true;
            this.restartGame();
        });
    }



    private initAudioSource() {
        // 创建用于播放音效的 AudioSource
        this.audioSource = this.addComponent(AudioSource);
        
        // 创建专门用于播放背景音乐的 AudioSource，并尝试播放 BGM
        this.bgmSource = this.addComponent(AudioSource);
        this.bgmSource.loop = true;
        this.bgmSource.volume = 0.7; // 背景音乐音量调至 70%
        this.playBGM();
    }

    /**
     * 尝试加载并播放背景音乐
     */
    private playBGM() {
        if (!this.bgmSource) return;

        const musicEnabled = sys.localStorage.getItem('jungle_music_enabled') !== 'false';
        if (!musicEnabled) {
            if (this.bgmSource.playing) {
                this.bgmSource.stop();
            }
            return;
        }

        // 随机选择一首背景音乐
        const bgmList = ['sounds/bgm-1', 'sounds/bgm-2'];
        const randomBGM = bgmList[Math.floor(Math.random() * bgmList.length)];

        resources.load(randomBGM, AudioClip, (err, clip) => {
            if (err) {
                console.log(`提示：加载背景音乐失败 (${randomBGM})，请确保文件存在。`);
                return;
            }
            if (clip && this.bgmSource) {
                this.bgmSource.clip = clip;
                this.bgmSource.play(); // 尝试直接播放
            }
        });

        // 监听用户的第一次点击：解决浏览器“必须在用户交互后才能播放音频”的安全限制
        this.node.once(Node.EventType.TOUCH_END, () => {
            const currentMusicEnabled = sys.localStorage.getItem('jungle_music_enabled') !== 'false';
            if (currentMusicEnabled && this.bgmSource && this.bgmSource.clip && !this.bgmSource.playing) {
                this.bgmSource.play();
            }
        }, this);
    }

    /**
     * 动态计算并缩放棋盘容器，使其完美适配当前画布视口大小
     */
    private getScaleFactor(): number {
        const visibleSize = view.getVisibleSize();
        const cw = visibleSize.width;
        const ch = visibleSize.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        return Math.min(cw / refW, ch / refH);
    }

    /**
     * 动态计算并缩放棋盘容器，使其完美适配当前画布视口大小
     */
    private adjustBoardScale(): void {
        if (!this.boardContainer) return;

        const visibleSize = view.getVisibleSize();
        const screenWidth = visibleSize.width;
        const screenHeight = visibleSize.height;
        const scaleFactor = this.getScaleFactor();

        // 强制归零重正当前 BoardView 本身节点的属性，防止坐标偏离视口
        const nodeTrans = this.node.getComponent(UITransform);
        if (nodeTrans) {
            nodeTrans.setAnchorPoint(0.5, 0.5);
            nodeTrans.setContentSize(screenWidth, screenHeight);
        }
        this.node.setPosition(Vec3.ZERO);
        this.node.setScale(Vec3.ONE);

        // 同步背景及水洗层的大小
        if (this.bgNode) {
            const bgTrans = this.bgNode.getComponent(UITransform);
            if (bgTrans) {
                bgTrans.setContentSize(screenWidth, screenHeight);
            }
        }
        if (this.bgWashNode) {
            const washTrans = this.bgWashNode.getComponent(UITransform);
            if (washTrans) {
                washTrans.setContentSize(screenWidth, screenHeight);
            }
            const g = this.bgWashNode.getComponent(Graphics);
            if (g) {
                g.clear();
                const color = new Color();
                Color.fromHEX(color, '#f6ffe8');
                color.a = 36;
                g.fillColor = color;
                g.rect(-screenWidth / 2, -screenHeight / 2, screenWidth, screenHeight);
                g.fill();
            }
        }

        // 计算棋盘的目标尺寸 (让宽度完美撑满屏幕)
        const boardWidth = LocalEngine.COLS * this.cellWidth;

        // 缩放比完全由宽度决定，以实现宽度撑满屏幕，高度自适应
        let targetScale = screenWidth / boardWidth;

        console.log(`BoardView: adjustScale visibleSize=${screenWidth}x${screenHeight}, targetScale=${targetScale}`);
        this.boardContainer.setScale(new Vec3(targetScale, targetScale, 1.0));

        // 状态栏美化位置绑定 (居中靠上)
        const posY = screenHeight / 2 - 64 * scaleFactor;
        if (this.turnIndicator) {
            this.turnIndicator.fontSize = Math.round(28 * scaleFactor);
            this.turnIndicator.lineHeight = Math.round(36 * scaleFactor);
            this.turnIndicator.node.setPosition(new Vec3(0, posY, 0));
        }
        if (this.turnIndicatorBgNode) {
            const bgTrans = this.turnIndicatorBgNode.getComponent(UITransform);
            if (bgTrans) {
                bgTrans.setContentSize(460 * scaleFactor, 68 * scaleFactor);
            }
            const bgGraphics = this.turnIndicatorBgNode.getComponent(Graphics);
            if (bgGraphics) {
                bgGraphics.clear();
                bgGraphics.lineWidth = 2.5 * scaleFactor;
                bgGraphics.strokeColor = new Color(245, 240, 235, 255); // 象牙白边
                bgGraphics.fillColor = new Color(20, 20, 20, 220); // 优雅的深碳黑色
                const w = 460 * scaleFactor;
                const h = 68 * scaleFactor;
                bgGraphics.roundRect(-w/2, -h/2, w, h, 18 * scaleFactor);
                bgGraphics.fill();
                bgGraphics.stroke();
            }
            this.turnIndicatorBgNode.setPosition(new Vec3(0, posY, 0));
        }

        // 返回按钮位置绑定 (左上角安全边界，与外层返回按钮形状位置完全对齐)
        if (this.backButtonNode) {
            const backTrans = this.backButtonNode.getComponent(UITransform);
            if (backTrans) {
                backTrans.setContentSize(80, 80); // 触控热区 80x80 物理像素
            }
            const backGraphics = this.backButtonNode.getComponent(Graphics);
            if (backGraphics) {
                backGraphics.clear();
                const r = 42 * scaleFactor;
                
                // 1. 绘制阴影 (偏移 2.5 * scaleFactor)
                const shadowColor = new Color(40, 30, 0, 80); // 深茶色半透明
                backGraphics.fillColor = shadowColor;
                backGraphics.circle(0, -2.5 * scaleFactor, r);
                backGraphics.fill();

                // 2. 绘制主体底色圆 (更高级的暖太阳金黄色)
                backGraphics.fillColor = new Color(248, 215, 32, 255); 
                backGraphics.circle(0, 0, r);
                backGraphics.fill();

                // 3. 描边 (高光白描边)
                backGraphics.lineWidth = 2.5 * scaleFactor;
                backGraphics.strokeColor = new Color(255, 255, 255, 255);
                backGraphics.circle(0, 0, r);
                backGraphics.stroke();

                // 4. 绘制精致高光月牙 (果冻质感)
                backGraphics.fillColor = new Color(255, 255, 255, 36); 
                backGraphics.arc(0, 0, r - 1.5 * scaleFactor, 0, Math.PI, false);
                backGraphics.lineTo(-(r - 1.5 * scaleFactor), 0);
                backGraphics.close();
                backGraphics.fill();

                // 5. 绘制极简现代圆角折线箭头 (巧克力茶褐色)
                backGraphics.lineWidth = 6 * scaleFactor;
                backGraphics.strokeColor = new Color(50, 38, 0, 255);
                backGraphics.lineCap = 1; // ROUND
                backGraphics.lineJoin = 1; // ROUND
                
                const arrowLength = 12 * scaleFactor;
                const arrowWidth = 9 * scaleFactor;
                backGraphics.moveTo(arrowLength, 0);
                backGraphics.lineTo(-arrowLength + 2 * scaleFactor, 0);
                backGraphics.stroke();

                backGraphics.moveTo(-arrowLength + 2 * scaleFactor + arrowWidth * 0.8, arrowWidth * 0.8);
                backGraphics.lineTo(-arrowLength + 2 * scaleFactor, 0);
                backGraphics.lineTo(-arrowLength + 2 * scaleFactor + arrowWidth * 0.8, -arrowWidth * 0.8);
                backGraphics.stroke();
            }
            // 隐藏子 Label 节点以防残留
            const labelNode = this.backButtonNode.getChildByName("Label");
            if (labelNode) {
                labelNode.active = false;
            }
            this.backButtonNode.setPosition(new Vec3(-screenWidth / 2 + 56 * scaleFactor, screenHeight / 2 - 54 * scaleFactor, 0));
        }

        // 悔棋按钮位置绑定 (底部偏上，避开安全操作栏)
        if (this.undoButtonNode) {
            const undoTrans = this.undoButtonNode.getComponent(UITransform);
            if (undoTrans) {
                undoTrans.setContentSize(190 * scaleFactor, 56 * scaleFactor);
            }
            const undoGraphics = this.undoButtonNode.getComponent(Graphics);
            if (undoGraphics) {
                undoGraphics.clear();
                undoGraphics.lineWidth = 3 * scaleFactor;
                undoGraphics.strokeColor = new Color(255, 255, 255, 255);
                undoGraphics.fillColor = new Color(230, 130, 20, 240); // 暖金橙色
                const w = 190 * scaleFactor;
                const h = 56 * scaleFactor;
                undoGraphics.roundRect(-w/2, -h/2, w, h, 16 * scaleFactor);
                undoGraphics.fill();
                undoGraphics.stroke();
            }
            const undoLabelNode = this.undoButtonNode.getChildByName("Label");
            if (undoLabelNode) {
                const undoLabelTrans = undoLabelNode.getComponent(UITransform);
                if (undoLabelTrans) undoLabelTrans.setContentSize(190 * scaleFactor, 56 * scaleFactor);
                const undoLabelComp = undoLabelNode.getComponent(Label);
                if (undoLabelComp) {
                    undoLabelComp.fontSize = Math.round(22 * scaleFactor);
                    undoLabelComp.lineHeight = Math.round(26 * scaleFactor);
                }
            }
            this.undoButtonNode.setPosition(new Vec3(0, -screenHeight / 2 + 75 * scaleFactor, 0));
        }

        // 重新排布结算弹窗 (如果有)
        if (this.customGameOverPanel && this.customGameOverPanel.active) {
            this.layoutCustomGameOverPanel();
        }
    }

    /**
     * 重启游戏
     */
    public restartGame(): void {
        this.unschedule(this.makeAIMove);
        this.stopTurnTimer();
        this.isAIMoving = false;

        // 对局中音量调低至 50% 的 0.7 = 0.35
        if (this.bgmSource) {
            this.bgmSource.volume = 0.35;
            const musicEnabled = sys.localStorage.getItem('jungle_music_enabled') !== 'false';
            if (!musicEnabled && this.bgmSource.playing) {
                this.bgmSource.stop();
            }
        }

        // 1. 清理棋子
        this.pieceViews.forEach(pv => {
            if (pv.node) pv.node.destroy();
        });
        this.pieceViews.clear();

        // 2. 重置引擎状态
        this.engine.resetGame();
        this.selectedPiece = null;
        this.clearHighlights();

        // 3. 渲染新棋子
        this.renderPieces();

        // 4. 隐藏结束弹窗
        if (this.gameOverPanel) {
            this.gameOverPanel.active = false;
        }
        this.hideCustomGameOverPanel();

        // 动态创建并布局游戏内的UI组件 (返回按钮和悔棋按钮)
        this.createInGameUI();

        this.startTurnTimer();
    }

    /**
     * 初始化棋盘背景 (如果用户没有底图，脚本将自动根据格子坐标渲染出小河、陷阱和兽穴)
     */
    private initBoardBackground(): void {
        console.log("BoardView: initBoardBackground() called. gridCellPrefab =", this.gridCellPrefab);
        if (!this.boardContainer) {
            this.boardContainer = this.node;
        }

        // 创建全屏背景图
        if (!this.bgNode) {
            this.bgNode = new Node('GameBackground');
            this.bgNode.layer = 33554432; // UI_2D
            const bgTrans = this.bgNode.addComponent(UITransform);
            bgTrans.setContentSize(view.getVisibleSize().width, view.getVisibleSize().height);
            const bgSprite = this.bgNode.addComponent(Sprite);
            bgSprite.sizeMode = 0;
            this.safeLoadSprite('textures/main_menu_bg', bgSprite);
            this.node.addChild(this.bgNode);
            this.bgNode.setSiblingIndex(0); // 置于最底层
        }

        if (!this.bgWashNode) {
            this.bgWashNode = new Node('GameBgWash');
            this.bgWashNode.layer = 33554432;
            const washTrans = this.bgWashNode.addComponent(UITransform);
            washTrans.setContentSize(view.getVisibleSize().width, view.getVisibleSize().height);
            const g = this.bgWashNode.addComponent(Graphics);
            const color = new Color();
            Color.fromHEX(color, '#f6ffe8');
            color.a = 36;
            g.fillColor = color;
            g.rect(-view.getVisibleSize().width / 2, -view.getVisibleSize().height / 2, view.getVisibleSize().width, view.getVisibleSize().height);
            g.fill();
            this.node.addChild(this.bgWashNode);
            this.bgWashNode.setSiblingIndex(1); // 置于背景之上
        }

        // 森林微光特效粒子层 (加在背景 wash 层之上，对局元素及 UI 之下)
        if (sys.localStorage.getItem('jungle_effects_enabled') !== 'false') {
            if (!this.node.getChildByName('ForestFirefliesLayer')) {
                const scaleFactor = Math.min(view.getVisibleSize().width / 750, view.getVisibleSize().height / 1334);
                this.createForestFireflies(this.node, scaleFactor);
            }
        }

        this.riverSprites = [];

        // 如果提供了 gridCellPrefab，则自动铺满 7x9 = 63 个格子
        if (this.gridCellPrefab) {
            for (let x = 0; x < LocalEngine.COLS; x++) {
                for (let y = 0; y < LocalEngine.ROWS; y++) {
                    const cellNode = instantiate(this.gridCellPrefab);
                    cellNode.parent = this.boardContainer;
                    cellNode.setPosition(this.gridToWorldPos(x, y));

                    // 绑定点击事件，点击空白格子用于移动
                    cellNode.on(Node.EventType.TOUCH_END, () => {
                        this.onCellClicked(x, y);
                    }, this);

                    // 根据地形给格子涂色，方便新手认清棋盘
                    const sprite = cellNode.getComponent(Sprite);
                    if (sprite) {
                        if (this.engine.isRiver(x, y)) {
                            // 小河格：保持底层预设的贴图，染成卡通水蓝色
                            sprite.color = new Color(30, 144, 255, 255); // DodgerBlue
                            // 将格子稍微扩大 2 像素（102x102），使相邻河道产生微小重叠以遮挡草地缝隙，同时完美保留贴图纹理
                            const trans = cellNode.getComponent(UITransform);
                            if (trans) {
                                trans.setContentSize(this.cellWidth + 2, this.cellHeight + 2);
                            }
                        } else if (this.engine.getTrapCamp(x, y) !== null) {
                            // 陷阱格：使用用户上传的精美陷阱图片
                            resources.load('textures/trap/texture', ImageAsset, (err, imageAsset) => {
                                if (err) {
                                    console.error("Failed to load trap image:", err);
                                    sprite.color = new Color(220, 75, 75, 200); // 加载失败的降级方案
                                    return;
                                }
                                if (cellNode.isValid) {
                                    const tex = new Texture2D(); tex.image = imageAsset;
                                    const sf = new SpriteFrame(); sf.texture = tex;
                                    sprite.spriteFrame = sf;
                                    sprite.color = new Color(255, 255, 255, 255); // 使用图片原色
                                }
                            });
                        } else {
                            // 陆地与兽穴格：相隔排列 caoping1 和 caoping2
                            const useGrass1 = (x + y) % 2 === 0;
                            const targetSF = useGrass1 ? this.grass1SF : this.grass2SF;

                            if (targetSF) {
                                sprite.spriteFrame = targetSF;
                                sprite.color = new Color(255, 255, 255, 255); // 使用贴图原色彩
                            } else {
                                // 备用降级方案（未在编辑器绑定贴图时使用纯色相隔）
                                sprite.color = useGrass1 ? new Color(115, 185, 120, 255) : new Color(125, 195, 130, 255);
                            }

                            // 兽穴格：使用精美的帐篷大本营图片
                            if (this.engine.isDen(x, y)) {
                                resources.load('textures/den/texture', ImageAsset, (err, imageAsset) => {
                                    if (err) {
                                        console.error("Failed to load den image:", err);
                                        sprite.color = new Color(255, 235, 120, 255); // 降级方案
                                        return;
                                    }
                                    if (cellNode.isValid) {
                                        const tex = new Texture2D(); tex.image = imageAsset;
                                        const sf = new SpriteFrame(); sf.texture = tex;
                                        sprite.spriteFrame = sf;
                                        sprite.color = new Color(255, 255, 255, 255); // 使用图片原色
                                    }
                                });
                            }

                            // 1. 特色：动态随风摇曳的草叶 (已优化移除以降低 Draw Call 和性能消耗)

                            // 2. 特色：偶有呼吸绽放的小野花 (Flowers)
                            if (sys.localStorage.getItem('jungle_effects_enabled') !== 'false') {
                                if (Math.random() < 0.25) {
                                    const flowerNode = new Node(`Flower`);
                                    flowerNode.parent = cellNode;
                                    flowerNode.layer = cellNode.layer;

                                    const fTransform = flowerNode.addComponent(UITransform);
                                    flowerNode.setScale(new Vec3(1.0, 1.0, 1.0));
                                    fTransform.setContentSize(6, 6);
                                    fTransform.setAnchorPoint(0.5, 0.5);

                                    const fSprite = flowerNode.addComponent(Sprite);
                                    fSprite.sizeMode = 0;
                                    fSprite.spriteFrame = this.gridCellPrefab.data.getComponent(Sprite)?.spriteFrame || sprite.spriteFrame;
                                    // 随机出白色、黄色或淡紫色的花朵
                                    const colors = [
                                        new Color(255, 255, 255, 255), // 白色
                                        new Color(255, 215, 0, 255),   // 黄色
                                        new Color(210, 160, 255, 255),  // 淡紫色
                                    ];
                                    fSprite.color = colors[Math.floor(Math.random() * colors.length)];

                                    const flowX = -35 + Math.random() * 70;
                                    const flowY = -15 + Math.random() * 45;
                                    flowerNode.setPosition(new Vec3(flowX, flowY, 0));

                                    // 呼吸微型动效
                                    const scaleTime = 0.8 + Math.random() * 0.5;
                                    tween(flowerNode)
                                        .to(scaleTime, { scale: new Vec3(1.2, 1.2, 1.0) }, { easing: 'sineInOut' })
                                        .to(scaleTime, { scale: new Vec3(0.8, 0.8, 1.0) }, { easing: 'sineInOut' })
                                        .union()
                                        .repeatForever()
                                        .start();
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 最后生成跨越整个河道畅游的全局鱼群
        if (sys.localStorage.getItem('jungle_effects_enabled') !== 'false') {
            this.createGlobalFishes();
        }
    }
    
    private createGlobalFishes(): void {
        const createRiverArea = (centerX: number, centerY: number, width: number, height: number, name: string) => {
            const areaNode = new Node(name);
            areaNode.parent = this.boardContainer;
            areaNode.layer = this.boardContainer!.layer || 33554432;
            areaNode.setPosition(this.gridToWorldPos(centerX, centerY));
            
            const transform = areaNode.addComponent(UITransform);
            transform.setContentSize(width, height);
            areaNode.addComponent(Mask);
            
            // 1. 双层差速无缝滚动大水体背景 (Parallax Water Sliding)
            // 第一层：慢速基底水流
            const waterContainer1 = new Node('WaterContainer1');
            waterContainer1.parent = areaNode;
            waterContainer1.layer = areaNode.layer;
            waterContainer1.setSiblingIndex(0);

            const water1_1 = new Node('Water1_1');
            water1_1.parent = waterContainer1;
            water1_1.layer = areaNode.layer;
            const wTrans1_1 = water1_1.addComponent(UITransform);
            wTrans1_1.setContentSize(width, height);
            const wSprite1_1 = water1_1.addComponent(Sprite);
            wSprite1_1.sizeMode = 0;
            wSprite1_1.color = new Color(255, 255, 255, 110); // 略淡的不透明度，衬托深蓝色河床

            const water1_2 = new Node('Water1_2');
            water1_2.parent = waterContainer1;
            water1_2.layer = areaNode.layer;
            const wTrans1_2 = water1_2.addComponent(UITransform);
            wTrans1_2.setContentSize(width, height);
            water1_2.setPosition(new Vec3(0, height, 0));
            const wSprite1_2 = water1_2.addComponent(Sprite);
            wSprite1_2.sizeMode = 0;
            wSprite1_2.color = new Color(255, 255, 255, 110);

            // 缓动向下流动（慢速）
            tween(waterContainer1)
                .to(16.0, { position: new Vec3(0, -height, 0) })
                .call(() => {
                    waterContainer1.setPosition(Vec3.ZERO);
                })
                .union()
                .repeatForever()
                .start();

            // 横向微幅正弦起伏，模拟溪流在流动中的左右扭动
            tween(waterContainer1)
                .by(4.5, { position: new Vec3(6, 0, 0) }, { easing: 'sineInOut' })
                .by(4.5, { position: new Vec3(-6, 0, 0) }, { easing: 'sineInOut' })
                .union()
                .repeatForever()
                .start();

            // 第二层：快速表层波光干涉纹理
            const waterContainer2 = new Node('WaterContainer2');
            waterContainer2.parent = areaNode;
            waterContainer2.layer = areaNode.layer;
            waterContainer2.setSiblingIndex(1);
            // 微微放大第二层，避免完全等比例重叠，消除拼贴感
            waterContainer2.setScale(new Vec3(1.15, 1.15, 1.0));

            const water2_1 = new Node('Water2_1');
            water2_1.parent = waterContainer2;
            water2_1.layer = areaNode.layer;
            const wTrans2_1 = water2_1.addComponent(UITransform);
            wTrans2_1.setContentSize(width, height);
            const wSprite2_1 = water2_1.addComponent(Sprite);
            wSprite2_1.sizeMode = 0;
            wSprite2_1.color = new Color(255, 255, 255, 75); // 较淡透明度，作为动态纹理干涉层

            const water2_2 = new Node('Water2_2');
            water2_2.parent = waterContainer2;
            water2_2.layer = areaNode.layer;
            const wTrans2_2 = water2_2.addComponent(UITransform);
            wTrans2_2.setContentSize(width, height);
            water2_2.setPosition(new Vec3(0, height, 0));
            const wSprite2_2 = water2_2.addComponent(Sprite);
            wSprite2_2.sizeMode = 0;
            wSprite2_2.color = new Color(255, 255, 255, 75);

            // 缓动向下流动（快速）
            tween(waterContainer2)
                .to(10.0, { position: new Vec3(0, -height, 0) })
                .call(() => {
                    waterContainer2.setPosition(Vec3.ZERO);
                })
                .union()
                .repeatForever()
                .start();

            // 横向采用不同的周期与幅值进行正弦摆动，创造多重动态质感
            tween(waterContainer2)
                .by(3.2, { position: new Vec3(-8, 0, 0) }, { easing: 'sineInOut' })
                .by(3.2, { position: new Vec3(8, 0, 0) }, { easing: 'sineInOut' })
                .union()
                .repeatForever()
                .start();

            // 载入水纹贴图应用到双层 4 张 Sprite 纹理上
            resources.load('textures/river_water/texture', ImageAsset, (err, imageAsset) => {
                if (err) { console.error("Failed to load river_water:", err); return; }
                if (areaNode.isValid) {
                    const tex = new Texture2D();
                    tex.image = imageAsset;
                    const sf = new SpriteFrame();
                    sf.texture = tex;

                    if (wSprite1_1.isValid) wSprite1_1.spriteFrame = sf;
                    if (wSprite1_2.isValid) wSprite1_2.spriteFrame = sf;
                    if (wSprite2_1.isValid) wSprite2_1.spriteFrame = sf;
                    if (wSprite2_2.isValid) wSprite2_2.spriteFrame = sf;
                }
            });

            // 2. 河底静谧石头 (3-5颗)
            const stoneCount = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < stoneCount; i++) {
                const stone = new Node(`RiverStone_${i}`);
                stone.parent = areaNode;
                stone.layer = areaNode.layer;
                stone.setSiblingIndex(2); // 贴近河底，位于双层水流上方，鱼和浮萍下方

                const stTrans = stone.addComponent(UITransform);
                const stW = 16 + Math.random() * 12;
                const stH = 12 + Math.random() * 8;
                stTrans.setContentSize(stW, stH);

                const stSprite = stone.addComponent(Sprite);
                stSprite.sizeMode = 0;
                stSprite.color = new Color(255, 255, 255, 255);

                resources.load('textures/river_stone/texture', ImageAsset, (err, imageAsset) => {
                    if (err) { console.error("Failed to load river_stone:", err); return; }
                    if (stone.isValid && stSprite.isValid) {
                        const tex = new Texture2D();
                        tex.image = imageAsset;
                        const sf = new SpriteFrame();
                        sf.texture = tex;
                        stSprite.spriteFrame = sf;
                    }
                });

                // 随机撒在大河域内，留足 20 像素边距避免撞墙
                const stX = -width / 2 + 20 + Math.random() * (width - 40);
                const stY = -height / 2 + 20 + Math.random() * (height - 40);
                stone.setPosition(new Vec3(stX, stY, 0));
                stone.setRotationFromEuler(0, 0, Math.random() * 360);
            }

            // 3. 漂流浮萍/荷叶 (2个)
            const lilyPadCount = 2;
            for (let i = 0; i < lilyPadCount; i++) {
                const lilyPad = new Node(`LilyPad_${i}`);
                lilyPad.parent = areaNode;
                lilyPad.layer = areaNode.layer;
                lilyPad.setSiblingIndex(3); // 浮于水面 (鱼儿从下方穿过)

                const lpTrans = lilyPad.addComponent(UITransform);
                const size = 20 + Math.random() * 10;
                lpTrans.setContentSize(size, size);
                lpTrans.setAnchorPoint(0.5, 0.5);

                const lpGraphic = lilyPad.addComponent(Graphics);
                lpGraphic.fillColor = new Color(46, 139, 87, 220); // 浮萍绿 (SeaGreen)
                lpGraphic.ellipse(0, 0, size / 2, (size / 2) * 0.85);
                lpGraphic.fill();

                const lpOpacity = lilyPad.addComponent(UIOpacity);
                lpOpacity.opacity = 180 + Math.random() * 50;

                const lpX = -width / 2 + 30 + Math.random() * (width - 60);
                const lpY = -height / 2 + 40 + Math.random() * (height - 80);
                lilyPad.setPosition(new Vec3(lpX, lpY, 0));
                lilyPad.setRotationFromEuler(0, 0, Math.random() * 360);

                // 上下微幅起伏
                const floatDuration = 2.5 + Math.random() * 1.5;
                const floatAmp = 3 + Math.random() * 3;
                tween(lilyPad)
                    .by(floatDuration, { position: new Vec3(0, floatAmp, 0) }, { easing: 'sineInOut' })
                    .by(floatDuration, { position: new Vec3(0, -floatAmp, 0) }, { easing: 'sineInOut' })
                    .union()
                    .repeatForever()
                    .start();

                // 徐徐左右晃摆自转
                const rotateDuration = 4.0 + Math.random() * 2.0;
                const rotateAng = 8 + Math.random() * 8;
                tween(lilyPad)
                    .by(rotateDuration, { angle: rotateAng }, { easing: 'sineInOut' })
                    .by(rotateDuration, { angle: -rotateAng }, { easing: 'sineInOut' })
                    .union()
                    .repeatForever()
                    .start();
            }

            // 4. 鲤鱼畅游层 (2-4条) - 完全保留并置顶原有的精致动作与尾摆动画
            const fishCount = 2 + Math.floor(Math.random() * 3);
            for (let fi = 0; fi < fishCount; fi++) {
                const fishNode = new Node(`KoiFish_${fi}`);
                fishNode.parent = areaNode;
                fishNode.layer = areaNode.layer;
                fishNode.setSiblingIndex(4); // 位于荷叶与水纹之上

                const fTransform = fishNode.addComponent(UITransform);
                fTransform.setContentSize(30, 20);

                const fSprite = fishNode.addComponent(Sprite);
                fSprite.sizeMode = 0;
                
                resources.load('textures/koi_fish/texture', ImageAsset, (err, imageAsset) => {
                    if (err) return;
                    if (fishNode.isValid && fSprite.isValid) {
                        const tex = new Texture2D(); tex.image = imageAsset;
                        const sf = new SpriteFrame(); sf.texture = tex;
                        fSprite.spriteFrame = sf;
                        fSprite.color = new Color(255, 255, 255, 255);
                        fTransform.setContentSize(30, 20);
                    }
                });

                const fOpacity = fishNode.addComponent(UIOpacity);
                fOpacity.opacity = 0;

                // 鱼尾巴 (二级动画，模拟物理运动)
                const tailNode = new Node(`KoiTail`);
                tailNode.parent = fishNode;
                tailNode.layer = fishNode.layer;
                const tTransform = tailNode.addComponent(UITransform);
                tTransform.setContentSize(5, 3);
                tTransform.setAnchorPoint(1.0, 0.5); 
                tailNode.setPosition(new Vec3(-7, 0, 0));
                
                const tSprite = tailNode.addComponent(Sprite);
                tSprite.sizeMode = 0;
                tSprite.spriteFrame = this.gridCellPrefab?.data?.getComponent(Sprite)?.spriteFrame || null;
                tSprite.color = new Color(250, 140, 70, 255); 
                
                resources.load('textures/koi_fish/texture', ImageAsset, (err) => {
                    if (!err && tailNode.isValid) tailNode.active = false;
                });

                tween(tailNode)
                    .to(0.25, { angle: 20 }, { easing: 'sineInOut' })
                    .to(0.50, { angle: -20 }, { easing: 'sineInOut' })
                    .to(0.25, { angle: 0 }, { easing: 'sineInOut' })
                    .union()
                    .repeatForever()
                    .start();

                // 游动大循环
                const swimCycle = () => {
                    if (!fishNode.isValid) return;

                    const dir = Math.random() > 0.5 ? 1 : -1;
                    const halfWidth = width / 2;
                    const halfHeight = height / 2;
                    
                    const startX = -(halfWidth + 20) * dir;
                    const swimY = -halfHeight + 20 + Math.random() * (height - 40);

                    fishNode.setPosition(new Vec3(startX, swimY, 0));
                    fishNode.setScale(new Vec3(dir, 1.0, 1.0)); 
                    fishNode.angle = 0;
                    fOpacity.opacity = 0;

                    tween(fOpacity).to(0.5, { opacity: 200 }).start();

                    const fishTween = tween(fishNode);
                    let currentX = startX;
                    let currentY = swimY;
                    const segments = 4 + Math.floor(Math.random() * 3);
                    
                    for (let i = 0; i < segments; i++) {
                        const moveX = (50 + Math.random() * 40) * dir;
                        const moveY = (Math.random() * 40 - 20); // 游动时的上下起伏
                        
                        currentX += moveX;
                        currentY += moveY;
                        
                        let targetAngle = Math.atan2(moveY, moveX * dir) * 180 / Math.PI;
                        targetAngle = Math.max(-25, Math.min(25, targetAngle));

                        const swimDuration = 1.0 + Math.random() * 0.8;
                        
                        // 连贯平滑的真实鱼类游动
                        fishTween.to(swimDuration, { position: new Vec3(currentX, currentY, 0), angle: targetAngle }, { easing: 'sineInOut' });
                    }

                    fishTween.call(() => {
                        tween(fOpacity).to(0.6, { opacity: 0 }).call(() => {
                            this.scheduleOnce(swimCycle, 1.5 + Math.random() * 3.0);
                        }).start();
                    }).start();
                };

                this.scheduleOnce(swimCycle, Math.random() * 3.0);
            }

            // 5. 波光粼粼的闪烁动效 (6-10个环境闪光粒子)
            const sparkleCount = 6 + Math.floor(Math.random() * 5);
            for (let i = 0; i < sparkleCount; i++) {
                const sparkle = new Node(`Sparkle_${i}`);
                sparkle.parent = areaNode;
                sparkle.layer = areaNode.layer;
                sparkle.setSiblingIndex(5); // 最顶层，用于反射环境光

                const sTransform = sparkle.addComponent(UITransform);
                const sW = 8 + Math.random() * 8;
                const sH = sW * 0.35; // 扁平梭形
                sTransform.setContentSize(sW, sH);

                // 使用 Graphics 绘制纯白扁平梭形波光粒子
                const sGraphic = sparkle.addComponent(Graphics);
                sGraphic.fillColor = new Color(255, 255, 255, 255);
                sGraphic.ellipse(0, 0, sW / 2, sH / 2);
                sGraphic.fill();

                const sOpacity = sparkle.addComponent(UIOpacity);
                sOpacity.opacity = 0;

                const sX = -width / 2 + 15 + Math.random() * (width - 30);
                const sY = -height / 2 + 15 + Math.random() * (height - 30);
                sparkle.setPosition(new Vec3(sX, sY, 0));
                sparkle.setRotationFromEuler(0, 0, -10 + Math.random() * 20);

                const duration = 1.2 + Math.random() * 1.8;
                const delay = Math.random() * 3.0;

                // 闪烁和大小脉动交替进行
                tween(sOpacity)
                    .delay(delay)
                    .to(duration, { opacity: 100 + Math.random() * 120 }, { easing: 'sineInOut' })
                    .to(duration, { opacity: 0 }, { easing: 'sineInOut' })
                    .delay(Math.random() * 2.0)
                    .union()
                    .repeatForever()
                    .start();

                tween(sparkle)
                    .delay(delay)
                    .to(duration, { scale: new Vec3(1.4, 1.0, 1.0) }, { easing: 'sineInOut' })
                    .to(duration, { scale: new Vec3(0.7, 1.0, 1.0) }, { easing: 'sineInOut' })
                    .delay(Math.random() * 2.0)
                    .union()
                    .repeatForever()
                    .start();
            }
        };

        // 左河道中心: X=1.5, Y=4.0
        // 左河道宽度=2个格子(200), 高度=3个格子(300)
        createRiverArea(1.5, 4.0, this.cellWidth * 2, this.cellHeight * 3, 'LeftRiverArea');
        
        // 右河道中心: X=4.5, Y=4.0
        createRiverArea(4.5, 4.0, this.cellWidth * 2, this.cellHeight * 3, 'RightRiverArea');
    }

    /**
     * 绘制所有棋子
     */
    private renderPieces(): void {
        const pieces = this.engine.getPieces();
        pieces.forEach(p => {
            this.spawnPieceNode(p);
        });
    }

    /**
     * 实例化一个棋子节点
     */
    private spawnPieceNode(p: Piece): void {
        if (!this.piecePrefab) return;

        const pieceNode = instantiate(this.piecePrefab);
        pieceNode.parent = this.boardContainer;

        const view = pieceNode.getComponent(PieceView);
        if (view) {
            // 获取对应的动物图片 (注意 AnimalType 1-8，数组下标 0-7)
            const fullPieceSF = this.getPieceArt(p.camp, p.type);
            console.log(`BoardView: spawnPieceNode: ID=${p.id}, type=${p.type}, camp=${p.camp}, x=${p.x}, y=${p.y}, hasCustomArt=${!!fullPieceSF}`);
            const animalSF = fullPieceSF ?? this.animalSprites[p.type - 1];
            const baseSF = p.camp === Camp.RED ? this.redBaseSF : this.blueBaseSF;
            view.init(p, animalSF, baseSF, !!fullPieceSF);
            
            const pos = this.gridToWorldPos(p.x, p.y);
            if (!view.useFullPieceArt) {
                pos.y -= 18; // 科学对齐：旧版默认图中 animalPos 为 18，故精确下移 18 像素抵消，使得动物图形完美居中
            }
            pieceNode.setPosition(pos);

            this.pieceViews.set(p.id, view);

            // 监听子节点（Base和Animal）的点击事件，解决最外层节点无渲染组件导致点击穿透的引擎缺陷
            const baseNode = pieceNode.getChildByName("Base");
            if (baseNode) {
                baseNode.on(Node.EventType.TOUCH_END, () => {
                    this.onPieceClicked(p);
                }, this);
            }
            const animalNode = pieceNode.getChildByName("Animal");
            if (animalNode) {
                animalNode.on(Node.EventType.TOUCH_END, () => {
                    this.onPieceClicked(p);
                }, this);
            }
        }
    }

    /**
     * 更新回合提示 UI
     */
    private updateTurnUI(): void {
        if (this.turnIndicator) {
            const turnCamp = this.engine.getCurrentTurn();
            const turnStr = turnCamp === Camp.RED ? '🔴 红方行动 (下方)' : '🔵 蓝方行动 (上方)';
            this.turnIndicator.string = `${turnStr}   ⏳ ${this.remainingTime}s`;
            
            // 亮眼对比度色彩
            this.turnIndicator.color = turnCamp === Camp.RED ? new Color(255, 90, 90) : new Color(100, 160, 255);

            // 每次数字更新，做一个微型呼吸脉动动效，体现 Motion 动效美学
            if (this.turnIndicatorBgNode) {
                tween(this.turnIndicatorBgNode)
                    .to(0.1, { scale: new Vec3(1.05, 1.05, 1.0) })
                    .to(0.1, { scale: new Vec3(1.0, 1.0, 1.0) })
                    .start();
            }
        }
    }

    /**
     * 棋子被点击的响应
     */
    private onPieceClicked(piece: Piece): void {
        if (this.isAIMoving || (this.isAIMode && this.engine.getCurrentTurn() === Camp.BLUE)) {
            return; // AI 正在思考或行动阶段，玩家不可操作
        }
        console.log("BoardView: onPieceClicked called for piece:", piece.id, "camp:", piece.camp);
        const turn = this.engine.getCurrentTurn();
        
        if (!piece) return;

        this.playAnimalSound(piece.type);

        // 如果点击的是当前已选中的棋子，则取消选中并清除高亮
        if (this.selectedPiece?.id === piece.id) {
            this.clearSelection();
            return;
        } 

        // 1. 如果点击的是当前行动方的棋子，则选中它，并高亮可行走格子
        if (piece.camp === turn) {
            this.selectPiece(piece);
        } 
        // 2. 如果点击的是敌方棋子，且当前已有选中棋子，则尝试吃子
        else if (this.selectedPiece) {
            this.tryMovePiece(this.selectedPiece.x, this.selectedPiece.y, piece.x, piece.y);
        }
    }

    /**
     * 空白格子被点击的响应
     */
    private onCellClicked(x: number, y: number): void {
        if (this.isAIMoving || (this.isAIMode && this.engine.getCurrentTurn() === Camp.BLUE)) {
            return; // AI 正在思考或行动阶段，玩家不可操作
        }
        if (this.selectedPiece) {
            this.tryMovePiece(this.selectedPiece.x, this.selectedPiece.y, x, y);
        }
    }

    /**
     * 播放动物专属配音
     */
    private playAnimalSound(type: AnimalType) {
        if (!this.audioSource) return;

        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        const soundMap: Record<AnimalType, string> = {
            [AnimalType.RAT]: "rat",
            [AnimalType.CAT]: "cat",
            [AnimalType.DOG]: "dog",
            [AnimalType.WOLF]: "wolf",
            [AnimalType.LEOPARD]: "leopard",
            [AnimalType.TIGER]: "tiger",
            [AnimalType.LION]: "lion",
            [AnimalType.ELEPHANT]: "elephant"
        };
        const name = soundMap[type];
        if (!name) return;

        // 使用动态加载播放
        resources.load(`sounds/${name}`, AudioClip, (err, clip) => {
            if (err) {
                console.warn("未找到音效:", name, err);
                return;
            }
            if (clip && this.audioSource) {
                this.audioSource.playOneShot(clip, 1.0);
            }
        });
    }

    /**
     * 播放吃子打败音效
     */
    private playDabaiSound() {
        if (!this.audioSource) return;

        const soundEnabled = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        if (!soundEnabled) return;

        resources.load('sounds/dabai', AudioClip, (err, clip) => {
            if (err) {
                console.warn("未找到打败音效 (sounds/dabai)，请确认已放入音频文件。");
                return;
            }
            if (clip && this.audioSource) {
                this.audioSource.playOneShot(clip, 1.0);
            }
        });
    }

    /**
     * 选中某个棋子，并高亮其所有合法的落子格
     */
    private selectPiece(piece: Piece): void {
        console.log("BoardView: selectPiece called. Old selected:", this.selectedPiece ? this.selectedPiece.id : "null", "New selected:", piece.id);
        // 先取消旧选中
        if (this.selectedPiece) {
            const oldView = this.pieceViews.get(this.selectedPiece.id);
            if (oldView) oldView.setSelected(false);
        }

        this.selectedPiece = piece;
        const newView = this.pieceViews.get(piece.id);
        if (newView) newView.setSelected(true);

        this.clearHighlights();

        // 扫描全图，找出所有合法目标点进行高亮
        // 狮虎跳河最大检查4格，其余1格
        const range = (piece.type === AnimalType.LION || piece.type === AnimalType.TIGER) ? 4 : 1;
        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                if (dx === 0 && dy === 0) continue;
                if (dx !== 0 && dy !== 0) continue; // 只能横竖走

                const tx = piece.x + dx;
                const ty = piece.y + dy;

                if (this.engine.validateMove(piece.x, piece.y, tx, ty)) {
                    this.spawnHighlightNode(tx, ty);
                }
            }
        }
    }

    /**
     * 尝试移动棋子 (核心逻辑跳转)
     */
    private tryMovePiece(fromX: number, fromY: number, toX: number, toY: number): void {
        if (!this.engine.validateMove(fromX, fromY, toX, toY)) {
            // 非法移动，清除选中
            this.clearSelection();
            return;
        }

        const activePiece = this.engine.getPieceAt(fromX, fromY)!;
        const activeView = this.pieceViews.get(activePiece.id)!;

        // 执行逻辑移动并获取被吃掉的棋子
        const eatenPiece = this.engine.makeMove(fromX, fromY, toX, toY);

        // 清除高亮
        this.clearHighlights();
        this.selectedPiece = null;

        // 视图层执行移动动画
        const targetWorldPos = this.gridToWorldPos(toX, toY);
        if (!activeView.useFullPieceArt) {
            targetWorldPos.y -= 18; // 科学对齐：精确下移 18 像素
        }

        if (eatenPiece) {
            const eatenView = this.pieceViews.get(eatenPiece.id)!;
            this.pieceViews.delete(eatenPiece.id);

            // 1. 主动攻击方播放冲锋突刺动画 (蓄力后退 -> 快速冲锋压扁)
            activeView.playAttackLunge(targetWorldPos, 
                // 击中瞬间的回调 (Impact)
                () => {
                    // 播放吃子（打败）音效
                    this.playDabaiSound();

                    // 播放击中波光与爪击特写特效，并触发棋盘震屏
                    this.playImpactEffect(targetWorldPos);
                    
                    // 被吃方播放旋转击飞淡出动画
                    eatenView.playBeatenAnimation(() => {
                        // 结束销毁回调已经在 playBeatenAnimation 中调用 node.destroy
                    });
                },
                // 冲锋动作完全恢复后的回调 (Complete)
                () => {
                    this.onMoveCompleted();
                }
            );
        } else {
            // 普通无吃子移动
            activeView.smoothMoveTo(targetWorldPos, () => {
                this.onMoveCompleted();
            });
        }
    }

    /**
     * 播放受击物理打击特效（爪击抓痕裂开 + 扩散冲击波 + 棋盘震屏）
     * @param worldPos 击中点的世界坐标
     */
    private playImpactEffect(worldPos: Vec3): void {
        if (!this.boardContainer) return;

        // 1. 震屏效果 (对整个棋盘容器进行小幅快速抖动)
        const originalPos = new Vec3(0, 0, 0);
        tween(this.boardContainer)
            .to(0.03, { position: new Vec3(originalPos.x + 8, originalPos.y - 6, 0) })
            .to(0.03, { position: new Vec3(originalPos.x - 8, originalPos.y + 6, 0) })
            .to(0.03, { position: new Vec3(originalPos.x + 5, originalPos.y + 5, 0) })
            .to(0.03, { position: new Vec3(originalPos.x - 4, originalPos.y - 4, 0) })
            .to(0.03, { position: originalPos })
            .start();

        // 2. 扩散冲击波特效
        const shockwave = new Node("Shockwave");
        shockwave.parent = this.boardContainer;
        shockwave.layer = this.boardContainer.layer;
        shockwave.setPosition(worldPos);

        const swTransform = shockwave.addComponent(UITransform);
        swTransform.setContentSize(20, 20);

        const swSprite = shockwave.addComponent(Sprite);
        swSprite.sizeMode = 0; // CUSTOM
        
        // 尝试复用底座的白图贴图
        if (this.redBaseSF) {
            swSprite.spriteFrame = this.redBaseSF; 
        }
        swSprite.color = new Color(255, 255, 255, 180);

        const swOpacity = shockwave.addComponent(UIOpacity);
        swOpacity.opacity = 180;

        // 缩放扩散并消失
        shockwave.setScale(new Vec3(0.3, 0.3, 1.0));
        tween(shockwave)
            .to(0.2, { scale: new Vec3(2.5, 2.5, 1.0) }, { easing: 'quadOut' })
            .call(() => {
                shockwave.destroy();
            })
            .start();

        tween(swOpacity)
            .to(0.2, { opacity: 0 }, { easing: 'sineIn' })
            .start();

        // 3. 撕裂爪击特效 (3条红色/白色相间的斜边抓痕，依次以时间差划过)
        const colors = [new Color(255, 50, 50, 255), new Color(255, 255, 255, 255), new Color(255, 50, 50, 255)];
        const rotations = [-30, -30, -30];
        const yOffsets = [16, 0, -16];

        for (let i = 0; i < 3; i++) {
            const slash = new Node(`Slash_${i}`);
            slash.parent = this.boardContainer;
            slash.layer = this.boardContainer.layer;
            
            // 抓痕初始设置
            slash.setPosition(new Vec3(worldPos.x, worldPos.y + yOffsets[i], 0));
            slash.setRotationFromEuler(0, 0, rotations[i]);
            slash.setScale(new Vec3(0, 1.0, 1.0)); // 长度初始为 0

            const sTransform = slash.addComponent(UITransform);
            sTransform.setContentSize(100, 6); // 长 100，高 6 像素的直线条

            const sSprite = slash.addComponent(Sprite);
            sSprite.sizeMode = 0; // CUSTOM
            if (this.redBaseSF) {
                sSprite.spriteFrame = this.redBaseSF;
            }
            sSprite.color = colors[i];

            const sOpacity = slash.addComponent(UIOpacity);
            sOpacity.opacity = 255;

            // 依次错开 0.04 秒依次抓出，形成丝滑连击感
            const delay = i * 0.04;
            this.scheduleOnce(() => {
                if (!slash.isValid || !sOpacity.isValid) return;

                tween(slash)
                    .to(0.12, { scale: new Vec3(1.3, 1.0, 1.0) }, { easing: 'sineOut' })
                    .call(() => {
                        slash.destroy();
                    })
                    .start();

                tween(sOpacity)
                    .to(0.06, { opacity: 255 })
                    .to(0.08, { opacity: 0 }, { easing: 'sineIn' })
                    .start();
            }, delay);
        }
    }

    /**
     * 一步走子动画结束后的回调：检查胜负、切换回合 UI
     */
    private onMoveCompleted(): void {
        this.updateTurnUI();

        // 检查胜负
        const status = this.engine.checkGameOver();
        if (status.isGameOver) {
            this.showGameOver(status.winner, status.reason);
            this.stopTurnTimer();
            return;
        }

        // 重启倒计时
        this.startTurnTimer();

        // 如果是人机模式且轮到蓝方回合，则触发人机自动走子
        if (this.isAIMode && this.engine.getCurrentTurn() === Camp.BLUE) {
            this.isAIMoving = true;
            this.scheduleOnce(() => {
                this.makeAIMove();
            }, 1.2);
        }
    }

    private clearSelection(): void {
        if (this.selectedPiece) {
            const view = this.pieceViews.get(this.selectedPiece.id);
            if (view) view.setSelected(false);
            this.selectedPiece = null;
        }
        this.clearHighlights();
    }

    /**
     * 生成移动目标点高亮光圈
     */
    private spawnHighlightNode(x: number, y: number): void {
        const hlNode = new Node("HighlightArrow");
        hlNode.parent = this.boardContainer;
        hlNode.setPosition(this.gridToWorldPos(x, y));
        hlNode.layer = this.boardContainer!.layer || 33554432;
        
        // 点击响应区域
        const uiTransform = hlNode.addComponent(UITransform);
        uiTransform.setContentSize(100, 100);

        // --- 地面阴影 (跟随箭头浮动变化) ---
        const shadowNode = new Node("ShadowGraphic");
        shadowNode.parent = hlNode;
        shadowNode.layer = hlNode.layer;
        const sg = shadowNode.addComponent(Graphics);
        sg.fillColor = new Color(0, 0, 0, 255);
        sg.ellipse(0, 0, 16, 6);
        sg.fill();

        const shadowOpacity = shadowNode.addComponent(UIOpacity);
        shadowOpacity.opacity = 60;

        // --- 动态绘制向下的指示箭头 ---
        const arrowNode = new Node("ArrowGraphic");
        arrowNode.parent = hlNode;
        arrowNode.layer = hlNode.layer;
        arrowNode.setPosition(new Vec3(0, 35, 0)); // 初始高度
        
        const g = arrowNode.addComponent(Graphics);
        g.fillColor = new Color(255, 170, 0, 255); // 温暖醒目的橙黄色
        g.strokeColor = new Color(255, 255, 255, 200); // 白色描边
        g.lineWidth = 3;
        
        // 画一个经典的向下指示箭头
        g.moveTo(0, -15); // 箭头尖 (底端)
        g.lineTo(16, 6);  // 右侧下边
        g.lineTo(6, 6);   // 拐角
        g.lineTo(6, 20);  // 右侧上柄
        g.lineTo(-6, 20); // 左侧上柄
        g.lineTo(-6, 6);  // 左拐角
        g.lineTo(-16, 6); // 左侧下边
        g.close();
        g.fill();
        g.stroke();

        // 箭头上下浮动动画
        tween(arrowNode)
            .to(0.5, { position: new Vec3(0, 15, 0) }, { easing: 'quadInOut' })
            .to(0.5, { position: new Vec3(0, 35, 0) }, { easing: 'quadInOut' })
            .union()
            .repeatForever()
            .start();

        // 阴影联动动画 (箭头靠近地面时，阴影变大变深)
        tween(shadowNode)
            .to(0.5, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'quadInOut' })
            .to(0.5, { scale: new Vec3(0.8, 0.8, 1) }, { easing: 'quadInOut' })
            .union()
            .repeatForever()
            .start();

        tween(shadowOpacity)
            .to(0.5, { opacity: 100 }, { easing: 'quadInOut' })
            .to(0.5, { opacity: 50 }, { easing: 'quadInOut' })
            .union()
            .repeatForever()
            .start();

        // 绑定点击事件，点击光圈范围触发移动
        hlNode.on(Node.EventType.TOUCH_END, () => {
            this.onCellClicked(x, y);
        }, this);

        this.highlightNodes.push(hlNode);
    }

    private clearHighlights(): void {
        this.highlightNodes.forEach(node => {
            if (node) node.destroy();
        });
        this.highlightNodes = [];
    }

    /**
     * 结算并展示游戏结束弹窗
     */
    private showGameOver(winner: Camp | null, reason: GameOverReason | null): void {
        this.gameOverWinner = winner;
        this.gameOverReason = reason;

        if (this.customGameOverPanel && this.customGameOverPanel.isValid) {
            this.customGameOverPanel.destroy();
            this.customGameOverPanel = null;
        }

        const visibleSize = view.getVisibleSize();
        const cw = visibleSize.width;
        const ch = visibleSize.height;
        const scaleFactor = this.getScaleFactor();

        this.customGameOverPanel = new Node("CustomGameOverPanel");
        this.customGameOverPanel.layer = 33554432; // UI_2D
        this.customGameOverPanel.addComponent(UITransform).setContentSize(cw, ch);

        // 1. 全屏淡黑遮罩防止触摸穿透
        const mask = new Node("Mask");
        mask.layer = 33554432;
        mask.addComponent(UITransform).setContentSize(cw, ch);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 160);
        maskGraphics.rect(-cw/2, -ch/2, cw, ch);
        maskGraphics.fill();
        mask.addComponent(Button); // 吞噬触摸
        this.customGameOverPanel.addChild(mask);

        // 2. 结算主体 Dialog 节点 (自适应大小)
        const dialogW = Math.min(cw * 0.88, 580 * scaleFactor);
        const dialogH = 460 * scaleFactor;
        const dialogNode = new Node("DialogNode");
        dialogNode.layer = 33554432;
        dialogNode.addComponent(UITransform).setContentSize(dialogW, dialogH);
        const dialogGraphics = dialogNode.addComponent(Graphics);
        dialogGraphics.lineWidth = 4 * scaleFactor;
        dialogGraphics.strokeColor = new Color(245, 240, 235, 255); // 象牙白描边
        dialogGraphics.fillColor = new Color(246, 255, 232, 250); // 丛林风淡绿底色
        dialogGraphics.roundRect(-dialogW/2, -dialogH/2, dialogW, dialogH, 30 * scaleFactor);
        dialogGraphics.fill();
        dialogGraphics.stroke();
        this.customGameOverPanel.addChild(dialogNode);

        // 3. 胜利标志
        const resultBadgeNode = new Node("ResultBadge");
        resultBadgeNode.layer = 33554432;
        resultBadgeNode.addComponent(UITransform).setContentSize(92 * scaleFactor, 92 * scaleFactor);
        const badgeGraphics = resultBadgeNode.addComponent(Graphics);
        badgeGraphics.fillColor = winner === null ? new Color(230, 232, 226, 255) : new Color(248, 228, 54, 255);
        badgeGraphics.circle(0, 0, 46 * scaleFactor);
        badgeGraphics.fill();
        badgeGraphics.lineWidth = 3 * scaleFactor;
        badgeGraphics.strokeColor = new Color(255, 255, 255, 255);
        badgeGraphics.circle(0, 0, 46 * scaleFactor);
        badgeGraphics.stroke();
        const badgeText = new Node("BadgeText");
        badgeText.layer = 33554432;
        const badgeLabel = badgeText.addComponent(Label);
        badgeLabel.string = winner === null ? "和" : "胜";
        badgeLabel.fontSize = Math.round(48 * scaleFactor);
        badgeLabel.color = winner === null ? new Color(102, 102, 102, 255) : new Color(110, 78, 0, 255);
        badgeLabel.isBold = true;
        badgeText.addComponent(UITransform);
        resultBadgeNode.addChild(badgeText);
        resultBadgeNode.setPosition(new Vec3(0, dialogH / 2 - 80 * scaleFactor, 0));
        dialogNode.addChild(resultBadgeNode);

        // 4. 结算大字标题
        const titleNode = new Node("Title");
        titleNode.layer = 33554432;
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.isBold = true;
        titleNode.addComponent(UITransform);
        titleNode.setPosition(new Vec3(0, dialogH / 2 - 170 * scaleFactor, 0));

        let reasonStr = '';
        switch (reason) {
            case GameOverReason.DEN_CAPTURED:
                reasonStr = '成功占领对方兽穴！';
                break;
            case GameOverReason.ELIMINATED:
                reasonStr = '将对方棋子全部消灭！';
                break;
            case GameOverReason.NO_MOVE:
                reasonStr = '对方已无路可走（困毙）！';
                break;
            case GameOverReason.REPETITION_DRAW:
                reasonStr = '连续 5 次出现相同局面，判定为和棋！';
                break;
        }

        if (winner === null) {
            titleLabel.string = "握手言和";
            titleLabel.color = new Color(102, 102, 102, 255); // 灰色
        } else {
            const winnerName = winner === Camp.RED ? '红方' : '蓝方';
            titleLabel.string = `${winnerName} 获得胜利！`;
            titleLabel.color = winner === Camp.RED ? new Color(214, 48, 49, 255) : new Color(9, 132, 227, 255);
        }
        titleLabel.fontSize = Math.round(38 * scaleFactor);
        dialogNode.addChild(titleNode);

        // 5. 具体获胜原因
        const reasonNode = new Node("Reason");
        reasonNode.layer = 33554432;
        const reasonLabel = reasonNode.addComponent(Label);
        reasonLabel.string = reasonStr;
        reasonLabel.fontSize = Math.round(22 * scaleFactor);
        reasonLabel.color = new Color(100, 115, 90, 255); // 温和深草绿字
        reasonNode.addComponent(UITransform);
        reasonNode.setPosition(new Vec3(0, dialogH / 2 - 236 * scaleFactor, 0));
        dialogNode.addChild(reasonNode);

        // 6. 并排的两个大按钮
        const btnW = dialogW * 0.42;
        const btnH = 80 * scaleFactor;
        const btnY = -dialogH / 2 + 76 * scaleFactor;

        // (1) 再来一局
        const restartBtn = new Node("RestartBtn");
        restartBtn.layer = 33554432;
        restartBtn.addComponent(UITransform).setContentSize(btnW, btnH);
        const restartGraphics = restartBtn.addComponent(Graphics);
        restartGraphics.lineWidth = 2 * scaleFactor;
        restartGraphics.strokeColor = new Color(255, 255, 255, 255);
        restartGraphics.fillColor = new Color(22, 143, 37, 255); // 经典丛林翠绿
        restartGraphics.roundRect(-btnW/2, -btnH/2, btnW, btnH, 18 * scaleFactor);
        restartGraphics.fill();
        restartGraphics.stroke();

        const restartText = new Node("Label");
        restartText.layer = 33554432;
        const restartLabel = restartText.addComponent(Label);
        restartLabel.string = "再来一局";
        restartLabel.fontSize = Math.round(24 * scaleFactor);
        restartLabel.color = Color.WHITE;
        restartLabel.isBold = true;
        restartText.addComponent(UITransform);
        restartBtn.addChild(restartText);
        restartBtn.setPosition(new Vec3(-dialogW / 4, btnY, 0));

        restartBtn.on(Node.EventType.TOUCH_START, () => { restartBtn.setScale(new Vec3(0.95, 0.95, 1.0)); }, this);
        restartBtn.on(Node.EventType.TOUCH_END, () => {
            restartBtn.setScale(new Vec3(1.0, 1.0, 1.0));
            AudioSynth.playClick();
            this.hideCustomGameOverPanel();
            this.restartGame();
        }, this);
        restartBtn.on(Node.EventType.TOUCH_CANCEL, () => { restartBtn.setScale(new Vec3(1.0, 1.0, 1.0)); }, this);
        dialogNode.addChild(restartBtn);

        // (2) 返回菜单
        const exitBtn = new Node("ExitBtn");
        exitBtn.layer = 33554432;
        exitBtn.addComponent(UITransform).setContentSize(btnW, btnH);
        const exitGraphics = exitBtn.addComponent(Graphics);
        exitGraphics.lineWidth = 2 * scaleFactor;
        exitGraphics.strokeColor = new Color(255, 255, 255, 255);
        exitGraphics.fillColor = new Color(214, 129, 24, 255); // 温暖亮橙色
        exitGraphics.roundRect(-btnW/2, -btnH/2, btnW, btnH, 18 * scaleFactor);
        exitGraphics.fill();
        exitGraphics.stroke();

        const exitText = new Node("Label");
        exitText.layer = 33554432;
        const exitLabel = exitText.addComponent(Label);
        exitLabel.string = "返回菜单";
        exitLabel.fontSize = Math.round(24 * scaleFactor);
        exitLabel.color = Color.WHITE;
        exitLabel.isBold = true;
        exitText.addComponent(UITransform);
        exitBtn.addChild(exitText);
        exitBtn.setPosition(new Vec3(dialogW / 4, btnY, 0));

        exitBtn.on(Node.EventType.TOUCH_START, () => { exitBtn.setScale(new Vec3(0.95, 0.95, 1.0)); }, this);
        exitBtn.on(Node.EventType.TOUCH_END, () => {
            exitBtn.setScale(new Vec3(1.0, 1.0, 1.0));
            AudioSynth.playClick();
            this.hideCustomGameOverPanel();
            this.onBackButtonClicked();
        }, this);
        exitBtn.on(Node.EventType.TOUCH_CANCEL, () => { exitBtn.setScale(new Vec3(1.0, 1.0, 1.0)); }, this);
        dialogNode.addChild(exitBtn);

        // 挂载到父节点
        this.node.parent!.addChild(this.customGameOverPanel);

        // 弹出缓动效果 (backOut)
        dialogNode.setScale(new Vec3(0.82, 0.82, 1.0));
        tween(dialogNode)
            .to(0.25, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
            .start();
    }

    private hideCustomGameOverPanel() {
        if (this.customGameOverPanel && this.customGameOverPanel.isValid) {
            this.customGameOverPanel.destroy();
            this.customGameOverPanel = null;
        }
    }

    private layoutCustomGameOverPanel() {
        if (this.customGameOverPanel) {
            this.showGameOver(this.gameOverWinner, this.gameOverReason);
        }
    }

    /**
     * 核心计算：将 7x9 网格坐标映射到 Cocos Creator 的本地节点 2D 坐标系 (以棋盘中心为 0,0)
     */
    public gridToWorldPos(x: number, y: number): Vec3 {
        // x 从 0..6，y 从 0..8
        // 棋盘中心列为 x = 3，中心行为 y = 4
        const posX = (x - 3) * this.cellWidth;
        const posY = (y - 4) * this.cellHeight;
        return new Vec3(posX, posY, 0);
    }



    private loadPieceArt(): Promise<void> {
        const animals: { name: string; type: AnimalType }[] = [
            { name: 'rat', type: AnimalType.RAT },
            { name: 'cat', type: AnimalType.CAT },
            { name: 'dog', type: AnimalType.DOG },
            { name: 'wolf', type: AnimalType.WOLF },
            { name: 'leopard', type: AnimalType.LEOPARD },
            { name: 'tiger', type: AnimalType.TIGER },
            { name: 'lion', type: AnimalType.LION },
            { name: 'elephant', type: AnimalType.ELEPHANT },
        ];
        const camps: { name: string; camp: Camp }[] = [
            { name: 'red', camp: Camp.RED },
            { name: 'blue', camp: Camp.BLUE },
        ];

        const promises: Promise<void>[] = [];

        for (const animal of animals) {
            for (const campInfo of camps) {
                const path = `animal_pieces/${animal.name}-${campInfo.name}`;
                const key = `${campInfo.camp}_${animal.type}`;

                promises.push(new Promise<void>((resolve) => {
                    // 优先尝试加载 SpriteFrame 子资源
                    resources.load(`${path}/spriteFrame`, SpriteFrame, (err, frame) => {
                        if (!err && frame) {
                            this.pieceArtByCampAndType.set(key, frame);
                            console.log(`BoardView: registered art (SpriteFrame) for key: ${key} from ${path}/spriteFrame`);
                            resolve();
                            return;
                        }
                        // 回退：尝试直接作为 SpriteFrame 加载
                        resources.load(path, SpriteFrame, (err2, frame2) => {
                            if (!err2 && frame2) {
                                this.pieceArtByCampAndType.set(key, frame2);
                                console.log(`BoardView: registered art (SpriteFrame direct) for key: ${key} from ${path}`);
                                resolve();
                                return;
                            }
                            // 最终回退：加载 ImageAsset 并手动创建 SpriteFrame
                            resources.load(path, ImageAsset, (err3, imgAsset) => {
                                if (err3 || !imgAsset) {
                                    console.warn(`BoardView: failed to load piece art for ${path}:`, err3);
                                    resolve();
                                    return;
                                }
                                try {
                                    const sf = SpriteFrame.createWithImage(imgAsset);
                                    this.pieceArtByCampAndType.set(key, sf);
                                    console.log(`BoardView: registered art (ImageAsset->SF) for key: ${key} from ${path}`);
                                } catch (e) {
                                    console.error(`BoardView: createWithImage failed for ${path}:`, e);
                                }
                                resolve();
                            });
                        });
                    });
                }));
            }
        }

        return Promise.all(promises).then(() => {
            console.log(`BoardView: total registered piece arts: ${this.pieceArtByCampAndType.size}`);
        });
    }

    private getPieceArt(camp: Camp, type: AnimalType): SpriteFrame | null {
        const key = `${camp}_${type}`;
        const art = this.pieceArtByCampAndType.get(key) ?? null;
        console.log(`BoardView: getPieceArt query for key ${key} -> ${art ? 'FOUND' : 'NOT FOUND'}`);
        return art;
    }

    // ==========================================
    //    返回、悔棋、倒计时与人机AI辅助实现
    // ==========================================

    private createInGameUI() {
        const showUI = this.node.active;

        // 如果已经创建，则只需将其激活并执行布局更新即可
        if (this.backButtonNode) {
            this.backButtonNode.active = showUI;
            this.undoButtonNode.active = showUI;
            if (this.turnIndicatorBgNode) {
                this.turnIndicatorBgNode.active = showUI;
            }
            if (this.turnIndicator) {
                this.turnIndicator.node.active = showUI;
            }
            this.decorateTurnIndicator();
            this.adjustBoardScale();
            return;
        }

        // 1. 创建左上角返回按钮 (统一为外侧的黄色圆形样式)
        this.backButtonNode = new Node("BackButton");
        this.backButtonNode.layer = 33554432; // UI_2D
        this.backButtonNode.addComponent(UITransform);
        this.backButtonNode.addComponent(Graphics);

        // 绑定返回事件与触摸微动反馈
        this.backButtonNode.on(Node.EventType.TOUCH_START, () => {
            this.backButtonNode.setScale(new Vec3(0.95, 0.95, 1.0));
        }, this);
        this.backButtonNode.on(Node.EventType.TOUCH_END, () => {
            this.backButtonNode.setScale(new Vec3(1.0, 1.0, 1.0));
            AudioSynth.playClick();
            this.onBackButtonClicked();
        }, this);
        this.backButtonNode.on(Node.EventType.TOUCH_CANCEL, () => {
            this.backButtonNode.setScale(new Vec3(1.0, 1.0, 1.0));
        }, this);

        this.node.parent!.addChild(this.backButtonNode);

        // 2. 创建底部悔棋按钮
        this.undoButtonNode = new Node("UndoButton");
        this.undoButtonNode.layer = 33554432;
        this.undoButtonNode.addComponent(UITransform);
        this.undoButtonNode.addComponent(Graphics);

        // 悔棋文字
        const undoLabelNode = new Node("Label");
        undoLabelNode.layer = 33554432;
        undoLabelNode.addComponent(UITransform);
        const undoLabel = undoLabelNode.addComponent(Label);
        undoLabel.string = "请求悔棋";
        undoLabel.color = Color.WHITE;
        undoLabel.isBold = true;
        this.undoButtonNode.addChild(undoLabelNode);

        // 绑定悔棋事件与触摸微动反馈
        this.undoButtonNode.on(Node.EventType.TOUCH_START, () => {
            this.undoButtonNode.setScale(new Vec3(0.95, 0.95, 1.0));
        }, this);
        this.undoButtonNode.on(Node.EventType.TOUCH_END, () => {
            this.undoButtonNode.setScale(new Vec3(1.0, 1.0, 1.0));
            AudioSynth.playClick();
            this.onUndoButtonClicked();
        }, this);
        this.undoButtonNode.on(Node.EventType.TOUCH_CANCEL, () => {
            this.undoButtonNode.setScale(new Vec3(1.0, 1.0, 1.0));
        }, this);

        this.node.parent!.addChild(this.undoButtonNode);

        // 3. 修饰回合文字组件
        this.decorateTurnIndicator();

        // 绑定当前的 active 状态
        this.backButtonNode.active = showUI;
        this.undoButtonNode.active = showUI;
        if (this.turnIndicatorBgNode) {
            this.turnIndicatorBgNode.active = showUI;
        }
        if (this.turnIndicator) {
            this.turnIndicator.node.active = showUI;
        }

        // 刷新一次位置布局
        this.adjustBoardScale();
    }

    private decorateTurnIndicator() {
        if (!this.turnIndicator) return;
        const showUI = this.node.active;
        this.turnIndicator.node.active = showUI; // 确保仅在对局激活时显示
        if (this.turnIndicatorBgNode) {
            this.turnIndicatorBgNode.active = showUI;
            return;
        }

        const parentNode = this.turnIndicator.node.parent!;
        
        // 创建背景板
        this.turnIndicatorBgNode = new Node("TurnIndicatorBg");
        this.turnIndicatorBgNode.layer = 33554432;
        this.turnIndicatorBgNode.addComponent(UITransform);
        this.turnIndicatorBgNode.addComponent(Graphics);

        // 插入父节点下
        parentNode.addChild(this.turnIndicatorBgNode);
        
        // 绑定位置：它的初始位置应该和 turnIndicator 保持完全一致
        this.turnIndicatorBgNode.setPosition(this.turnIndicator.node.position);
        
        // 确保 turnIndicator 挂在其之上显示
        this.turnIndicator.node.setSiblingIndex(this.turnIndicatorBgNode.getSiblingIndex() + 1);
        
        this.turnIndicatorBgNode.active = showUI;
    }

    private onBackButtonClicked() {
        this.stopTurnTimer();
        this.node.active = false;

        // 返回菜单恢复 70% 音量
        if (this.bgmSource) {
            this.bgmSource.volume = 0.7;
        }

        // 手动关闭动态 UI 节点以防残留
        if (this.backButtonNode) this.backButtonNode.active = false;
        if (this.undoButtonNode) this.undoButtonNode.active = false;
        if (this.turnIndicatorBgNode) this.turnIndicatorBgNode.active = false;
        if (this.turnIndicator) this.turnIndicator.node.active = false;

        if (this.gameOverPanel) {
            this.gameOverPanel.active = false;
        }
        this.hideCustomGameOverPanel();

        this.showModeSelection();
    }

    private startTurnTimer() {
        this.stopTurnTimer();
        this.remainingTime = 30;
        this.updateTurnUI();
        this.schedule(this.onTimerTick, 1.0);
    }

    private stopTurnTimer() {
        this.unschedule(this.onTimerTick);
    }

    private onTimerTick() {
        if (!this.node.active) {
            this.stopTurnTimer();
            return;
        }

        this.remainingTime--;
        this.updateTurnUI();

        if (this.remainingTime <= 0) {
            this.stopTurnTimer();
            const currentTurn = this.engine.getCurrentTurn();
            const winner = currentTurn === Camp.RED ? Camp.BLUE : Camp.RED;
            this.showGameOver(winner, null);
            const winnerName = winner === Camp.RED ? '红方 (下方)' : '蓝方 (上方)';
            if (this.gameOverText) {
                this.gameOverText.string = `时间到！恭喜 ${winnerName} 获胜！\n当前回合方走棋超时。`;
            }
        }
    }

    private onUndoButtonClicked() {
        if (this.isAIMoving) {
            this.showToast("正在行棋中，请稍后...");
            return;
        }

        const currentTurn = this.engine.getCurrentTurn();
        
        if (this.isAIMode) {
            if (currentTurn !== Camp.RED) {
                this.showToast("当前不是您的回合，无法悔棋");
                return;
            }

            this.showToast("请求人机悔棋中...");
            this.scheduleOnce(() => {
                const undone1 = this.engine.undo();
                const undone2 = this.engine.undo();
                if (undone1 || undone2) {
                    this.showToast("人机同意了您的悔棋！");
                    this.refreshBoardAfterUndo();
                } else {
                    this.showToast("没有历史记录，无法悔棋");
                }
            }, 0.5);
        } else {
            const applicant = currentTurn === Camp.RED ? Camp.BLUE : Camp.RED;
            const respondent = currentTurn;

            this.showUndoRequestDialog(applicant, respondent, (agree) => {
                if (agree) {
                    const undone = this.engine.undo();
                    if (undone) {
                        this.showToast("对方已同意悔棋！");
                        this.refreshBoardAfterUndo();
                    } else {
                        this.showToast("没有历史记录，无法悔棋");
                    }
                } else {
                    this.showToast("对方拒绝了您的悔棋请求");
                }
            });
        }
    }

    private refreshBoardAfterUndo() {
        this.clearSelection();
        this.pieceViews.forEach(pv => {
            if (pv.node) pv.node.destroy();
        });
        this.pieceViews.clear();
        this.renderPieces();
        this.startTurnTimer();
    }

    private showUndoRequestDialog(applicant: Camp, respondent: Camp, callback: (agree: boolean) => void) {
        if (this.undoRequestPanel) {
            this.undoRequestPanel.destroy();
        }

        const visibleSize = view.getVisibleSize();
        const cw = visibleSize.width;
        const ch = visibleSize.height;

        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.max(0.6, Math.min(cw / refW, ch / refH));

        this.undoRequestPanel = new Node("UndoRequestPanel");
        this.undoRequestPanel.layer = 33554432;
        const panelTrans = this.undoRequestPanel.addComponent(UITransform);
        panelTrans.setContentSize(cw, ch);

        const bgNode = new Node("BlackBg");
        bgNode.layer = 33554432;
        bgNode.addComponent(UITransform).setContentSize(cw, ch);
        const bgGraphics = bgNode.addComponent(Graphics);
        bgGraphics.fillColor = new Color(0, 0, 0, 160);
        bgGraphics.rect(-cw/2, -ch/2, cw, ch);
        bgGraphics.fill();
        bgNode.addComponent(Button); // 拦截事件
        this.undoRequestPanel.addChild(bgNode);

        const dialogNode = new Node("Dialog");
        dialogNode.layer = 33554432;
        const dialogW = Math.min(cw * 0.86, 540 * scaleFactor);
        const dialogH = 340 * scaleFactor;
        dialogNode.addComponent(UITransform).setContentSize(dialogW, dialogH);
        const dialogGraphics = dialogNode.addComponent(Graphics);
        dialogGraphics.lineWidth = 3 * scaleFactor;
        dialogGraphics.strokeColor = new Color(245, 240, 235, 255); // 象牙白边
        dialogGraphics.fillColor = new Color(255, 248, 223, 250); // 丛林温馨淡黄色底
        dialogGraphics.roundRect(-dialogW/2, -dialogH/2, dialogW, dialogH, 24 * scaleFactor);
        dialogGraphics.fill();
        dialogGraphics.stroke();
        this.undoRequestPanel.addChild(dialogNode);

        const titleNode = new Node("Title");
        titleNode.layer = 33554432;
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = "悔棋申请";
        titleLabel.fontSize = Math.round(30 * scaleFactor);
        titleLabel.color = new Color(139, 80, 0, 255); // 森林橙黄/深茶色
        titleLabel.isBold = true;
        titleNode.addComponent(UITransform);
        titleNode.setPosition(new Vec3(0, dialogH / 2 - 55 * scaleFactor, 0));
        dialogNode.addChild(titleNode);

        const appName = applicant === Camp.RED ? '红方 (下方)' : '蓝方 (上方)';
        const respName = respondent === Camp.RED ? '红方' : '蓝方';

        const contentNode = new Node("Content");
        contentNode.layer = 33554432;
        const contentLabel = contentNode.addComponent(Label);
        contentLabel.string = `${appName} 申请悔棋，\n请问 ${respName} 同意吗？`;
        contentLabel.fontSize = Math.round(24 * scaleFactor);
        contentLabel.lineHeight = Math.round(32 * scaleFactor);
        contentLabel.color = new Color(102, 87, 45, 255); // 丛林风深木色字
        contentLabel.isBold = true;
        contentNode.addComponent(UITransform);
        contentNode.setPosition(new Vec3(0, 10 * scaleFactor, 0));
        dialogNode.addChild(contentNode);

        const btnW = dialogW * 0.4;
        const btnH = 76 * scaleFactor;
        const btnY = -dialogH / 2 + 65 * scaleFactor;

        // (1) 同意按钮
        const agreeBtn = new Node("AgreeBtn");
        agreeBtn.layer = 33554432;
        agreeBtn.addComponent(UITransform).setContentSize(btnW, btnH);
        const agreeGraphics = agreeBtn.addComponent(Graphics);
        agreeGraphics.lineWidth = 1.5 * scaleFactor;
        agreeGraphics.strokeColor = new Color(255, 255, 255, 255);
        agreeGraphics.fillColor = new Color(22, 143, 37, 255); // 翠绿
        agreeGraphics.roundRect(-btnW/2, -btnH/2, btnW, btnH, 16 * scaleFactor);
        agreeGraphics.fill();
        agreeGraphics.stroke();

        const agreeText = new Node("Label");
        agreeText.layer = 33554432;
        const agreeLabel = agreeText.addComponent(Label);
        agreeLabel.string = "同意";
        agreeLabel.fontSize = Math.round(24 * scaleFactor);
        agreeLabel.color = Color.WHITE;
        agreeLabel.isBold = true;
        agreeText.addComponent(UITransform);
        agreeBtn.addChild(agreeText);
        agreeBtn.setPosition(new Vec3(-dialogW / 4, btnY, 0));

        agreeBtn.on(Node.EventType.TOUCH_START, () => { agreeBtn.setScale(new Vec3(0.95, 0.95, 1.0)); }, this);
        agreeBtn.on(Node.EventType.TOUCH_END, () => {
            agreeBtn.setScale(new Vec3(1.0, 1.0, 1.0));
            AudioSynth.playClick();
            this.undoRequestPanel?.destroy();
            this.undoRequestPanel = null;
            callback(true);
        }, this);
        agreeBtn.on(Node.EventType.TOUCH_CANCEL, () => { agreeBtn.setScale(new Vec3(1.0, 1.0, 1.0)); }, this);
        dialogNode.addChild(agreeBtn);

        // (2) 拒绝按钮
        const refuseBtn = new Node("RefuseBtn");
        refuseBtn.layer = 33554432;
        refuseBtn.addComponent(UITransform).setContentSize(btnW, btnH);
        const refuseGraphics = refuseBtn.addComponent(Graphics);
        refuseGraphics.lineWidth = 1.5 * scaleFactor;
        refuseGraphics.strokeColor = new Color(255, 255, 255, 255);
        refuseGraphics.fillColor = new Color(214, 48, 49, 255); // 珊瑚红
        refuseGraphics.roundRect(-btnW/2, -btnH/2, btnW, btnH, 16 * scaleFactor);
        refuseGraphics.fill();
        refuseGraphics.stroke();

        const refuseText = new Node("Label");
        refuseText.layer = 33554432;
        const refuseLabel = refuseText.addComponent(Label);
        refuseLabel.string = "拒绝";
        refuseLabel.fontSize = Math.round(24 * scaleFactor);
        refuseLabel.color = Color.WHITE;
        refuseLabel.isBold = true;
        refuseText.addComponent(UITransform);
        refuseBtn.addChild(refuseText);
        refuseBtn.setPosition(new Vec3(dialogW / 4, btnY, 0));

        refuseBtn.on(Node.EventType.TOUCH_START, () => { refuseBtn.setScale(new Vec3(0.95, 0.95, 1.0)); }, this);
        refuseBtn.on(Node.EventType.TOUCH_END, () => {
            refuseBtn.setScale(new Vec3(1.0, 1.0, 1.0));
            AudioSynth.playClick();
            this.undoRequestPanel?.destroy();
            this.undoRequestPanel = null;
            callback(false);
        }, this);
        refuseBtn.on(Node.EventType.TOUCH_CANCEL, () => { refuseBtn.setScale(new Vec3(1.0, 1.0, 1.0)); }, this);
        dialogNode.addChild(refuseBtn);

        this.node.parent!.addChild(this.undoRequestPanel);

        // 动画弹出效果
        dialogNode.setScale(new Vec3(0.82, 0.82, 1.0));
        tween(dialogNode)
            .to(0.25, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
            .start();
    }

    private showToast(message: string) {
        const visibleSize = view.getVisibleSize();
        const cw = visibleSize.width;
        const ch = visibleSize.height;
        const scaleFactor = this.getScaleFactor();
        const toastW = Math.min(cw * 0.82, 480 * scaleFactor);
        const toastH = Math.max(48, 56 * scaleFactor);
        const toast = new Node("Toast");
        toast.layer = 33554432;
        const transform = toast.addComponent(UITransform);
        transform.setContentSize(toastW, toastH);

        const graphics = toast.addComponent(Graphics);
        graphics.fillColor = new Color(0, 0, 0, 200);
        graphics.roundRect(-toastW / 2, -toastH / 2, toastW, toastH, 12 * scaleFactor);
        graphics.fill();

        const textNode = new Node("Text");
        textNode.layer = 33554432;
        const label = textNode.addComponent(Label);
        label.string = message;
        label.fontSize = Math.round(Math.max(16, 18 * scaleFactor));
        label.lineHeight = Math.round(Math.max(20, 24 * scaleFactor));
        label.color = Color.WHITE;
        textNode.addComponent(UITransform).setContentSize(toastW - 32 * scaleFactor, toastH);
        toast.addChild(textNode);

        const opacity = toast.addComponent(UIOpacity);
        opacity.opacity = 255;

        toast.setPosition(new Vec3(0, -ch / 2 + 126 * scaleFactor, 0));
        this.node.parent!.addChild(toast);

        tween(toast)
            .by(1.5, { position: new Vec3(0, 50, 0) })
            .start();

        tween(opacity)
            .delay(1.0)
            .to(0.5, { opacity: 0 })
            .call(() => {
                toast.destroy();
            })
            .start();
    }

    private makeAIMove(): void {
        if (!this.node.active || !this.isAIMode) {
            this.isAIMoving = false;
            return;
        }

        const pieces = this.engine.getPieces().filter(p => p.camp === Camp.BLUE);
        const validMoves: { piece: Piece; fromX: number; fromY: number; toX: number; toY: number; priority: number }[] = [];

        for (const piece of pieces) {
            const range = (piece.type === AnimalType.LION || piece.type === AnimalType.TIGER) ? 4 : 1;
            for (let dx = -range; dx <= range; dx++) {
                for (let dy = -range; dy <= range; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    if (dx !== 0 && dy !== 0) continue;

                    const tx = piece.x + dx;
                    const ty = piece.y + dy;

                    if (this.engine.validateMove(piece.x, piece.y, tx, ty)) {
                        const targetPiece = this.engine.getPieceAt(tx, ty);
                        let priority = 0;

                        if (targetPiece) {
                            priority = targetPiece.type * 10 + (9 - piece.type);
                        } else {
                            const prevDist = Math.abs(piece.x - 3) + Math.abs(piece.y - 0);
                            const nextDist = Math.abs(tx - 3) + Math.abs(ty - 0);
                            if (nextDist < prevDist) {
                                priority = 1;
                            }
                        }

                        validMoves.push({
                            piece,
                            fromX: piece.x,
                            fromY: piece.y,
                            toX: tx,
                            toY: ty,
                            priority
                        });
                    }
                }
            }
        }

        if (validMoves.length === 0) {
            console.log("AI has no valid moves!");
            this.isAIMoving = false;
            return;
        }

        // 读取本地存储中的 AI 难度设置 (默认为中等)
        const difficulty = sys.localStorage.getItem('jungle_ai_difficulty') || 'normal';
        let optimalChance = 1.0; // 默认困难 (100% 概率最优解)

        if (difficulty === 'easy') {
            optimalChance = 0.35; // 简单：35% 概率最优，65% 概率瞎走
        } else if (difficulty === 'normal') {
            optimalChance = 0.70; // 中等：70% 概率最优，30% 概率瞎走
        }

        const useOptimal = Math.random() < optimalChance;
        let chosen: { piece: Piece; fromX: number; fromY: number; toX: number; toY: number; priority: number };

        if (useOptimal) {
            validMoves.sort((a, b) => b.priority - a.priority);
            const highestPriority = validMoves[0].priority;
            const candidates = validMoves.filter(m => m.priority === highestPriority);
            chosen = candidates[Math.floor(Math.random() * candidates.length)];
            console.log(`AI optimal move (${difficulty}): piece=${chosen.piece.id}, from=(${chosen.fromX},${chosen.fromY}) -> to=(${chosen.toX},${chosen.toY}), priority=${chosen.priority}`);
        } else {
            // 纯随机瞎走一步
            chosen = validMoves[Math.floor(Math.random() * validMoves.length)];
            console.log(`AI casual move (${difficulty}): piece=${chosen.piece.id}, from=(${chosen.fromX},${chosen.fromY}) -> to=(${chosen.toX},${chosen.toY}), priority=${chosen.priority}`);
        }

        this.isAIMoving = false;
        this.tryMovePiece(chosen.fromX, chosen.fromY, chosen.toX, chosen.toY);
    }

    private safeLoadSprite(path: string, sprite: Sprite) {
        resources.load(`${path}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!err && sf) {
                if (sprite && sprite.isValid) {
                    sprite.spriteFrame = sf;
                }
            } else {
                resources.load(path, SpriteFrame, (err2, sf2) => {
                    if (!err2 && sf2) {
                        if (sprite && sprite.isValid) {
                            sprite.spriteFrame = sf2;
                        }
                    } else {
                        resources.load(path, ImageAsset, (err3, imgAsset) => {
                            if (!err3 && imgAsset) {
                                if (sprite && sprite.isValid) {
                                    const sf3 = SpriteFrame.createWithImage(imgAsset);
                                    sprite.spriteFrame = sf3;
                                }
                            } else {
                                console.warn(`safeLoadSprite warning for ${path}:`, err3);
                            }
                        });
                    }
                });
            }
        });
    }

    private createForestFireflies(parent: Node, scaleFactor: number) {
        const uiTrans = parent.getComponent(UITransform);
        if (!uiTrans) return;
        const w = uiTrans.width;
        const h = uiTrans.height;

        const effectNode = new Node('ForestFirefliesLayer');
        effectNode.layer = parent.layer || 33554432;
        effectNode.addComponent(UITransform).setContentSize(w, h);
        parent.addChild(effectNode);
        
        // 保证在背景 wash 层之上，但比其他 UI 元素低
        effectNode.setSiblingIndex(2);

        const particleCount = 14;
        const colors = ['#bbfeb8', '#fff8b3', '#d4ffc7']; // 淡绿、淡金、黄绿

        for (let i = 0; i < particleCount; i++) {
            const particle = new Node(`Firefly_${i}`);
            particle.layer = effectNode.layer;
            particle.addComponent(UITransform);
            const g = particle.addComponent(Graphics);

            const size = (8 + Math.random() * 12) * scaleFactor;
            const colorHex = colors[Math.floor(Math.random() * colors.length)];
            const color = new Color();
            Color.fromHEX(color, colorHex);
            
            // 绘制羽化光斑效果：用多层渐变透明的圆重叠实现
            const baseAlpha = 30 + Math.floor(Math.random() * 50);
            for (let r_step = 3; r_step >= 1; r_step--) {
                color.a = Math.floor(baseAlpha / r_step);
                g.fillColor = color;
                g.circle(0, 0, size * (r_step * 0.45));
                g.fill();
            }

            // 随机初始位置
            const initX = -w / 2 + Math.random() * w;
            const initY = -h / 2 + Math.random() * h;
            particle.setPosition(initX, initY, 0);
            
            const pOpacity = particle.addComponent(UIOpacity);
            pOpacity.opacity = baseAlpha * 2.5;

            effectNode.addChild(particle);

            // 游荡大缓动大循环
            const roam = (node: Node, opacityComp: UIOpacity) => {
                if (!node.isValid || !opacityComp.isValid) return;
                
                const targetX = -w / 2 + Math.random() * w;
                const targetY = -h / 2 + Math.random() * h;
                const duration = 12 + Math.random() * 12;
                const targetOpacity = 50 + Math.floor(Math.random() * 180);

                // 物理横向摆动曲线
                const shakeCount = 3 + Math.floor(Math.random() * 4);
                const currentPos = node.position.clone();
                const stepX = (targetX - currentPos.x) / shakeCount;
                const stepY = (targetY - currentPos.y) / shakeCount;

                const t = tween(node);
                for (let step = 1; step <= shakeCount; step++) {
                    const stepDuration = duration / shakeCount;
                    const nextX = currentPos.x + stepX * step + (Math.random() * 40 - 20) * scaleFactor;
                    const nextY = currentPos.y + stepY * step + (Math.random() * 40 - 20) * scaleFactor;
                    const stepScale = 0.8 + Math.random() * 0.4;
                    
                    t.to(stepDuration, { position: new Vec3(nextX, nextY, 0), scale: new Vec3(stepScale, stepScale, 1) }, { easing: 'sineInOut' });
                }

                t.call(() => {
                    roam(node, opacityComp);
                }).start();

                // 独立控制呼吸闪烁
                tween(opacityComp)
                    .to(duration * 0.4, { opacity: targetOpacity }, { easing: 'sineInOut' })
                    .to(duration * 0.6, { opacity: 20 + Math.random() * 40 }, { easing: 'sineInOut' })
                    .start();
            };

            // 随机延时后开始游荡，错开动作
            this.scheduleOnce(() => {
                roam(particle, pOpacity);
            }, Math.random() * 3.0);
        }
    }
}
