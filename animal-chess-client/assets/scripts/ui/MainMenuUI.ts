import { _decorator, Component, Node, Label, Color, UITransform, Graphics, Vec3, tween, Button, director, resources, SpriteFrame, Sprite } from 'cc';
const { ccclass } = _decorator;

@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
    
    onLoad() {
        this.buildUI();
    }

    private buildUI() {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;

        // 1. Background (using previously generated jungle_bg)
        const bgNode = new Node('Background');
        bgNode.layer = 33554432;
        const bgTrans = bgNode.addComponent(UITransform);
        bgTrans.setContentSize(cw, ch);
        const bgSprite = bgNode.addComponent(Sprite);
        this.safeLoadSprite('textures/jungle_bg', bgSprite);
        // Add a semi-transparent white overlay to match the bright/washed out look of the screenshot
        const bgOverlay = this.createRectNode('BgOverlay', '#ffffff', cw, ch);
        bgOverlay.getComponent(UITransform).contentSize = bgTrans.contentSize;
        bgOverlay.getComponent(Graphics).fillColor = new Color(255, 255, 255, 100);
        bgNode.addChild(bgOverlay);
        canvas.addChild(bgNode);

        // 2. Top Bar
        const topBarHeight = 60;
        const topBar = this.createRectNode('TopBar', '#f0e6c8', cw, topBarHeight);
        topBar.setPosition(0, ch / 2 - topBarHeight / 2, 0);
        canvas.addChild(topBar);

        // Avatar (Left)
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

        // XP Pill (Right)
        const xpPill = this.createRectNode('XPPill', '#e2d6b3', 120, 36, 18);
        xpPill.setPosition(cw / 2 - 80, 0, 0);
        topBar.addChild(xpPill);
        
        const xpTxt = this.createLabelNode('XPTxt', '⭐ XP: 1250', 16, '#434133', true);
        xpPill.addChild(xpTxt);

        // 3. Center Emblem (Circle with image)
        const emblemRadius = Math.min(cw * 0.4, 150);
        const emblemY = ch / 2 - topBarHeight - emblemRadius - 20; // High up
        
        // Outer Yellow Ring
        const emblemRing = this.createCircleNode('EmblemRing', '#fdf441', emblemRadius + 15);
        emblemRing.setPosition(0, emblemY, 0);
        canvas.addChild(emblemRing);

        // Inner Image
        const emblemImg = new Node('EmblemImage');
        emblemImg.layer = 33554432;
        const emblemImgTrans = emblemImg.addComponent(UITransform);
        emblemImgTrans.setContentSize(emblemRadius * 2, emblemRadius * 2);
        const emblemSprite = emblemImg.addComponent(Sprite);
        // Load the logo we have
        this.safeLoadSprite('textures/jungle_logo', emblemSprite);
        emblemRing.addChild(emblemImg);

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

        // 5. Start Game Button
        const startBtnY = titleY - 140;
        const startBtnWidth = Math.min(cw * 0.8, 320);
        const startBtnHeight = 70;
        
        const startBtnNode = this.createRectNode('StartBtn', '#046a17', startBtnWidth, startBtnHeight, 35);
        startBtnNode.setPosition(0, startBtnY, 0);
        canvas.addChild(startBtnNode);
        
        // Inner highlight
        const highlight = this.createRectNode('Highlight', '#2c8a3c', startBtnWidth - 10, startBtnHeight / 2, 15);
        highlight.setPosition(0, startBtnHeight / 4 - 2, 0);
        startBtnNode.addChild(highlight);

        const startBtnText = this.createLabelNode('StartTxt', '开始游戏', 26, '#ffffff', true);
        startBtnNode.addChild(startBtnText);

        startBtnNode.addComponent(Button);
        startBtnNode.on(Node.EventType.TOUCH_START, () => {
            startBtnNode.setScale(new Vec3(0.95, 0.95, 1));
        }, this);
        startBtnNode.on(Node.EventType.TOUCH_END, () => {
            startBtnNode.setScale(new Vec3(1, 1, 1));
            this.onStartGame();
        }, this);

        // 6. Bottom Buttons
        const bottomBtnY = startBtnY - 80;
        const bottomBtnWidth = startBtnWidth / 2 - 10;
        
        // Exit Button
        const exitBtn = this.createRectNode('ExitBtn', '#ecd90b', bottomBtnWidth, 50, 25);
        exitBtn.setPosition(-bottomBtnWidth / 2 - 5, bottomBtnY, 0);
        canvas.addChild(exitBtn);
        const exitTxt = this.createLabelNode('ExitTxt', '🚪 退出', 18, '#000000', true);
        exitBtn.addChild(exitTxt);

        // Settings Button
        const settingsBtn = this.createRectNode('SettingsBtn', '#e9e2c6', bottomBtnWidth, 50, 25);
        settingsBtn.setPosition(bottomBtnWidth / 2 + 5, bottomBtnY, 0);
        canvas.addChild(settingsBtn);
        const settingsTxt = this.createLabelNode('SettingsTxt', '⚙️ 系统设置', 18, '#394034', true);
        settingsBtn.addChild(settingsTxt);
    }

    private onStartGame() {
        console.log('Start Game Clicked!');
        this.node.emit('start-game');
    }

    // --- Helper functions to construct UI from code ---
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
            g.roundRect(-w/2, -h/2, w, h, radius);
        } else {
            g.rect(-w/2, -h/2, w, h);
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
