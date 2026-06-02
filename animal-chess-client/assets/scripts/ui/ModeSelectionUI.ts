import { _decorator, Component, Node, Label, Color, UITransform, Graphics, Vec3, tween, Button, resources, SpriteFrame, Sprite, Texture2D, ImageAsset, assetManager, UIOpacity } from 'cc';
const { ccclass } = _decorator;

type DifficultyKey = 'easy' | 'normal' | 'hard';

interface DifficultyState {
    node: Node;
    mainLabel: Label;
    subLabel: Label;
    dotInner: Node;
    accentColor: Color;
    bgNode: Node;
    shadowNode: Node;
    badgeNode: Node;
}

@ccclass('ModeSelectionUI')
export class ModeSelectionUI extends Component {
    private toastNode: Node | null = null;
    private difficultyDialog: Node | null = null;
    private selectedDifficulty: DifficultyKey = 'normal';
    private difficultyStates: Map<DifficultyKey, DifficultyState> = new Map();
    private createRoomDialog: Node | null = null;

    onLoad() {
        this.buildUI();
    }

    private buildUI() {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;

        // 计算 scaleFactor 自适应系数
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.min(cw / refW, ch / refH);

        const bgNode = new Node('Background');
        bgNode.layer = 33554432;
        const bgTrans = bgNode.addComponent(UITransform);
        bgTrans.setContentSize(cw, ch);
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.sizeMode = 0;
        this.safeLoadSprite('textures/main_menu_bg', bgSprite);
        canvas.addChild(bgNode);

        canvas.addChild(this.createRectNode('BgWash', '#f6ffe8', cw, ch, 0, 36));

        // 1. 顶栏 (自适应放大)
        const topBarHeight = 92 * scaleFactor;
        const topBar = this.createRectNode('TopBar', '#f6ebbf', cw - 24 * scaleFactor, topBarHeight, 18 * scaleFactor, 232);
        topBar.setPosition(0, ch / 2 - topBarHeight / 2 - 8 * scaleFactor, 0);
        canvas.addChild(topBar);

        const backBtn = this.createCircleNode('BackBtn', '#f0dd1b', 42 * scaleFactor);
        backBtn.setPosition(-cw / 2 + 56 * scaleFactor, 0, 0);
        topBar.addChild(backBtn);
        const backTxt = this.createLabelNode('BackTxt', '←', 34 * scaleFactor, '#3f3600', true);
        backBtn.addChild(backTxt);
        backBtn.addComponent(Button);
        backBtn.on(Node.EventType.TOUCH_END, () => {
            this.node.emit('go-back');
        }, this);

        const titleText = this.createLabelNode('Title', '丛林战棋', 30 * scaleFactor, '#006e1c', true);
        titleText.getComponent(UITransform).setAnchorPoint(0, 0.5);
        titleText.setPosition(-cw / 2 + 116 * scaleFactor, 0, 0);
        topBar.addChild(titleText);

        const xpPill = this.createRectNode('XPPill', '#4caf50', 190 * scaleFactor, 58 * scaleFactor, 29 * scaleFactor);
        xpPill.setPosition(cw / 2 - 108 * scaleFactor, 0, 0);
        topBar.addChild(xpPill);
        const xpTxt = this.createLabelNode('XPTxt', '★ XP: 1250', 24 * scaleFactor, '#ffffff', true);
        xpPill.addChild(xpTxt);

        // 2. 卡片自适应尺寸 (高宽及间距放大)
        const cardW = Math.min(cw * 0.96, 620 * scaleFactor);
        const cardH = 380 * scaleFactor;
        const cardSpacing = 26 * scaleFactor;
        const centerY = -(topBarHeight + 16 * scaleFactor) / 2;
        const card1Y = isPortrait ? centerY + cardH + cardSpacing : 60 * scaleFactor;
        const card2Y = isPortrait ? centerY : (60 - cardH - cardSpacing) * scaleFactor;
        const card3Y = isPortrait ? centerY - cardH - cardSpacing : (60 - (cardH + cardSpacing) * 2) * scaleFactor;

        const localCard = this.createCardNode(
            'LocalDuoCard',
            cardW,
            cardH,
            '本地双人',
            '#006e1c',
            '开始',
            '#006e1c',
            '#003c0b',
            'textures/mode_local_duo',
            () => {
                this.node.emit('start-local-duo');
            },
            scaleFactor
        );
        localCard.setPosition(0, card1Y, 0);
        canvas.addChild(localCard);

        const aiCard = this.createCardNode(
            'AIPracticeCard',
            cardW,
            cardH,
            '人机挑战',
            '#8b5000',
            '练习 >',
            '#8b5000',
            '#4d2b00',
            'textures/mode_ai_practice',
            () => {
                this.showDifficultyDialog();
            },
            scaleFactor
        );
        aiCard.setPosition(0, card2Y, 0);
        canvas.addChild(aiCard);

        const roomCard = this.createCardNode(
            'OnlineBattleCard',
            cardW,
            cardH,
            '房间对战',
            '#695f00',
            '进入 >',
            '#695f00',
            '#4f4800',
            'textures/mode_online_battle',
            () => {
                this.showCreateRoomDialog();
            },
            scaleFactor
        );
        roomCard.setPosition(0, card3Y, 0);
        canvas.addChild(roomCard);
    }

