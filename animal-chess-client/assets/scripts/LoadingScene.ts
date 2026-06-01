import { _decorator, Component, Node, Label, Color, UITransform, tween, Vec3, Graphics, resources, SpriteFrame, Sprite, Texture2D, ImageAsset, director } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoadingScene')
export class LoadingScene extends Component {
    private _progress: number = 0;
    private _targetProgress: number = 0;
    private _isLoaded: boolean = false;
    private _barTotalWidth: number = 300;
    private _elapsed: number = 0;
    private _loadingDuration: number = 3;

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
                this.progressBarFill.width = this._barTotalWidth * this._progress;
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
        this.safeLoadSprite('textures/loading_bg', bgSprite);
        canvas.addChild(bgNode);

        // 2. Loading Progress Bar
        const bottomContainer = new Node('BottomContainer');
        bottomContainer.layer = 33554432;
        bottomContainer.addComponent(UITransform);
        bottomContainer.setPosition(0, -ch / 2 + 120, 0);
        canvas.addChild(bottomContainer);

        const statusTxt = this.createLabelNode('StatusTxt', '正在探索丛林中...', 18, '#137920', true);
        statusTxt.setPosition(0, 45, 0);
        bottomContainer.addChild(statusTxt);

        this._barTotalWidth = Math.min(cw * 0.8, 320);
        const barBg = this.createRectNode('BarBg', '#e9e2c6', this._barTotalWidth + 8, 36, 18);
        bottomContainer.addChild(barBg);

        const barFillNode = this.createRectNode('BarFill', '#046a17', 0, 28, 14);
        barFillNode.getComponent(UITransform).setAnchorPoint(0, 0.5);
        barFillNode.setPosition(-this._barTotalWidth / 2, 0, 0);
        this.progressBarFill = barFillNode.getComponent(UITransform);
        bottomContainer.addChild(barFillNode);

        this.progressBadge = this.createRectNode('ProgressBadge', '#fdf441', 50, 28, 8);
        this.progressBadge.setPosition(-this._barTotalWidth / 2, 35, 0);
        bottomContainer.addChild(this.progressBadge);

        this.progressText = this.createLabelNode('ProgressText', '0%', 14, '#000000', true).getComponent(Label);
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
