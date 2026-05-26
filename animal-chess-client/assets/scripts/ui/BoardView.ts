import { _decorator, Component, Node, Sprite, SpriteFrame, Prefab, instantiate, Vec3, Color, Label, UITransform, tween, Tween, UIOpacity, view, CCFloat, resources, EffectAsset, Material, Graphics } from 'cc';
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
    private walkFramesByType: Map<number, SpriteFrame[]> = new Map();
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
        this.loadWalkSprites().then(() => {
            this.restartGame();
        });
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
                            // 小河格：底色深水蓝 (更深沉，提供更好的质感)
                            sprite.color = new Color(25, 75, 160, 255);

                            // 1. 高级多粒子流水波光特效（不依赖 Shader，100% 兼容无错）
                            const rippleCount = 8; // 增加到 8 个高光波光带，形成密集流动质感
                            for (let i = 0; i < rippleCount; i++) {
                                const rippleNode = new Node(`RiverRipple_${i}`);
                                rippleNode.parent = cellNode;
                                rippleNode.layer = cellNode.layer; // 保持 UI_2D 图层

                                const rTransform = rippleNode.addComponent(UITransform);
                                // 随机化波光尺寸，有的细长（拉伸水纹），有的圆润（反光光斑）
                                const rWidth = 12 + Math.random() * 25;
                                const rHeight = 1.5 + Math.random() * 2;
                                rTransform.setContentSize(rWidth, rHeight);

                                const rSprite = rippleNode.addComponent(Sprite);
                                rSprite.sizeMode = 0; // CUSTOM
                                rSprite.spriteFrame = sprite.spriteFrame; // white_square 贴图

                                // 采用淡水蓝到亮白之间的粼粼高光色
                                rSprite.color = new Color(210, 245, 255, 255);

                                // 挂载 2D 透明度控制组件
                                const rOpacity = rippleNode.addComponent(UIOpacity);
                                rOpacity.opacity = 0;

                                // 启动循环的水流波动与漂移运动
                                this.scheduleOnce(() => {
                                    if (!rippleNode.isValid || !rOpacity.isValid) return;

                                    const startCycle = () => {
                                        if (!rippleNode.isValid || !rOpacity.isValid) return;

                                        // 流动统一从格子左边缘外开始，向右滑动至右边缘外
                                        const startX = -55;
                                        const endX = 55;
                                        // 垂直分布在不同的高度通道中
                                        const startY = -42 + (i * 12) + (Math.random() * 4 - 2); 
                                        
                                        rippleNode.setPosition(new Vec3(startX, startY, 0));
                                        rippleNode.setScale(new Vec3(0.5, 1.0, 1.0));
                                        rippleNode.setRotationFromEuler(0, 0, Math.random() * 10 - 5); // 带有微弱的角度倾斜，更自然
                                        rOpacity.opacity = 0;

                                        // 随机流动周期 (1.5秒 ~ 2.8秒)
                                        const duration = 1.5 + Math.random() * 1.3;

                                        // 渐入（0.3周期）、持续、渐出（0.3周期）
                                        tween(rOpacity)
                                            .to(duration * 0.3, { opacity: 100 + Math.random() * 120 }, { easing: 'sineOut' })
                                            .to(duration * 0.4, { opacity: 100 + Math.random() * 120 })
                                            .to(duration * 0.3, { opacity: 0 }, { easing: 'sineIn' })
                                            .start();

                                        // 沿 X 轴平移流动，同时在 Y 轴做微小正弦波上下晃动，模拟水流涟漪
                                        const segmentCount = 3;
                                        const segmentTime = duration / segmentCount;
                                        const stepX = (endX - startX) / segmentCount;
                                        
                                        let myTween = tween(rippleNode);
                                        for (let k = 1; k <= segmentCount; k++) {
                                            const nextX = startX + k * stepX;
                                            const waveY = startY + Math.sin(k * Math.PI * 0.6 + i) * 3;
                                            const targetScaleX = 0.8 + (k / segmentCount) * 1.0 + Math.random() * 0.4;
                                            const targetAngle = (Math.random() * 10 - 5) + Math.cos(k) * 4; // 角度波动
                                            
                                            myTween = myTween.to(segmentTime, {
                                                position: new Vec3(nextX, waveY, 0),
                                                scale: new Vec3(targetScaleX, 1.0, 1.0),
                                                angle: targetAngle as any
                                            }, { easing: 'sineInOut' });
                                        }

                                        myTween.call(() => {
                                            const nextDelay = Math.random() * 0.6;
                                            this.scheduleOnce(startCycle, nextDelay);
                                        }).start();
                                    };

                                    const initialDelay = Math.random() * 1.6;
                                    this.scheduleOnce(startCycle, initialDelay);
                                }, 0.05);
                            }

                            // 2. 特色：添加浮萍/荷叶 (Lily Pads) 浮动效果
                            if (Math.random() < 0.35) {
                                const lilyPad = new Node(`LilyPad`);
                                lilyPad.parent = cellNode;
                                lilyPad.layer = cellNode.layer;

                                const lpTransform = lilyPad.addComponent(UITransform);
                                const size = 12 + Math.random() * 8;
                                lpTransform.setContentSize(size, size);
                                lpTransform.setAnchorPoint(0.5, 0.5);

                                const lpSprite = lilyPad.addComponent(Sprite);
                                lpSprite.sizeMode = 0;
                                lpSprite.spriteFrame = sprite.spriteFrame;
                                lpSprite.color = new Color(46, 139, 87, 240); // 浮萍绿 (SeaGreen)

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

                            // 3. 特色：添加游动的小鲤鱼 (Koi Fish) 和摆尾动画
                            if (Math.random() < 0.4) {
                                const fishNode = new Node(`KoiFish`);
                                fishNode.parent = cellNode;
                                fishNode.layer = cellNode.layer;

                                const fTransform = fishNode.addComponent(UITransform);
                                fTransform.setContentSize(14, 6);

                                const fSprite = fishNode.addComponent(Sprite);
                                fSprite.sizeMode = 0;
                                fSprite.spriteFrame = sprite.spriteFrame;
                                fSprite.color = new Color(235, 90, 50, 255); // 喜庆橘红色鲤鱼

                                const fOpacity = fishNode.addComponent(UIOpacity);
                                fOpacity.opacity = 0;

                                // 鱼尾巴 (二级动画，模拟物理运动)
                                const tailNode = new Node(`KoiTail`);
                                tailNode.parent = fishNode;
                                tailNode.layer = fishNode.layer;
                                const tTransform = tailNode.addComponent(UITransform);
                                tTransform.setContentSize(5, 3);
                                tTransform.setAnchorPoint(1.0, 0.5); // 右侧对齐为尾关节
                                tailNode.setPosition(new Vec3(-7, 0, 0)); // 挂载在身体后部
                                
                                const tSprite = tailNode.addComponent(Sprite);
                                tSprite.sizeMode = 0;
                                tSprite.spriteFrame = sprite.spriteFrame;
                                tSprite.color = new Color(250, 140, 70, 255); // 浅色尾鳍

                                // 尾巴循环摆动
                                tween(tailNode)
                                    .to(0.12, { angle: 25 }, { easing: 'sineInOut' })
                                    .to(0.24, { angle: -25 }, { easing: 'sineInOut' })
                                    .to(0.12, { angle: 0 }, { easing: 'sineInOut' })
                                    .union()
                                    .repeatForever()
                                    .start();

                                // 游动大循环
                                const swimCycle = () => {
                                    if (!fishNode.isValid || !fOpacity.isValid) return;

                                    const dir = Math.random() > 0.5 ? 1 : -1;
                                    const startX = -60 * dir;
                                    const endX = 60 * dir;
                                    const swimY = -25 + Math.random() * 50;

                                    fishNode.setPosition(new Vec3(startX, swimY, 0));
                                    fishNode.setScale(new Vec3(dir, 1.0, 1.0)); // 调转鱼头方向
                                    fOpacity.opacity = 0;

                                    const duration = 2.2 + Math.random() * 1.3;

                                    // 游动进出渐显渐隐
                                    tween(fOpacity)
                                        .to(0.4, { opacity: 190 }, { easing: 'sineOut' })
                                        .delay(duration - 0.8)
                                        .to(0.4, { opacity: 0 }, { easing: 'sineIn' })
                                        .start();

                                    // 鱼儿在水流中微微扭动着前行
                                    tween(fishNode)
                                        .to(duration, { position: new Vec3(endX, swimY + (Math.random() * 16 - 8), 0) }, { easing: 'sineInOut' })
                                        .call(() => {
                                            this.scheduleOnce(swimCycle, 2.0 + Math.random() * 3.0);
                                        })
                                        .start();
                                };

                                this.scheduleOnce(swimCycle, Math.random() * 2.5);
                            }
                        } else if (this.engine.getTrapCamp(x, y) !== null) {
                            // 陷阱格：危险暗粉红色
                            sprite.color = new Color(220, 75, 75, 200);

                            // 特色：警示呼吸光环
                            const glowNode = new Node(`TrapGlow`);
                            glowNode.parent = cellNode;
                            glowNode.layer = cellNode.layer;
                            const gTransform = glowNode.addComponent(UITransform);
                            gTransform.setContentSize(this.cellWidth - 16, this.cellHeight - 16);
                            
                            const gSprite = glowNode.addComponent(Sprite);
                            gSprite.sizeMode = 0;
                            gSprite.spriteFrame = sprite.spriteFrame;
                            gSprite.color = new Color(255, 0, 0, 60);

                            const gOpacity = glowNode.addComponent(UIOpacity);
                            gOpacity.opacity = 50;

                            // 快速闪烁脉动动效
                            tween(gOpacity)
                                .to(0.7, { opacity: 140 }, { easing: 'sineInOut' })
                                .to(0.7, { opacity: 20 }, { easing: 'sineInOut' })
                                .union()
                                .repeatForever()
                                .start();
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

                            // 兽穴格额外增加金色魔力结界光圈
                            if (this.engine.isDen(x, y)) {
                                const shineNode = new Node(`DenShine`);
                                shineNode.parent = cellNode;
                                shineNode.layer = cellNode.layer;
                                const sTransform = shineNode.addComponent(UITransform);
                                sTransform.setContentSize(this.cellWidth - 10, this.cellHeight - 10);
                                
                                const sSprite = shineNode.addComponent(Sprite);
                                sSprite.sizeMode = 0;
                                sSprite.spriteFrame = this.gridCellPrefab.data.getComponent(Sprite)?.spriteFrame || sprite.spriteFrame;
                                sSprite.color = new Color(255, 235, 120, 100);

                                const sOpacity = shineNode.addComponent(UIOpacity);
                                sOpacity.opacity = 80;

                                // 呼吸脉动动效
                                tween(sOpacity)
                                    .to(1.5, { opacity: 160 }, { easing: 'sineInOut' })
                                    .to(1.5, { opacity: 40 }, { easing: 'sineInOut' })
                                    .union()
                                    .repeatForever()
                                    .start();

                                // 慢速旋转
                                tween(shineNode)
                                    .to(10.0, { angle: 360 })
                                    .call(() => { shineNode.angle = 0; })
                                    .union()
                                    .repeatForever()
                                    .start();
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
        pieceNode.setPosition(this.gridToWorldPos(p.x, p.y));

        const view = pieceNode.getComponent(PieceView);
        if (view) {
            // 获取对应的动物图片 (注意 AnimalType 1-8，数组下标 0-7)
            const animalSF = this.animalSprites[p.type - 1];
            const baseSF = p.camp === Camp.RED ? this.redBaseSF : this.blueBaseSF;
            const walkFrames = this.getWalkFramesForType(p.type);

            view.init(p, animalSF, baseSF, walkFrames);
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

        if (eatenPiece) {
            const eatenView = this.pieceViews.get(eatenPiece.id)!;
            this.pieceViews.delete(eatenPiece.id);

            // 1. 主动攻击方播放冲锋突刺动画 (蓄力后退 -> 快速冲锋压扁)
            activeView.playAttackLunge(targetWorldPos, 
                // 击中瞬间的回调 (Impact)
                () => {
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
        if (!this.cellHighlightPrefab) return;

        const hlNode = instantiate(this.cellHighlightPrefab);
        hlNode.parent = this.boardContainer;
        hlNode.setPosition(this.gridToWorldPos(x, y));
        this.highlightNodes.push(hlNode);

        // 绑定点击事件，点击高亮光圈触发移动
        hlNode.on(Node.EventType.TOUCH_END, () => {
            this.onCellClicked(x, y);
        }, this);
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

    private getWalkFramesForType(type: number): SpriteFrame[] {
        return this.walkFramesByType.get(type) ?? [];
    }

    private loadWalkSprites(): Promise<void> {
        const animals = ['cat', 'dog', 'elephant', 'leopard', 'lion', 'rat', 'tiger', 'wolf'];
        const typeMap: Record<string, number> = {
            rat: 1,
            cat: 2,
            dog: 3,
            wolf: 4,
            leopard: 5,
            tiger: 6,
            lion: 7,
            elephant: 8,
        };

        return new Promise((resolve) => {
            resources.loadDir('animals_walk', SpriteFrame, (err, frames) => {
                if (err) {
                    console.warn('BoardView: failed to load walk sprite frames from resources/animals_walk', err);
                    resolve();
                    return;
                }

                console.log('BoardView: loaded walk sprite frames count =', frames.length);

                const grouped = new Map<number, SpriteFrame[]>();
                for (let i = 1; i <= 8; i++) {
                    grouped.set(i, []);
                }

                const requiredCount = animals.length * 6;
                if (frames.length < requiredCount) {
                    console.warn(`BoardView: walk sprite frame count is ${frames.length}, expected ${requiredCount}`);
                }

                for (let animalIndex = 0; animalIndex < animals.length; animalIndex++) {
                    const animal = animals[animalIndex];
                    const type = typeMap[animal];
                    for (let frameIndex = 0; frameIndex < 6; frameIndex++) {
                        const assetIndex = animalIndex * 6 + frameIndex;
                        const frame = frames[assetIndex] as SpriteFrame | undefined;
                        if (!frame) continue;
                        frame.name = `${animal}_walk_${frameIndex + 1}`;
                        grouped.get(type)?.push(frame);
                    }
                }

                for (const [type, frameList] of grouped.entries()) {
                    console.log(`BoardView: loaded walk frames for type ${type}: ${frameList.length}`);
                }

                this.walkFramesByType = grouped;
                console.log('BoardView: walk frame loading finished');
                resolve();
            });
        });
    }
}