    private createCardNode(name: string, w: number, h: number, title: string, titleColor: string, btnText: string, btnColor: string, btnShadowColor: string, imgUrl: string, onClick: () => void, scaleFactor: number): Node {
        const card = this.createRectNode(name, '#ffffff', w, h, 24 * scaleFactor);

        const imgNode = new Node('Illustration');
        imgNode.layer = 33554432;
        const imgTrans = imgNode.addComponent(UITransform);
        imgTrans.setContentSize(220 * scaleFactor, 220 * scaleFactor);
        const sprite = imgNode.addComponent(Sprite);
        sprite.sizeMode = 0;
        imgNode.setPosition(0, h / 2 - 120 * scaleFactor, 0);
        card.addChild(imgNode);
        this.safeLoadSprite(imgUrl, sprite);

        const label = this.createLabelNode('Title', title, 30 * scaleFactor, titleColor, true);
        label.setPosition(0, h / 2 - 250 * scaleFactor, 0);
        card.addChild(label);

        const btnW = w - 40 * scaleFactor;
        const btnH = 84 * scaleFactor;
        const btnRadius = 42 * scaleFactor;
        const shadow = this.createRectNode('BtnShadow', btnShadowColor, btnW, btnH, btnRadius);
        shadow.setPosition(0, -h / 2 + 42 * scaleFactor, 0);
        card.addChild(shadow);

        const btn = this.createRectNode('ActionBtn', btnColor, btnW, btnH, btnRadius);
        btn.setPosition(0, -h / 2 + 46 * scaleFactor, 0);
        card.addChild(btn);

        const btnTxt = this.createLabelNode('BtnTxt', btnText, 28 * scaleFactor, '#ffffff', true);
        btn.addChild(btnTxt);

        btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_START, () => {
            btn.setScale(new Vec3(0.96, 0.96, 1.0));
        });
        btn.on(Node.EventType.TOUCH_END, () => {
            btn.setScale(new Vec3(1.0, 1.0, 1.0));
            onClick();
        });
        btn.on(Node.EventType.TOUCH_CANCEL, () => {
            btn.setScale(new Vec3(1.0, 1.0, 1.0));
        });

