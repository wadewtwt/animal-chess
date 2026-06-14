import { _decorator, Component, Node, Label, Color, UITransform, tween, Vec3, Graphics, resources, SpriteFrame, Sprite, Texture2D, ImageAsset, director, Widget, sys } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoadingScene')
export class LoadingScene extends Component {
    private _progress: number = 0;
    private _targetProgress: number = 0;
    private _isLoaded: boolean = false;
    private _barTotalWidth: number = 300;
    private _barFillHeight: number = 56;
    private _elapsed: number = 0;
    private _loadingDuration: number = 2;

    private _resProgress: number = 0;
    private _sceneProgress: number = 0;
    private _resCompleted: boolean = false;
    private _sceneCompleted: boolean = false;

    @property
    public bootMode: boolean = false;

    @property
    public nextScene: string = 'main';

    private progressBarFill: UITransform = null;
    private progressText: Label = null;
    private progressBadge: Node = null;
    private bouncyHero: Node = null;

    onLoad() {
        console.log('=== LoadingScene onLoad ===');
        if (sys.isBrowser) {
            try {
                const style = document.createElement('style');
                style.innerHTML = `
                    canvas, #GameCanvas, body, html {
                        touch-action: none !important;
                    }
                `;
                document.head.appendChild(style);
                console.log('Successfully injected touch-action styling to prevent browser warnings.');
            } catch (e) {
                console.warn('Failed to inject style:', e);
            }
        }
        this.buildUI();
    }

    start() {
        console.log('=== LoadingScene start ===');
        if (this.bouncyHero) {
            const startPos = this.bouncyHero.position.clone();
            tween(this.bouncyHero)
                .to(2, { position: new Vec3(startPos.x, startPos.y + 15, startPos.z) }, { easing: 'sineInOut' })
                .to(2, { position: startPos }, { easing: 'sineInOut' })
                .union()
                .repeatForever()
                .start();
        }

        this._progress = 0;
        this._targetProgress = 0;
        this._isLoaded = false;
        this._resProgress = 0;
        this._sceneProgress = 0;
        this._resCompleted = false;
        this._sceneCompleted = false;

        this.startRealPreloading();
    }

    private startRealPreloading() {
        console.log('=== LoadingScene startRealPreloading ===');
        // 1. 预加载 resources 目录下的所有资源 (占比 70%)
        resources.preloadDir("", (finished: number, total: number, item: any) => {
            if (total > 0) {
                this._resProgress = finished / total;
                this.updateCombinedProgress();
            }
        }, (err: any, items: any) => {
            if (err) {
                console.error("Failed to preload resources directory:", err);
            }
            console.log("Preloading resources completed.");
            this._resProgress = 1;
            this._resCompleted = true;
            this.updateCombinedProgress();
        });

        // 2. 预加载下一目标场景 (占比 30%)
        director.preloadScene(this.nextScene, (finished: number, total: number, item: any) => {
            if (total > 0) {
                this._sceneProgress = finished / total;
                this.updateCombinedProgress();
            }
        }, (err: any) => {
            if (err) {
                console.error(`Failed to preload scene ${this.nextScene}:`, err);
            }
            console.log(`Preloading scene ${this.nextScene} completed.`);
            this._sceneProgress = 1;
            this._sceneCompleted = true;
            this.updateCombinedProgress();
        });
    }

    private updateCombinedProgress() {
        if (this._isLoaded) return;
        // 合并计算目标进度：资源预加载占 70%，场景预加载占 30%
        this._targetProgress = (this._resProgress * 0.7) + (this._sceneProgress * 0.3);
        console.log(`Preload progress update: target = ${Math.floor(this._targetProgress * 100)}% (res = ${Math.floor(this._resProgress * 100)}%, scene = ${Math.floor(this._sceneProgress * 100)}%)`);
    }

