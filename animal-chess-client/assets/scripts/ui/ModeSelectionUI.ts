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

    onLoad() {
        this.buildUI();
    }

    private buildUI() {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;

        const bgNode = new Node('Background');
        bgNode.layer = 33554432;
        const bgTrans = bgNode.addComponent(UITransform);
        bgTrans.setContentSize(cw, ch);
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.sizeMode = 0;
        this.safeLoadSprite('textures/main_menu_bg', bgSprite);
        canvas.addChild(bgNode);

        canvas.addChild(this.createRectNode('BgWash', '#f6ffe8', cw, ch, 0, 36));

        const topBarHeight = 92;
        const topBar = this.createRectNode('TopBar', '#f6ebbf', cw - 24, topBarHeight, 18, 232);
        topBar.setPosition(0, ch / 2 - topBarHeight / 2 - 8, 0);
        canvas.addChild(topBar);

        const backBtn = this.createCircleNode('BackBtn', '#f0dd1b', 42);
        backBtn.setPosition(-cw / 2 + 52, 0, 0);
        topBar.addChild(backBtn);
        const backTxt = this.createLabelNode('BackTxt', '←', 34, '#3f3600', true);
        backBtn.addChild(backTxt);
        backBtn.addComponent(Button);
        backBtn.on(Node.EventType.TOUCH_END, () => {
            this.node.emit('go-back');
        }, this);

        const titleText = this.createLabelNode('Title', '丛林战棋', 30, '#006e1c', true);
        titleText.getComponent(UITransform).setAnchorPoint(0, 0.5);
        titleText.setPosition(-cw / 2 + 92, 0, 0);
        topBar.addChild(titleText);

        const xpPill = this.createRectNode('XPPill', '#4caf50', 190, 58, 29);
        xpPill.setPosition(cw / 2 - 88, 0, 0);
        topBar.addChild(xpPill);
        const xpTxt = this.createLabelNode('XPTxt', '★ XP: 1250', 24, '#ffffff', true);
        xpPill.addChild(xpTxt);

        const cardW = Math.min(cw * 0.96, 600);
        const cardH = 360;
        const cardSpacing = 26;
        const centerY = -(topBarHeight + 16) / 2;
        const card1Y = isPortrait ? centerY + cardH + cardSpacing : 60;
        const card2Y = isPortrait ? centerY : 60 - cardH - cardSpacing;
        const card3Y = isPortrait ? centerY - cardH - cardSpacing : 60 - (cardH + cardSpacing) * 2;

        const localCard = this.createCardNode(
            'LocalDuoCard',
            cardW,
            cardH,
            '本地双人',
            '#006e1c',
            '开始',
            '#006e1c',
            '#003c0b',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuCoeEhEZaC_DfUgAXt1ab-i9zRiU-DvfOgHKy3aLc8Zs4V0IbYuiqD35YImv4A4E4OsC3xRbHBreYAYRrfD7MJoFBxuOWO-E8AQT3RW3vOhEdtR5dIH_EwtinFLcBFkUeYTABc0O_HB90i9CKs787onGK8E8FB__ekbbBBIu5-Xsq6QlnfuUEuSqkr-W6VO30-dinFJBxNNK2YzJgOWQ_tMsfCjeF-kFFtbhniYjt6aHm-0A_ZVejrCW5_LA9FUO6NYsaY-kJFaYj0q',
            () => {
                this.node.emit('start-local-duo');
            }
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
            'https://lh3.googleusercontent.com/aida-public/AB6AXuANuDlw9HOKO7qbK4FeWshclBuxOpWziVWodNFu7PqI4t6wyAt2QGrGfYIQ7rAzLOZbxUc3MaB6XU5XkbD3HIFjTibd9pghs5ZBGw3rGNRXxWXJf3oZ0xwovpIlMvjOkUwWCtAxHhAEGf4hUK-fTRdjYbVc0Yd0v1n4nzjNug6HXxw1y7EzfwmHoq_ID72sx-uomDJd2GbOrjXvkWns8WRcUSGu48FSGpMLt7BLvBoblE6Po6Po44xlDEW_wvP3fdrSu2--3v48TZiA',
            () => {
                this.showDifficultyDialog();
            }
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
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDoqf3HzVTw4mkBDJ1pjYsgQ9khFAweITEL_ko4JVNeHnhACu7luiAjWijBSBiOXzO9tT4wgyAxYhZVGJ8cbcjlMQ7o0HeRxkFpLah7QOD6u_yxWUsVALKDAx4EG-z6iCLcY2H2Mvht4RbSk4_Zl4RAQ3gUQQQckOUu7Jgq-YVVfTOh48difTwKf3MM_YR8VDcPstOaIs6Zwpaungz8eOtmzJozV9QjL1IE5MTJUJVbjeOA_zAGHMPhTdPg0ojKCRAfof5PtP3rnhYn',
            () => {
                this.showToast('房间对局暂未开放，敬请期待！');
            }
        );
        roomCard.setPosition(0, card3Y, 0);
        canvas.addChild(roomCard);
    }

    private createCardNode(name: string, w: number, h: number, title: string, titleColor: string, btnText: string, btnColor: string, btnShadowColor: string, imgUrl: string, onClick: () => void): Node {
        const card = this.createRectNode(name, '#ffffff', w, h, 24);

        const imgNode = new Node('Illustration');
        imgNode.layer = 33554432;
        const imgTrans = imgNode.addComponent(UITransform);
        imgTrans.setContentSize(200, 200);
        const sprite = imgNode.addComponent(Sprite);
        sprite.sizeMode = 0;
        imgNode.setPosition(0, h / 2 - 106, 0);
        card.addChild(imgNode);
        this.loadRemoteImage(imgUrl, sprite);

        const label = this.createLabelNode('Title', title, 30, titleColor, true);
        label.setPosition(0, h / 2 - 230, 0);
        card.addChild(label);

        const btnW = w - 24;
        const btnH = 102;
        const shadow = this.createRectNode('BtnShadow', btnShadowColor, btnW, btnH, 44);
        shadow.setPosition(0, -h / 2 + 50, 0);
        card.addChild(shadow);

        const btn = this.createRectNode('ActionBtn', btnColor, btnW, btnH, 44);
        btn.setPosition(0, -h / 2 + 54, 0);
        card.addChild(btn);

        const btnTxt = this.createLabelNode('BtnTxt', btnText, 30, '#ffffff', true);
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

        if (!this.difficultyDialog) {
            this.difficultyStates.clear();

            this.difficultyDialog = new Node('DifficultyDialog');
            this.difficultyDialog.layer = 33554432;
            this.difficultyDialog.addComponent(UITransform).setContentSize(cw, ch);
            canvas.addChild(this.difficultyDialog);

            const mask = this.createRectNode('Mask', '#000000', cw, ch, 0, 150);
            mask.addComponent(Button);
            mask.on(Node.EventType.TOUCH_END, () => this.hideDifficultyDialog(), this);
            this.difficultyDialog.addChild(mask);

            const dialogW = Math.min(cw * 0.88, 520);
            const dialogH = Math.min(ch * 0.76, 680);
            const dialog = this.createRectNode('Dialog', '#fff8df', dialogW, dialogH, 34);
            dialog.name = 'DialogNode';
            this.difficultyDialog.addChild(dialog);

            const closeBtn = this.createCircleNode('CloseBtn', '#d63a2f', 20);
            closeBtn.setPosition(dialogW / 2 - 24, dialogH / 2 - 24, 0);
            dialog.addChild(closeBtn);
            const closeTxt = this.createLabelNode('CloseTxt', '×', 32, '#ffffff', true);
            closeBtn.addChild(closeTxt);
            closeBtn.addComponent(Button);
            closeBtn.on(Node.EventType.TOUCH_END, () => this.hideDifficultyDialog(), this);

            const title = this.createLabelNode('Title', '选择难度', 34, '#148437', true);
            title.setPosition(0, dialogH / 2 - 52, 0);
            dialog.addChild(title);

            const subtitle = this.createLabelNode('Subtitle', '请选择合适的对手强度开始挑战', 15, '#9a8d5d', false);
            subtitle.setPosition(0, dialogH / 2 - 84, 0);
            dialog.addChild(subtitle);

            const optionW = dialogW - 44;
            const optionH = 82;
            const optionGap = 14;
            const firstY = dialogH / 2 - 156;

            const easyNode = this.createDifficultyOption(optionW, optionH, '简单', '适合新手', '#5bc16f');
            easyNode.setPosition(0, firstY, 0);
            dialog.addChild(easyNode);

            const normalNode = this.createDifficultyOption(optionW, optionH, '中等', '推荐默认', '#e0a13a');
            normalNode.setPosition(0, firstY - optionH - optionGap, 0);
            dialog.addChild(normalNode);

            const hardNode = this.createDifficultyOption(optionW, optionH, '困难', '更强的挑战', '#ef6666');
            hardNode.setPosition(0, firstY - (optionH + optionGap) * 2, 0);
            dialog.addChild(hardNode);

            const startBtn = this.createRectNode('StartBtn', '#0f7f34', dialogW - 64, 68, 30);
            startBtn.setPosition(0, -dialogH / 2 + 102, 0);
            dialog.addChild(startBtn);
            const startTxt = this.createLabelNode('StartTxt', '开始挑战', 26, '#ffffff', true);
            startBtn.addChild(startTxt);
            startBtn.addComponent(Button);
            startBtn.on(Node.EventType.TOUCH_END, () => {
                const difficulty = this.selectedDifficulty;
                this.hideDifficultyDialog();
                this.node.emit('start-ai-practice', difficulty);
            }, this);

            const cancelTxt = this.createLabelNode('CancelTxt', '取消', 16, '#8f8a76', false);
            cancelTxt.setPosition(0, -dialogH / 2 + 32, 0);
            dialog.addChild(cancelTxt);

            this.registerDifficultyState(easyNode, 'easy', '#5bc16f');
            this.registerDifficultyState(normalNode, 'normal', '#e0a13a');
            this.registerDifficultyState(hardNode, 'hard', '#ef6666');
        } else {
            this.difficultyDialog.getComponent(UITransform)!.setContentSize(cw, ch);
            const mask = this.difficultyDialog.getChildByName('Mask');
            if (mask) {
                mask.getComponent(UITransform)!.setContentSize(cw, ch);
            }
        }

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

    private createDifficultyOption(w: number, h: number, mainText: string, subText: string, accentHex: string): Node {
        const option = new Node('DifficultyOption');
        option.layer = 33554432;
        const trans = option.addComponent(UITransform);
        trans.setContentSize(w, h);

        const shadow = this.createRectNode('Shadow', '#7f622a', w - 2, h - 2, 20, 36);
        shadow.setPosition(0, -2, 0);
        option.addChild(shadow);

        const bg = this.createRectNode('Bg', '#ffffff', w, h, 20, 248);
        option.addChild(bg);

        const accentBar = this.createRectNode('Accent', accentHex, 8, h - 20, 4, 210);
        accentBar.setPosition(-w / 2 + 18, 0, 0);
        option.addChild(accentBar);

        const badge = this.createCircleNode('Badge', accentHex, 18, 220);
        badge.setPosition(-w / 2 + 54, 0, 0);
        option.addChild(badge);
        const badgeText = this.createLabelNode('BadgeText', mainText.charAt(0), 20, '#ffffff', true);
        badge.addChild(badgeText);

        const mainLabel = this.createLabelNode('MainLabel', mainText, 22, '#66572d', true);
        mainLabel.getComponent(UITransform).setAnchorPoint(0, 0.5);
        mainLabel.setPosition(-w / 2 + 82, 12, 0);
        option.addChild(mainLabel);

        const subLabel = this.createLabelNode('SubLabel', subText, 14, '#9f9276', false);
        subLabel.getComponent(UITransform).setAnchorPoint(0, 0.5);
        subLabel.setPosition(-w / 2 + 82, -18, 0);
        option.addChild(subLabel);

        const dotOuter = this.createCircleNode('Dot', accentHex, 14);
        dotOuter.setPosition(w / 2 - 34, 0, 0);
        option.addChild(dotOuter);

        const dotCover = this.createCircleNode('DotCover', '#fff8df', 10);
        dotOuter.addChild(dotCover);

        const dotInner = this.createCircleNode('DotInner', accentHex, 6);
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
        this.toastNode = new Node('Toast');
        this.toastNode.layer = 33554432;
        const trans = this.toastNode.addComponent(UITransform);
        trans.setContentSize(260, 48);
        this.toastNode.setPosition(0, -100, 0);
        canvas.addChild(this.toastNode);

        const opacity = this.toastNode.addComponent(UIOpacity);
        opacity.opacity = 0;

        const bg = this.createRectNode('Bg', '#000000', 260, 48, 12, 190);
        this.toastNode.addChild(bg);

        const txt = this.createLabelNode('Label', text, 14, '#ffffff', true);
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
            .by(1.65, { position: new Vec3(0, 50, 0) })
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