        return card;
    }

    private showDifficultyDialog() {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.min(cw / refW, ch / refH);

        // 如果存在则先销毁，确保自适应参数永远最新
        if (this.difficultyDialog) {
            this.difficultyDialog.destroy();
            this.difficultyDialog = null;
        }

        this.difficultyStates.clear();

        this.difficultyDialog = new Node('DifficultyDialog');
        this.difficultyDialog.layer = 33554432;
        this.difficultyDialog.addComponent(UITransform).setContentSize(cw, ch);
        canvas.addChild(this.difficultyDialog);

        const mask = this.createRectNode('Mask', '#000000', cw, ch, 0, 150);
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => this.hideDifficultyDialog(), this);
        this.difficultyDialog.addChild(mask);

        const dialogW = Math.min(cw * 0.88, 580 * scaleFactor);
        const dialogH = Math.min(ch * 0.8, 760 * scaleFactor);
        const dialog = this.createRectNode('Dialog', '#fff8df', dialogW, dialogH, 34 * scaleFactor);
        dialog.name = 'DialogNode';
        this.difficultyDialog.addChild(dialog);

        const closeBtn = this.createCircleNode('CloseBtn', '#d63a2f', 24 * scaleFactor);
        closeBtn.setPosition(dialogW / 2 - 32 * scaleFactor, dialogH / 2 - 32 * scaleFactor, 0);
        dialog.addChild(closeBtn);
        const closeTxt = this.createLabelNode('CloseTxt', '×', 32 * scaleFactor, '#ffffff', true);
        closeBtn.addChild(closeTxt);
        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, () => this.hideDifficultyDialog(), this);

        const title = this.createLabelNode('Title', '选择难度', 36 * scaleFactor, '#148437', true);
        title.setPosition(0, dialogH / 2 - 60 * scaleFactor, 0);
        dialog.addChild(title);

        const subtitle = this.createLabelNode('Subtitle', '请选择合适的对手强度开始挑战', 18 * scaleFactor, '#9a8d5d', false);
        subtitle.setPosition(0, dialogH / 2 - 96 * scaleFactor, 0);
        dialog.addChild(subtitle);

        const optionW = dialogW - 48 * scaleFactor;
        const optionH = 96 * scaleFactor;
        const optionGap = 16 * scaleFactor;
        const firstY = dialogH / 2 - 176 * scaleFactor;

        const easyNode = this.createDifficultyOption(optionW, optionH, '简单', '适合新手', '#5bc16f', scaleFactor);
        easyNode.setPosition(0, firstY, 0);
        dialog.addChild(easyNode);

        const normalNode = this.createDifficultyOption(optionW, optionH, '中等', '推荐默认', '#e0a13a', scaleFactor);
        normalNode.setPosition(0, firstY - optionH - optionGap, 0);
        dialog.addChild(normalNode);

        const hardNode = this.createDifficultyOption(optionW, optionH, '困难', '更强的挑战', '#ef6666', scaleFactor);
        hardNode.setPosition(0, firstY - (optionH + optionGap) * 2, 0);
        dialog.addChild(hardNode);

        const startBtn = this.createRectNode('StartBtn', '#0f7f34', dialogW - 80 * scaleFactor, 80 * scaleFactor, 40 * scaleFactor);
        startBtn.setPosition(0, -dialogH / 2 + 116 * scaleFactor, 0);
        dialog.addChild(startBtn);
        const startTxt = this.createLabelNode('StartTxt', '开始挑战', 28 * scaleFactor, '#ffffff', true);
        startBtn.addChild(startTxt);
        startBtn.addComponent(Button);
        startBtn.on(Node.EventType.TOUCH_END, () => {
            const difficulty = this.selectedDifficulty;
            this.hideDifficultyDialog();
            this.node.emit('start-ai-practice', difficulty);
        }, this);

        const cancelTxt = this.createLabelNode('CancelTxt', '取消', 20 * scaleFactor, '#8f8a76', false);
        cancelTxt.setPosition(0, -dialogH / 2 + 42 * scaleFactor, 0);
        dialog.addChild(cancelTxt);

        this.registerDifficultyState(easyNode, 'easy', '#5bc16f');
        this.registerDifficultyState(normalNode, 'normal', '#e0a13a');
        this.registerDifficultyState(hardNode, 'hard', '#ef6666');

        this.difficultyDialog.active = true;
        const dialogNode = this.difficultyDialog.getChildByName('DialogNode');
        if (dialogNode) {
            dialogNode.setScale(new Vec3(0.82, 0.82, 1.0));
            tween(dialogNode)
                .to(0.25, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
                .start();
        }
        this.refreshDifficultySelection();
    }

    private hideDifficultyDialog() {
        if (!this.difficultyDialog) return;
        const dialogNode = this.difficultyDialog.getChildByName('DialogNode');
        if (dialogNode) {
            tween(dialogNode)
                .to(0.16, { scale: new Vec3(0.82, 0.82, 1.0) }, { easing: 'backIn' })
                .call(() => {
                    if (this.difficultyDialog) {
                        this.difficultyDialog.active = false;
                    }
                })
                .start();
        } else {
            this.difficultyDialog.active = false;
        }
    }

    private createDifficultyOption(w: number, h: number, mainText: string, subText: string, accentHex: string, scaleFactor: number): Node {
        const option = new Node('DifficultyOption');
        option.layer = 33554432;
        const trans = option.addComponent(UITransform);
        trans.setContentSize(w, h);

        const shadow = this.createRectNode('Shadow', '#7f622a', w - 2 * scaleFactor, h - 2 * scaleFactor, 20 * scaleFactor, 36);
        shadow.setPosition(0, -2 * scaleFactor, 0);
        option.addChild(shadow);

        const bg = this.createRectNode('Bg', '#ffffff', w, h, 20 * scaleFactor, 248);
        option.addChild(bg);

        const accentBar = this.createRectNode('Accent', accentHex, 8 * scaleFactor, h - 24 * scaleFactor, 4 * scaleFactor, 210);
        accentBar.setPosition(-w / 2 + 20 * scaleFactor, 0, 0);
        option.addChild(accentBar);

        const badge = this.createCircleNode('Badge', accentHex, 22 * scaleFactor, 220);
        badge.setPosition(-w / 2 + 64 * scaleFactor, 0, 0);
        option.addChild(badge);
        const badgeText = this.createLabelNode('BadgeText', mainText.charAt(0), 24 * scaleFactor, '#ffffff', true);
        badge.addChild(badgeText);

        const mainLabel = this.createLabelNode('MainLabel', mainText, 26 * scaleFactor, '#66572d', true);
        mainLabel.getComponent(UITransform).setAnchorPoint(0, 0.5);
        mainLabel.setPosition(-w / 2 + 98 * scaleFactor, 16 * scaleFactor, 0);
        option.addChild(mainLabel);

        const subLabel = this.createLabelNode('SubLabel', subText, 16 * scaleFactor, '#9f9276', false);
        subLabel.getComponent(UITransform).setAnchorPoint(0, 0.5);
        subLabel.setPosition(-w / 2 + 98 * scaleFactor, -20 * scaleFactor, 0);
        option.addChild(subLabel);

        const dotOuter = this.createCircleNode('Dot', accentHex, 16 * scaleFactor);
        dotOuter.setPosition(w / 2 - 36 * scaleFactor, 0, 0);
        option.addChild(dotOuter);

        const dotCover = this.createCircleNode('DotCover', '#fff8df', 11 * scaleFactor);
        dotOuter.addChild(dotCover);

        const dotInner = this.createCircleNode('DotInner', accentHex, 7 * scaleFactor);
        dotInner.active = false;
        dotCover.addChild(dotInner);

        return option;
    }

    private registerDifficultyState(optionNode: Node, key: DifficultyKey, accentHex: string) {
        const mainLabel = optionNode.getChildByName('MainLabel')!.getComponent(Label)!;
        const subLabel = optionNode.getChildByName('SubLabel')!.getComponent(Label)!;
        const dotInner = optionNode.getChildByName('Dot')!.getChildByName('DotCover')!.getChildByName('DotInner')!;
        const bgNode = optionNode.getChildByName('Bg')!;
        const shadowNode = optionNode.getChildByName('Shadow')!;
        const badgeNode = optionNode.getChildByName('Badge')!;
        const accentColor = new Color();
        Color.fromHEX(accentColor, accentHex);

        this.difficultyStates.set(key, {
            node: optionNode,
            mainLabel,
            subLabel,
            dotInner,
            accentColor,
            bgNode,
            shadowNode,
            badgeNode,
        });

        optionNode.addComponent(Button);
        optionNode.on(Node.EventType.TOUCH_END, () => {
            this.selectedDifficulty = key;
            this.refreshDifficultySelection();
        }, this);
    }

    private refreshDifficultySelection() {
        this.difficultyStates.forEach((state, key) => {
            const selected = key === this.selectedDifficulty;
            state.node.setScale(new Vec3(selected ? 1.03 : 1.0, selected ? 1.03 : 1.0, 1.0));
            state.mainLabel.color = selected ? state.accentColor : new Color(102, 87, 45, 255);
            state.subLabel.color = selected ? new Color(75, 150, 90, 255) : new Color(159, 146, 118, 255);
            state.bgNode.getComponent(Graphics)!.fillColor = selected ? new Color(255, 255, 255, 255) : new Color(255, 255, 255, 248);
            state.shadowNode.getComponent(Graphics)!.fillColor = selected ? new Color(120, 88, 28, 58) : new Color(120, 88, 28, 36);
            state.badgeNode.getComponent(Graphics)!.fillColor = selected ? state.accentColor : new Color(225, 218, 201, 255);
            state.dotInner.active = selected;
        });
    }

    private showToast(text: string) {
        if (this.toastNode && this.toastNode.isValid) {
            this.toastNode.destroy();
        }

        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.min(cw / refW, ch / refH);

        this.toastNode = new Node('Toast');
        this.toastNode.layer = 33554432;
        const trans = this.toastNode.addComponent(UITransform);
        trans.setContentSize(280 * scaleFactor, 60 * scaleFactor);
        this.toastNode.setPosition(0, -100 * scaleFactor, 0);
        canvas.addChild(this.toastNode);

        const opacity = this.toastNode.addComponent(UIOpacity);
        opacity.opacity = 0;

        const bg = this.createRectNode('Bg', '#000000', 280 * scaleFactor, 60 * scaleFactor, 15 * scaleFactor, 190);
        this.toastNode.addChild(bg);

        const txt = this.createLabelNode('Label', text, 18 * scaleFactor, '#ffffff', true);
        this.toastNode.addChild(txt);

        tween(opacity)
            .to(0.15, { opacity: 255 })
            .delay(1.2)
            .to(0.3, { opacity: 0 })
            .call(() => {
                if (this.toastNode && this.toastNode.isValid) {
                    this.toastNode.destroy();
                    this.toastNode = null;
                }
            })
            .start();

        tween(this.toastNode)
            .by(1.65, { position: new Vec3(0, 50 * scaleFactor, 0) })
            .start();
    }

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
            g.roundRect(-w / 2, -h / 2, w, h, radius);
        } else {
            g.rect(-w / 2, -h / 2, w, h);
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

    private getScaleFactor(): number {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        return Math.min(cw / refW, ch / refH);
    }

    private adjustSpriteSize(sprite: Sprite, origW: number, origH: number) {
        if (!sprite || !sprite.isValid) return;
        const uiTrans = sprite.getComponent(UITransform);
        if (uiTrans) {
            const scaleFactor = this.getScaleFactor();
            const maxW = 320 * scaleFactor;
            const maxH = 180 * scaleFactor;
            const scale = Math.min(maxW / origW, maxH / origH);
            uiTrans.setContentSize(origW * scale, origH * scale);
        }
    }

    private safeLoadSprite(path: string, sprite: Sprite) {
        resources.load(`${path}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!err && sf) {
                if (sprite && sprite.isValid) {
                    sprite.spriteFrame = sf;
                    this.adjustSpriteSize(sprite, sf.rect.width, sf.rect.height);
                }
            } else {
                resources.load(path, SpriteFrame, (err2, sf2) => {
                    if (!err2 && sf2) {
                        if (sprite && sprite.isValid) {
                            sprite.spriteFrame = sf2;
                            this.adjustSpriteSize(sprite, sf2.rect.width, sf2.rect.height);
                        }
                    } else {
                        resources.load(path, Texture2D, (err3, tex) => {
                            if (!err3 && tex) {
                                  if (sprite && sprite.isValid) {
                                      const newSf = new SpriteFrame();
                                      newSf.texture = tex;
                                      sprite.spriteFrame = newSf;
                                      this.adjustSpriteSize(sprite, tex.width, tex.height);
                                  }
                            } else {
                                resources.load(`${path}/texture`, Texture2D, (err4, tex2) => {
                                    if (!err4 && tex2) {
                                        if (sprite && sprite.isValid) {
                                            const newSf = new SpriteFrame();
                                            newSf.texture = tex2;
                                            sprite.spriteFrame = newSf;
                                            this.adjustSpriteSize(sprite, tex2.width, tex2.height);
                                        }
                                    } else {
                                        resources.load(path, ImageAsset, (err5, imgAsset) => {
                                            if (!err5 && imgAsset) {
                                                if (sprite && sprite.isValid) {
                                                    const text3 = new Texture2D();
                                                    text3.image = imgAsset;
                                                    const newSf = new SpriteFrame();
                                                    newSf.texture = text3;
                                                    sprite.spriteFrame = newSf;
                                                    this.adjustSpriteSize(sprite, imgAsset.width, imgAsset.height);
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

    onDestroy() {
        if (this.createRoomDialog && this.createRoomDialog.isValid) {
            this.createRoomDialog.destroy();
            this.createRoomDialog = null;
        }
    }

    private showCreateRoomDialog() {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.min(cw / refW, ch / refH);

        if (this.createRoomDialog && this.createRoomDialog.isValid) {
            this.createRoomDialog.destroy();
            this.createRoomDialog = null;
        }

        this.createRoomDialog = new Node('CreateRoomDialog');
        this.createRoomDialog.layer = 33554432; // UI_2D
        this.createRoomDialog.addComponent(UITransform).setContentSize(cw, ch);
        canvas.addChild(this.createRoomDialog);

        // 1. 全屏淡黄色/淡绿色水洗背景
        const bgWash = this.createRectNode('BgWash', '#f6ffe8', cw, ch, 0, 255);
        this.createRoomDialog.addChild(bgWash);

        // 2. 顶栏 (直接复刻)
        const topBarHeight = 92 * scaleFactor;
        const topBar = this.createRectNode('TopBar', '#f6ebbf', cw - 24 * scaleFactor, topBarHeight, 18 * scaleFactor, 232);
        topBar.setPosition(0, ch / 2 - topBarHeight / 2 - 8 * scaleFactor, 0);
        this.createRoomDialog.addChild(topBar);

        const backBtn = this.createCircleNode('BackBtn', '#f0dd1b', 42 * scaleFactor);
        backBtn.setPosition(-cw / 2 + 56 * scaleFactor, 0, 0);
        topBar.addChild(backBtn);
        const backTxt = this.createLabelNode('BackTxt', '←', 34 * scaleFactor, '#3f3600', true);
        backBtn.addChild(backTxt);
        backBtn.addComponent(Button);
        backBtn.on(Node.EventType.TOUCH_END, () => {
            this.hideCreateRoomDialog();
        }, this);

        const titleText = this.createLabelNode('Title', '丛林战棋', 30 * scaleFactor, '#006e1c', true);
        titleText.getComponent(UITransform).setAnchorPoint(0, 0.5);
        titleText.setPosition(-cw / 2 + 116 * scaleFactor, 0, 0);
        topBar.addChild(titleText);

        const xpPill = this.createRectNode('XPPill', '#e5debd', 170 * scaleFactor, 54 * scaleFactor, 27 * scaleFactor);
        xpPill.setPosition(cw / 2 - 108 * scaleFactor, 0, 0);
        topBar.addChild(xpPill);
        const xpTxt = this.createLabelNode('XPTxt', '1,250 🔷', 22 * scaleFactor, '#3f3600', true);
        xpPill.addChild(xpTxt);

        // 房间代码 (产生 6 位数字)
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

        if (isPortrait) {
            // ================== 竖屏自适应排版 ==================
            // (1) 成功绿色对勾图标
            const checkIcon = new Node('CheckIcon');
            checkIcon.layer = 33554432;
            checkIcon.setPosition(0, ch / 2 - topBarHeight - 130 * scaleFactor, 0);
            this.createRoomDialog.addChild(checkIcon);
            const outerCircle = this.createCircleNode('Outer', '#e3f3e6', 70 * scaleFactor);
            checkIcon.addChild(outerCircle);
            const innerCircle = this.createCircleNode('Inner', '#5bc16f', 55 * scaleFactor);
            checkIcon.addChild(innerCircle);
            const checkMark = this.createLabelNode('CheckMark', '✓', 54 * scaleFactor, '#ffffff', true);
            innerCircle.addChild(checkMark);

            // (2) 成功标题
            const successTitle = this.createLabelNode('SuccessTitle', '创建房间成功！', 38 * scaleFactor, '#006e1c', true);
            successTitle.setPosition(0, checkIcon.position.y - 120 * scaleFactor, 0);
            this.createRoomDialog.addChild(successTitle);

            const successSubtitle = this.createLabelNode('SuccessSubtitle', '快叫上你的小伙伴一起来战斗吧', 20 * scaleFactor, '#66755c', false);
            successSubtitle.setPosition(0, successTitle.position.y - 46 * scaleFactor, 0);
            this.createRoomDialog.addChild(successSubtitle);

            // (3) 白色大代码卡片
            const cardW = 520 * scaleFactor;
            const cardH = 290 * scaleFactor;
            const cardY = successSubtitle.position.y - 180 * scaleFactor;

            const cardShadow = this.createRectNode('CardShadow', '#e0dfd5', cardW, cardH, 36 * scaleFactor);
            cardShadow.setPosition(0, cardY - 4 * scaleFactor, 0);
            this.createRoomDialog.addChild(cardShadow);

            const codeCard = this.createRectNode('CodeCard', '#ffffff', cardW, cardH, 36 * scaleFactor);
            codeCard.setPosition(0, cardY, 0);
            this.createRoomDialog.addChild(codeCard);

            const tagNode = this.createRectNode('Tag', '#f5eba9', 160 * scaleFactor, 46 * scaleFactor, 23 * scaleFactor);
            tagNode.setPosition(0, cardH / 2 - 40 * scaleFactor, 0);
            codeCard.addChild(tagNode);
            const tagText = this.createLabelNode('TagText', '房间代码', 20 * scaleFactor, '#7f6f26', true);
            tagNode.addChild(tagText);

            const codeBg = this.createRectNode('CodeBg', '#f1f6f2', cardW - 70 * scaleFactor, 88 * scaleFactor, 26 * scaleFactor);
            codeBg.setPosition(0, 10 * scaleFactor, 0);
            codeCard.addChild(codeBg);
            const codeLabel = this.createLabelNode('CodeText', randomCode, 48 * scaleFactor, '#006e1c', true);
            codeBg.addChild(codeLabel);

            const expireText = this.createLabelNode('ExpireText', '此代码在 15 分钟内有效', 18 * scaleFactor, '#9ca597', false);
            expireText.setPosition(0, -cardH / 2 + 40 * scaleFactor, 0);
            codeCard.addChild(expireText);

            // (4) 两个按钮
            const btnW = 540 * scaleFactor;
            const btnH = 88 * scaleFactor;
            const btnRadius = btnH / 2;
            const btn1Y = cardY - cardH / 2 - 80 * scaleFactor;
            const btn2Y = btn1Y - btnH - 24 * scaleFactor;

            // 复制分享
            const shareShadow = this.createRectNode('ShareShadow', '#7f4400', btnW, btnH, btnRadius, 120);
            shareShadow.setPosition(0, btn1Y - 4 * scaleFactor, 0);
            this.createRoomDialog.addChild(shareShadow);

            const shareBtn = this.createRectNode('ShareBtn', '#d68118', btnW, btnH, btnRadius);
            shareBtn.setPosition(0, btn1Y, 0);
            this.createRoomDialog.addChild(shareBtn);
            const shareTxt = this.createLabelNode('ShareTxt', '☍ 复制并分享', 26 * scaleFactor, '#ffffff', true);
            shareBtn.addChild(shareTxt);

            shareBtn.addComponent(Button);
            shareBtn.on(Node.EventType.TOUCH_START, () => { shareBtn.setScale(new Vec3(0.96, 0.96, 1.0)); });
            shareBtn.on(Node.EventType.TOUCH_END, () => {
                shareBtn.setScale(new Vec3(1.0, 1.0, 1.0));
                sys.copyText(randomCode);
                this.showToast(`复制成功！房间代码: ${randomCode}`);
            });
            shareBtn.on(Node.EventType.TOUCH_CANCEL, () => { shareBtn.setScale(new Vec3(1.0, 1.0, 1.0)); });

            // 进入房间
            const enterShadow = this.createRectNode('EnterShadow', '#074f14', btnW, btnH, btnRadius, 120);
            enterShadow.setPosition(0, btn2Y - 4 * scaleFactor, 0);
            this.createRoomDialog.addChild(enterShadow);

            const enterBtn = this.createRectNode('EnterBtn', '#48b85c', btnW, btnH, btnRadius);
            enterBtn.setPosition(0, btn2Y, 0);
            this.createRoomDialog.addChild(enterBtn);
            const enterTxt = this.createLabelNode('EnterTxt', '➜] 进入房间', 26 * scaleFactor, '#ffffff', true);
            enterBtn.addChild(enterTxt);

            enterBtn.addComponent(Button);
            enterBtn.on(Node.EventType.TOUCH_START, () => { enterBtn.setScale(new Vec3(0.96, 0.96, 1.0)); });
            enterBtn.on(Node.EventType.TOUCH_END, () => {
                enterBtn.setScale(new Vec3(1.0, 1.0, 1.0));
                this.showToast("正在连接网络房间对局...");
            });
            enterBtn.on(Node.EventType.TOUCH_CANCEL, () => { enterBtn.setScale(new Vec3(1.0, 1.0, 1.0)); });

            // (5) 底部小牛蛙
            const frogY = btn2Y - btnH / 2 - 80 * scaleFactor;
            const frogNode = new Node('FrogNode');
            frogNode.layer = 33554432;
            const frogTrans = frogNode.addComponent(UITransform);
            frogTrans.setContentSize(120 * scaleFactor, 120 * scaleFactor);
            const frogSprite = frogNode.addComponent(Sprite);
            frogSprite.sizeMode = 0;
            frogSprite.color = new Color(200, 200, 200, 255);
            frogNode.setPosition(0, frogY, 0);
            this.createRoomDialog.addChild(frogNode);
            this.safeLoadSprite('textures/mode_online_battle', frogSprite);
            
        } else {
            // ================== 横屏左右布局 ==================
            const leftX = -cw / 4;
            const rightX = cw / 4;
            const startY = (ch / 2 - topBarHeight) - 60 * scaleFactor;

            // (1) 左侧：成功绿色对勾图标
            const checkIcon = new Node('CheckIcon');
            checkIcon.layer = 33554432;
            checkIcon.setPosition(leftX, startY - 40 * scaleFactor, 0);
            this.createRoomDialog.addChild(checkIcon);
            const outerCircle = this.createCircleNode('Outer', '#e3f3e6', 56 * scaleFactor);
            checkIcon.addChild(outerCircle);
            const innerCircle = this.createCircleNode('Inner', '#5bc16f', 44 * scaleFactor);
            checkIcon.addChild(innerCircle);
            const checkMark = this.createLabelNode('CheckMark', '✓', 42 * scaleFactor, '#ffffff', true);
            innerCircle.addChild(checkMark);

            // (2) 左侧：成功标题和副标题
            const successTitle = this.createLabelNode('SuccessTitle', '创建房间成功！', 32 * scaleFactor, '#006e1c', true);
            successTitle.setPosition(leftX, checkIcon.position.y - 86 * scaleFactor, 0);
            this.createRoomDialog.addChild(successTitle);

            const successSubtitle = this.createLabelNode('SuccessSubtitle', '快叫上你的小伙伴一起来战斗吧', 16 * scaleFactor, '#66755c', false);
            successSubtitle.setPosition(leftX, successTitle.position.y - 36 * scaleFactor, 0);
            this.createRoomDialog.addChild(successSubtitle);

            // (3) 左侧：底部小牛蛙
            const frogNode = new Node('FrogNode');
            frogNode.layer = 33554432;
            const frogTrans = frogNode.addComponent(UITransform);
            frogTrans.setContentSize(96 * scaleFactor, 96 * scaleFactor);
            const frogSprite = frogNode.addComponent(Sprite);
            frogSprite.sizeMode = 0;
            frogSprite.color = new Color(200, 200, 200, 255);
            frogNode.setPosition(leftX, successSubtitle.position.y - 86 * scaleFactor, 0);
            this.createRoomDialog.addChild(frogNode);
            this.safeLoadSprite('textures/mode_online_battle', frogSprite);

            // 右侧布局
            // (4) 右侧：白色卡片
            const cardW = 460 * scaleFactor;
            const cardH = 220 * scaleFactor;
            const cardY = startY - 20 * scaleFactor;

            const cardShadow = this.createRectNode('CardShadow', '#e0dfd5', cardW, cardH, 24 * scaleFactor);
            cardShadow.setPosition(rightX, cardY - 3 * scaleFactor, 0);
            this.createRoomDialog.addChild(cardShadow);

            const codeCard = this.createRectNode('CodeCard', '#ffffff', cardW, cardH, 24 * scaleFactor);
            codeCard.setPosition(rightX, cardY, 0);
            this.createRoomDialog.addChild(codeCard);

            const tagNode = this.createRectNode('Tag', '#f5eba9', 140 * scaleFactor, 36 * scaleFactor, 18 * scaleFactor);
            tagNode.setPosition(0, cardH / 2 - 28 * scaleFactor, 0);
            codeCard.addChild(tagNode);
            const tagText = this.createLabelNode('TagText', '房间代码', 16 * scaleFactor, '#7f6f26', true);
            tagNode.addChild(tagText);

            const codeBg = this.createRectNode('CodeBg', '#f1f6f2', cardW - 60 * scaleFactor, 72 * scaleFactor, 20 * scaleFactor);
            codeBg.setPosition(0, 4 * scaleFactor, 0);
            codeCard.addChild(codeBg);
            const codeLabel = this.createLabelNode('CodeText', randomCode, 38 * scaleFactor, '#006e1c', true);
            codeBg.addChild(codeLabel);

            const expireText = this.createLabelNode('ExpireText', '此代码在 15 分钟内有效', 14 * scaleFactor, '#9ca597', false);
            expireText.setPosition(0, -cardH / 2 + 28 * scaleFactor, 0);
            codeCard.addChild(expireText);

            // (5) 右侧：下方并排的两个按钮（横屏下并排以节约高度）
            const btnW = cardW / 2 - 12 * scaleFactor;
            const btnH = 76 * scaleFactor;
            const btnRadius = btnH / 2;
            const btnY = cardY - cardH / 2 - 60 * scaleFactor;

            // 复制分享
            const shareShadow = this.createRectNode('ShareShadow', '#7f4400', btnW, btnH, btnRadius, 120);
            shareShadow.setPosition(rightX - btnW / 2 - 12 * scaleFactor, btnY - 3 * scaleFactor, 0);
            this.createRoomDialog.addChild(shareShadow);

            const shareBtn = this.createRectNode('ShareBtn', '#d68118', btnW, btnH, btnRadius);
            shareBtn.setPosition(rightX - btnW / 2 - 12 * scaleFactor, btnY, 0);
            this.createRoomDialog.addChild(shareBtn);
            const shareTxt = this.createLabelNode('ShareTxt', '☍ 复制并分享', 18 * scaleFactor, '#ffffff', true);
            shareBtn.addChild(shareTxt);

            shareBtn.addComponent(Button);
            shareBtn.on(Node.EventType.TOUCH_START, () => { shareBtn.setScale(new Vec3(0.96, 0.96, 1.0)); });
            shareBtn.on(Node.EventType.TOUCH_END, () => {
                shareBtn.setScale(new Vec3(1.0, 1.0, 1.0));
                sys.copyText(randomCode);
                this.showToast(`复制成功！房间代码: ${randomCode}`);
            });
            shareBtn.on(Node.EventType.TOUCH_CANCEL, () => { shareBtn.setScale(new Vec3(1.0, 1.0, 1.0)); });

            // 进入房间
            const enterShadow = this.createRectNode('EnterShadow', '#074f14', btnW, btnH, btnRadius, 120);
            enterShadow.setPosition(rightX + btnW / 2 + 12 * scaleFactor, btnY - 3 * scaleFactor, 0);
            this.createRoomDialog.addChild(enterShadow);

            const enterBtn = this.createRectNode('EnterBtn', '#48b85c', btnW, btnH, btnRadius);
            enterBtn.setPosition(rightX + btnW / 2 + 12 * scaleFactor, btnY, 0);
            this.createRoomDialog.addChild(enterBtn);
            const enterTxt = this.createLabelNode('EnterTxt', '➜] 进入房间', 18 * scaleFactor, '#ffffff', true);
            enterBtn.addChild(enterTxt);

            enterBtn.addComponent(Button);
            enterBtn.on(Node.EventType.TOUCH_START, () => { enterBtn.setScale(new Vec3(0.96, 0.96, 1.0)); });
            enterBtn.on(Node.EventType.TOUCH_END, () => {
                enterBtn.setScale(new Vec3(1.0, 1.0, 1.0));
                this.showToast("正在连接网络房间对局...");
            });
            enterBtn.on(Node.EventType.TOUCH_CANCEL, () => { enterBtn.setScale(new Vec3(1.0, 1.0, 1.0)); });
        }

        // 动画弹出效果
        this.createRoomDialog.active = true;
        this.createRoomDialog.setScale(new Vec3(0.9, 0.9, 1.0));
        tween(this.createRoomDialog)
            .to(0.2, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
            .start();
    }

    private hideCreateRoomDialog() {
        if (!this.createRoomDialog) return;
        const dialogNode = this.createRoomDialog;
        tween(dialogNode)
            .to(0.15, { scale: new Vec3(0.9, 0.9, 1.0) }, { easing: 'backIn' })
            .call(() => {
                if (this.createRoomDialog && this.createRoomDialog.isValid) {
                    this.createRoomDialog.destroy();
                    this.createRoomDialog = null;
                }
            })
            .start();
    }

}
