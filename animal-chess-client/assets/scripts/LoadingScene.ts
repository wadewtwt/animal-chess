import { _decorator, Component, Node, Label, Color, UITransform, tween, Vec3, Graphics, resources, SpriteFrame, Sprite, Texture2D, ImageAsset, director, Widget, sys } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoadingScene')
export class LoadingScene extends Component {
    private _progress: number = 0;
    private _targetProgress: number = 0;
    private _isLoaded: boolean = false;
    private _barTotalWidth: number = 300;
    private _elapsed: number = 0;
    private _loadingDuration: number = 2;

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

        this._elapsed = 0;
        this._progress = 0;
        this._targetProgress = 0;
        this._isLoaded = false;
        this.schedule(this.simulateLoading, 0.05);
    }

    simulateLoading(dt: number) {
        if (this._isLoaded) return;
        this._elapsed += dt;
        this._targetProgress = Math.min(1, this._elapsed / this._loadingDuration);

        if (this._elapsed >= this._loadingDuration) {
            this._targetProgress = 1;
            this._isLoaded = true;
            this.unschedule(this.simulateLoading);
            this.onLoadComplete();
        }
    }

    update(deltaTime: number) {
        if (this._progress < this._targetProgress) {
            this._progress += deltaTime * 0.5; 
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
    }

    private updateProgressBarFill(w: number) {
        if (!this.progressBarFill) return;
        this.progressBarFill.width = w;
        const g = this.progressBarFill.node.getComponent(Graphics);
        if (g) {
            g.clear();
            if (w > 4) {
                const h = 56;
                const radius = Math.min(28, w / 2);
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

        // 2. Loading Progress Bar (整体拉长并往上移动至底部 35% 处)
        const bottomContainer = new Node('BottomContainer');
        bottomContainer.layer = 33554432;
        bottomContainer.addComponent(UITransform);
        bottomContainer.setPosition(0, -ch / 2 + ch * 0.35, 0); // 往上移动至距离底边 35% 像素
        canvas.addChild(bottomContainer);

        const statusTxt = this.createLabelNode('StatusTxt', '游戏努力加载中。。。', 36, '#137920', true); // 字号放大至 36
        statusTxt.setPosition(0, 90, 0); // Y坐标上移至 90
        bottomContainer.addChild(statusTxt);

        this._barTotalWidth = Math.min(cw * 0.9, 832); // 进度条总宽度再拉长 30%，最大 832 像素
        const barBg = this.createRectNode('BarBg', '#e9e2c6', this._barTotalWidth + 16, 72, 36); // 高度放大至 72，圆角 36
        bottomContainer.addChild(barBg);

        const barFillNode = this.createRectNode('BarFill', '#046a17', 0, 56, 28); // 填充条高度放大至 56，圆角 28
        barFillNode.getComponent(UITransform).setAnchorPoint(0, 0.5);
        barFillNode.setPosition(-this._barTotalWidth / 2, 0, 0);
        this.progressBarFill = barFillNode.getComponent(UITransform);
        bottomContainer.addChild(barFillNode);

        this.progressBadge = this.createRectNode('ProgressBadge', '#fdf441', 150, 80, 24); // 气泡大小放大至 150x80，圆角 24
        this.progressBadge.setPosition(-this._barTotalWidth / 2, 86, 0); // Y坐标上移至 86
        bottomContainer.addChild(this.progressBadge);

        this.progressText = this.createLabelNode('ProgressText', '0%', 42, '#000000', true).getComponent(Label); // 字号放大至 42
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
