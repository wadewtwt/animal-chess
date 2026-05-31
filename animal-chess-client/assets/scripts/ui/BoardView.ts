import { _decorator, Component, Node, Sprite, SpriteFrame, Prefab, instantiate, Vec3, Color, Label, UITransform, tween, Tween, UIOpacity, view, CCFloat, resources, EffectAsset, Material, Graphics, Texture2D, BlendFactor, ImageAsset, Mask, AudioClip, AudioSource } from 'cc';
import { LocalEngine, Camp, Piece, GameOverReason, AnimalType } from '../engine/LocalEngine';
import { PieceView } from './PieceView';

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

    @property({ type: SpriteFrame, tooltip: '每只动物6帧走路图，顺序按鼠猫狗狼豹虎狮象，每种6帧，共48帧' })
    public animalWalkSprites: SpriteFrame[] = [];

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

    onLoad() {
        // 监听画布大小变化事件进行自适应缩放
        view.on('canvas-resize', this.adjustBoardScale, this);
    }

    onDestroy() {
        view.off('canvas-resize', this.adjustBoardScale, this);
    }

    start() {
        console.log("BoardView: start() called.");
        this.engine = new LocalEngine();
        this.initBoardBackground();
        this.adjustBoardScale(); // ???????????????
        this.loadPieceArt().then(() => {
            this.restartGame();
            this.initAudioSource();
        });
    }

    private initAudioSource() {
        // 创建用于播放音效的 AudioSource
        this.audioSource = this.addComponent(AudioSource);
        
        // 创建专门用于播放背景音乐的 AudioSource，并尝试播放 BGM
        this.bgmSource = this.addComponent(AudioSource);
        this.bgmSource.loop = true;
        this.bgmSource.volume = 0.5; // 背景音乐音量调小一点
        this.playBGM();
    }

    /**
     * 尝试加载并播放背景音乐
     */
    private playBGM() {
        if (!this.bgmSource) return;

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
            if (this.bgmSource && this.bgmSource.clip && !this.bgmSource.playing) {
                this.bgmSource.play();
            }
        }, this);
    }

    /**
     * 动态计算并缩放棋盘容器，使其完美适配当前画布视口大小
     */
    private adjustBoardScale(): void {
        if (!this.boardContainer) return;

        const visibleSize = view.getVisibleSize();
        const screenWidth = visibleSize.width;
        const screenHeight = visibleSize.height;

        // 计算棋盘加上安全边距的目标尺寸 (左右边距+60，上下留足高空+140以便显示提示词和弹窗)
        const boardWidth = LocalEngine.COLS * this.cellWidth + 60;
        const boardHeight = LocalEngine.ROWS * this.cellHeight + 140;

        // 宽高缩放比
        const scaleX = screenWidth / boardWidth;
        const scaleY = screenHeight / boardHeight;

        // 选择较小值来确保全屏均完整包含
        let targetScale = Math.min(scaleX, scaleY);
        if (targetScale > 1.0) {
            targetScale = 1.0; // 不放大超过原始100%大小，防止图片拉伸模糊
        }

        console.log(`BoardView: adjustScale visibleSize=${screenWidth}x${screenHeight}, targetScale=${targetScale}`);
        this.boardContainer.setScale(new Vec3(targetScale, targetScale, 1.0));
    }

    /**
     * 重启游戏
     */
    public restartGame(): void {
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

        this.updateTurnUI();
    }

    /**
     * 初始化棋盘背景 (如果用户没有底图，脚本将自动根据格子坐标渲染出小河、陷阱和兽穴)
     */
    private initBoardBackground(): void {
        console.log("BoardView: initBoardBackground() called. gridCellPrefab =", this.gridCellPrefab);
        if (!this.boardContainer) {
            this.boardContainer = this.node;
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
                            // 小河格：保持底层预设的贴图，染成纯水蓝色，作为固定不动的河底
                            sprite.color = new Color(30, 144, 255, 255); // 明亮的卡通水蓝色 DodgerBlue

                            // 为了防止水流、鱼儿等溢出到草地，创建一个专用的遮罩层
                            const riverMaskNode = new Node('RiverMask');
                            riverMaskNode.parent = cellNode;
                            riverMaskNode.layer = cellNode.layer;
                            const maskTransform = riverMaskNode.addComponent(UITransform);
                            maskTransform.setContentSize(this.cellWidth, this.cellHeight);
                            riverMaskNode.addComponent(Mask);

                            // 1. 创建流动的波纹 (Flowing Ripples)
                            // 真正的无缝滚动：使用两个波纹节点首尾相连，永不消失
                            const rippleContainer = new Node('RippleContainer');
                            rippleContainer.parent = riverMaskNode;
                            rippleContainer.layer = cellNode.layer;
                            
                            const ripple1 = new Node('FlowRipple1');
                            ripple1.parent = rippleContainer;
                            ripple1.layer = cellNode.layer;
                            const rTransform1 = ripple1.addComponent(UITransform);
                            rTransform1.setContentSize(100, 100); 
                            
                            const rSprite1 = ripple1.addComponent(Sprite);
                            rSprite1.sizeMode = 0;
                            // 恢复完全不透明，确保波纹清晰可见
                            rSprite1.color = new Color(255, 255, 255, 255);

                            const ripple2 = instantiate(ripple1);
                            ripple2.name = 'FlowRipple2';
                            ripple2.parent = rippleContainer;
                            ripple2.setPosition(new Vec3(100, 0, 0));
                            const rSprite2 = ripple2.getComponent(Sprite);

                            // 无缝滚动动画
                            // 容器向左移动 100 像素后瞬间归位
                            const duration = 4.0 + Math.random() * 2.0; // 每个格子稍微随机速度
                            
                            tween(rippleContainer)
                                .by(duration, { position: new Vec3(-100, 0, 0) })
                                .call(() => {
                                    rippleContainer.setPosition(Vec3.ZERO);
                                })
                                .union()
                                .repeatForever()
                                .start();

                            // 加载流动水面素材并赋值给波纹层
                            resources.load('textures/river_water/texture', ImageAsset, (err, imageAsset) => {
                                if (err) { console.error("Failed to load river_water:", err); return; }
                                if (cellNode.isValid) {
                                    const tex = new Texture2D();
                                    tex.image = imageAsset;
                                    const sf = new SpriteFrame();
                                    sf.texture = tex;
                                    
                                    if (rSprite1.isValid) rSprite1.spriteFrame = sf;
                                    if (rSprite2.isValid) rSprite2.spriteFrame = sf;
                                }
                            });

                            // 1.5 特色：添加波光粼粼的闪烁动效 (Sparkling Water)
                            // 遵循动画原理：有机体的随机交错与舒缓的 sineInOut 缓动
                            const sparkleCount = 3 + Math.floor(Math.random() * 4);
                            for (let i = 0; i < sparkleCount; i++) {
                                const sparkle = new Node(`Sparkle_${i}`);
                                sparkle.parent = riverMaskNode;
                                sparkle.layer = cellNode.layer;
                                
                                const sTransform = sparkle.addComponent(UITransform);
                                const sSize = 4 + Math.random() * 6;
                                sTransform.setContentSize(sSize, sSize * 0.4); // 扁长的波光
                                
                                const sSprite = sparkle.addComponent(Sprite);
                                sSprite.sizeMode = 0;
                                sSprite.spriteFrame = sprite.spriteFrame;
                                sSprite.color = new Color(255, 255, 255, 255);
                                
                                const sOpacity = sparkle.addComponent(UIOpacity);
                                sOpacity.opacity = 0;
                                
                                const sX = -40 + Math.random() * 80;
                                const sY = -40 + Math.random() * 80;
                                sparkle.setPosition(new Vec3(sX, sY, 0));
                                sparkle.setRotationFromEuler(0, 0, -5 + Math.random() * 10);
                                
                                // 波光脉动动画
                                const duration = 1.5 + Math.random() * 2.0;
                                const delay = Math.random() * 3.0;
                                
                                tween(sOpacity)
                                    .delay(delay)
                                    .to(duration, { opacity: 100 + Math.random() * 100 }, { easing: 'sineInOut' })
                                    .to(duration, { opacity: 0 }, { easing: 'sineInOut' })
                                    .delay(Math.random() * 2.0)
                                    .union()
                                    .repeatForever()
                                    .start();
                                    
                                tween(sparkle)
                                    .delay(delay)
                                    .to(duration, { scale: new Vec3(1.5, 1.0, 1.0) }, { easing: 'sineInOut' })
                                    .to(duration, { scale: new Vec3(0.8, 1.0, 1.0) }, { easing: 'sineInOut' })
                                    .delay(Math.random() * 2.0)
                                    .union()
                                    .repeatForever()
                                    .start();
                            }

                            // 1.6 特色：河底静谧的小石头 (River Stones)
                            // 石头数量减少约三分之一 (平均每格约 1 个或没有)
                            let stoneCount = 1;
                            const sr = Math.random();
                            if (sr < 0.33) stoneCount = 0;
                            else if (sr > 0.8) stoneCount = 2;
                            
                            for (let i = 0; i < stoneCount; i++) {
                                const stone = new Node(`Stone_${i}`);
                                stone.parent = riverMaskNode;
                                stone.layer = cellNode.layer;
                                stone.setSiblingIndex(0); // 置于水纹底层
                                
                                const stTransform = stone.addComponent(UITransform);
                                const stW = 12 + Math.random() * 10;
                                const stH = 8 + Math.random() * 6;
                                stTransform.setContentSize(stW, stH);
                                
                                const stSprite = stone.addComponent(Sprite);
                                stSprite.sizeMode = 0;
                                stSprite.spriteFrame = sprite.spriteFrame;
                                stSprite.color = new Color(20, 45, 75, 180); // 暗青蓝色
                                
                                resources.load('textures/river_stone/texture', ImageAsset, (err, imageAsset) => {
                                    if (err) { console.error("Failed to load river_stone:", err); return; }
                                    if (stone.isValid && stSprite.isValid) {
                                        const tex = new Texture2D();
                                        tex.image = imageAsset;
                                        const sf = new SpriteFrame();
                                        sf.texture = tex;
                                        stSprite.spriteFrame = sf;
                                        stSprite.color = new Color(255, 255, 255, 255);
                                        // 加大体积以突出素材
                                        stTransform.setContentSize(24, 18);
                                    }
                                });
                                
                                const stX = -35 + Math.random() * 70;
                                const stY = -35 + Math.random() * 70;
                                stone.setPosition(new Vec3(stX, stY, 0));
                                stone.setRotationFromEuler(0, 0, Math.random() * 360);
                            }

                            // 2. 特色：添加浮萍/荷叶 (Lily Pads) 浮动效果
                            if (Math.random() < 0.35) {
                                const lilyPad = new Node(`LilyPad`);
                                lilyPad.parent = riverMaskNode;
                                lilyPad.layer = cellNode.layer;

                                const lpTransform = lilyPad.addComponent(UITransform);
                                const size = 12 + Math.random() * 8;
                                lpTransform.setContentSize(size, size);
                                lpTransform.setAnchorPoint(0.5, 0.5);

                                const lpGraphic = lilyPad.addComponent(Graphics);
                                lpGraphic.fillColor = new Color(46, 139, 87, 240); // 浮萍绿 (SeaGreen)
                                // 画一个稍微扁平的椭圆更像荷叶
                                lpGraphic.ellipse(0, 0, size / 2, (size / 2) * 0.8);
                                lpGraphic.fill();

                                const lpOpacity = lilyPad.addComponent(UIOpacity);
                                lpOpacity.opacity = 160 + Math.random() * 60;

                                // 随机位置与旋转
                                const padX = -35 + Math.random() * 70;
                                const padY = -35 + Math.random() * 70;
                                lilyPad.setPosition(new Vec3(padX, padY, 0));
                                lilyPad.setRotationFromEuler(0, 0, Math.random() * 360);

                                // 浮萍上下漂浮与微幅旋转动画 (体现Motion技能的轻微缓动)
                                const floatDuration = 2.0 + Math.random() * 1.5;
                                tween(lilyPad)
                                    .by(floatDuration, { position: new Vec3(0, 2 + Math.random() * 2, 0) }, { easing: 'sineInOut' })
                                    .by(floatDuration, { position: new Vec3(0, -(2 + Math.random() * 2), 0) }, { easing: 'sineInOut' })
                                    .union()
                                    .repeatForever()
                                    .start();

                                const rotateDuration = 3.0 + Math.random() * 2.0;
                                tween(lilyPad)
                                    .by(rotateDuration, { angle: 10 + Math.random() * 10 }, { easing: 'sineInOut' })
                                    .by(rotateDuration, { angle: -(10 + Math.random() * 10) }, { easing: 'sineInOut' })
                                    .union()
                                    .repeatForever()
                                    .start();
                            }

                            // (小鱼的生成逻辑已重构为全局跨格游动，见 createGlobalFishes)
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

                            // 1. 特色：动态随风摇曳的草叶 (Grass Blades) 
                            const grassCount = 3 + Math.floor(Math.random() * 2);
                            for (let i = 0; i < grassCount; i++) {
                                const bladeNode = new Node(`GrassBlade_${i}`);
                                bladeNode.parent = cellNode;
                                bladeNode.layer = cellNode.layer;

                                const bTransform = bladeNode.addComponent(UITransform);
                                const w = 4 + Math.random() * 2;
                                const h = 14 + Math.random() * 12;
                                bTransform.setContentSize(w, h);
                                bTransform.setAnchorPoint(0.5, 0.0); // 设置草叶根部为旋转中心

                                const graphics = bladeNode.addComponent(Graphics);
                                const greenColor = new Color(
                                    35 + Math.random() * 20,
                                    115 + Math.random() * 25,
                                    40 + Math.random() * 15,
                                    255
                                );
                                graphics.fillColor = greenColor;
                                graphics.strokeColor = new Color(
                                    Math.max(0, greenColor.r - 15),
                                    Math.max(0, greenColor.g - 25),
                                    Math.max(0, greenColor.b - 10),
                                    120
                                );
                                graphics.lineWidth = 1;

                                // 1. 后置叶片 (较深暗绿色，偏左)
                                const hBack = h * 0.85;
                                const wBack = w * 0.7;
                                const leanBack = -wBack - 4;
                                graphics.fillColor = new Color(25, 80, 35, 255);
                                graphics.strokeColor = new Color(15, 60, 25, 120);
                                graphics.moveTo(-wBack / 2 - 2, 0);
                                graphics.quadraticCurveTo(-wBack, hBack * 0.5, leanBack, hBack);
                                graphics.quadraticCurveTo(leanBack * 0.5 + wBack / 2, hBack * 0.4, wBack / 2 - 2, 0);
                                graphics.close();
                                graphics.fill();
                                graphics.stroke();

                                // 2. 主叶片 (中度翠绿色，偏右)
                                const leanMain = w + 4 + (Math.random() - 0.5) * 4;
                                graphics.fillColor = new Color(45, 135, 60, 255);
                                graphics.strokeColor = new Color(30, 95, 40, 120);
                                graphics.moveTo(-w / 2, 0);
                                graphics.quadraticCurveTo(-w / 4, h * 0.5, leanMain, h);
                                graphics.quadraticCurveTo(w / 4 + leanMain * 0.5, h * 0.45, w / 2, 0);
                                graphics.close();
                                graphics.fill();
                                graphics.stroke();

                                // 3. 前置短叶片 (明亮黄绿色，偏左)
                                const hFront = h * 0.6;
                                const wFront = w * 0.8;
                                const leanFront = -wFront - 2;
                                graphics.fillColor = new Color(125, 195, 50, 255);
                                graphics.strokeColor = new Color(90, 145, 30, 120);
                                graphics.moveTo(-wFront / 2 + 1, 0);
                                graphics.quadraticCurveTo(-wFront * 0.8, hFront * 0.55, leanFront, hFront);
                                graphics.quadraticCurveTo(leanFront * 0.5 + wFront / 2, hFront * 0.4, wFront / 2 + 1, 0);
                                graphics.close();
                                graphics.fill();
                                graphics.stroke();

                                const bOpacity = bladeNode.addComponent(UIOpacity);
                                bOpacity.opacity = 210;

                                // 铺在格子的随机中下部
                                const posX = -38 + Math.random() * 76;
                                const posY = -45 + Math.random() * 25; 
                                bladeNode.setPosition(new Vec3(posX, posY, 0));
                                bladeNode.setRotationFromEuler(0, 0, Math.random() * 12 - 6);

                                // 随风摆动的微型动画 (Motion 物理感觉)
                                const swayTime = 1.3 + Math.random() * 0.7;
                                const maxAngle = 6 + Math.random() * 8;
                                tween(bladeNode)
                                    .to(swayTime, { angle: maxAngle }, { easing: 'sineInOut' })
                                    .to(swayTime, { angle: -maxAngle }, { easing: 'sineInOut' })
                                    .union()
                                    .repeatForever()
                                    .start();
                            }

                            // 2. 特色：偶有呼吸绽放的小野花 (Flowers)
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
        
        // 最后生成跨越整个河道畅游的全局鱼群
        this.createGlobalFishes();
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
            
            // 在这片开阔河域内生成 2-4 条鱼
            const fishCount = 2 + Math.floor(Math.random() * 3);
            for (let fi = 0; fi < fishCount; fi++) {
                const fishNode = new Node(`KoiFish_${fi}`);
                fishNode.parent = areaNode;
                fishNode.layer = areaNode.layer;

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
            const turnStr = this.engine.getCurrentTurn() === Camp.RED ? '红方回合 (下方)' : '蓝方回合 (上方)';
            this.turnIndicator.string = turnStr;
            this.turnIndicator.color = this.engine.getCurrentTurn() === Camp.RED ? new Color(255, 60, 60) : new Color(60, 120, 255);
        }
    }

    /**
     * 棋子被点击的响应
     */
    private onPieceClicked(piece: Piece): void {
        console.log("BoardView: onPieceClicked called for piece:", piece.id, "camp:", piece.camp);
        const turn = this.engine.getCurrentTurn();

        if (!piece) return;

        this.playAnimalSound(piece.type);

        // 如果点击的是当前已选中的棋子，无需重复操作
        if (this.selectedPiece?.id === piece.id) {
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
        if (this.selectedPiece) {
            this.tryMovePiece(this.selectedPiece.x, this.selectedPiece.y, x, y);
        }
    }

    /**
     * 播放动物专属配音
     */
    private playAnimalSound(type: AnimalType) {
        if (!this.audioSource) return;

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
        if (!this.gameOverPanel || !this.gameOverText) return;

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
            this.gameOverText.string = `握手言和！\n${reasonStr}`;
            this.gameOverText.color = Color.WHITE;
        } else {
            const winnerName = winner === Camp.RED ? '红方 (下方)' : '蓝方 (上方)';
            this.gameOverText.string = `恭喜 ${winnerName} 获胜！\n${reasonStr}`;
            this.gameOverText.color = winner === Camp.RED ? new Color(255, 60, 60) : new Color(60, 120, 255);
        }

        this.gameOverPanel.active = true;
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


}
