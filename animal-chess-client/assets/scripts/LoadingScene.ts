import { _decorator, Component, Node, Label, Color, UITransform, tween, Vec3, Graphics, resources, SpriteFrame, Sprite } from 'cc';
const { ccclass } = _decorator;

@ccclass('LoadingScene')
export class LoadingScene extends Component {
    private _progress: number = 0;
    private _targetProgress: number = 0;
    private _isLoaded: boolean = false;
    private _barTotalWidth: number = 300;

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

        this.schedule(this.simulateLoading, 0.15);
    }

    simulateLoading() {
        if (this._isLoaded) return;
        this._targetProgress += Math.random() * 0.05; 
        if (this._targetProgress >= 1) {
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

        // 1. Background (using jungle_bg)
        const bgNode = new Node('Background');
        bgNode.layer = 33554432;
        const bgTrans = bgNode.addComponent(UITransform);
        bgTrans.setContentSize(cw, ch);
        const bgSprite = bgNode.addComponent(Sprite);
        this.safeLoadSprite('textures/jungle_bg', bgSprite);
        const bgOverlay = this.createRectNode('BgOverlay', '#ffffff', cw, ch);
        bgOverlay.getComponent(UITransform).contentSize = bgTrans.contentSize;
        bgOverlay.getComponent(Graphics).fillColor = new Color(255, 255, 255, 100);
        bgNode.addChild(bgOverlay);
        canvas.addChild(bgNode);

        // 2. Top Bar (from MainMenuUI layout)
        const topBarHeight = 60;
        const topBar = this.createRectNode('TopBar', '#f0e6c8', cw, topBarHeight);
        topBar.setPosition(0, ch / 2 - topBarHeight / 2, 0);
        canvas.addChild(topBar);

        const avatarNode = this.createCircleNode('Avatar', '#333333', 20);
        avatarNode.setPosition(-cw / 2 + 30, 0, 0);
        topBar.addChild(avatarNode);

        const nameTxt = this.createLabelNode('Name', '游侠阿提 (Tim)', 18, '#1f2619', true);
        nameTxt.getComponent(UITransform).setAnchorPoint(0, 0.5);
        nameTxt.setPosition(-cw / 2 + 60, 10, 0);
        topBar.addChild(nameTxt);

        const levelTxt = this.createLabelNode('Level', '等级 12 · 黄金段位', 12, '#1ea423', true);
        levelTxt.getComponent(UITransform).setAnchorPoint(0, 0.5);
        levelTxt.setPosition(-cw / 2 + 60, -10, 0);
        topBar.addChild(levelTxt);

        const xpPill = this.createRectNode('XPPill', '#e2d6b3', 120, 36, 18);
        xpPill.setPosition(cw / 2 - 80, 0, 0);
        topBar.addChild(xpPill);
        
        const xpTxt = this.createLabelNode('XPTxt', '⭐ XP: 1250', 16, '#434133', true);
        xpPill.addChild(xpTxt);

        // 3. Center Emblem (Circle with image)
        const emblemRadius = Math.min(cw * 0.4, 150);
        const emblemY = ch / 2 - topBarHeight - emblemRadius - 20;
        
        const emblemRing = this.createCircleNode('EmblemRing', '#fdf441', emblemRadius + 15);
        emblemRing.setPosition(0, emblemY, 0);
        canvas.addChild(emblemRing);

        this.bouncyHero = new Node('EmblemImage');
        this.bouncyHero.layer = 33554432;
        const emblemImgTrans = this.bouncyHero.addComponent(UITransform);
        emblemImgTrans.setContentSize(emblemRadius * 2, emblemRadius * 2);
        const emblemSprite = this.bouncyHero.addComponent(Sprite);
        this.safeLoadSprite('textures/jungle_logo', emblemSprite);
        emblemRing.addChild(this.bouncyHero);

        // 4. Texts
        const titleY = emblemY - emblemRadius - 50;
        const titleText = this.createLabelNode('Title', '丛林战棋', 42, '#137920', true);
        titleText.setPosition(0, titleY, 0);
        canvas.addChild(titleText);

        const underline = this.createRectNode('Underline', '#137920', 160, 4);
        underline.setPosition(0, titleY - 25, 0);
        canvas.addChild(underline);

        const subtitleText = this.createLabelNode('Subtitle', '准备好开启你的热带冒险了吗？', 18, '#374632', false);
        subtitleText.setPosition(0, titleY - 55, 0);
        canvas.addChild(subtitleText);

        // 5. Loading Progress Bar (in place of Start Game button)
        const startBtnY = titleY - 140;
        const bottomContainer = new Node('BottomContainer');
        bottomContainer.layer = 33554432;
        bottomContainer.addComponent(UITransform);
        bottomContainer.setPosition(0, startBtnY + 20, 0); // Position it around where the start button would be
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