    update(deltaTime: number) {
        if (this._progress < this._targetProgress) {
            // 平滑步进，每秒最多前进 1.0 的进度值，确保展示平滑
            this._progress += deltaTime * 1.0; 
            if (this._progress > this._targetProgress) {
                this._progress = this._targetProgress;
            }

            if (this.progressBarFill) {
                this.updateProgressBarFill(this._barTotalWidth * this._progress);
            }
            if (this.progressText) {
                this.progressText.string = `${Math.floor(this._progress * 100)}%`;
            }
            if (this.progressBadge) {
                const currentX = (-this._barTotalWidth / 2) + (this._barTotalWidth * this._progress);
                this.progressBadge.setPosition(new Vec3(currentX, this.progressBadge.position.y, 0));
            }
        }

        // 资源及场景均已完全完成，且进度条动画也已经平滑走完（达到 99% 以上）
        if (this._resCompleted && this._sceneCompleted && this._progress >= 0.99 && !this._isLoaded) {
            this._progress = 1;
            if (this.progressBarFill) {
                this.updateProgressBarFill(this._barTotalWidth);
            }
            if (this.progressText) {
                this.progressText.string = '100%';
            }
            if (this.progressBadge) {
                this.progressBadge.setPosition(new Vec3(this._barTotalWidth / 2, this.progressBadge.position.y, 0));
            }
            this._isLoaded = true;
            console.log("All real assets preloaded successfully. Loading complete.");
            this.onLoadComplete();
        }
    }

    private updateProgressBarFill(w: number) {
        if (!this.progressBarFill) return;
        this.progressBarFill.width = w;
        const g = this.progressBarFill.node.getComponent(Graphics);
        if (g) {
            g.clear();
            if (w > 4) {
                const h = this._barFillHeight;
                const radius = Math.min(h / 2, w / 2);
                g.roundRect(0, -h / 2, w, h, radius);
                g.fill();
            }
        }
    }

    onLoadComplete() {
        if (this.bootMode) {
            director.loadScene(this.nextScene);
            return;
        }

        if (this.bouncyHero) {
            this.bouncyHero.angle = 0;
            const startPos = this.bouncyHero.position.clone();
            tween(this.bouncyHero)
                .to(0.1, { position: new Vec3(startPos.x, startPos.y + 10, startPos.z) }, { easing: 'quadOut' })
                .to(0.1, { position: startPos }, { easing: 'quadIn' })
                .union()
                .repeat(2)
                .call(() => {
                    this.node.emit('loading-complete');
                })
                .start();
        } else {
            this.node.emit('loading-complete');
        }
    }

    // --- UI 构建核心逻辑 (复刻设计图) ---
    buildUI() {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        if (!uiTrans) {
            console.error('LoadingScene: No UITransform on node!');
            return;
        }
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.max(0.62, Math.min(cw / refW, ch / refH));

        // 1. Background (using loading_bg)
        const bgNode = new Node('Background');
        bgNode.layer = 33554432;
        const bgTrans = bgNode.addComponent(UITransform);
        bgTrans.setContentSize(cw, ch);
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.safeLoadSprite('textures/loading_bg', bgSprite);
        canvas.addChild(bgNode);

        const widget = bgNode.addComponent(Widget);
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.left = 0;
        widget.right = 0;
        widget.top = 0;
        widget.bottom = 0;
        widget.alignMode = 2; // ON_WINDOW_RESIZE

        // 2. Loading Progress Bar (随屏幕尺寸缩放，避免小屏横屏挤压)
        const bottomContainer = new Node('BottomContainer');
        bottomContainer.layer = 33554432;
        bottomContainer.addComponent(UITransform);
        bottomContainer.setPosition(0, -ch / 2 + ch * (isPortrait ? 0.35 : 0.28), 0);
        canvas.addChild(bottomContainer);

        const statusFontSize = Math.round(Math.max(22, Math.min(36, 36 * scaleFactor)));
        const statusTxt = this.createLabelNode('StatusTxt', '游戏努力加载中...', statusFontSize, '#137920', true);
        statusTxt.setPosition(0, 88 * scaleFactor, 0);
        bottomContainer.addChild(statusTxt);

        this._barTotalWidth = Math.min(cw * 0.86, 640 * scaleFactor);
        const barBgHeight = 72 * scaleFactor;
        const barBg = this.createRectNode('BarBg', '#e9e2c6', this._barTotalWidth + 16 * scaleFactor, barBgHeight, barBgHeight / 2);
        bottomContainer.addChild(barBg);

        this._barFillHeight = 56 * scaleFactor;
        const barFillNode = this.createRectNode('BarFill', '#046a17', 0, this._barFillHeight, this._barFillHeight / 2);
        barFillNode.getComponent(UITransform).setAnchorPoint(0, 0.5);
        barFillNode.setPosition(-this._barTotalWidth / 2, 0, 0);
        this.progressBarFill = barFillNode.getComponent(UITransform);
        bottomContainer.addChild(barFillNode);

        const badgeW = 132 * scaleFactor;
        const badgeH = 68 * scaleFactor;
        this.progressBadge = this.createRectNode('ProgressBadge', '#fdf441', badgeW, badgeH, 20 * scaleFactor);
        this.progressBadge.setPosition(-this._barTotalWidth / 2, 82 * scaleFactor, 0);
        bottomContainer.addChild(this.progressBadge);

        this.progressText = this.createLabelNode('ProgressText', '0%', Math.round(38 * scaleFactor), '#000000', true).getComponent(Label);
        this.progressBadge.addChild(this.progressText.node);
    }

