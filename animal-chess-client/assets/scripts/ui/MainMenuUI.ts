import { _decorator, Component, Node, Label, Color, UITransform, Graphics, Vec3, tween, Button, director, resources, SpriteFrame, Sprite, Texture2D, ImageAsset } from 'cc';
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

        // 1. Background
        const bgNode = new Node('Background');
        bgNode.layer = 33554432;
        const bgTrans = bgNode.addComponent(UITransform);
        bgTrans.setContentSize(cw, ch);
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.sizeMode = 0;
        this.safeLoadSprite('textures/main_menu_bg', bgSprite);
        canvas.addChild(bgNode);

        const bgWash = this.createRectNode('BgWash', '#f6ffe8', cw, ch, 0, 36);
        canvas.addChild(bgWash);

        // 2. Top Bar
        const topBarHeight = 58;
        const topBar = this.createRectNode('TopBar', '#f6ebbf', cw - 24, topBarHeight, 18, 232);
        topBar.setPosition(0, ch / 2 - topBarHeight / 2 - 8, 0);
        canvas.addChild(topBar);

        const avatarNode = this.createCircleNode('Avatar', '#2d2b1f', 16);
        avatarNode.setPosition(-cw / 2 + 42, 0, 0);
        topBar.addChild(avatarNode);

        const nameTxt = this.createLabelNode('Name', '游侠阿提 (Tim)', 16, '#22311c', true);
        nameTxt.getComponent(UITransform).setAnchorPoint(0, 0.5);
        nameTxt.setPosition(-cw / 2 + 70, 10, 0);
        topBar.addChild(nameTxt);

        const levelTxt = this.createLabelNode('Level', '等级 12 · 黄金段位', 12, '#198d2c', true);
        levelTxt.getComponent(UITransform).setAnchorPoint(0, 0.5);
        levelTxt.setPosition(-cw / 2 + 70, -10, 0);
        topBar.addChild(levelTxt);

        const xpPill = this.createRectNode('XPPill', '#efe2af', 132, 34, 17);
        xpPill.setPosition(cw / 2 - 86, 0, 0);
        topBar.addChild(xpPill);
        const xpTxt = this.createLabelNode('XPTxt', '✦ XP: 1250', 16, '#5b4b1c', true);
        xpPill.addChild(xpTxt);

        // 3. Main Emblem
        const emblemRadius = Math.min(Math.min(cw, ch) * 0.18, 118);
        const emblemY = ch / 2 - topBarHeight - emblemRadius - 42;
        const emblemShadow = this.createCircleNode('EmblemShadow', '#0f2b0f', emblemRadius + 4, 42);
        emblemShadow.setPosition(0, emblemY - 6, 0);
        canvas.addChild(emblemShadow);

        const emblemRing = this.createCircleNode('EmblemRing', '#f9e42b', emblemRadius + 16);
        emblemRing.setPosition(0, emblemY, 0);
        canvas.addChild(emblemRing);

        const emblemImg = new Node('EmblemImage');
        emblemImg.layer = 33554432;
        const emblemImgTrans = emblemImg.addComponent(UITransform);
        emblemImgTrans.setContentSize(emblemRadius * 2, emblemRadius * 2);
        const emblemSprite = emblemImg.addComponent(Sprite);
        emblemSprite.sizeMode = 0;
        this.safeLoadSprite('textures/start_emblem', emblemSprite);
        emblemRing.addChild(emblemImg);

        // 4. Title & Subtitle
        const titleY = emblemY - emblemRadius - 48;
        const titleText = this.createLabelNode('Title', '丛林战棋', 42, '#11751e', true);
        titleText.setPosition(0, titleY, 0);
        canvas.addChild(titleText);

        const underline = this.createRectNode('Underline', '#11751e', 160, 4, 2);
        underline.setPosition(0, titleY - 26, 0);
        canvas.addChild(underline);

        const subtitleText = this.createLabelNode('Subtitle', '准备好开启你的热带冒险了吗？', 18, '#3f4d33', false);
        subtitleText.setPosition(0, titleY - 56, 0);
        canvas.addChild(subtitleText);

        // 5. Start Button
        const startBtnY = titleY - 142;
        const startBtnWidth = Math.min(cw * 0.42, 360);
        const startBtnHeight = 72;
        const startBtnNode = this.createRectNode('StartBtn', '#168f25', startBtnWidth, startBtnHeight, 36);
        startBtnNode.setPosition(0, startBtnY, 0);
        canvas.addChild(startBtnNode);

        const startGlow = this.createRectNode('StartGlow', '#4fcc58', startBtnWidth - 16, 22, 11, 92);
        startGlow.setPosition(0, 16, 0);
        startBtnNode.addChild(startGlow);

        const playCircle = this.createCircleNode('PlayCircle', '#f8fff7', 12);
        playCircle.setPosition(-58, 0, 0);
        startBtnNode.addChild(playCircle);
        const playIcon = this.createLabelNode('PlayIcon', '▶', 14, '#168f25', true);
        playIcon.setPosition(-58, 0, 0);
        startBtnNode.addChild(playIcon);

        const startBtnText = this.createLabelNode('StartTxt', '开始游戏', 26, '#ffffff', true);
        startBtnText.setPosition(22, 1, 0);
        startBtnNode.addChild(startBtnText);

        startBtnNode.addComponent(Button);
        startBtnNode.on(Node.EventType.TOUCH_START, () => {
            startBtnNode.setScale(new Vec3(0.96, 0.96, 1));
        }, this);
        startBtnNode.on(Node.EventType.TOUCH_END, () => {
            startBtnNode.setScale(new Vec3(1, 1, 1));
            this.onStartGame();
        }, this);

        // 6. Bottom Buttons
        const bottomBtnY = startBtnY - 88;
        const bottomBtnWidth = startBtnWidth / 2 - 12;

        const exitBtn = this.createRectNode('ExitBtn', '#f0dd1b', bottomBtnWidth, 52, 26);
        exitBtn.setPosition(-bottomBtnWidth / 2 - 6, bottomBtnY, 0);
        canvas.addChild(exitBtn);
        const exitTxt = this.createLabelNode('ExitTxt', '↩ 退出', 18, '#3f3600', true);
        exitBtn.addChild(exitTxt);
        exitBtn.addComponent(Button);
        exitBtn.on(Node.EventType.TOUCH_END, () => {
            this.onExitGame();
        }, this);

        const settingsBtn = this.createRectNode('SettingsBtn', '#efe6c8', bottomBtnWidth, 52, 26);
        settingsBtn.setPosition(bottomBtnWidth / 2 + 6, bottomBtnY, 0);
        canvas.addChild(settingsBtn);
        const settingsTxt = this.createLabelNode('SettingsTxt', '⚙ 系统设置', 18, '#44493f', true);
        settingsBtn.addChild(settingsTxt);
        settingsBtn.addComponent(Button);
        settingsBtn.on(Node.EventType.TOUCH_END, () => {
            this.onSettingsGame();
        }, this);
    }

    private onStartGame() {
        console.log('Start Game Clicked!');
        this.node.emit('start-game');
    }

    private onExitGame() {
        console.log('Exit Clicked!');
        this.node.emit('exit-game');
    }

    private onSettingsGame() {
        console.log('Settings Clicked!');
        this.node.emit('settings-game');
    }

    // --- Helper functions to construct UI from code ---
    private createRectNode(name: string, hexColor: string, w: number, h: number, radius: number = 0, alpha: number = 255): Node {
        const node = new Node(name);
        node.layer = 33554432;
        const uiTrans = node.addComponent(UITransform);
        uiTrans.width = w;
        uiTrans.height = h;
        
        const g = node.addComponent(Graphics);
        const color = new Color();
        Color.fromHEX(color, hexColor);
        color.a = alpha;
        g.fillColor = color;
        
        if (radius > 0) {
            g.roundRect(-w/2, -h/2, w, h, radius);
        } else {
            g.rect(-w/2, -h/2, w, h);
        }
        g.fill();
        return node;
    }

    private createCircleNode(name: string, hexColor: string, radius: number, alpha: number = 255): Node {
        const node = new Node(name);
        node.layer = 33554432;
        const uiTrans = node.addComponent(UITransform);
        uiTrans.width = radius * 2;
        uiTrans.height = radius * 2;
        
        const g = node.addComponent(Graphics);
        const color = new Color();
        Color.fromHEX(color, hexColor);
        color.a = alpha;
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
