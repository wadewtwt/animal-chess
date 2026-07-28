import { _decorator, Component, Node, Label, Color, UITransform, Graphics, Vec3, tween, Button, resources, SpriteFrame, Sprite, Texture2D, ImageAsset, assetManager, UIOpacity, sys } from 'cc';
import { AudioSynth } from '../utils/AudioSynth';
import { getMatchDuration, getMatchStatusText } from './MatchmakingConfig';
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
    private matchmakingDialog: Node | null = null;
    private matchmakingStatusLabel: Label | null = null;
    private matchmakingElapsedLabel: Label | null = null;
    private matchmakingElapsedSeconds = 0;
    private matchmakingDurationSeconds = 0;

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
        this.safeLoadSprite('textures/main_menu_bg', bgSprite, false);
        canvas.addChild(bgNode);

        const bgWash = this.createRectNode('BgWash', '#f6ffe8', cw, ch, 0, 36);
        canvas.addChild(bgWash);

        // 森林微光特效粒子层 (加在背景 wash 层之上，卡片及 UI 之下)
        if (sys.localStorage.getItem('jungle_effects_enabled') !== 'false') {
            this.createForestFireflies(canvas, scaleFactor);
        }

        // 1. 顶栏 (自适应放大)
        const topBarHeight = 92 * scaleFactor;
        const topBar = this.createRectNode('TopBar', '#f6ebbf', cw - 24 * scaleFactor, topBarHeight, 18 * scaleFactor, 232);
        topBar.setPosition(0, ch / 2 - topBarHeight / 2 - 8 * scaleFactor, 0);
        canvas.addChild(topBar);

        const backBtn = this.createUnifiedBackBtn(() => {
            this.node.emit('go-back');
        }, scaleFactor);
        backBtn.setPosition(-cw / 2 + 56 * scaleFactor, 0, 0);
        topBar.addChild(backBtn);



        const xpPill = this.createRectNode('XPPill', '#4caf50', 190 * scaleFactor, 58 * scaleFactor, 29 * scaleFactor);
        xpPill.setPosition(cw / 2 - 108 * scaleFactor, 0, 0);
        topBar.addChild(xpPill);
        const xpTxt = this.createLabelNode('XPTxt', 'XP 1250', 24 * scaleFactor, '#ffffff', true);
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
            '练习',
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

        const onlineMatchCard = this.createCardNode(
            'OnlineMatchCard',
            cardW,
            cardH,
            '在线匹配',
            '#185f99',
            '开始匹配',
            '#1976b9',
            '#0d436f',
            'textures/mode_online_battle',
            () => {
                this.showMatchmakingDialog();
            },
            scaleFactor
        );
        onlineMatchCard.setPosition(0, card3Y, 0);
        canvas.addChild(onlineMatchCard);
    }

    private createCardNode(name: string, w: number, h: number, title: string, titleColor: string, btnText: string, btnColor: string, btnShadowColor: string, imgUrl: string, onClick: () => void, scaleFactor: number): Node {
        // 创建整张卡片的基础容器 (空节点)
        const cardContainer = new Node(name);
        cardContainer.layer = 33554432;
        const cTrans = cardContainer.addComponent(UITransform);
        cTrans.setContentSize(w, h);

        const r = 24 * scaleFactor;

        // 1. 卡片底座投影 (强化：偏移 8 * scaleFactor，透明度提升至 80)
        const shadow = new Node("CardShadow");
        shadow.layer = 33554432;
        shadow.addComponent(UITransform).setContentSize(w, h);
        const sg = shadow.addComponent(Graphics);
        sg.fillColor = new Color(30, 25, 10, 80); 
        sg.roundRect(-w/2, -h/2, w, h, r);
        sg.fill();
        shadow.setPosition(0, -8 * scaleFactor, 0);
        cardContainer.addChild(shadow);

        // 2. 卡片主体底图
        const cardBg = new Node("CardBg");
        cardBg.layer = 33554432;
        cardBg.addComponent(UITransform).setContentSize(w, h);
        const bgG = cardBg.addComponent(Graphics);

        // 填充暖象牙米白色底
        bgG.fillColor = new Color(250, 248, 240, 255); // #faf8f0
        bgG.roundRect(-w/2, -h/2, w, h, r);
        bgG.fill();

        // 强化：加粗燕麦色外线描边 (粗度提升至 3.5，色调加深)
        bgG.lineWidth = 3.5 * scaleFactor;
        bgG.strokeColor = new Color(215, 205, 185, 255); 
        bgG.roundRect(-w/2, -h/2, w, h, r);
        bgG.stroke();

        // 强化：同心叶圆弧不透明度由 12 提到 28，粗度由 10 提到 12
        bgG.strokeColor = new Color(76, 175, 80, 28); 
        bgG.lineWidth = 12 * scaleFactor;
        bgG.circle(-w/2 + 20 * scaleFactor, h/2 - 20 * scaleFactor, 60 * scaleFactor);
        bgG.stroke();
        bgG.circle(w/2 - 30 * scaleFactor, -h/2 + 30 * scaleFactor, 45 * scaleFactor);
        bgG.stroke();

        cardContainer.addChild(cardBg);

        // 3. 插画底下手办式暗投影座 (强化：透明度由 24 提到 64，变为更明显的深褐色投影)
        const baseShadow = new Node("BaseShadow");
        baseShadow.layer = 33554432;
        baseShadow.addComponent(UITransform).setContentSize(160 * scaleFactor, 26 * scaleFactor);
        const bsg = baseShadow.addComponent(Graphics);
        bsg.fillColor = new Color(30, 25, 10, 64); 
        bsg.ellipse(0, 0, 80 * scaleFactor, 13 * scaleFactor);
        bsg.fill();
        baseShadow.setPosition(0, h / 2 - 190 * scaleFactor, 0); 
        cardContainer.addChild(baseShadow);

        // 4. 插画图
        const imgNode = new Node('Illustration');
        imgNode.layer = 33554432;
        const imgTrans = imgNode.addComponent(UITransform);
        imgTrans.setContentSize(200 * scaleFactor, 200 * scaleFactor);
        const sprite = imgNode.addComponent(Sprite);
        sprite.sizeMode = 0;
        imgNode.setPosition(0, h / 2 - 110 * scaleFactor, 0);
        cardContainer.addChild(imgNode);
        this.safeLoadSprite(imgUrl, sprite);

        // 5. 标题文本
        const label = this.createLabelNode('Title', title, 32 * scaleFactor, '#3e3012', true); 
        label.setPosition(0, h / 2 - 245 * scaleFactor, 0);
        cardContainer.addChild(label);

        // 6. 立体 ActionBtn 按钮创建
        const btnW = w - 48 * scaleFactor;
        const btnH = 80 * scaleFactor;
        const btnRadius = 40 * scaleFactor;

        // 按钮底投影 (偏移 5 * scaleFactor，暗度提升)
        const btnShadow = new Node("BtnShadow");
        btnShadow.layer = 33554432;
        btnShadow.addComponent(UITransform).setContentSize(btnW, btnH);
        const bShadowG = btnShadow.addComponent(Graphics);
        const shadowColor = new Color();
        Color.fromHEX(shadowColor, btnShadowColor);
        shadowColor.a = 230; 
        bShadowG.fillColor = shadowColor;
        bShadowG.roundRect(-btnW/2, -btnH/2, btnW, btnH, btnRadius);
        bShadowG.fill();
        btnShadow.setPosition(0, -h / 2 + 41 * scaleFactor, 0);
        cardContainer.addChild(btnShadow);

        // 按钮主体
        const btn = new Node("ActionBtn");
        btn.layer = 33554432;
        btn.addComponent(UITransform).setContentSize(btnW, btnH);
        const btnG = btn.addComponent(Graphics);
        const mainColor = new Color();
        Color.fromHEX(mainColor, btnColor);
        
        btnG.fillColor = mainColor;
        btnG.roundRect(-btnW/2, -btnH/2, btnW, btnH, btnRadius);
        btnG.fill();

        // 按钮上边缘亮色内高光
        btnG.lineWidth = 2 * scaleFactor;
        btnG.strokeColor = new Color(255, 255, 255, 120); 
        btnG.arc(0, 0, btnRadius - 1 * scaleFactor, 0.1 * Math.PI, 0.9 * Math.PI, false);
        btnG.stroke();

        btn.setPosition(0, -h / 2 + 46 * scaleFactor, 0);
        cardContainer.addChild(btn);

        const btnTxt = this.createLabelNode('BtnTxt', btnText, 28 * scaleFactor, '#ffffff', true);
        btn.addChild(btnTxt);

        // 7. 为彩色动作按钮绑定点击与下压微动反馈 (卡片本身没有任何点击效果)
        btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_START, () => {
            // 按钮本身产生超强下压和形变 (缩放至 0.94，并且下移 4 * scaleFactor 像素)
            btn.setScale(new Vec3(0.94, 0.94, 1.0));
            btn.setPosition(new Vec3(0, -h / 2 + 42 * scaleFactor, 0));
        }, this);
        
        btn.on(Node.EventType.TOUCH_END, () => {
            btn.setScale(new Vec3(1.0, 1.0, 1.0));
            btn.setPosition(new Vec3(0, -h / 2 + 46 * scaleFactor, 0));
            AudioSynth.playClick();
            onClick();
        }, this);

        btn.on(Node.EventType.TOUCH_CANCEL, () => {
            btn.setScale(new Vec3(1.0, 1.0, 1.0));
            btn.setPosition(new Vec3(0, -h / 2 + 46 * scaleFactor, 0));
        }, this);
        
        cardContainer.on(Node.EventType.TOUCH_CANCEL, () => {
            // 取消按压时也全部弹回常态初始参数
            cardContainer.setScale(new Vec3(1.0, 1.0, 1.0));
            shadow.setPosition(new Vec3(0, -8 * scaleFactor, 0));
            btn.setPosition(0, -h / 2 + 46 * scaleFactor, 0);
            imgNode.setPosition(new Vec3(0, h / 2 - 110 * scaleFactor, 0));
            baseShadow.setScale(new Vec3(1.0, 1.0, 1.0));
        }, this);

        return cardContainer;
    }

    private showDifficultyDialog() {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.max(0.62, Math.min(cw / refW, ch / refH));

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
        const closeTrans = closeBtn.getComponent(UITransform);
        if (closeTrans) {
            closeTrans.setContentSize(80, 80);
        }
        closeBtn.setPosition(dialogW / 2 - 32 * scaleFactor, dialogH / 2 - 32 * scaleFactor, 0);
        dialog.addChild(closeBtn);
        const closeTxt = this.createLabelNode('CloseTxt', '×', 32 * scaleFactor, '#ffffff', true);
        closeBtn.addChild(closeTxt);
        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            this.hideDifficultyDialog();
        }, this);

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
            AudioSynth.playClick();
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
            AudioSynth.playClick();
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

    private showMatchmakingDialog(): void {
        if (this.matchmakingDialog && this.matchmakingDialog.isValid) {
            return;
        }

        const canvas = this.node;
        const canvasTransform = canvas.getComponent(UITransform);
        if (!canvasTransform) {
            console.warn('无法创建匹配界面：缺少 UITransform。');
            return;
        }

        const cw = canvasTransform.width;
        const ch = canvasTransform.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.max(0.62, Math.min(cw / refW, ch / refH));
        const dialogW = Math.min(cw * 0.88, 580 * scaleFactor);
        const dialogH = Math.min(ch * 0.72, 590 * scaleFactor);

        this.matchmakingDialog = new Node('MatchmakingDialog');
        this.matchmakingDialog.layer = 33554432;
        this.matchmakingDialog.addComponent(UITransform).setContentSize(cw, ch);
        canvas.addChild(this.matchmakingDialog);

        const mask = this.createRectNode('Mask', '#092314', cw, ch, 0, 188);
        this.matchmakingDialog.addChild(mask);

        const panelShadow = this.createRectNode('PanelShadow', '#203316', dialogW, dialogH, 30 * scaleFactor, 105);
        panelShadow.setPosition(0, -8 * scaleFactor, 0);
        this.matchmakingDialog.addChild(panelShadow);

        const panel = this.createRectNode('Panel', '#fff8df', dialogW, dialogH, 30 * scaleFactor);
        panel.name = 'MatchPanel';
        this.matchmakingDialog.addChild(panel);

        const title = this.createLabelNode('Title', '正在在线匹配', 36 * scaleFactor, '#146c38', true);
        title.setPosition(0, dialogH / 2 - 62 * scaleFactor, 0);
        panel.addChild(title);

        const subtitle = this.createLabelNode('Subtitle', '正在为你寻找旗鼓相当的对手', 18 * scaleFactor, '#7a765e', false);
        subtitle.setPosition(0, dialogH / 2 - 102 * scaleFactor, 0);
        panel.addChild(subtitle);

        const badge = new Node('MatchPulse');
        badge.layer = 33554432;
        badge.addComponent(UITransform).setContentSize(180 * scaleFactor, 180 * scaleFactor);
        badge.setPosition(0, 42 * scaleFactor, 0);
        panel.addChild(badge);

        const outerRing = badge.addComponent(Graphics);
        outerRing.lineWidth = 12 * scaleFactor;
        outerRing.strokeColor = new Color(180, 224, 150, 255);
        outerRing.circle(0, 0, 72 * scaleFactor);
        outerRing.stroke();

        const inner = this.createCircleNode('Inner', '#4caf50', 56 * scaleFactor);
        badge.addChild(inner);
        const innerText = this.createLabelNode('InnerText', 'VS', 30 * scaleFactor, '#ffffff', true);
        inner.addChild(innerText);

        tween(badge)
            .to(0.72, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' })
            .to(0.72, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();

        const statusNode = this.createLabelNode('Status', '', 25 * scaleFactor, '#31583a', true);
        statusNode.setPosition(0, -104 * scaleFactor, 0);
        panel.addChild(statusNode);
        this.matchmakingStatusLabel = statusNode.getComponent(Label);

        const elapsedNode = this.createLabelNode('Elapsed', '', 18 * scaleFactor, '#9a8d5d', false);
        elapsedNode.setPosition(0, -143 * scaleFactor, 0);
        panel.addChild(elapsedNode);
        this.matchmakingElapsedLabel = elapsedNode.getComponent(Label);

        const cancelShadow = this.createRectNode('CancelShadow', '#7f4400', dialogW - 104 * scaleFactor, 70 * scaleFactor, 35 * scaleFactor, 120);
        cancelShadow.setPosition(0, -dialogH / 2 + 74 * scaleFactor, 0);
        panel.addChild(cancelShadow);

        const cancelButton = this.createRectNode('CancelButton', '#d68118', dialogW - 104 * scaleFactor, 70 * scaleFactor, 35 * scaleFactor);
        cancelButton.setPosition(0, -dialogH / 2 + 78 * scaleFactor, 0);
        panel.addChild(cancelButton);
        cancelButton.addComponent(Button);
        const cancelText = this.createLabelNode('CancelText', '取消匹配', 24 * scaleFactor, '#ffffff', true);
        cancelButton.addChild(cancelText);
        cancelButton.on(Node.EventType.TOUCH_START, () => cancelButton.setScale(new Vec3(0.96, 0.96, 1)), this);
        cancelButton.on(Node.EventType.TOUCH_END, () => {
            cancelButton.setScale(Vec3.ONE);
            AudioSynth.playClick();
            this.hideMatchmakingDialog();
        }, this);
        cancelButton.on(Node.EventType.TOUCH_CANCEL, () => cancelButton.setScale(Vec3.ONE), this);

        this.matchmakingElapsedSeconds = 0;
        this.matchmakingDurationSeconds = getMatchDuration();
        this.updateMatchmakingLabels();
        this.schedule(this.advanceMatchmaking, 1);

        panel.setScale(new Vec3(0.86, 0.86, 1));
        tween(panel)
            .to(0.24, { scale: Vec3.ONE }, { easing: 'backOut' })
            .start();
    }

    private advanceMatchmaking(): void {
        if (!this.matchmakingDialog || !this.matchmakingDialog.isValid) {
            this.unschedule(this.advanceMatchmaking);
            return;
        }

        this.matchmakingElapsedSeconds += 1;
        this.updateMatchmakingLabels();
        if (this.matchmakingElapsedSeconds >= this.matchmakingDurationSeconds) {
            this.finishMatchmaking();
        }
    }

    private updateMatchmakingLabels(): void {
        if (this.matchmakingStatusLabel) {
            this.matchmakingStatusLabel.string = getMatchStatusText(this.matchmakingElapsedSeconds);
        }
        if (this.matchmakingElapsedLabel) {
            this.matchmakingElapsedLabel.string = `已匹配 ${this.matchmakingElapsedSeconds} 秒`;
        }
    }

    private finishMatchmaking(): void {
        this.unschedule(this.advanceMatchmaking);
        if (!this.matchmakingDialog || !this.matchmakingDialog.isValid) {
            return;
        }

        if (this.matchmakingStatusLabel) {
            this.matchmakingStatusLabel.string = '匹配成功，准备开战';
        }
        if (this.matchmakingElapsedLabel) {
            this.matchmakingElapsedLabel.string = '对手已就绪';
        }
        const cancelButton = this.matchmakingDialog.getChildByName('MatchPanel')?.getChildByName('CancelButton');
        if (cancelButton) {
            cancelButton.active = false;
        }
        AudioSynth.playClick();

        this.scheduleOnce(() => {
            if (!this.matchmakingDialog || !this.matchmakingDialog.isValid) {
                return;
            }
            this.matchmakingDialog.destroy();
            this.matchmakingDialog = null;
            this.matchmakingStatusLabel = null;
            this.matchmakingElapsedLabel = null;
            this.node.emit('start-online-match', 'normal');
        }, 0.5);
    }

    private hideMatchmakingDialog(): void {
        this.unschedule(this.advanceMatchmaking);
        const dialog = this.matchmakingDialog;
        this.matchmakingDialog = null;
        this.matchmakingStatusLabel = null;
        this.matchmakingElapsedLabel = null;
        if (!dialog || !dialog.isValid) {
            return;
        }

        const panel = dialog.getChildByName('MatchPanel');
        if (panel) {
            tween(panel)
                .to(0.15, { scale: new Vec3(0.86, 0.86, 1) }, { easing: 'backIn' })
                .call(() => dialog.destroy())
                .start();
            return;
        }
        dialog.destroy();
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
        const scaleFactor = Math.max(0.62, Math.min(cw / refW, ch / refH));
        const toastW = Math.min(cw * 0.82, 460 * scaleFactor);
        const toastH = 60 * scaleFactor;

        this.toastNode = new Node('Toast');
        this.toastNode.layer = 33554432;
        const trans = this.toastNode.addComponent(UITransform);
        trans.setContentSize(toastW, toastH);
        this.toastNode.setPosition(0, -100 * scaleFactor, 0);
        canvas.addChild(this.toastNode);

        const opacity = this.toastNode.addComponent(UIOpacity);
        opacity.opacity = 0;

        const bg = this.createRectNode('Bg', '#000000', toastW, toastH, 15 * scaleFactor, 190);
        this.toastNode.addChild(bg);

        const txt = this.createLabelNode('Label', text, 18 * scaleFactor, '#ffffff', true);
        txt.getComponent(UITransform).setContentSize(toastW - 32 * scaleFactor, toastH);
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

    private createUnifiedBackBtn(onClick: () => void, scaleFactor: number): Node {
        const btn = new Node("BackButton");
        btn.layer = 33554432;
        const trans = btn.addComponent(UITransform);
        trans.setContentSize(80, 80); // 触控热区宽 80x80

        const g = btn.addComponent(Graphics);
        const r = 42 * scaleFactor;

        // 1. 绘制阴影 (偏移 2.5 * scaleFactor)
        const shadowColor = new Color(40, 30, 0, 80); // 深茶色半透明
        g.fillColor = shadowColor;
        g.circle(0, -2.5 * scaleFactor, r);
        g.fill();

        // 2. 绘制主体底色圆 (暖太阳金黄色)
        g.fillColor = new Color(248, 215, 32, 255);
        g.circle(0, 0, r);
        g.fill();

        // 3. 描白框
        g.lineWidth = 2.5 * scaleFactor;
        g.strokeColor = new Color(255, 255, 255, 255);
        g.circle(0, 0, r);
        g.stroke();

        // 4. 绘制高光月牙 (果冻拟物感)
        g.fillColor = new Color(255, 255, 255, 36);
        g.arc(0, 0, r - 1.5 * scaleFactor, 0, Math.PI, false);
        g.lineTo(-(r - 1.5 * scaleFactor), 0);
        g.close();
        g.fill();

        // 5. 绘制极简现代圆角折线箭头 (巧克力茶褐色)
        g.lineWidth = 6 * scaleFactor;
        g.strokeColor = new Color(50, 38, 0, 255);
        g.lineCap = 1; // ROUND
        g.lineJoin = 1; // ROUND

        const arrowLength = 12 * scaleFactor;
        const arrowWidth = 9 * scaleFactor;
        g.moveTo(arrowLength, 0);
        g.lineTo(-arrowLength + 2 * scaleFactor, 0);
        g.stroke();

        g.moveTo(-arrowLength + 2 * scaleFactor + arrowWidth * 0.8, arrowWidth * 0.8);
        g.lineTo(-arrowLength + 2 * scaleFactor, 0);
        g.lineTo(-arrowLength + 2 * scaleFactor + arrowWidth * 0.8, -arrowWidth * 0.8);
        g.stroke();

        btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_START, () => {
            btn.setScale(new Vec3(0.95, 0.95, 1.0));
        }, this);
        btn.on(Node.EventType.TOUCH_END, () => {
            btn.setScale(new Vec3(1.0, 1.0, 1.0));
            AudioSynth.playClick();
            onClick();
        }, this);
        btn.on(Node.EventType.TOUCH_CANCEL, () => {
            btn.setScale(new Vec3(1.0, 1.0, 1.0));
        }, this);

        return btn;
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

    private safeLoadSprite(path: string, sprite: Sprite, adjustSize: boolean = true) {
        resources.load(`${path}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!err && sf) {
                if (sprite && sprite.isValid) {
                    sprite.spriteFrame = sf;
                    if (adjustSize) {
                        this.adjustSpriteSize(sprite, sf.rect.width, sf.rect.height);
                    }
                }
            } else {
                resources.load(path, SpriteFrame, (err2, sf2) => {
                    if (!err2 && sf2) {
                        if (sprite && sprite.isValid) {
                            sprite.spriteFrame = sf2;
                            if (adjustSize) {
                                this.adjustSpriteSize(sprite, sf2.rect.width, sf2.rect.height);
                            }
                        }
                    } else {
                        resources.load(path, Texture2D, (err3, tex) => {
                            if (!err3 && tex) {
                                  if (sprite && sprite.isValid) {
                                      const newSf = new SpriteFrame();
                                      newSf.texture = tex;
                                      sprite.spriteFrame = newSf;
                                      if (adjustSize) {
                                          this.adjustSpriteSize(sprite, tex.width, tex.height);
                                      }
                                  }
                            } else {
                                resources.load(`${path}/texture`, Texture2D, (err4, tex2) => {
                                    if (!err4 && tex2) {
                                        if (sprite && sprite.isValid) {
                                            const newSf = new SpriteFrame();
                                            newSf.texture = tex2;
                                            sprite.spriteFrame = newSf;
                                            if (adjustSize) {
                                                this.adjustSpriteSize(sprite, tex2.width, tex2.height);
                                            }
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
                                                    if (adjustSize) {
                                                        this.adjustSpriteSize(sprite, imgAsset.width, imgAsset.height);
                                                    }
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
        this.unschedule(this.advanceMatchmaking);
        if (this.matchmakingDialog && this.matchmakingDialog.isValid) {
            this.matchmakingDialog.destroy();
            this.matchmakingDialog = null;
        }
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

        // 1. 背景图
        const bgNode = new Node('Background');
        bgNode.layer = 33554432;
        const bgTrans = bgNode.addComponent(UITransform);
        bgTrans.setContentSize(cw, ch);
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.sizeMode = 0;
        this.safeLoadSprite('textures/main_menu_bg', bgSprite, false);
        this.createRoomDialog.addChild(bgNode);

        // 2. 淡绿色水洗层
        const bgWash = this.createRectNode('BgWash', '#f6ffe8', cw, ch, 0, 36);
        this.createRoomDialog.addChild(bgWash);

        // 2. 顶栏 (直接复刻)
        const topBarHeight = 92 * scaleFactor;
        const topBar = this.createRectNode('TopBar', '#f6ebbf', cw - 24 * scaleFactor, topBarHeight, 18 * scaleFactor, 232);
        topBar.setPosition(0, ch / 2 - topBarHeight / 2 - 8 * scaleFactor, 0);
        this.createRoomDialog.addChild(topBar);

        const backBtn = this.createUnifiedBackBtn(() => {
            this.hideCreateRoomDialog();
        }, scaleFactor);
        backBtn.setPosition(-cw / 2 + 56 * scaleFactor, 0, 0);
        topBar.addChild(backBtn);



        const xpPill = this.createRectNode('XPPill', '#e5debd', 170 * scaleFactor, 54 * scaleFactor, 27 * scaleFactor);
        xpPill.setPosition(cw / 2 - 108 * scaleFactor, 0, 0);
        topBar.addChild(xpPill);
        const xpTxt = this.createLabelNode('XPTxt', 'XP 1250', 22 * scaleFactor, '#3f3600', true);
        xpPill.addChild(xpTxt);

        // 房间代码 (产生 6 位数字)
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();

        if (isPortrait) {
            // ================== 竖屏自适应排版 ==================
            // (1) 成功绿色对勾图标
            const checkIcon = new Node('CheckIcon');
            checkIcon.layer = 33554432;
            checkIcon.setPosition(0, ch / 2 - topBarHeight - 180 * scaleFactor, 0);
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

            // (3) 两个按钮 (垂直居中排列，不再有卡片阻挡)
            const btnW = 540 * scaleFactor;
            const btnH = 88 * scaleFactor;
            const btnRadius = btnH / 2;
            const btn1Y = successSubtitle.position.y - 140 * scaleFactor;
            const btn2Y = btn1Y - btnH - 30 * scaleFactor;

            // 复制分享
            const shareShadow = this.createRectNode('ShareShadow', '#7f4400', btnW, btnH, btnRadius, 120);
            shareShadow.setPosition(0, btn1Y - 4 * scaleFactor, 0);
            this.createRoomDialog.addChild(shareShadow);

            const shareBtn = this.createRectNode('ShareBtn', '#d68118', btnW, btnH, btnRadius);
            shareBtn.setPosition(0, btn1Y, 0);
            this.createRoomDialog.addChild(shareBtn);
            const shareTxt = this.createLabelNode('ShareTxt', '复制并分享', 26 * scaleFactor, '#ffffff', true);
            shareBtn.addChild(shareTxt);

            shareBtn.addComponent(Button);
            shareBtn.on(Node.EventType.TOUCH_START, () => { shareBtn.setScale(new Vec3(0.96, 0.96, 1.0)); });
            shareBtn.on(Node.EventType.TOUCH_END, () => {
                shareBtn.setScale(new Vec3(1.0, 1.0, 1.0));
                AudioSynth.playClick();
                this.shareGameRoom(randomCode);
            });
            shareBtn.on(Node.EventType.TOUCH_CANCEL, () => { shareBtn.setScale(new Vec3(1.0, 1.0, 1.0)); });

            // 进入房间
            const enterShadow = this.createRectNode('EnterShadow', '#074f14', btnW, btnH, btnRadius, 120);
            enterShadow.setPosition(0, btn2Y - 4 * scaleFactor, 0);
            this.createRoomDialog.addChild(enterShadow);

            const enterBtn = this.createRectNode('EnterBtn', '#48b85c', btnW, btnH, btnRadius);
            enterBtn.setPosition(0, btn2Y, 0);
            this.createRoomDialog.addChild(enterBtn);
            const enterTxt = this.createLabelNode('EnterTxt', '进入房间', 26 * scaleFactor, '#ffffff', true);
            enterBtn.addChild(enterTxt);

            enterBtn.addComponent(Button);
            enterBtn.on(Node.EventType.TOUCH_START, () => { enterBtn.setScale(new Vec3(0.96, 0.96, 1.0)); });
            enterBtn.on(Node.EventType.TOUCH_END, () => {
                enterBtn.setScale(new Vec3(1.0, 1.0, 1.0));
                AudioSynth.playClick();
                this.showToast("正在连接网络房间对局...");
            });
            enterBtn.on(Node.EventType.TOUCH_CANCEL, () => { enterBtn.setScale(new Vec3(1.0, 1.0, 1.0)); });

        } else {
            // ================== 横屏左右对齐改为居中对称布局 ==================
            // (1) 成功绿色对勾图标
            const checkIcon = new Node('CheckIcon');
            checkIcon.layer = 33554432;
            checkIcon.setPosition(0, ch / 2 - topBarHeight - 110 * scaleFactor, 0);
            this.createRoomDialog.addChild(checkIcon);
            const outerCircle = this.createCircleNode('Outer', '#e3f3e6', 56 * scaleFactor);
            checkIcon.addChild(outerCircle);
            const innerCircle = this.createCircleNode('Inner', '#5bc16f', 44 * scaleFactor);
            checkIcon.addChild(innerCircle);
            const checkMark = this.createLabelNode('CheckMark', '✓', 42 * scaleFactor, '#ffffff', true);
            innerCircle.addChild(checkMark);

            // (2) 成功标题和副标题
            const successTitle = this.createLabelNode('SuccessTitle', '创建房间成功！', 32 * scaleFactor, '#006e1c', true);
            successTitle.setPosition(0, checkIcon.position.y - 86 * scaleFactor, 0);
            this.createRoomDialog.addChild(successTitle);

            const successSubtitle = this.createLabelNode('SuccessSubtitle', '快叫上你的小伙伴一起来战斗吧', 16 * scaleFactor, '#66755c', false);
            successSubtitle.setPosition(0, successTitle.position.y - 36 * scaleFactor, 0);
            this.createRoomDialog.addChild(successSubtitle);

            // (3) 横屏并排按钮 (居中放置，不再有卡片阻挡)
            const btnW = 240 * scaleFactor;
            const btnH = 76 * scaleFactor;
            const btnRadius = btnH / 2;
            const btnY = successSubtitle.position.y - 86 * scaleFactor;

            // 复制分享
            const shareShadow = this.createRectNode('ShareShadow', '#7f4400', btnW, btnH, btnRadius, 120);
            shareShadow.setPosition(-btnW / 2 - 12 * scaleFactor, btnY - 3 * scaleFactor, 0);
            this.createRoomDialog.addChild(shareShadow);

            const shareBtn = this.createRectNode('ShareBtn', '#d68118', btnW, btnH, btnRadius);
            shareBtn.setPosition(-btnW / 2 - 12 * scaleFactor, btnY, 0);
            this.createRoomDialog.addChild(shareBtn);
            const shareTxt = this.createLabelNode('ShareTxt', '复制分享', 18 * scaleFactor, '#ffffff', true);
            shareBtn.addChild(shareTxt);

            shareBtn.addComponent(Button);
            shareBtn.on(Node.EventType.TOUCH_START, () => { shareBtn.setScale(new Vec3(0.96, 0.96, 1.0)); });
            shareBtn.on(Node.EventType.TOUCH_END, () => {
                shareBtn.setScale(new Vec3(1.0, 1.0, 1.0));
                AudioSynth.playClick();
                this.shareGameRoom(randomCode);
            });
            shareBtn.on(Node.EventType.TOUCH_CANCEL, () => { shareBtn.setScale(new Vec3(1.0, 1.0, 1.0)); });

            // 进入房间
            const enterShadow = this.createRectNode('EnterShadow', '#074f14', btnW, btnH, btnRadius, 120);
            enterShadow.setPosition(btnW / 2 + 12 * scaleFactor, btnY - 3 * scaleFactor, 0);
            this.createRoomDialog.addChild(enterShadow);

            const enterBtn = this.createRectNode('EnterBtn', '#48b85c', btnW, btnH, btnRadius);
            enterBtn.setPosition(btnW / 2 + 12 * scaleFactor, btnY, 0);
            this.createRoomDialog.addChild(enterBtn);
            const enterTxt = this.createLabelNode('EnterTxt', '进入房间', 18 * scaleFactor, '#ffffff', true);
            enterBtn.addChild(enterTxt);

            enterBtn.addComponent(Button);
            enterBtn.on(Node.EventType.TOUCH_START, () => { enterBtn.setScale(new Vec3(0.96, 0.96, 1.0)); });
            enterBtn.on(Node.EventType.TOUCH_END, () => {
                enterBtn.setScale(new Vec3(1.0, 1.0, 1.0));
                AudioSynth.playClick();
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

    private copyToClipboard(text: string): boolean {
        if (sys.isBrowser) {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text);
                    return true;
                }
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.top = "0";
                textArea.style.left = "0";
                textArea.style.position = "fixed";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const success = document.execCommand('copy');
                document.body.removeChild(textArea);
                return success;
            } catch (e) {
                console.error("Web copy error:", e);
                return false;
            }
        }

        try {
            if (typeof (sys as any).copyText === "function") {
                (sys as any).copyText(text);
                return true;
            }
        } catch (e) {
            console.warn("Clipboard copy warning:", e);
        }
        return false;
    }

    private createForestFireflies(parent: Node, scaleFactor: number) {
        const uiTrans = parent.getComponent(UITransform);
        if (!uiTrans) return;
        const w = uiTrans.width;
        const h = uiTrans.height;

        const effectNode = new Node('ForestFirefliesLayer');
        effectNode.layer = parent.layer || 33554432;
        effectNode.addComponent(UITransform).setContentSize(w, h);
        parent.addChild(effectNode);
        
        // 保证在背景 wash 层之上，但比其他 UI 元素低
        effectNode.setSiblingIndex(2);

        const particleCount = 14;
        const colors = ['#bbfeb8', '#fff8b3', '#d4ffc7']; // 淡绿、淡金、黄绿

        for (let i = 0; i < particleCount; i++) {
            const particle = new Node(`Firefly_${i}`);
            particle.layer = effectNode.layer;
            particle.addComponent(UITransform);
            const g = particle.addComponent(Graphics);

            const size = (8 + Math.random() * 12) * scaleFactor;
            const colorHex = colors[Math.floor(Math.random() * colors.length)];
            const color = new Color();
            Color.fromHEX(color, colorHex);
            
            // 绘制羽化光斑效果：用多层渐变透明的圆重叠实现
            const baseAlpha = 30 + Math.floor(Math.random() * 50);
            for (let r_step = 3; r_step >= 1; r_step--) {
                color.a = Math.floor(baseAlpha / r_step);
                g.fillColor = color;
                g.circle(0, 0, size * (r_step * 0.45));
                g.fill();
            }

            // 随机初始位置
            const initX = -w / 2 + Math.random() * w;
            const initY = -h / 2 + Math.random() * h;
            particle.setPosition(initX, initY, 0);
            
            const pOpacity = particle.addComponent(UIOpacity);
            pOpacity.opacity = baseAlpha * 2.5;

            effectNode.addChild(particle);

            // 游荡大缓动大循环
            const roam = (node: Node, opacityComp: UIOpacity) => {
                if (!node.isValid || !opacityComp.isValid) return;
                
                const targetX = -w / 2 + Math.random() * w;
                const targetY = -h / 2 + Math.random() * h;
                const duration = 12 + Math.random() * 12;
                const targetOpacity = 50 + Math.floor(Math.random() * 180);

                // 物理横向摆动曲线
                const shakeCount = 3 + Math.floor(Math.random() * 4);
                const currentPos = node.position.clone();
                const stepX = (targetX - currentPos.x) / shakeCount;
                const stepY = (targetY - currentPos.y) / shakeCount;

                const t = tween(node);
                for (let step = 1; step <= shakeCount; step++) {
                    const stepDuration = duration / shakeCount;
                    const nextX = currentPos.x + stepX * step + (Math.random() * 40 - 20) * scaleFactor;
                    const nextY = currentPos.y + stepY * step + (Math.random() * 40 - 20) * scaleFactor;
                    const stepScale = 0.8 + Math.random() * 0.4;
                    
                    t.to(stepDuration, { position: new Vec3(nextX, nextY, 0), scale: new Vec3(stepScale, stepScale, 1) }, { easing: 'sineInOut' });
                }

                t.call(() => {
                    roam(node, opacityComp);
                }).start();

                // 独立控制呼吸闪烁
                tween(opacityComp)
                    .to(duration * 0.4, { opacity: targetOpacity }, { easing: 'sineInOut' })
                    .to(duration * 0.6, { opacity: 20 + Math.random() * 40 }, { easing: 'sineInOut' })
                    .start();
            };

            // 随机延时后开始游荡，错开动作
            this.scheduleOnce(() => {
                roam(particle, pOpacity);
            }, Math.random() * 3.0);
        }
    }

    private shareGameRoom(roomCode: string) {
        const wxObj = (window as any).wx;
        if (typeof wxObj !== 'undefined') {
            try {
                wxObj.shareAppMessage({
                    title: '快来和我进行一局斗兽棋对决吧！房间号：' + roomCode,
                    query: 'room=' + roomCode,
                });
                this.showToast("已发起分享，邀请好友加入！");
                return;
            } catch (e) {
                console.warn("wx.shareAppMessage failed:", e);
            }
        }
        
        if (sys.isBrowser) {
            const shareUrl = window.location.href.split('?')[0] + '?room=' + roomCode;
            const success = this.copyToClipboard(shareUrl);
            if (success) {
                this.showToast("已复制专属对局链接，发送给好友点开即可直接进入对局！");
            } else {
                this.showToast("复制失败，请手动分享房间号: " + roomCode);
            }
        } else {
            this.showToast("房间号: " + roomCode + " 已复制，请发给好友输入加入！");
        }
    }
}