    private createRectNode(name: string, hexColor: string, w: number, h: number, radius: number = 0): Node {
        const node = new Node(name);
        node.layer = 33554432;
        const uiTrans = node.addComponent(UITransform);
        uiTrans.width = w;
        uiTrans.height = h;
        
        const g = node.addComponent(Graphics);
        const color = new Color();
        Color.fromHEX(color, hexColor);
        g.fillColor = color;
        
        if (radius > 0) {
            g.roundRect(-w / 2, -h / 2, w, h, radius);
        } else {
            g.rect(-w / 2, -h / 2, w, h);
        }
        g.fill();
        return node;
    }

    private createCircleNode(name: string, hexColor: string, radius: number): Node {
        const node = new Node(name);
        node.layer = 33554432;
        const uiTrans = node.addComponent(UITransform);
        uiTrans.width = radius * 2;
        uiTrans.height = radius * 2;
        
        const g = node.addComponent(Graphics);
        const color = new Color();
        Color.fromHEX(color, hexColor);
        g.fillColor = color;
        
        g.circle(0, 0, radius);
        g.fill();
        return node;
    }

    private createLabelNode(name: string, text: string, fontSize: number, hexColor: string, bold: boolean): Node {
        const node = new Node(name);
        node.layer = 33554432;
        node.addComponent(UITransform);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 4;
        label.isBold = bold;
        const color = new Color();
        Color.fromHEX(color, hexColor);
        label.color = color;
        return node;
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
                        resources.load(path, Texture2D, (err3, tex) => {
                            if (!err3 && tex) {
                                if (sprite && sprite.isValid) {
                                    const newSf = new SpriteFrame();
                                    newSf.texture = tex;
                                    sprite.spriteFrame = newSf;
                                }
                            } else {
                                resources.load(`${path}/texture`, Texture2D, (err4, tex2) => {
                                    if (!err4 && tex2) {
                                        if (sprite && sprite.isValid) {
                                            const newSf = new SpriteFrame();
                                            newSf.texture = tex2;
                                            sprite.spriteFrame = newSf;
                                        }
                                    } else {
                                        resources.load(path, ImageAsset, (err5, imgAsset) => {
                                            if (!err5 && imgAsset) {
                                                if (sprite && sprite.isValid) {
                                                    const tex3 = new Texture2D();
                                                    tex3.image = imgAsset;
                                                    const newSf = new SpriteFrame();
                                                    newSf.texture = tex3;
                                                    sprite.spriteFrame = newSf;
                                                }
                                            } else {
                                                console.warn(`safeLoadSprite warning for ${path}:`, err5);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }
}
