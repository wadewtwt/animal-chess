import { _decorator, Component, Node, Label, Color, UITransform, Graphics, Vec3, tween, Button, director, resources, SpriteFrame, Sprite, Texture2D, ImageAsset, sys } from 'cc';
const { ccclass } = _decorator;

@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
    
    onLoad() {
        this.buildUI();
    }

    private buildUI() {
        console.log('=== MainMenuUI buildUI V4 ===');
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
        const topBarHeight = 100;
        const topBar = this.createRectNode('TopBar', '#f6ebbf', cw - 24, topBarHeight, 20, 232);
        topBar.setPosition(0, ch / 2 - topBarHeight / 2 - 8, 0);
        canvas.addChild(topBar);

        const avatarNode = this.createCircleNode('Avatar', '#2d2b1f', 36);
        avatarNode.setPosition(-cw / 2 + 76, 0, 0);
        topBar.addChild(avatarNode);

        const nameTxt = this.createLabelNode('Name', '游侠阿提 (Tim)', 24, '#22311c', true);
        nameTxt.getComponent(UITransform).setAnchorPoint(0, 0.5);
        nameTxt.setPosition(-cw / 2 + 130, 18, 0);
        topBar.addChild(nameTxt);

        const levelTxt = this.createLabelNode('Level', '等级 12 · 黄金段位', 18, '#198d2c', true);
        levelTxt.getComponent(UITransform).setAnchorPoint(0, 0.5);
        levelTxt.setPosition(-cw / 2 + 130, -18, 0);
        topBar.addChild(levelTxt);

        const xpPill = this.createRectNode('XPPill', '#efe2af', 200, 56, 28);
        xpPill.setPosition(cw / 2 - 120, 0, 0);
        topBar.addChild(xpPill);
        const xpTxt = this.createLabelNode('XPTxt', '✦ XP: 1250', 24, '#5b4b1c', true);
        xpPill.addChild(xpTxt);

        // 3. Main Emblem
        const isPortrait = ch > cw;
        
        // --- 1. 基于设计分辨率动态计算缩放因子 scaleFactor (实现跨分辨率等比例缩放) ---
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.min(cw / refW, ch / refH);
        
        // --- 2. 动态自适应按钮尺寸及字号 (整体缩小 20%) ---
        const startBtnHeight = (isPortrait ? 190 : 120) * scaleFactor * 0.8;
        const bottomBtnHeight = (isPortrait ? 150 : 90) * scaleFactor * 0.8;
        const bottomBtnRadius = (isPortrait ? 75 : 45) * scaleFactor * 0.8;
        
        let emblemRadius: number;
        let emblemY: number;
        let titleY: number;
        let startBtnY: number;
        let bottomBtnY: number;
        let startBtnWidth: number;

        // 全自适应字号 (字号和图标随按钮同步缩小 20%)
        const titleFontSize = (isPortrait ? 42 : 32) * scaleFactor;
        const subtitleFontSize = (isPortrait ? 18 : 14) * scaleFactor;
        const startBtnFontSize = (isPortrait ? 72 : 46) * scaleFactor * 0.8;
        const bottomBtnFontSize = (isPortrait ? 60 : 36) * scaleFactor * 0.6; // 字体再缩小 25% (相对于原始共缩小 40%)
        const playIconFontSize = (isPortrait ? 57 : 32) * scaleFactor * 0.8;
        const playCircleRadius = (isPortrait ? 63 : 40) * scaleFactor * 0.8;

        if (isPortrait) {
            startBtnWidth = Math.min(cw * 0.96 * 0.8, 760 * scaleFactor * 0.8);
            
            // --- 动态自适应弹性布局系统 (竖屏) ---
            const hBottom = bottomBtnHeight;
            const hStart = startBtnHeight;
            const hTitle = 120 * scaleFactor; // 标题与副标题区域的总物理高度
            
            // 测量垂直可用总高度 (顶部栏下边缘到画布底边缘)
            const topBarMinY = ch / 2 - topBarHeight - 8 * scaleFactor;
            const bottomLimitY = -ch / 2;
            const totalAvailHeight = topBarMinY - bottomLimitY;
            
            // 设定安全固定的组件间距，保证操作区视觉紧凑美观
            const gapMiddle1 = 25 * scaleFactor; // 开始按钮与底部按钮的间距
            const gapMiddle2 = 50 * scaleFactor; // 标题与开始按钮的间距
            
            // 计算剩余可自由分配的弹性空间
            const remainHeight = totalAvailHeight - hBottom - hStart - hTitle - gapMiddle1 - gapMiddle2;
            
            // 将弹性空间按 38% 分配给底部留白（使按钮整体向上移到黄金操作高度），其余分配给徽章区间
            const gapBottom = Math.max(40 * scaleFactor, remainHeight * 0.38);
            const emblemSectionHeight = remainHeight - gapBottom;
            
            // 确定最终徽章半径 (徽章尺寸缩小 25%)
            const targetRadius = Math.floor((emblemSectionHeight - 32 * scaleFactor) / 2);
            const targetMaxRadius = Math.min(cw * 0.48 * 0.75, 368 * scaleFactor * 0.75); // 最大值限制缩小 25%
            emblemRadius = Math.min(targetMaxRadius, targetRadius * 0.75);
            if (emblemRadius < 90 * scaleFactor) emblemRadius = 90 * scaleFactor; // 设定安全底线 (等比缩至 90)
            
            // 依据弹性分配自底向上精算各组件中心 Y 坐标 (防重叠，跨手机自适应)
            bottomBtnY = bottomLimitY + gapBottom + hBottom / 2;
            startBtnY = bottomBtnY + hBottom / 2 + gapMiddle1 + hStart / 2;
            titleY = startBtnY + hStart / 2 + gapMiddle2 + 30 * scaleFactor; // 30 为标题中心偏移量
            
            // 徽章中心 Y 坐标设在标题上边缘和顶部栏下边缘的几何中心，确保对称美观
            const titleTopY = titleY + 30 * scaleFactor;
            emblemY = (titleTopY + topBarMinY) / 2;
        } else {
            // --- 动态自适应弹性布局系统 (横屏) ---
            startBtnWidth = Math.min(cw * 0.76 * 0.8, 720 * scaleFactor * 0.8);
            const hBottom = bottomBtnHeight;
            const hStart = startBtnHeight;
            const hTitle = 60 * scaleFactor; // 横屏下标题区域高度较窄
            
            const topBarMinY = ch / 2 - topBarHeight - 8 * scaleFactor;
            const bottomLimitY = -ch / 2;
            const totalAvailHeight = topBarMinY - bottomLimitY;
            
            const gapMiddle1 = 12 * scaleFactor;
            const gapMiddle2 = 30 * scaleFactor;
            
            const remainHeight = totalAvailHeight - hBottom - hStart - hTitle - gapMiddle1 - gapMiddle2;
            
            // 横屏下底部留白相对紧凑，分配 20% 给底部留白，其余给徽章
            const gapBottom = Math.max(15 * scaleFactor, remainHeight * 0.20);
            const emblemSectionHeight = remainHeight - gapBottom;
            
            // 徽章半径在 130 的基准上缩小 25%，设为 98
            emblemRadius = 98 * scaleFactor;
            
            bottomBtnY = bottomLimitY + gapBottom + hBottom / 2;
            startBtnY = bottomBtnY + hBottom / 2 + gapMiddle1 + hStart / 2;
            titleY = startBtnY + hStart / 2 + gapMiddle2 + 20 * scaleFactor;
            
            const titleTopY = titleY + 22 * scaleFactor;
            emblemY = (titleTopY + topBarMinY) / 2;
        }

        const emblemShadow = this.createCircleNode('EmblemShadow', '#0f2b0f', emblemRadius + 4, 42);
        emblemShadow.setPosition(0, emblemY - 6 * scaleFactor, 0);
        canvas.addChild(emblemShadow);

        const emblemRing = this.createCircleNode('EmblemRing', '#f9e42b', emblemRadius + 16 * scaleFactor);
        emblemRing.setPosition(0, emblemY, 0);
        canvas.addChild(emblemRing);

        const emblemImg = new Node('EmblemImage');
        emblemImg.layer = 33554432;
        const emblemImgTrans = emblemImg.addComponent(UITransform);
        emblemImgTrans.setContentSize(emblemRadius * 2.18, emblemRadius * 2.18);
        const emblemSprite = emblemImg.addComponent(Sprite);
        emblemSprite.sizeMode = 0;
        this.safeLoadSprite('textures/start_emblem', emblemSprite);
        emblemRing.addChild(emblemImg);

        // 4. Title & Subtitle
        const titleText = this.createLabelNode('Title', '丛林战棋', titleFontSize, '#11751e', true);
        titleText.setPosition(0, titleY, 0);
        canvas.addChild(titleText);

        const underline = this.createRectNode('Underline', '#11751e', (isPortrait ? 160 : 120) * scaleFactor, 4 * scaleFactor, 2 * scaleFactor);
        underline.setPosition(0, titleY - (isPortrait ? 26 : 20) * scaleFactor, 0);
        canvas.addChild(underline);

        const subtitleText = this.createLabelNode('Subtitle', '准备好开启你的热带冒险了吗？', subtitleFontSize, '#3f4d33', false);
        subtitleText.setPosition(0, titleY - (isPortrait ? 56 : 42) * scaleFactor, 0);
        canvas.addChild(subtitleText);

        // 5. Start Button
        const startBtnNode = this.createRectNode('StartBtn', '#168f25', startBtnWidth, startBtnHeight, 50 * scaleFactor);
        startBtnNode.setPosition(0, startBtnY, 0);
        canvas.addChild(startBtnNode);

        const startGlow = this.createRectNode('StartGlow', '#4fcc58', startBtnWidth - 28 * scaleFactor, startBtnHeight * 0.3, 36 * scaleFactor, 92);
        startGlow.setPosition(0, startBtnHeight * 0.2, 0);
        startBtnNode.addChild(startGlow);

        const playCircle = this.createCircleNode('PlayCircle', '#f8fff7', playCircleRadius);
        playCircle.setPosition((isPortrait ? -160 : -110) * scaleFactor * 0.8, 0, 0);
        startBtnNode.addChild(playCircle);
        const playIcon = this.createLabelNode('PlayIcon', '▶', playIconFontSize, '#168f25', true);
        playIcon.setPosition((isPortrait ? -160 : -110) * scaleFactor * 0.8, 0, 0);
        startBtnNode.addChild(playIcon);

        const startBtnText = this.createLabelNode('StartTxt', '开始游戏', startBtnFontSize, '#ffffff', true);
        startBtnText.setPosition((isPortrait ? 90 : 60) * scaleFactor * 0.8, 2 * scaleFactor, 0);
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
        const bottomBtnWidth = startBtnWidth / 2 - 24 * scaleFactor;
        const exitBtn = this.createRectNode('ExitBtn', '#f0dd1b', bottomBtnWidth, bottomBtnHeight, bottomBtnRadius);
        exitBtn.setPosition(-bottomBtnWidth / 2 - 11 * scaleFactor, bottomBtnY, 0);
        canvas.addChild(exitBtn);
        const exitTxt = this.createLabelNode('ExitTxt', '↩ 退出', bottomBtnFontSize, '#3f3600', true);
        exitBtn.addChild(exitTxt);
        exitBtn.addComponent(Button);
        exitBtn.on(Node.EventType.TOUCH_END, () => {
            this.onExitGame();
        }, this);

        const settingsBtn = this.createRectNode('SettingsBtn', '#efe6c8', bottomBtnWidth, bottomBtnHeight, bottomBtnRadius);
        settingsBtn.setPosition(bottomBtnWidth / 2 + 11 * scaleFactor, bottomBtnY, 0);
        canvas.addChild(settingsBtn);
        const settingsTxt = this.createLabelNode('SettingsTxt', '⚙ 系统设置', bottomBtnFontSize, '#44493f', true);
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

    private settingsPanel: Node | null = null;
    private musicBtnLabel: Label | null = null;
    private soundBtnLabel: Label | null = null;

    private onSettingsGame() {
        console.log('Settings Clicked!');
        
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;

        if (!this.settingsPanel) {
            // 1. 创建全屏遮罩防穿透
            this.settingsPanel = new Node('SettingsPanel');
            this.settingsPanel.layer = 33554432; // UI_2D
            this.settingsPanel.addComponent(UITransform).setContentSize(cw, ch);
            canvas.addChild(this.settingsPanel);

            // 灰色半透明背景，添加 Button 拦截触摸事件
            const mask = this.createRectNode('Mask', '#000000', cw, ch, 0, 150);
            mask.name = 'Mask';
            mask.addComponent(Button); // 吞噬事件
            this.settingsPanel.addChild(mask);

            // 2. 创建弹窗主体
            const dialogWidth = Math.min(cw * 0.9, 540);
            const dialogHeight = Math.min(ch * 0.66, 620);
            const dialog = this.createRectNode('Dialog', '#efe6c8', dialogWidth, dialogHeight, 32);
            dialog.name = 'DialogNode';
            this.settingsPanel.addChild(dialog);

            // 3. 弹窗标题
            const title = this.createLabelNode('Title', '系统设置', 30, '#11751e', true);
            title.setPosition(0, dialogHeight / 2 - 48, 0);
            dialog.addChild(title);

            // 分割线
            const line = this.createRectNode('Line', '#11751e', dialogWidth - 72, 2, 0, 40);
            line.setPosition(0, dialogHeight / 2 - 78, 0);
            dialog.addChild(line);

            // 4. 背景音乐开关按钮
            const btnWidth = dialogWidth - 56;
            const btnHeight = 72;
            const btnGap = 18;
            const musicBtnY = dialogHeight / 2 - 150;
            const musicBtn = this.createRectNode('MusicBtn', '#f6ebbf', btnWidth, btnHeight, 22);
            musicBtn.setPosition(0, musicBtnY, 0);
            dialog.addChild(musicBtn);

            const musicLabelNode = this.createLabelNode('MusicLabel', '', 22, '#5b4b1c', true);
            this.musicBtnLabel = musicLabelNode.getComponent(Label);
            musicBtn.addChild(musicLabelNode);

            musicBtn.addComponent(Button);
            musicBtn.on(Node.EventType.TOUCH_END, () => {
                let musicOn = sys.localStorage.getItem('jungle_music_enabled') !== 'false';
                musicOn = !musicOn;
                sys.localStorage.setItem('jungle_music_enabled', musicOn ? 'true' : 'false');
                this.updateSettingsUI();
                // 触发音乐开关事件
                this.node.emit('music-toggle', musicOn);
            }, this);

            // 5. 游戏音效开关按钮
            const soundBtn = this.createRectNode('SoundBtn', '#f6ebbf', btnWidth, btnHeight, 22);
            soundBtn.setPosition(0, musicBtnY - btnHeight - btnGap, 0);
            dialog.addChild(soundBtn);

            const soundLabelNode = this.createLabelNode('SoundLabel', '', 22, '#5b4b1c', true);
            this.soundBtnLabel = soundLabelNode.getComponent(Label);
            soundBtn.addChild(soundLabelNode);

            soundBtn.addComponent(Button);
            soundBtn.on(Node.EventType.TOUCH_END, () => {
                let soundOn = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
                soundOn = !soundOn;
                sys.localStorage.setItem('jungle_sound_enabled', soundOn ? 'true' : 'false');
                this.updateSettingsUI();
            }, this);

            // 6. 关闭按钮
            const closeBtn = this.createRectNode('CloseBtn', '#168f25', dialogWidth - 120, 60, 30);
            closeBtn.setPosition(0, -dialogHeight / 2 + 54, 0);
            dialog.addChild(closeBtn);

            const closeTxt = this.createLabelNode('CloseTxt', '确 定', 22, '#ffffff', true);
            closeBtn.addChild(closeTxt);

            closeBtn.addComponent(Button);
            closeBtn.on(Node.EventType.TOUCH_END, () => {
                const dialogNode = this.settingsPanel!.getChildByName('DialogNode');
                if (dialogNode) {
                    tween(dialogNode)
                        .to(0.2, { scale: new Vec3(0.78, 0.78, 1.0) }, { easing: 'backIn' })
                        .call(() => {
                            this.settingsPanel!.active = false;
                        })
                        .start();
                } else {
                    this.settingsPanel!.active = false;
                }
            }, this);
        } else {
            // 同步视口大小以防动态改变分辨率
            this.settingsPanel.getComponent(UITransform)!.setContentSize(cw, ch);
            const mask = this.settingsPanel.getChildByName('Mask');
            if (mask) mask.getComponent(UITransform)!.setContentSize(cw, ch);
        }

        // 显示并执行弹出动画
        this.settingsPanel.active = true;
        this.updateSettingsUI();

        const dialogNode = this.settingsPanel.getChildByName('DialogNode');
        if (dialogNode) {
            dialogNode.setScale(new Vec3(0.78, 0.78, 1.0));
            tween(dialogNode)
                .to(0.3, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
                .start();
        }

        // 同时派发原始事件供外部兼容
        this.node.emit('settings-game');
    }

    private updateSettingsUI() {
        const musicOn = sys.localStorage.getItem('jungle_music_enabled') !== 'false';
        const soundOn = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';

        if (this.musicBtnLabel) {
            this.musicBtnLabel.string = `🎵 背景音乐: ${musicOn ? '🔊 开启' : '🔇 关闭'}`;
        }
        if (this.soundBtnLabel) {
            this.soundBtnLabel.string = `🔊 游戏音效: ${soundOn ? '🔊 开启' : '🔇 关闭'}`;
        }
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
