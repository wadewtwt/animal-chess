import { _decorator, Component, Node, Label, Color, UITransform, Graphics, Vec3, tween, Tween, Button, resources, SpriteFrame, Sprite, Texture2D, ImageAsset, assetManager, UIOpacity, sys, EditBox } from 'cc';
import { AudioSynth } from '../utils/AudioSynth';
import { NetworkManager } from '../utils/NetworkManager';
import { WxShareUtil } from '../utils/WxShareUtil';
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
    private roomActionDialog: Node | null = null;
    private joinRoomDialog: Node | null = null;
    private currentInputCode: string = '';
    private inputGridLabels: Label[] = [];
    private matchmakingDialog: Node | null = null;
    private matchmakingStatusLabel: Label | null = null;
    private matchmakingElapsedLabel: Label | null = null;
    private matchmakingElapsedSeconds = 0;
    private matchmakingDurationSeconds = 0;
    private joinRoomEditBox: EditBox | null = null;
    private isJoinRoomSubmitting: boolean = false;
    private roomKeydownListener: ((e: KeyboardEvent) => void) | null = null;

    onLoad() {
        WxShareUtil.init();
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

        // 1. 顶栏 (自适应放大) - 已隐藏黄色顶栏背景，将返回按钮直接加到 canvas
        const topSafeInset = this.getTopSafeInset(ch);
        const topHeaderPadding = topSafeInset + 68 * scaleFactor;
        const headerPanelW = Math.min(cw * 0.56, 420 * scaleFactor);
        const headerPanelH = (isPortrait ? 112 : 98) * scaleFactor;
        const topHeaderHeight = headerPanelH + 28 * scaleFactor + topSafeInset;
        const headerPanelY = ch / 2 - topHeaderPadding - headerPanelH / 2;
        const backBtnY = ch / 2 - Math.max(54 * scaleFactor, topSafeInset + 15 * scaleFactor);

        const backBtn = this.createUnifiedBackBtn(() => {
            this.node.emit('go-back');
        }, scaleFactor);
        backBtn.setPosition(-cw / 2 + 82 * scaleFactor, backBtnY, 0);
        canvas.addChild(backBtn);

        // 1.5 顶栏标题 (恢复显示游戏名，用于小游戏备案)
        const headerPanel = new Node('HeaderPanel');
        headerPanel.layer = 33554432;
        headerPanel.addComponent(UITransform).setContentSize(headerPanelW, headerPanelH);
        const headerGraphics = headerPanel.addComponent(Graphics);
        headerGraphics.lineWidth = 2.5 * scaleFactor;
        headerGraphics.strokeColor = new Color(245, 240, 235, 255);
        headerGraphics.fillColor = new Color(20, 20, 20, 220);
        headerGraphics.roundRect(-headerPanelW / 2, -headerPanelH / 2, headerPanelW, headerPanelH, 18 * scaleFactor);
        headerGraphics.fill();
        headerGraphics.stroke();
        headerPanel.setPosition(0, headerPanelY, 0);
        canvas.addChild(headerPanel);

        const brandTitle = this.createLabelNode('BrandTitle', '勇者来斗兽', 28 * scaleFactor, '#ffca28', true);
        const brandTitleLabel = brandTitle.getComponent(Label);
        if (brandTitleLabel) {
            brandTitleLabel.lineHeight = Math.round(36 * scaleFactor);
        }
        brandTitle.setPosition(0, 16 * scaleFactor, 0);
        headerPanel.addChild(brandTitle);

        const pageTitle = this.createLabelNode('PageTitle', '模式选择', 24 * scaleFactor, '#ffffff', true);
        const pageTitleLabel = pageTitle.getComponent(Label);
        if (pageTitleLabel) {
            pageTitleLabel.lineHeight = Math.round(30 * scaleFactor);
        }
        pageTitle.setPosition(0, -14 * scaleFactor, 0);
        headerPanel.addChild(pageTitle);

        // 2. 卡片自适应尺寸 (高宽及间距放大)
        const cardW = Math.min(cw * 0.96, 620 * scaleFactor);
        const cardH = 380 * scaleFactor;
        const cardSpacing = 26 * scaleFactor;
        const centerY = -(topHeaderHeight + 18 * scaleFactor) / 2;
        const card1Y = isPortrait ? centerY + cardH + cardSpacing : 60 * scaleFactor;
        const card2Y = isPortrait ? centerY : (60 - cardH - cardSpacing) * scaleFactor;
        const card3Y = isPortrait ? centerY - cardH - cardSpacing : (60 - (cardH + cardSpacing) * 2) * scaleFactor;

        const localCard = this.createCardNode(
            'LocalDuoCard',
            cardW,
            cardH,
            '本地双人',
            '和身边的朋友一起下棋',
            '温馨共玩',
            '开始',
            '#27ae60',
            '#196f3d',
            'textures/mode_local_duo',
            () => {
                this.node.emit('start-local-duo');
            },
            scaleFactor
        );
        localCard.setPosition(0, card1Y, 0);
        canvas.addChild(localCard);

        const roomCard = this.createCardNode(
            'OnlineBattleCard',
            cardW,
            cardH,
            '房间对战',
            '邀请好友，在同一片森林里相遇',
            '远程同乐',
            '进入',
            '#2980b9',
            '#1a5276',
            'textures/mode_online_battle',
            () => {
                this.showRoomActionDialog();
            },
            scaleFactor
        );
        roomCard.setPosition(0, card2Y, 0);
        canvas.addChild(roomCard);

        const aiCard = this.createCardNode(
            'AIPracticeCard',
            cardW,
            cardH,
            '人机挑战',
            '和AI慢慢练，熟悉规则与节奏',
            '轻松练习',
            '练习',
            '#f39c12',
            '#a05d00',
            'textures/mode_ai_practice',
            () => {
                this.showDifficultyDialog();
            },
            scaleFactor
        );
        aiCard.setPosition(0, card3Y, 0);
        canvas.addChild(aiCard);
    }

    private getTopSafeInset(containerHeight: number): number {
        const safeArea = sys.getSafeAreaRect();
        if (!safeArea) {
            return 0;
        }
        return Math.max(0, containerHeight - (safeArea.y + safeArea.height));
    }

    private createCardNode(name: string, w: number, h: number, title: string, subTitle: string, tag: string, btnText: string, btnColor: string, btnShadowColor: string, imgUrl: string, onClick: () => void, scaleFactor: number): Node {
        const cardContainer = new Node(name);
        cardContainer.layer = 33554432;
        cardContainer.addComponent(UITransform).setContentSize(w, h);

        const cardRadius = 28 * scaleFactor;
        const paperInset = 12 * scaleFactor;

        // 60% 图片区域，40% 文字区域布局
        const imageFrameW = 320 * scaleFactor;
        const imageFrameH = 200 * scaleFactor;
        const imageFrameX = -w / 2 + 180 * scaleFactor;
        const imageFrameY = 26 * scaleFactor;
        const imageY = imageFrameY;

        const textStartX = w * 0.08;

        const shadow = new Node("CardShadow");
        shadow.layer = 33554432;
        shadow.addComponent(UITransform).setContentSize(w, h);
        const shadowG = shadow.addComponent(Graphics);
        shadowG.fillColor = new Color(77, 56, 23, 46);
        shadowG.roundRect(-w / 2, -h / 2, w, h, cardRadius);
        shadowG.fill();
        shadow.setPosition(0, -10 * scaleFactor, 0);
        cardContainer.addChild(shadow);

        const cardBg = new Node("CardBg");
        cardBg.layer = 33554432;
        cardBg.addComponent(UITransform).setContentSize(w, h);
        const bgG = cardBg.addComponent(Graphics);
        bgG.fillColor = new Color(252, 246, 232, 255);
        bgG.roundRect(-w / 2, -h / 2, w, h, cardRadius);
        bgG.fill();
        bgG.lineWidth = 3 * scaleFactor;
        bgG.strokeColor = new Color(220, 200, 166, 255);
        bgG.roundRect(-w / 2, -h / 2, w, h, cardRadius);
        bgG.stroke();
        bgG.lineWidth = 1.6 * scaleFactor;
        bgG.strokeColor = new Color(255, 255, 255, 155);
        bgG.roundRect(-w / 2 + paperInset, -h / 2 + paperInset, w - paperInset * 2, h - paperInset * 2, cardRadius - 10 * scaleFactor);
        bgG.stroke();
        bgG.strokeColor = new Color(109, 142, 95, 32);
        bgG.lineWidth = 12 * scaleFactor;
        bgG.circle(-w / 2 + 48 * scaleFactor, h / 2 - 54 * scaleFactor, 58 * scaleFactor);
        bgG.stroke();
        bgG.circle(w / 2 - 56 * scaleFactor, -h / 2 + 62 * scaleFactor, 44 * scaleFactor);
        bgG.stroke();
        cardContainer.addChild(cardBg);

        const badge = this.createRectNode("ModeTag", "#efe0bf", 118 * scaleFactor, 42 * scaleFactor, 21 * scaleFactor, 255);
        badge.setPosition(-w / 2 + 92 * scaleFactor, h / 2 - 38 * scaleFactor, 0);
        cardContainer.addChild(badge);
        const badgeOutline = badge.addComponent(Graphics);
        badgeOutline.lineWidth = 2 * scaleFactor;
        badgeOutline.strokeColor = new Color(208, 183, 138, 255);
        badgeOutline.roundRect(-59 * scaleFactor, -21 * scaleFactor, 118 * scaleFactor, 42 * scaleFactor, 21 * scaleFactor);
        badgeOutline.stroke();
        const badgeText = this.createLabelNode("ModeTagText", tag, 20 * scaleFactor, "#7a5b29", true);
        badgeText.setPosition(0, 1 * scaleFactor, 0);
        badge.addChild(badgeText);

        const imageFrame = new Node("ImageFrame");
        imageFrame.layer = 33554432;
        imageFrame.addComponent(UITransform).setContentSize(imageFrameW, imageFrameH);
        const frameG = imageFrame.addComponent(Graphics);
        frameG.fillColor = new Color(244, 232, 205, 255);
        frameG.roundRect(-imageFrameW / 2, -imageFrameH / 2, imageFrameW, imageFrameH, 24 * scaleFactor);
        frameG.fill();
        frameG.lineWidth = 2.5 * scaleFactor;
        frameG.strokeColor = new Color(219, 194, 149, 255);
        frameG.roundRect(-imageFrameW / 2, -imageFrameH / 2, imageFrameW, imageFrameH, 24 * scaleFactor);
        frameG.stroke();
        frameG.lineWidth = 1.5 * scaleFactor;
        frameG.strokeColor = new Color(255, 255, 255, 120);
        frameG.roundRect(-imageFrameW / 2 + 6 * scaleFactor, -imageFrameH / 2 + 6 * scaleFactor, imageFrameW - 12 * scaleFactor, imageFrameH - 12 * scaleFactor, 20 * scaleFactor);
        frameG.stroke();
        imageFrame.setPosition(imageFrameX, imageFrameY, 0);
        cardContainer.addChild(imageFrame);

        const baseShadow = new Node("BaseShadow");
        baseShadow.layer = 33554432;
        baseShadow.addComponent(UITransform).setContentSize(240 * scaleFactor, 24 * scaleFactor);
        const baseShadowG = baseShadow.addComponent(Graphics);
        baseShadowG.fillColor = new Color(83, 57, 24, 38);
        baseShadowG.ellipse(0, 0, 120 * scaleFactor, 12 * scaleFactor);
        baseShadowG.fill();
        baseShadow.setPosition(imageFrameX, imageFrameY - imageFrameH / 2 - 6 * scaleFactor, 0);
        cardContainer.addChild(baseShadow);

        const imgNode = new Node("Illustration");
        imgNode.layer = 33554432;
        imgNode.addComponent(UITransform).setContentSize(300 * scaleFactor, 180 * scaleFactor);
        const sprite = imgNode.addComponent(Sprite);
        sprite.sizeMode = 0;
        imgNode.setPosition(imageFrameX, imageY, 0);
        cardContainer.addChild(imgNode);
        this.safeLoadSprite(imgUrl, sprite, true, 300 * scaleFactor, 180 * scaleFactor);

        const titleLabel = this.createLabelNode("Title", title, 34 * scaleFactor, "#3f3018", true);
        titleLabel.getComponent(UITransform)!.setAnchorPoint(0, 0.5);
        titleLabel.setPosition(textStartX, h / 2 - 80 * scaleFactor, 0);
        cardContainer.addChild(titleLabel);

        const subTitleLabel = this.createLabelNode("SubTitle", subTitle, 20 * scaleFactor, "#7b6a4b", false);
        const subTitleTrans = subTitleLabel.getComponent(UITransform)!;
        subTitleTrans.setAnchorPoint(0, 0.5);
        subTitleTrans.setContentSize(w * 0.38 - 24 * scaleFactor, 80 * scaleFactor);
        const subTitleLabelComp = subTitleLabel.getComponent(Label)!;
        subTitleLabelComp.overflow = Label.Overflow.SHRINK;
        subTitleLabelComp.enableWrapText = true;
        subTitleLabelComp.lineHeight = 28 * scaleFactor;
        subTitleLabel.setPosition(textStartX, h / 2 - 138 * scaleFactor, 0);
        cardContainer.addChild(subTitleLabel);

        const btnW = w - 64 * scaleFactor;
        const btnH = 66 * scaleFactor;
        const btnRadius = 33 * scaleFactor;

        const btnShadow = new Node("BtnShadow");
        btnShadow.layer = 33554432;
        btnShadow.addComponent(UITransform).setContentSize(btnW, btnH);
        const btnShadowG = btnShadow.addComponent(Graphics);
        const shadowColor = new Color();
        Color.fromHEX(shadowColor, btnShadowColor);
        shadowColor.a = 34;
        btnShadowG.fillColor = shadowColor;
        btnShadowG.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);
        btnShadowG.fill();
        shadowColor.a = 80;
        btnShadowG.fillColor = shadowColor;
        btnShadowG.roundRect(-btnW / 2 + 2 * scaleFactor, -btnH / 2 + 2 * scaleFactor, btnW - 4 * scaleFactor, btnH - 4 * scaleFactor, btnRadius - 2 * scaleFactor);
        btnShadowG.fill();
        btnShadow.setPosition(0, -h / 2 + 42 * scaleFactor, 0);
        cardContainer.addChild(btnShadow);

        const btn = new Node("ActionBtn");
        btn.layer = 33554432;
        btn.addComponent(UITransform).setContentSize(btnW, btnH);
        const btnG = btn.addComponent(Graphics);
        const mainColor = new Color();
        Color.fromHEX(mainColor, btnColor);
        btnG.fillColor = mainColor;
        btnG.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);
        btnG.fill();
        btnG.lineWidth = 1.5 * scaleFactor;
        btnG.strokeColor = new Color(255, 255, 255, 95);
        btnG.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnRadius);
        btnG.stroke();

        const btnBaseY = -h / 2 + 48 * scaleFactor;
        btn.setPosition(0, btnBaseY, 0);
        cardContainer.addChild(btn);

        const btnHighlight = this.createRectNode("BtnHighlight", "#ffffff", btnW - 14 * scaleFactor, 20 * scaleFactor, Math.max(10 * scaleFactor, btnRadius - 12 * scaleFactor), 24);
        btnHighlight.setPosition(0, btnH / 2 - 14 * scaleFactor, 0);
        btn.addChild(btnHighlight);
        const btnHighlightOpacity = btnHighlight.addComponent(UIOpacity);
        btnHighlightOpacity.opacity = 24;

        const btnTxt = this.createLabelNode("BtnTxt", btnText, 28 * scaleFactor, "#ffffff", true);
        btn.addChild(btnTxt);

        btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_START, () => {
            this.playModeCardButtonFeedback(btn, btnShadow, btnTxt, btnHighlightOpacity, btnBaseY, true);
        }, this);

        btn.on(Node.EventType.TOUCH_END, () => {
            this.playModeCardButtonFeedback(btn, btnShadow, btnTxt, btnHighlightOpacity, btnBaseY, false);
            AudioSynth.playJoyfulClick();
            onClick();
        }, this);

        btn.on(Node.EventType.TOUCH_CANCEL, () => {
            this.playModeCardButtonFeedback(btn, btnShadow, btnTxt, btnHighlightOpacity, btnBaseY, false);
        }, this);

        cardContainer.on(Node.EventType.TOUCH_CANCEL, () => {
            cardContainer.setScale(new Vec3(1.0, 1.0, 1.0));
            shadow.setPosition(new Vec3(0, -10 * scaleFactor, 0));
            this.playModeCardButtonFeedback(btn, btnShadow, btnTxt, btnHighlightOpacity, btnBaseY, false);
            imgNode.setPosition(new Vec3(imageFrameX, imageY, 0));
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

        const mask = this.createRectNode('Mask', '#06190f', cw, ch, 0, 188);
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => this.hideDifficultyDialog(), this);
        this.difficultyDialog.addChild(mask);

        const dialogW = Math.min(cw * 0.9, 600 * scaleFactor);
        const dialogH = Math.min(ch * 0.8, 760 * scaleFactor);
        const panelShadow = this.createRectNode('PanelShadow', '#203316', dialogW, dialogH, 34 * scaleFactor, 112);
        panelShadow.setPosition(0, -8 * scaleFactor, 0);
        this.difficultyDialog.addChild(panelShadow);

        const dialog = this.createRectNode('Dialog', '#fff8df', dialogW, dialogH, 34 * scaleFactor);
        dialog.name = 'DialogNode';
        this.difficultyDialog.addChild(dialog);

        const topBand = this.createRectNode('TopBand', '#e9f4d6', dialogW - 34 * scaleFactor, 116 * scaleFactor, 28 * scaleFactor, 255);
        topBand.setPosition(0, dialogH / 2 - 74 * scaleFactor, 0);
        dialog.addChild(topBand);

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
            AudioSynth.playBackClick();
            this.hideDifficultyDialog();
        }, this);

        const headerIcon = this.createDifficultyOptionIcon('HeaderBot', '#148437', '#f7fff2', 42 * scaleFactor, 'bot', scaleFactor);
        headerIcon.setPosition(-142 * scaleFactor, dialogH / 2 - 60 * scaleFactor, 0);
        dialog.addChild(headerIcon);

        const title = this.createLabelNode('Title', '选择难度', 34 * scaleFactor, '#146c38', true);
        title.setPosition(12 * scaleFactor, dialogH / 2 - 54 * scaleFactor, 0);
        dialog.addChild(title);

        const subtitle = this.createLabelNode('Subtitle', '先选对手节奏，再开始一局练习', 18 * scaleFactor, '#647044', false);
        subtitle.setPosition(12 * scaleFactor, dialogH / 2 - 92 * scaleFactor, 0);
        dialog.addChild(subtitle);

        const optionW = dialogW - 48 * scaleFactor;
        const optionH = 104 * scaleFactor;
        const optionGap = 14 * scaleFactor;
        const firstY = dialogH / 2 - 188 * scaleFactor;

        const easyNode = this.createDifficultyOption(optionW, optionH, '简单', '适合新手，容错更高', '#4caf50', 'leaf', scaleFactor);
        easyNode.setPosition(0, firstY, 0);
        dialog.addChild(easyNode);

        const normalNode = this.createDifficultyOption(optionW, optionH, '中等', '推荐默认，节奏均衡', '#d68118', 'target', scaleFactor);
        normalNode.setPosition(0, firstY - optionH - optionGap, 0);
        dialog.addChild(normalNode);

        const hardNode = this.createDifficultyOption(optionW, optionH, '困难', '更强挑战，适合熟练玩家', '#d94b45', 'swords', scaleFactor);
        hardNode.setPosition(0, firstY - (optionH + optionGap) * 2, 0);
        dialog.addChild(hardNode);

        const startShadow = this.createRectNode('StartShadow', '#074f14', dialogW - 88 * scaleFactor, 76 * scaleFactor, 38 * scaleFactor, 118);
        startShadow.setPosition(0, -dialogH / 2 + 112 * scaleFactor - 5 * scaleFactor, 0);
        dialog.addChild(startShadow);

        const startBtn = this.createRectNode('StartBtn', '#13883a', dialogW - 88 * scaleFactor, 76 * scaleFactor, 38 * scaleFactor);
        startBtn.setPosition(0, -dialogH / 2 + 116 * scaleFactor, 0);
        dialog.addChild(startBtn);
        const startIcon = this.createLabelNode('开始挑战图标', '▶', 25 * scaleFactor, '#ffffff', true);
        startIcon.setPosition(-76 * scaleFactor, 0, 0);
        startBtn.addChild(startIcon);
        const startTxt = this.createLabelNode('StartTxt', '开始挑战', 27 * scaleFactor, '#ffffff', true);
        startTxt.setPosition(20 * scaleFactor, 0, 0);
        startBtn.addChild(startTxt);
        startBtn.addComponent(Button);
        startBtn.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playJoyfulClick();
            const difficulty = this.selectedDifficulty;
            this.hideDifficultyDialog();
            this.node.emit('start-ai-practice', difficulty);
        }, this);

        const cancelIcon = this.createLabelNode('取消图标', '×', 19 * scaleFactor, '#8f8a76', true);
        cancelIcon.setPosition(-34 * scaleFactor, -dialogH / 2 + 42 * scaleFactor, 0);
        dialog.addChild(cancelIcon);
        const cancelTxt = this.createLabelNode('CancelTxt', '取消', 20 * scaleFactor, '#8f8a76', false);
        cancelTxt.setPosition(14 * scaleFactor, -dialogH / 2 + 42 * scaleFactor, 0);
        dialog.addChild(cancelTxt);

        this.registerDifficultyState(easyNode, 'easy', '#4caf50');
        this.registerDifficultyState(normalNode, 'normal', '#d68118');
        this.registerDifficultyState(hardNode, 'hard', '#d94b45');

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

    private createDifficultyOption(w: number, h: number, mainText: string, subText: string, accentHex: string, iconType: 'leaf' | 'target' | 'swords', scaleFactor: number): Node {
        const option = new Node('DifficultyOption');
        option.layer = 33554432;
        const trans = option.addComponent(UITransform);
        trans.setContentSize(w, h);

        const shadow = this.createRectNode('Shadow', '#6a5229', w - 2 * scaleFactor, h - 2 * scaleFactor, 22 * scaleFactor, 42);
        shadow.setPosition(0, -3 * scaleFactor, 0);
        option.addChild(shadow);

        const bg = this.createRectNode('Bg', '#fffdfa', w, h, 22 * scaleFactor, 250);
        option.addChild(bg);

        const accentWash = this.createRectNode('AccentWash', accentHex, 68 * scaleFactor, h - 20 * scaleFactor, 20 * scaleFactor, 34);
        accentWash.setPosition(-w / 2 + 42 * scaleFactor, 0, 0);
        option.addChild(accentWash);

        const badge = this.createCircleNode('难度徽章', accentHex, 28 * scaleFactor, 230);
        badge.setPosition(-w / 2 + 66 * scaleFactor, 0, 0);
        option.addChild(badge);
        const icon = this.createDifficultyOptionIcon('Icon', accentHex, '#ffffff', 28 * scaleFactor, iconType, scaleFactor);
        badge.addChild(icon);

        const mainLabel = this.createLabelNode('MainLabel', mainText, 26 * scaleFactor, '#66572d', true);
        mainLabel.getComponent(UITransform).setAnchorPoint(0, 0.5);
        mainLabel.setPosition(-w / 2 + 112 * scaleFactor, 18 * scaleFactor, 0);
        option.addChild(mainLabel);

        const subLabel = this.createLabelNode('SubLabel', subText, 16 * scaleFactor, '#9f9276', false);
        subLabel.getComponent(UITransform).setAnchorPoint(0, 0.5);
        subLabel.setPosition(-w / 2 + 112 * scaleFactor, -21 * scaleFactor, 0);
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

    private createDifficultyOptionIcon(name: string, accentHex: string, strokeHex: string, size: number, iconType: 'bot' | 'leaf' | 'target' | 'swords', scaleFactor: number): Node {
        const icon = new Node(name);
        icon.layer = 33554432;
        icon.addComponent(UITransform).setContentSize(size, size);
        const g = icon.addComponent(Graphics);
        const stroke = new Color();
        Color.fromHEX(stroke, strokeHex);
        g.lineCap = 1;
        g.lineJoin = 1;
        g.lineWidth = Math.max(3 * scaleFactor, size * 0.08);
        g.strokeColor = stroke;
        g.fillColor = stroke;

        if (iconType === 'bot') {
            g.roundRect(-size * 0.24, -size * 0.12, size * 0.48, size * 0.38, size * 0.08);
            g.stroke();
            g.circle(-size * 0.12, size * 0.06, size * 0.035);
            g.circle(size * 0.12, size * 0.06, size * 0.035);
            g.fill();
            g.moveTo(0, size * 0.26);
            g.lineTo(0, size * 0.38);
            g.stroke();
            g.circle(0, size * 0.42, size * 0.045);
            g.fill();
            return icon;
        }

        if (iconType === 'leaf') {
            g.ellipse(0, 0, size * 0.26, size * 0.34);
            g.stroke();
            g.moveTo(-size * 0.18, -size * 0.2);
            g.quadraticCurveTo(-size * 0.02, -size * 0.02, size * 0.18, size * 0.22);
            g.stroke();
            return icon;
        }

        if (iconType === 'target') {
            g.circle(0, 0, size * 0.3);
            g.stroke();
            g.circle(0, 0, size * 0.16);
            g.stroke();
            g.circle(0, 0, size * 0.045);
            g.fill();
            return icon;
        }

        g.moveTo(-size * 0.22, size * 0.24);
        g.lineTo(size * 0.22, -size * 0.2);
        g.stroke();
        g.moveTo(size * 0.22, size * 0.24);
        g.lineTo(-size * 0.22, -size * 0.2);
        g.stroke();
        g.moveTo(-size * 0.02, -size * 0.2);
        g.lineTo(-size * 0.22, -size * 0.2);
        g.lineTo(-size * 0.22, 0);
        g.stroke();
        g.moveTo(size * 0.02, -size * 0.2);
        g.lineTo(size * 0.22, -size * 0.2);
        g.lineTo(size * 0.22, 0);
        g.stroke();
        return icon;
    }

    private registerDifficultyState(optionNode: Node, key: DifficultyKey, accentHex: string) {
        const mainLabel = optionNode.getChildByName('MainLabel')?.getComponent(Label) ?? null!;
        const subLabel = optionNode.getChildByName('SubLabel')?.getComponent(Label) ?? null!;
        const dotInner = optionNode.getChildByName('Dot')?.getChildByName('DotCover')?.getChildByName('DotInner') ?? null!;
        const bgNode = optionNode.getChildByName('Bg') ?? null!;
        const shadowNode = optionNode.getChildByName('Shadow') ?? null!;
        const badgeNode = optionNode.getChildByName('Badge') ?? null!;
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
            AudioSynth.playPrimaryClick();
            this.selectedDifficulty = key;
            this.refreshDifficultySelection();
        }, this);
    }

    private refreshDifficultySelection() {
        this.difficultyStates.forEach((state, key) => {
            const selected = key === this.selectedDifficulty;
            if (state.node) state.node.setScale(new Vec3(selected ? 1.03 : 1.0, selected ? 1.03 : 1.0, 1.0));
            if (state.mainLabel) state.mainLabel.color = selected ? state.accentColor : new Color(102, 87, 45, 255);
            if (state.subLabel) state.subLabel.color = selected ? new Color(75, 150, 90, 255) : new Color(159, 146, 118, 255);
            if (state.bgNode) {
                const g = state.bgNode.getComponent(Graphics);
                if (g) g.fillColor = selected ? new Color(255, 255, 255, 255) : new Color(255, 255, 255, 248);
            }
            if (state.shadowNode) {
                const g = state.shadowNode.getComponent(Graphics);
                if (g) g.fillColor = selected ? new Color(120, 88, 28, 58) : new Color(120, 88, 28, 36);
            }
            if (state.badgeNode) {
                const g = state.badgeNode.getComponent(Graphics);
                if (g) g.fillColor = selected ? state.accentColor : new Color(225, 218, 201, 255);
            }
            if (state.dotInner) state.dotInner.active = selected;
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
        AudioSynth.playBackClick();

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

    /**
     * 统一控制模式卡按钮的按压反馈，避免按下和弹起状态切换过硬。
     */
    private playModeCardButtonFeedback(btn: Node, btnShadow: Node, btnTxt: Node, btnHighlightOpacity: UIOpacity, baseY: number, isPressed: boolean): void {
        Tween.stopAllByTarget(btn);
        Tween.stopAllByTarget(btnShadow);
        Tween.stopAllByTarget(btnTxt);
        Tween.stopAllByTarget(btnHighlightOpacity);

        const targetBtnY = isPressed ? baseY - 4 : baseY;
        const targetShadowY = isPressed ? baseY - 2 : baseY - 8;
        const targetBtnScale = isPressed ? new Vec3(0.98, 0.965, 1.0) : new Vec3(1.0, 1.0, 1.0);
        const targetTextScale = isPressed ? new Vec3(0.96, 0.96, 1.0) : new Vec3(1.0, 1.0, 1.0);
        const targetHighlightOpacity = isPressed ? 8 : 24;
        const duration = isPressed ? 0.08 : 0.16;
        const easing = isPressed ? 'quadOut' : 'backOut';

        tween(btn)
            .to(duration, { position: new Vec3(0, targetBtnY, 0), scale: targetBtnScale }, { easing })
            .start();

        tween(btnShadow)
            .to(duration, { position: new Vec3(0, targetShadowY, 0) }, { easing })
            .start();

        tween(btnTxt)
            .to(duration, { scale: targetTextScale }, { easing })
            .start();

        tween(btnHighlightOpacity)
            .to(duration, { opacity: targetHighlightOpacity }, { easing: 'sineOut' })
            .start();
    }

    private createUnifiedBackBtn(onClick: () => void, scaleFactor: number): Node {
        const btn = new Node("BackButton");
        btn.layer = 33554432;
        const trans = btn.addComponent(UITransform);
        trans.setContentSize(80, 80); // 触控热区宽 80x80

        const g = btn.addComponent(Graphics);
        trans.setContentSize(92, 92);
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

        this.drawBackButtonBadgeOverlay(btn, scaleFactor);

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

    private drawBackButtonBadgeOverlay(btn: Node, scaleFactor: number): void {
        const badgeNode = new Node("BackBadgeOverlay");
        badgeNode.layer = btn.layer;
        badgeNode.setPosition(0, 0, 0);
        btn.addChild(badgeNode);

        const trans = badgeNode.addComponent(UITransform);
        trans.setContentSize(92, 92);

        const g = badgeNode.addComponent(Graphics);
        const r = 40 * scaleFactor;
        const outerR = 44 * scaleFactor;
        const innerR = 34 * scaleFactor;
        const ringR = 29 * scaleFactor;

        g.fillColor = new Color(28, 18, 6, 108);
        g.circle(0, -5 * scaleFactor, outerR);
        g.fill();

        g.fillColor = new Color(255, 214, 92, 48);
        g.circle(0, 0, outerR);
        g.fill();

        g.fillColor = new Color(229, 176, 45, 255);
        g.circle(0, 0, r);
        g.fill();

        g.fillColor = new Color(246, 205, 90, 255);
        g.circle(0, 0, innerR);
        g.fill();

        g.lineWidth = 2.5 * scaleFactor;
        g.strokeColor = new Color(255, 248, 230, 255);
        g.circle(0, 0, r);
        g.stroke();

        g.lineWidth = 1.6 * scaleFactor;
        g.strokeColor = new Color(130, 82, 18, 185);
        g.circle(0, -0.5 * scaleFactor, ringR);
        g.stroke();

        g.fillColor = new Color(255, 255, 255, 62);
        g.arc(0, 8 * scaleFactor, innerR - 3 * scaleFactor, Math.PI * 0.08, Math.PI * 0.92, false);
        g.lineTo(-(innerR - 3 * scaleFactor) * 0.98, 8 * scaleFactor);
        g.close();
        g.fill();

        g.lineCap = 1;
        g.lineJoin = 1;

        const arrowStartX = 12 * scaleFactor;
        const arrowEndX = -13 * scaleFactor;
        const arrowWing = 8.5 * scaleFactor;

        g.lineWidth = 8 * scaleFactor;
        g.strokeColor = new Color(255, 248, 220, 235);
        g.moveTo(arrowStartX, 0);
        g.lineTo(arrowEndX, 0);
        g.stroke();
        g.moveTo(-4 * scaleFactor, arrowWing);
        g.lineTo(arrowEndX, 0);
        g.lineTo(-4 * scaleFactor, -arrowWing);
        g.stroke();

        g.lineWidth = 5.2 * scaleFactor;
        g.strokeColor = new Color(78, 42, 8, 255);
        g.moveTo(arrowStartX, 0);
        g.lineTo(arrowEndX, 0);
        g.stroke();
        g.moveTo(-4 * scaleFactor, arrowWing);
        g.lineTo(arrowEndX, 0);
        g.lineTo(-4 * scaleFactor, -arrowWing);
        g.stroke();
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

    private adjustSpriteSize(sprite: Sprite, origW: number, origH: number, maxW?: number, maxH?: number) {
        if (!sprite || !sprite.isValid) return;
        const uiTrans = sprite.getComponent(UITransform);
        if (uiTrans) {
            const scaleFactor = this.getScaleFactor();
            const targetMaxW = maxW ?? (uiTrans.width > 0 ? uiTrans.width : 150 * scaleFactor);
            const targetMaxH = maxH ?? (uiTrans.height > 0 ? uiTrans.height : 150 * scaleFactor);
            const scale = Math.min(targetMaxW / origW, targetMaxH / origH);
            uiTrans.setContentSize(origW * scale, origH * scale);
        }
    }

    private safeLoadSprite(path: string, sprite: Sprite, adjustSize: boolean = true, maxW?: number, maxH?: number) {
        resources.load(`${path}/spriteFrame`, SpriteFrame, (err, sf) => {
            if (!err && sf) {
                if (sprite && sprite.isValid) {
                    sprite.spriteFrame = sf;
                    if (adjustSize) {
                        this.adjustSpriteSize(sprite, sf.rect.width, sf.rect.height, maxW, maxH);
                    }
                }
            } else {
                resources.load(path, SpriteFrame, (err2, sf2) => {
                    if (!err2 && sf2) {
                        if (sprite && sprite.isValid) {
                            sprite.spriteFrame = sf2;
                            if (adjustSize) {
                                this.adjustSpriteSize(sprite, sf2.rect.width, sf2.rect.height, maxW, maxH);
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
                                          this.adjustSpriteSize(sprite, tex.width, tex.height, maxW, maxH);
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
                                                this.adjustSpriteSize(sprite, tex2.width, tex2.height, maxW, maxH);
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
                                                        this.adjustSpriteSize(sprite, imgAsset.width, imgAsset.height, maxW, maxH);
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
        if (this.roomActionDialog && this.roomActionDialog.isValid) {
            this.roomActionDialog.destroy();
            this.roomActionDialog = null;
        }
        if (this.joinRoomDialog && this.joinRoomDialog.isValid) {
            this.joinRoomDialog.destroy();
            this.joinRoomDialog = null;
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

        // 2. 顶栏 (直接复刻) - 已隐藏黄色顶栏背景，将返回按钮直接加到弹窗
        const topBarHeight = 92 * scaleFactor;

        const backBtn = this.createUnifiedBackBtn(() => {
            this.hideCreateRoomDialog();
        }, scaleFactor);
        backBtn.setPosition(-cw / 2 + 82 * scaleFactor, ch / 2 - topBarHeight / 2 - 8 * scaleFactor, 0);
        this.createRoomDialog.addChild(backBtn);


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

            // 明文展示房间号，并支持点击复制房间号
            const roomCodeLabel = this.createLabelNode('RoomCodeLabel', `房间号：${randomCode}`, 40 * scaleFactor, '#d63031', true);
            roomCodeLabel.setPosition(0, successSubtitle.position.y - 64 * scaleFactor, 0);
            this.createRoomDialog.addChild(roomCodeLabel);
            roomCodeLabel.addComponent(Button);
            roomCodeLabel.on(Node.EventType.TOUCH_END, () => {
                AudioSynth.playClick();
                const success = this.copyToClipboard(randomCode);
                if (success) {
                    this.showToast(`已复制房间号: ${randomCode}`);
                }
            });

            // (3) 两个按钮 (垂直居中排列，不再有卡片阻挡)
            const btnW = 540 * scaleFactor;
            const btnH = 88 * scaleFactor;
            const btnRadius = btnH / 2;
            const btn1Y = successSubtitle.position.y - 200 * scaleFactor;
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
                AudioSynth.playJoyfulClick();
                this.startOnlineMatch(randomCode);
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

            // 明文展示房间号，并支持点击复制房间号
            const roomCodeLabel = this.createLabelNode('RoomCodeLabel', `房间号：${randomCode}`, 32 * scaleFactor, '#d63031', true);
            roomCodeLabel.setPosition(0, successSubtitle.position.y - 48 * scaleFactor, 0);
            this.createRoomDialog.addChild(roomCodeLabel);
            roomCodeLabel.addComponent(Button);
            roomCodeLabel.on(Node.EventType.TOUCH_END, () => {
                AudioSynth.playClick();
                const success = this.copyToClipboard(randomCode);
                if (success) {
                    this.showToast(`已复制房间号: ${randomCode}`);
                }
            });

            // (3) 横屏并排按钮 (居中放置，不再有卡片阻挡)
            const btnW = 240 * scaleFactor;
            const btnH = 76 * scaleFactor;
            const btnRadius = btnH / 2;
            const btnY = successSubtitle.position.y - 130 * scaleFactor;

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
                AudioSynth.playJoyfulClick();
                this.startOnlineMatch(randomCode);
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

    private onMatchWait = () => {
        this.showToast("已连接，等待另一位玩家加入中...");
        if (this.createRoomDialog) {
            const enterBtn = this.createRoomDialog.getChildByName("EnterBtn");
            if (enterBtn) {
                const txtNode = enterBtn.getChildByName("EnterTxt");
                if (txtNode) {
                    const label = txtNode.getComponent(Label);
                    if (label) label.string = "等待中...";
                }
            }
        }
    };

    private onMatchSuccess = (dataStr: string) => {
        const data = JSON.parse(dataStr);
        console.log(`[ModeSelectionUI] 匹配成功: `, data);

        NetworkManager.getInstance().currentRoomId = data.room_id;
        NetworkManager.getInstance().myCamp = data.camp;
        NetworkManager.getInstance().opponentId = data.opponent_id;

        NetworkManager.getInstance().off('match_wait', this.onMatchWait);
        NetworkManager.getInstance().off('match_success', this.onMatchSuccess);

        this.hideCreateRoomDialog(false);
        this.node.emit('start-online-battle');
    };

    private startOnlineMatch(roomCode: string) {
        this.showToast("正在连接对战服务器...");
        NetworkManager.getInstance().connect()
            .then(() => {
                this.showToast("正在发起房间匹配...");
                NetworkManager.getInstance().on('match_wait', this.onMatchWait);
                NetworkManager.getInstance().on('match_success', this.onMatchSuccess);
                NetworkManager.getInstance().send('match_seek', { room_code: roomCode, user_name: "Player" });
            })
            .catch((err) => {
                console.error("连接服务器失败:", err);
                this.showToast("连接服务器失败，请检查网络！");
            });
    }

    private cleanupNetwork() {
        NetworkManager.getInstance().off('match_wait', this.onMatchWait);
        NetworkManager.getInstance().off('match_success', this.onMatchSuccess);
        NetworkManager.getInstance().disconnect();
    }

    private hideCreateRoomDialog(shouldDisconnect: boolean = true) {
        if (shouldDisconnect) {
            this.cleanupNetwork();
        } else {
            NetworkManager.getInstance().off('match_wait', this.onMatchWait);
            NetworkManager.getInstance().off('match_success', this.onMatchSuccess);
        }
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
        WxShareUtil.init();
        const shared = WxShareUtil.shareRoom(roomCode);
        if (shared) {
            this.showToast("已发起分享，邀请好友加入！");
            return;
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

    private showRoomActionDialog() {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.max(0.62, Math.min(cw / refW, ch / refH));

        if (this.roomActionDialog && this.roomActionDialog.isValid) {
            this.roomActionDialog.destroy();
            this.roomActionDialog = null;
        }

        this.roomActionDialog = new Node('RoomActionDialog');
        this.roomActionDialog.layer = 33554432;
        this.roomActionDialog.addComponent(UITransform).setContentSize(cw, ch);
        canvas.addChild(this.roomActionDialog);

        // 1. 遮罩
        const mask = this.createRectNode('Mask', '#06190f', cw, ch, 0, 188);
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => this.hideRoomActionDialog(), this);
        this.roomActionDialog.addChild(mask);

        // 2. 弹窗体
        const dialogW = Math.min(cw * 0.9, 600 * scaleFactor);
        const dialogH = Math.min(ch * 0.72, 620 * scaleFactor);
        const panelShadow = this.createRectNode('PanelShadow', '#203316', dialogW, dialogH, 34 * scaleFactor, 112);
        panelShadow.setPosition(0, -8 * scaleFactor, 0);
        this.roomActionDialog.addChild(panelShadow);

        const dialog = this.createRectNode('Dialog', '#fff8df', dialogW, dialogH, 34 * scaleFactor);
        dialog.name = 'DialogNode';
        this.roomActionDialog.addChild(dialog);

        const topBand = this.createRectNode('TopBand', '#e9f4d6', dialogW - 34 * scaleFactor, 116 * scaleFactor, 28 * scaleFactor, 255);
        topBand.setPosition(0, dialogH / 2 - 74 * scaleFactor, 0);
        dialog.addChild(topBand);

        // 3. 关闭按钮
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
            this.hideRoomActionDialog();
        }, this);

        // 4. 标题和副标题
        const headerBadge = this.createCircleNode('HeaderBadge', '#148437', 24 * scaleFactor);
        headerBadge.setPosition(-142 * scaleFactor, dialogH / 2 - 60 * scaleFactor, 0);
        dialog.addChild(headerBadge);

        const headerIcon = this.createDifficultyOptionIcon('HeaderRoom', '#148437', '#f7fff2', 30 * scaleFactor, 'swords', scaleFactor);
        headerBadge.addChild(headerIcon);

        const title = this.createLabelNode('Title', '房间对战', 34 * scaleFactor, '#146c38', true);
        title.setPosition(12 * scaleFactor, dialogH / 2 - 54 * scaleFactor, 0);
        dialog.addChild(title);

        const subtitle = this.createLabelNode('Subtitle', '全网随机匹配，或与好友创建/加入房间', 18 * scaleFactor, '#647044', false);
        subtitle.setPosition(12 * scaleFactor, dialogH / 2 - 92 * scaleFactor, 0);
        dialog.addChild(subtitle);

        // 5. 三个功能选项卡片 (风格与难度选择选项保持完全一致)
        const btnW = dialogW - 48 * scaleFactor;
        const btnH = 96 * scaleFactor;
        const btnRadius = 22 * scaleFactor;
        const btnGap = 14 * scaleFactor;
        const btn1Y = dialogH / 2 - 186 * scaleFactor;
        const btn2Y = btn1Y - btnH - btnGap;
        const btn3Y = btn2Y - btnH - btnGap;

        this.createRoomActionButton(dialog, {
            name: 'Match',
            y: btn1Y,
            width: btnW,
            height: btnH,
            radius: btnRadius,
            icon: 'VS',
            title: '全网随机匹配',
            subtitle: '自动寻找合适对手',
            fillHex: '#27ae60',
            shadowHex: '#145a32',
            iconHex: '#e9fff0',
            onClick: () => {
                this.hideRoomActionDialog();
                this.showMatchmakingDialog();
            },
            scaleFactor,
        });

        this.createRoomActionButton(dialog, {
            name: 'Create',
            y: btn2Y,
            width: btnW,
            height: btnH,
            radius: btnRadius,
            icon: '+',
            title: '创建专属房间',
            subtitle: '生成房间号邀请好友',
            fillHex: '#d68118',
            shadowHex: '#7f4400',
            iconHex: '#fff3d4',
            onClick: () => {
                this.hideRoomActionDialog();
                this.showCreateRoomDialog();
            },
            scaleFactor,
        });

        this.createRoomActionButton(dialog, {
            name: 'Join',
            y: btn3Y,
            width: btnW,
            height: btnH,
            radius: btnRadius,
            icon: '#',
            title: '输入房间号加入',
            subtitle: '输入 6 位数字开局',
            fillHex: '#2980b9',
            shadowHex: '#1a5276',
            iconHex: '#e7f5ff',
            onClick: () => {
                this.hideRoomActionDialog();
                this.showJoinRoomKeyboard();
            },
            scaleFactor,
        });

        // 动画弹出
        this.roomActionDialog.active = true;
        const dialogNode = this.roomActionDialog.getChildByName('DialogNode')!;
        dialogNode.setScale(new Vec3(0.85, 0.85, 1.0));
        tween(dialogNode)
            .to(0.2, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
            .start();
    }

    /**
     * 创建房间入口弹窗中的带图标操作卡片（与难度选择选项卡片统一风格）。
     */
    private createRoomActionButton(
        parent: Node,
        options: {
            name: string;
            y: number;
            width: number;
            height: number;
            radius: number;
            icon: string;
            title: string;
            subtitle: string;
            fillHex: string;
            shadowHex: string;
            iconHex: string;
            onClick: () => void;
            scaleFactor: number;
        }
    ): Node {
        const shadow = this.createRectNode(`${options.name}Shadow`, '#6a5229', options.width - 2 * options.scaleFactor, options.height - 2 * options.scaleFactor, options.radius, 42);
        shadow.setPosition(0, options.y - 3 * options.scaleFactor, 0);
        parent.addChild(shadow);

        const button = this.createRectNode(`${options.name}Btn`, '#fffdfa', options.width, options.height, options.radius, 250);
        button.setPosition(0, options.y, 0);
        parent.addChild(button);

        const accentWash = this.createRectNode(`${options.name}Wash`, options.fillHex, 68 * options.scaleFactor, options.height - 20 * options.scaleFactor, 20 * options.scaleFactor, 34);
        accentWash.setPosition(-options.width / 2 + 42 * options.scaleFactor, 0, 0);
        button.addChild(accentWash);

        const badge = this.createCircleNode(`${options.name}Badge`, options.fillHex, 28 * options.scaleFactor, 230);
        badge.setPosition(-options.width / 2 + 66 * options.scaleFactor, 0, 0);
        button.addChild(badge);

        const iconLabel = this.createLabelNode(`${options.name}Icon`, options.icon, 22 * options.scaleFactor, '#ffffff', true);
        badge.addChild(iconLabel);

        const textStartX = -options.width / 2 + 112 * options.scaleFactor;
        const title = this.createLabelNode(`${options.name}Title`, options.title, 24 * options.scaleFactor, '#66572d', true);
        title.getComponent(UITransform)?.setAnchorPoint(0, 0.5);
        const titleLabel = title.getComponent(Label);
        if (titleLabel) {
            titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        }
        title.setPosition(textStartX, 14 * options.scaleFactor, 0);
        button.addChild(title);

        const subtitle = this.createLabelNode(`${options.name}Subtitle`, options.subtitle, 15 * options.scaleFactor, '#9f9276', false);
        subtitle.getComponent(UITransform)?.setAnchorPoint(0, 0.5);
        const subtitleLabel = subtitle.getComponent(Label);
        if (subtitleLabel) {
            subtitleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        }
        subtitle.setPosition(textStartX, -18 * options.scaleFactor, 0);
        button.addChild(subtitle);

        const arrow = this.createLabelNode(`${options.name}Arrow`, '›', 28 * options.scaleFactor, '#66572d', true);
        arrow.setPosition(options.width / 2 - 31 * options.scaleFactor, 0, 0);
        button.addChild(arrow);

        button.addComponent(Button);
        button.on(Node.EventType.TOUCH_START, () => {
            button.setScale(new Vec3(0.97, 0.97, 1.0));
            shadow.setScale(new Vec3(0.97, 0.97, 1.0));
        }, this);
        button.on(Node.EventType.TOUCH_END, () => {
            button.setScale(new Vec3(1.0, 1.0, 1.0));
            shadow.setScale(new Vec3(1.0, 1.0, 1.0));
            AudioSynth.playClick();
            options.onClick();
        }, this);
        button.on(Node.EventType.TOUCH_CANCEL, () => {
            button.setScale(new Vec3(1.0, 1.0, 1.0));
            shadow.setScale(new Vec3(1.0, 1.0, 1.0));
        }, this);

        return button;
    }

    private hideRoomActionDialog() {
        if (!this.roomActionDialog) return;
        const dialogNode = this.roomActionDialog.getChildByName('DialogNode');
        if (dialogNode) {
            tween(dialogNode)
                .to(0.15, { scale: new Vec3(0.85, 0.85, 1.0) }, { easing: 'backIn' })
                .call(() => {
                    if (this.roomActionDialog && this.roomActionDialog.isValid) {
                        this.roomActionDialog.destroy();
                        this.roomActionDialog = null;
                    }
                })
                .start();
        } else {
            this.roomActionDialog.destroy();
            this.roomActionDialog = null;
        }
    }

    private showJoinRoomKeyboard() {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.min(cw / refW, ch / refH);

        if (this.joinRoomDialog && this.joinRoomDialog.isValid) {
            this.joinRoomDialog.destroy();
            this.joinRoomDialog = null;
        }

        this.currentInputCode = '';
        this.isJoinRoomSubmitting = false;
        this.joinRoomEditBox = null;

        this.joinRoomDialog = new Node('JoinRoomDialog');
        this.joinRoomDialog.layer = 33554432;
        this.joinRoomDialog.addComponent(UITransform).setContentSize(cw, ch);
        canvas.addChild(this.joinRoomDialog);

        // 1. 遮罩
        const mask = this.createRectNode('Mask', '#000000', cw, ch, 0, 150);
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => this.hideJoinRoomKeyboard(), this);
        this.joinRoomDialog.addChild(mask);

        // 2. 弹窗体
        const dialogW = Math.min(cw * 0.92, 580 * scaleFactor);
        const dialogH = Math.min(ch * 0.85, 620 * scaleFactor);
        const dialog = this.createRectNode('Dialog', '#fff8df', dialogW, dialogH, 30 * scaleFactor);
        dialog.name = 'DialogNode';
        this.joinRoomDialog.addChild(dialog);

        // 3. 关闭按钮
        const closeBtn = this.createCircleNode('CloseBtn', '#d63a2f', 22 * scaleFactor);
        closeBtn.setPosition(dialogW / 2 - 28 * scaleFactor, dialogH / 2 - 28 * scaleFactor, 0);
        dialog.addChild(closeBtn);
        const closeTxt = this.createLabelNode('CloseTxt', '×', 30 * scaleFactor, '#ffffff', true);
        closeBtn.addChild(closeTxt);
        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            this.hideJoinRoomKeyboard();
        }, this);

        // 4. 标题和副标题
        const title = this.createLabelNode('Title', '加入对局', 32 * scaleFactor, '#695f00', true);
        title.setPosition(0, dialogH / 2 - 45 * scaleFactor, 0);
        dialog.addChild(title);

        const subtitle = this.createLabelNode('Subtitle', '请输入6位数字房间号', 18 * scaleFactor, '#9a8d5d', false);
        subtitle.setPosition(0, dialogH / 2 - 75 * scaleFactor, 0);
        dialog.addChild(subtitle);

        // 5. 6位输入格子
        const inputContainer = new Node('InputContainer');
        inputContainer.layer = 33554432;
        inputContainer.setPosition(0, dialogH / 2 - 130 * scaleFactor, 0);
        dialog.addChild(inputContainer);

        const gridW = 56 * scaleFactor;
        const gridH = 68 * scaleFactor;
        const gridGap = 10 * scaleFactor;
        const startX = -((gridW * 6 + gridGap * 5) / 2) + gridW / 2;

        this.inputGridLabels = [];
        for (let i = 0; i < 6; i++) {
            const gridBg = this.createRectNode(`GridBg_${i}`, '#ffffff', gridW, gridH, 12 * scaleFactor, 248);
            gridBg.setPosition(startX + i * (gridW + gridGap), 0, 0);
            inputContainer.addChild(gridBg);

            const gg = gridBg.getComponent(Graphics)!;
            gg.lineWidth = 2.5 * scaleFactor;
            gg.strokeColor = new Color(215, 205, 185, 255);
            gg.roundRect(-gridW/2, -gridH/2, gridW, gridH, 12 * scaleFactor);
            gg.stroke();

            const lbl = this.createLabelNode(`Label`, '_', 34 * scaleFactor, '#9a8d5d', true);
            gridBg.addChild(lbl);
            this.inputGridLabels.push(lbl.getComponent(Label)!);
        }

        const tapHint = this.createLabelNode('TapHint', '点击按键或系统键盘输入6位数字', 16 * scaleFactor, '#7f7346', false);
        tapHint.setPosition(0, dialogH / 2 - 180 * scaleFactor, 0);
        dialog.addChild(tapHint);

        const inputTouchArea = new Node('InputTouchArea');
        inputTouchArea.layer = 33554432;
        inputTouchArea.addComponent(UITransform).setContentSize(gridW * 6 + gridGap * 5 + 24 * scaleFactor, gridH + 24 * scaleFactor);
        inputTouchArea.setPosition(inputContainer.position);
        dialog.addChild(inputTouchArea);
        inputTouchArea.addComponent(Button);
        inputTouchArea.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            this.focusJoinRoomInput();
        }, this);

        const editBoxNode = new Node('JoinRoomEditBox');
        editBoxNode.layer = 33554432;
        editBoxNode.addComponent(UITransform).setContentSize(gridW * 6 + gridGap * 5, gridH);
        editBoxNode.setPosition(0, 0, 0);
        inputTouchArea.addChild(editBoxNode);

        const textLabelNode = this.createLabelNode('EditBoxText', '', 2, '#000000', false);
        const textLabel = textLabelNode.getComponent(Label)!;
        textLabel.color = new Color(0, 0, 0, 0);
        editBoxNode.addChild(textLabelNode);

        const placeholderLabelNode = this.createLabelNode('EditBoxPlaceholder', '', 2, '#000000', false);
        const placeholderLabel = placeholderLabelNode.getComponent(Label)!;
        placeholderLabel.color = new Color(0, 0, 0, 0);
        editBoxNode.addChild(placeholderLabelNode);

        const editBox = editBoxNode.addComponent(EditBox);
        editBox.string = '';
        editBox.maxLength = 6;
        editBox.inputMode = EditBox.InputMode.NUMERIC;
        editBox.returnType = EditBox.KeyboardReturnType.DONE;
        editBox.textLabel = textLabel;
        editBox.placeholderLabel = placeholderLabel;
        this.joinRoomEditBox = editBox;

        editBoxNode.on(EditBox.EventType.TEXT_CHANGED, (target: any) => {
            this.onJoinRoomInputChanged(target);
        }, this);
        editBoxNode.on(EditBox.EventType.EDITING_RETURN, () => {
            this.trySubmitJoinRoomCode();
        }, this);

        // 6. UI 虚拟数字九宫格键盘
        const keypadContainer = new Node('KeypadContainer');
        keypadContainer.layer = 33554432;
        keypadContainer.setPosition(0, dialogH / 2 - 385 * scaleFactor, 0);
        dialog.addChild(keypadContainer);

        const keysData = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['清空', '0', '⌫']
        ];
        const btnW = Math.floor((dialogW - 70 * scaleFactor) / 3);
        const btnH = 56 * scaleFactor;
        const gapX = 14 * scaleFactor;
        const gapY = 12 * scaleFactor;

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 3; col++) {
                const val = keysData[row][col];
                const posX = (col - 1) * (btnW + gapX);
                const posY = (1.5 - row) * (btnH + gapY);

                const isFunc = val === '清空' || val === '⌫';
                const bgHex = isFunc ? '#f0e6ce' : '#ffffff';
                const textColor = isFunc ? '#903828' : '#5a4b10';

                const keyBg = this.createRectNode(`Key_${val}`, bgHex, btnW, btnH, 14 * scaleFactor, 255);
                keyBg.setPosition(posX, posY, 0);
                keypadContainer.addChild(keyBg);

                const gg = keyBg.getComponent(Graphics)!;
                gg.lineWidth = 1.5 * scaleFactor;
                gg.strokeColor = new Color(215, 205, 185, 255);
                gg.roundRect(-btnW/2, -btnH/2, btnW, btnH, 14 * scaleFactor);
                gg.stroke();

                const lblNode = this.createLabelNode(`KeyLbl_${val}`, val, isFunc ? 22 * scaleFactor : 28 * scaleFactor, textColor, true);
                keyBg.addChild(lblNode);

                keyBg.addComponent(Button);
                keyBg.on(Node.EventType.TOUCH_END, () => {
                    AudioSynth.playClick();
                    if (val === '⌫') {
                        if (this.currentInputCode.length > 0) {
                            this.onJoinRoomInputChanged(this.currentInputCode.slice(0, -1));
                        }
                    } else if (val === '清空') {
                        this.onJoinRoomInputChanged('');
                    } else {
                        if (this.currentInputCode.length < 6) {
                            this.onJoinRoomInputChanged(this.currentInputCode + val);
                        }
                    }
                }, this);
            }
        }

        // 7. 绑定桌面/Web物理键盘事件
        if (this.roomKeydownListener) {
            if (typeof window !== 'undefined' && window.removeEventListener) {
                window.removeEventListener('keydown', this.roomKeydownListener);
            }
        }
        this.roomKeydownListener = (e: KeyboardEvent) => {
            if (!this.joinRoomDialog || !this.joinRoomDialog.isValid) return;
            if (e.key >= '0' && e.key <= '9') {
                if (this.currentInputCode.length < 6) {
                    this.onJoinRoomInputChanged(this.currentInputCode + e.key);
                }
            } else if (e.key === 'Backspace') {
                if (this.currentInputCode.length > 0) {
                    this.onJoinRoomInputChanged(this.currentInputCode.slice(0, -1));
                }
            } else if (e.key === 'Enter') {
                this.trySubmitJoinRoomCode();
            }
        };
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('keydown', this.roomKeydownListener);
        }

        this.updateInputDisplay();

        // 动画弹出
        this.joinRoomDialog.active = true;
        const dialogNode = this.joinRoomDialog.getChildByName('DialogNode')!;
        dialogNode.setScale(new Vec3(0.85, 0.85, 1.0));
        tween(dialogNode)
            .to(0.2, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
            .start();

        this.scheduleOnce(() => {
            this.focusJoinRoomInput();
        }, 0.05);
    }

    private hideJoinRoomKeyboard() {
        if (this.roomKeydownListener) {
            if (typeof window !== 'undefined' && window.removeEventListener) {
                window.removeEventListener('keydown', this.roomKeydownListener);
            }
            this.roomKeydownListener = null;
        }
        const wxObj = (globalThis as any).wx;
        if (wxObj && typeof wxObj.hideKeyboard === 'function') {
            wxObj.hideKeyboard({});
        }

        this.joinRoomEditBox = null;
        this.currentInputCode = '';
        this.isJoinRoomSubmitting = false;
        if (!this.joinRoomDialog) return;
        const dialogNode = this.joinRoomDialog.getChildByName('DialogNode');
        if (dialogNode) {
            tween(dialogNode)
                .to(0.15, { scale: new Vec3(0.85, 0.85, 1.0) }, { easing: 'backIn' })
                .call(() => {
                    if (this.joinRoomDialog && this.joinRoomDialog.isValid) {
                        this.joinRoomDialog.destroy();
                        this.joinRoomDialog = null;
                    }
                })
                .start();
        } else {
            this.joinRoomDialog.destroy();
            this.joinRoomDialog = null;
        }
    }

    private focusJoinRoomInput() {
        const wxObj = (globalThis as any).wx;
        if (wxObj && typeof wxObj.showKeyboard === 'function') {
            wxObj.showKeyboard({
                defaultValue: this.currentInputCode || '',
                maxLength: 6,
                multiple: false,
                confirmHold: false,
                confirmType: 'done',
            });

            const onInput = (res: any) => {
                if (res && typeof res.value === 'string') {
                    this.onJoinRoomInputChanged(res.value);
                }
            };
            const onConfirm = (res: any) => {
                if (res && typeof res.value === 'string') {
                    this.onJoinRoomInputChanged(res.value);
                }
                if (typeof wxObj.hideKeyboard === 'function') {
                    wxObj.hideKeyboard({});
                }
                this.trySubmitJoinRoomCode();
            };

            if (typeof wxObj.offKeyboardInput === 'function') {
                wxObj.offKeyboardInput(onInput);
            }
            if (typeof wxObj.offKeyboardConfirm === 'function') {
                wxObj.offKeyboardConfirm(onConfirm);
            }

            if (typeof wxObj.onKeyboardInput === 'function') {
                wxObj.onKeyboardInput(onInput);
            }
            if (typeof wxObj.onKeyboardConfirm === 'function') {
                wxObj.onKeyboardConfirm(onConfirm);
            }
        }

        if (this.joinRoomEditBox && this.joinRoomEditBox.isValid) {
            this.joinRoomEditBox.focus();
        }
    }

    private onJoinRoomInputChanged(input: any) {
        let str = '';
        if (typeof input === 'string') {
            str = input;
        } else if (input && typeof input.string === 'string') {
            str = input.string;
        } else if (this.joinRoomEditBox && typeof this.joinRoomEditBox.string === 'string') {
            str = this.joinRoomEditBox.string;
        }

        const nextCode = str.replace(/\D/g, '').slice(0, 6);
        if (this.joinRoomEditBox && this.joinRoomEditBox.string !== nextCode) {
            this.joinRoomEditBox.string = nextCode;
        }
        this.currentInputCode = nextCode;
        this.updateInputDisplay();

        if (this.currentInputCode.length === 6) {
            this.scheduleOnce(() => {
                this.trySubmitJoinRoomCode();
            }, 0.2);
        }
    }

    private trySubmitJoinRoomCode() {
        if (this.isJoinRoomSubmitting) {
            return;
        }
        if (this.currentInputCode.length !== 6) {
            this.showToast("请输入6位房间号！");
            this.focusJoinRoomInput();
            return;
        }

        this.isJoinRoomSubmitting = true;
        const code = this.currentInputCode;
        this.hideJoinRoomKeyboard();
        this.startOnlineMatch(code);
    }

    private updateInputDisplay() {
        for (let i = 0; i < 6; i++) {
            const char = this.currentInputCode.charAt(i);
            const lbl = this.inputGridLabels[i];
            if (lbl && lbl.isValid) {
                lbl.string = char || '_';
                lbl.color = char ? new Color(0, 110, 28, 255) : new Color(154, 141, 93, 255);
            }
        }
    }
}
