import { _decorator, Component, Node, Label, Color, UITransform, Graphics, Vec3, tween, Button, director, resources, SpriteFrame, Sprite, Texture2D, ImageAsset, UIOpacity, sys, ScrollView, Mask } from 'cc';
import { AudioSynth } from '../utils/AudioSynth';
import { AuthManager } from '../utils/AuthManager';
import { HttpError } from '../utils/HttpClient';
import { buildUserScopedSignInStorageKey, hasSignedTodayLocally, markSignedTodayLocally, shouldAutoPopupSignIn } from '../utils/SignInLocalState';
import { SignInApi, SignInStatusResponse } from '../utils/SignInApi';
import { MainMenuSignInOverlay } from './MainMenuSignInOverlay';
import { SignInSuccessAnimation } from './SignInSuccessAnimation';
import { MainMenuProfileOverlay, WechatUserInfo } from './MainMenuProfileOverlay';
import { UserProfileApi } from '../utils/UserProfileApi';
const { ccclass } = _decorator;

@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
    private scaleFactor: number = 1.0;
    private effectsBtnLabel: Label | null = null;
    private pointsBadgeValueLabel: Label | null = null;
    private signInEntryButton: Node | null = null;
    private signInEntryTitleLabel: Label | null = null;
    private signInEntryStatusLabel: Label | null = null;
    private signInNotifyTag: Node | null = null;
    private signInOverlay: MainMenuSignInOverlay | null = null;
    private signInStatus: SignInStatusResponse | null = null;
    private signInInitializing: boolean = false;
    private signInSubmitting: boolean = false;
    private signInAutoPopupShown: boolean = false;
    private signInUserId: number | null = null;
    private profileLabel: Label | null = null;
    private profileOverlay: MainMenuProfileOverlay | null = null;
    private isStartTransitioning: boolean = false;

    /**
     * 获取当前签到本地状态对应的用户标识。
     */
    private getSignInUserId(): number {
        return this.signInUserId ?? 0;
    }

    /**
     * 获取当前用户的签到展示缓存键。
     */
    private getSignInStorageKey(baseKey: string): string {
        return buildUserScopedSignInStorageKey(baseKey, this.getSignInUserId());
    }
    
    onLoad() {
        this.buildUI();
    }

    start() {
        void this.initializeSignInFeature();
        this.initializeProfileFeature();
    }

    onDestroy() {
        this.signInOverlay?.destroy();
        this.signInOverlay = null;
        this.profileOverlay?.destroy();
        this.profileOverlay = null;
    }

    private buildUI() {
        console.log('=== MainMenuUI buildUI V4 ===');
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;

        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.min(cw / refW, ch / refH);
        this.scaleFactor = scaleFactor;

        // 1. Background
        const bgNode = new Node('Background');
        bgNode.layer = 33554432;
        bgNode.setScale(new Vec3(1.04, 1.04, 1));
        const bgTrans = bgNode.addComponent(UITransform);
        bgTrans.setContentSize(cw, ch);
        canvas.addChild(bgNode);

        const blurOffsets = [
            new Vec3(0, 0, 0),
            new Vec3(-6 * scaleFactor, 0, 0),
            new Vec3(6 * scaleFactor, 0, 0),
            new Vec3(0, -6 * scaleFactor, 0),
            new Vec3(0, 6 * scaleFactor, 0),
        ];
        blurOffsets.forEach((offset, index) => {
            const layerNode = new Node(index === 0 ? 'BgSharpHalf' : `BgBlurLayer${index}`);
            layerNode.layer = 33554432;
            layerNode.setPosition(offset);
            const layerTrans = layerNode.addComponent(UITransform);
            layerTrans.setContentSize(cw, ch);
            const layerSprite = layerNode.addComponent(Sprite);
            layerSprite.sizeMode = 0;
            layerSprite.color = new Color(255, 255, 255, index === 0 ? 128 : 64);
            this.safeLoadSprite('textures/main_menu_bg', layerSprite);
            bgNode.addChild(layerNode);
        });

        // 立即根据当前设置更新背景模糊效果 (如果是低特效模式则只保留单层不透明，如果是高特效模式则开启 5 层重合模糊效果)
        this.updateBackgroundEffects();

        const bgWash = this.createRectNode('BgWash', '#f6ffe8', cw, ch, 0, 36);
        canvas.addChild(bgWash);

        // 1.5 森林微光特效粒子层 (加在背景 wash 层之上，卡片及 UI 之下)
        if (sys.localStorage.getItem('jungle_effects_enabled') !== 'false') {
            this.createForestFireflies(canvas, scaleFactor);
        }

        // 2. Top Bar (已删除顶部个人信息模块，保留 topBarHeight 供后续排版计算使用)
        const topBarHeight = Math.max(100, Math.min(130, 130 * scaleFactor));

        this.createPointsBadge(canvas, cw, ch, scaleFactor);
        this.createSignInEntry(canvas, cw, ch, scaleFactor);
        this.createProfileEntry(canvas, cw, ch, scaleFactor);


        // 3. Main Emblem
        // isPortrait 和 scaleFactor 已在顶部计算和初始化

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
        let emblemTopLimit: number;
        let emblemBottomLimit: number;

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
            
            // 游戏标题“勇者来斗兽”移动到顶部栏下方
            titleY = topBarMinY - 60 * scaleFactor;
            
            // 徽章中心 Y 坐标设在标题下边缘和开始按钮上边缘的几何中心，确保对称美观
            const titleBottomY = titleY - 30 * scaleFactor;
            emblemY = (titleBottomY + startBtnY + hStart / 2) / 2;
            emblemTopLimit = topBarMinY;
            emblemBottomLimit = startBtnY + hStart / 2;
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
            
            // 游戏标题“勇者来斗兽”移动到顶部栏下方
            titleY = topBarMinY - 40 * scaleFactor;
            
            // 徽章中心 Y 坐标设在标题下边缘和开始按钮上边缘的几何中心，确保对称美观
            const titleBottomY = titleY - 22 * scaleFactor;
            emblemY = (titleBottomY + startBtnY + hStart / 2) / 2;
            emblemTopLimit = topBarMinY;
            emblemBottomLimit = startBtnY + hStart / 2;
        }

        const emblemImg = new Node('EmblemImage');
        emblemImg.layer = 33554432;
        emblemImg.setPosition(0, emblemY, 0);
        const emblemImgTrans = emblemImg.addComponent(UITransform);
        const emblemPadding = 8 * scaleFactor;
        const maxEmblemSizeByTop = Math.max(0, (emblemTopLimit - emblemY - emblemPadding) * 2);
        const maxEmblemSizeByBottom = Math.max(0, (emblemY - emblemBottomLimit - emblemPadding) * 2);
        const emblemImageSize = Math.min(emblemRadius * 2.6, cw * 0.92, maxEmblemSizeByTop, maxEmblemSizeByBottom);
        emblemImgTrans.setContentSize(emblemImageSize, emblemImageSize);
        const emblemSprite = emblemImg.addComponent(Sprite);
        emblemSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.safeLoadUntrimmedSprite('textures/start_emblem', emblemSprite);
        canvas.addChild(emblemImg);

        // 4. Title & Subtitle (由于新图片自带“勇者来斗兽”，此处屏蔽重复的文本渲染)
        // const gameTitleNode = this.createLabelNode('GameTitle', '勇者来斗兽', titleFontSize * 1.25, '#ffb300', true);
        // gameTitleNode.setPosition(0, titleY, 0);
        // canvas.addChild(gameTitleNode);

        // 5. Start Button
        const startBtnNode = this.createRectNode('StartBtn', '#0f801d', startBtnWidth, startBtnHeight, startBtnHeight / 2);
        startBtnNode.setPosition(0, startBtnY, 0);
        canvas.addChild(startBtnNode);

        const startGlow = this.createRectNode('StartGlow', '#56de60', startBtnWidth - 28 * scaleFactor, startBtnHeight * 0.28, (startBtnHeight * 0.28) / 2, 75);
        startGlow.setPosition(0, startBtnHeight * 0.2, 0);
        startBtnNode.addChild(startGlow);

        // 用精美新生成的 start_btn_icon 替代以前用 Graphics 画的白圆圈和字符 "▶"
        const iconSize = playCircleRadius * 2.3;
        const playIconImg = new Node('PlayIconImg');
        playIconImg.layer = 33554432;
        playIconImg.setPosition((isPortrait ? -160 : -110) * scaleFactor * 0.8, 0, 0);
        const iconTrans = playIconImg.addComponent(UITransform);
        iconTrans.setContentSize(iconSize, iconSize);
        const iconSprite = playIconImg.addComponent(Sprite);
        iconSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.safeLoadSprite('textures/start_btn_icon', iconSprite);
        startBtnNode.addChild(playIconImg);

        const startBtnText = this.createLabelNode('StartTxt', '开始游戏', startBtnFontSize, '#ffffff', true);
        startBtnText.setPosition((isPortrait ? 90 : 60) * scaleFactor * 0.8, 2 * scaleFactor, 0);
        startBtnNode.addChild(startBtnText);

        startBtnNode.addComponent(Button);
        startBtnNode.on(Node.EventType.TOUCH_START, () => {
            startBtnNode.setScale(new Vec3(0.96, 0.96, 1));
        }, this);
        startBtnNode.on(Node.EventType.TOUCH_END, () => {
            startBtnNode.setScale(new Vec3(1, 1, 1));
            AudioSynth.playClick();
            this.onStartGame();
        }, this);
        startBtnNode.on(Node.EventType.TOUCH_CANCEL, () => {
            startBtnNode.setScale(new Vec3(1, 1, 1));
        }, this);

        // 6. Bottom Buttons (排除了退出按钮，现在是 2 个并排排列)
        const bottomBtnWidth = (startBtnWidth - 10 * scaleFactor) / 2;
        
        // 计算通用 3D 高光参数 (贴近按钮顶部边缘，采用窄边、低透明度以实现极度柔和自然的 3D 质感)
        const glowW = bottomBtnWidth - 16 * scaleFactor;
        const glowH = bottomBtnHeight * 0.18; // 高度缩减为 18%
        const glowRadius = Math.max(0, bottomBtnRadius * 0.65);
        const glowY = bottomBtnHeight * 0.28; // 往上偏移至 28%

        // 6.1 游戏玩法按钮 (与整套森林风格搭配，使用清新的淡绿色，靠左侧排列)
        const rulesBtn = this.createRectNode('RulesBtn', '#d4ebd1', bottomBtnWidth, bottomBtnHeight, bottomBtnRadius);
        rulesBtn.setPosition(-bottomBtnWidth / 2 - 5 * scaleFactor, bottomBtnY, 0);
        canvas.addChild(rulesBtn);

        // 玩法按钮 3D 高光层 (清新白绿微光高光，Alpha 降至 70)
        const rulesGlow = this.createRectNode('RulesGlow', '#f1faf0', glowW, glowH, glowRadius, 70);
        rulesGlow.setPosition(0, glowY, 0);
        rulesBtn.addChild(rulesGlow);

        const rulesTxt = this.createLabelNode('RulesTxt', '游戏玩法', bottomBtnFontSize, '#1e4a1a', true);
        rulesBtn.addChild(rulesTxt);
        rulesBtn.addComponent(Button);
        rulesBtn.on(Node.EventType.TOUCH_START, () => {
            rulesBtn.setScale(new Vec3(0.96, 0.96, 1));
        }, this);
        rulesBtn.on(Node.EventType.TOUCH_END, () => {
            rulesBtn.setScale(new Vec3(1, 1, 1));
            AudioSynth.playClick();
            this.onRulesClicked();
        }, this);
        rulesBtn.on(Node.EventType.TOUCH_CANCEL, () => {
            rulesBtn.setScale(new Vec3(1, 1, 1));
        }, this);

        // 6.2 系统设置按钮 (靠右侧排列)
        const settingsBtn = this.createRectNode('SettingsBtn', '#efe6c8', bottomBtnWidth, bottomBtnHeight, bottomBtnRadius);
        settingsBtn.setPosition(bottomBtnWidth / 2 + 5 * scaleFactor, bottomBtnY, 0);
        canvas.addChild(settingsBtn);

        // 设置按钮 3D 高光层 (通透白微光高光，Alpha 降至 65)
        const settingsGlow = this.createRectNode('SettingsGlow', '#ffffff', glowW, glowH, glowRadius, 65);
        settingsGlow.setPosition(0, glowY, 0);
        settingsBtn.addChild(settingsGlow);

        const settingsTxt = this.createLabelNode('SettingsTxt', '系统设置', bottomBtnFontSize, '#44493f', true);
        settingsBtn.addChild(settingsTxt);
        settingsBtn.addComponent(Button);
        settingsBtn.on(Node.EventType.TOUCH_START, () => {
            settingsBtn.setScale(new Vec3(0.96, 0.96, 1));
        }, this);
        settingsBtn.on(Node.EventType.TOUCH_END, () => {
            settingsBtn.setScale(new Vec3(1, 1, 1));
            AudioSynth.playClick();
            this.onSettingsGame();
        }, this);
        settingsBtn.on(Node.EventType.TOUCH_CANCEL, () => {
            settingsBtn.setScale(new Vec3(1, 1, 1));
        }, this);
    }

    private createProfileEntry(canvas: Node, cw: number, ch: number, scaleFactor: number): void {
        const profileNode = new Node('ProfileEntry');
        profileNode.layer = 33554432;
        profileNode.addComponent(UITransform).setContentSize(260 * scaleFactor, 54 * scaleFactor);
        profileNode.setPosition(cw / 2 - 145 * scaleFactor, ch / 2 - 48 * scaleFactor, 0);
        const label = profileNode.addComponent(Label);
        label.fontSize = 18 * scaleFactor;
        label.color = new Color(64, 89, 45, 255);
        label.horizontalAlign = Label.HorizontalAlign.RIGHT;
        label.string = '微信用户';
        this.profileLabel = label;
        profileNode.on(Node.EventType.TOUCH_END, () => this.showProfileAuthorization(), this);
        canvas.addChild(profileNode);
        this.updateProfileDisplay(AuthManager.getStoredUser());
    }

    private initializeProfileFeature(): void {
        if (!AuthManager.isWechatSupported() || AuthManager.getStoredUser()?.nickname) {
            console.log('[MainMenuUI] initializeProfileFeature skipped: unsupported environment or profile already cached');
            return;
        }
        console.log('[MainMenuUI] initializeProfileFeature skipped: wait user tap profile entry');
    }

    private showProfileAuthorization(): void {
        const wxObj = (globalThis as any).wx;
        if (!wxObj || typeof wxObj.createUserInfoButton !== 'function') {
            console.log('[MainMenuUI] showProfileAuthorization skipped: native user info button unavailable');
            return;
        }
        if (!this.profileOverlay) {
            this.profileOverlay = new MainMenuProfileOverlay(this.node, this.scaleFactor, (profile) => {
                void this.submitUserProfile(profile);
            });
        }
        this.profileOverlay.show();
    }

    private async submitUserProfile(profile: WechatUserInfo): Promise<void> {
        const nickname = typeof profile.nickName === 'string' ? profile.nickName.trim() : '';
        const avatarUrl = typeof profile.avatarUrl === 'string' ? profile.avatarUrl.trim() : '';
        this.profileOverlay?.hide();
        if (!nickname && !avatarUrl) {
            console.log('[MainMenuUI] submitUserProfile skipped: empty user info');
            return;
        }
        try {
            if (!AuthManager.getToken()) {
                await AuthManager.ensureLogin();
            }
            const user = await UserProfileApi.updateProfile({ nickname, avatarUrl });
            this.updateProfileDisplay(user ?? AuthManager.getStoredUser());
        } catch (error) {
            console.warn('[MainMenuUI] submitUserProfile failed:', error);
            this.showToast('资料保存失败，请重试');
            this.profileOverlay?.show();
        }
    }

    private updateProfileDisplay(user: { nickname?: string } | null): void {
        if (this.profileLabel?.isValid && user?.nickname) {
            this.profileLabel.string = user.nickname;
        }
    }

    /**
     * 创建首页积分展示（重绘：羊皮纸木纹底座 + 金币徽章）
     */
    private createPointsBadge(canvas: Node, cw: number, ch: number, scaleFactor: number) {
        const badgeWidth = Math.min(cw * 0.32, 220 * scaleFactor);
        const badgeHeight = 84 * scaleFactor;
        const badgeRadius = 24 * scaleFactor;

        // 主体卡片（古朴羊皮纸底座）
        const badge = this.createRectNode('PointsBadge', '#fcf6e8', badgeWidth, badgeHeight, badgeRadius, 255);
        badge.setPosition(-cw / 2 + badgeWidth / 2 + 24 * scaleFactor, ch / 2 - badgeHeight / 2 - 58 * scaleFactor, 0);

        // 双层精致边框绘制
        const badgeG = badge.getComponent(Graphics)!;
        badgeG.lineWidth = 3 * scaleFactor;
        badgeG.strokeColor = new Color(219, 185, 114, 255); // 暖金木描边
        badgeG.roundRect(-badgeWidth / 2, -badgeHeight / 2, badgeWidth, badgeHeight, badgeRadius);
        badgeG.stroke();

        badgeG.lineWidth = 1.5 * scaleFactor;
        badgeG.strokeColor = new Color(255, 255, 255, 160); // 内衬微亮光
        badgeG.roundRect(-badgeWidth / 2 + 4 * scaleFactor, -badgeHeight / 2 + 4 * scaleFactor, badgeWidth - 8 * scaleFactor, badgeHeight - 8 * scaleFactor, badgeRadius - 4 * scaleFactor);
        badgeG.stroke();

        // 左侧金币图标徽章
        const iconSize = 50 * scaleFactor;
        const iconCircle = this.createCircleNode('CoinIcon', '#f5b025', iconSize / 2, 255);
        iconCircle.setPosition(-badgeWidth / 2 + 36 * scaleFactor, 0, 0);

        const iconG = iconCircle.getComponent(Graphics)!;
        iconG.lineWidth = 2 * scaleFactor;
        iconG.strokeColor = new Color(255, 248, 220, 255);
        iconG.circle(0, 0, iconSize / 2);
        iconG.stroke();

        const coinSymbol = this.createLabelNode('CoinSymbol', '🪙', 24 * scaleFactor, '#ffffff', true);
        coinSymbol.setPosition(0, 0, 0);
        iconCircle.addChild(coinSymbol);
        badge.addChild(iconCircle);

        // 右侧文字区（左对齐）
        const textX = -badgeWidth / 2 + 70 * scaleFactor;

        const titleNode = this.createLabelNode('PointsBadgeTitle', '当前积分', 16 * scaleFactor, '#7c5c24', true);
        const titleTrans = titleNode.getComponent(UITransform)!;
        titleTrans.setAnchorPoint(0, 0.5);
        titleNode.setPosition(textX, 15 * scaleFactor, 0);
        badge.addChild(titleNode);

        const valueNode = this.createLabelNode('PointsBadgeValue', '加载中...', 24 * scaleFactor, '#167a28', true);
        const valueTrans = valueNode.getComponent(UITransform)!;
        valueTrans.setAnchorPoint(0, 0.5);
        valueNode.setPosition(textX, -15 * scaleFactor, 0);
        this.pointsBadgeValueLabel = valueNode.getComponent(Label);
        badge.addChild(valueNode);

        canvas.addChild(badge);
    }

    /**
     * 创建主菜单签到入口（重绘：深森林绿卡片 + 礼物盒徽章 + 提醒 Tag）
     */
    private createSignInEntry(canvas: Node, cw: number, ch: number, scaleFactor: number) {
        if (this.signInEntryButton && this.signInEntryButton.isValid) {
            this.signInEntryButton.destroy();
            this.signInEntryButton = null;
        }

        const entryWidth = Math.min(cw * 0.32, 220 * scaleFactor);
        const entryHeight = 84 * scaleFactor;
        const entryRadius = 24 * scaleFactor;

        const badgeY = ch / 2 - entryHeight / 2 - 58 * scaleFactor;
        const entryY = badgeY - entryHeight - 14 * scaleFactor;

        const entry = this.createRectNode('SignInEntry', '#1e6024', entryWidth, entryHeight, entryRadius, 245);
        entry.setPosition(-cw / 2 + entryWidth / 2 + 24 * scaleFactor, entryY, 0);
        entry.active = true;

        // 双描边与 3D 高光
        const entryG = entry.getComponent(Graphics)!;
        entryG.lineWidth = 3 * scaleFactor;
        entryG.strokeColor = new Color(255, 215, 105, 255); // 辉煌金描边
        entryG.roundRect(-entryWidth / 2, -entryHeight / 2, entryWidth, entryHeight, entryRadius);
        entryG.stroke();

        entryG.lineWidth = 1.5 * scaleFactor;
        entryG.strokeColor = new Color(140, 225, 145, 180); // 嫩绿内描边
        entryG.roundRect(-entryWidth / 2 + 4 * scaleFactor, -entryHeight / 2 + 4 * scaleFactor, entryWidth - 8 * scaleFactor, entryHeight - 8 * scaleFactor, entryRadius - 4 * scaleFactor);
        entryG.stroke();

        // 3D 顶部微光
        const entryShine = this.createRectNode('EntryShine', '#ffffff', entryWidth - 16 * scaleFactor, 22 * scaleFactor, 11 * scaleFactor, 35);
        entryShine.setPosition(0, entryHeight / 2 - 16 * scaleFactor, 0);
        entry.addChild(entryShine);

        // 左侧礼物盒/签到徽章
        const iconSize = 50 * scaleFactor;
        const iconCircle = this.createCircleNode('GiftIcon', '#2b8735', iconSize / 2, 255);
        iconCircle.setPosition(-entryWidth / 2 + 36 * scaleFactor, 0, 0);

        const iconG = iconCircle.getComponent(Graphics)!;
        iconG.lineWidth = 2 * scaleFactor;
        iconG.strokeColor = new Color(255, 230, 150, 255);
        iconG.circle(0, 0, iconSize / 2);
        iconG.stroke();

        const giftSymbol = this.createLabelNode('GiftSymbol', '🎁', 24 * scaleFactor, '#ffffff', true);
        giftSymbol.setPosition(0, 0, 0);
        iconCircle.addChild(giftSymbol);
        entry.addChild(iconCircle);

        // 右侧文字区（左对齐）
        const textX = -entryWidth / 2 + 70 * scaleFactor;

        const titleNode = this.createLabelNode('SignInEntryTitle', '森林签到', 20 * scaleFactor, '#fffde7', true);
        const titleTrans = titleNode.getComponent(UITransform)!;
        titleTrans.setAnchorPoint(0, 0.5);
        titleNode.setPosition(textX, 14 * scaleFactor, 0);
        this.signInEntryTitleLabel = titleNode.getComponent(Label);
        entry.addChild(titleNode);

        const statusNode = this.createLabelNode('SignInEntryStatus', '加载中...', 15 * scaleFactor, '#c8e6c9', false);
        const statusTrans = statusNode.getComponent(UITransform)!;
        statusTrans.setAnchorPoint(0, 0.5);
        statusNode.setPosition(textX, -15 * scaleFactor, 0);
        this.signInEntryStatusLabel = statusNode.getComponent(Label);
        entry.addChild(statusNode);

        // 未签到高亮红色/金红红点 Notify Tag
        const tagW = 48 * scaleFactor;
        const tagH = 26 * scaleFactor;
        const notifyTag = this.createRectNode('SignInNotifyTag', '#e74c3c', tagW, tagH, 13 * scaleFactor, 255);
        notifyTag.setPosition(entryWidth / 2 - 14 * scaleFactor, entryHeight / 2 - 4 * scaleFactor, 0);

        const tagG = notifyTag.getComponent(Graphics)!;
        tagG.lineWidth = 1.5 * scaleFactor;
        tagG.strokeColor = new Color(255, 224, 130, 255);
        tagG.roundRect(-tagW / 2, -tagH / 2, tagW, tagH, 13 * scaleFactor);
        tagG.stroke();

        const tagLabel = this.createLabelNode('TagText', '+10', 13 * scaleFactor, '#ffffff', true);
        notifyTag.addChild(tagLabel);
        notifyTag.active = false;
        entry.addChild(notifyTag);
        this.signInNotifyTag = notifyTag;

        // 按钮触控动效
        entry.addComponent(Button);
        entry.on(Node.EventType.TOUCH_START, () => {
            entry.setScale(new Vec3(0.95, 0.95, 1));
        });
        entry.on(Node.EventType.TOUCH_END, () => {
            entry.setScale(new Vec3(1, 1, 1));
            AudioSynth.playClick();
            this.openSignInOverlay();
        }, this);
        entry.on(Node.EventType.TOUCH_CANCEL, () => {
            entry.setScale(new Vec3(1, 1, 1));
        });

        canvas.addChild(entry);
        this.signInEntryButton = entry;
    }

    /**
     * 初始化签到功能
     */
    private async initializeSignInFeature(): Promise<void> {
        if (this.signInInitializing) {
            return;
        }
        this.signInInitializing = true;

        if (this.signInEntryButton) {
            this.signInEntryButton.active = true;
        }

        // 优先根据本地存储预加载 UI 状态，避免因异步接口请求延迟导致误弹或界面闪烁
        const cachedSignedToday = hasSignedTodayLocally(sys.localStorage, this.getSignInUserId());
        const savedPoints = parseInt(sys.localStorage.getItem(this.getSignInStorageKey('animal_chess_total_points')) || '0', 10);
        const savedWeekSignedDays = parseInt(sys.localStorage.getItem(this.getSignInStorageKey('animal_chess_week_signed_days')) || '0', 10);
        const savedWeekContinuousDays = parseInt(sys.localStorage.getItem(this.getSignInStorageKey('animal_chess_week_continuous_days')) || '0', 10);

        if (cachedSignedToday || savedPoints > 0) {
            const initialStatus: SignInStatusResponse = {
                signedToday: cachedSignedToday,
                rewardPoints: 10,
                totalPoints: savedPoints,
                weekSignedDays: savedWeekSignedDays,
                weekContinuousDays: savedWeekContinuousDays,
                signedDates: [],
            };
            this.applySignInStatus(initialStatus);
        } else {
            this.updateSignInEntryState('加载中...');
            this.updatePointsBadge(null, '加载中...');
        }

        if (!AuthManager.isWechatSupported()) {
            console.log('[MainMenuUI] 非微信环境，启用本地预览签到模式');
            const signedToday = hasSignedTodayLocally(sys.localStorage, this.getSignInUserId());
            const mockStatus: SignInStatusResponse = {
                signedToday,
                rewardPoints: 10,
                totalPoints: savedPoints || 100,
                weekSignedDays: savedWeekSignedDays || (signedToday ? 1 : 0),
                weekContinuousDays: savedWeekContinuousDays || (signedToday ? 1 : 0),
                signedDates: [],
            };
            this.applySignInStatus(mockStatus);
            if (shouldAutoPopupSignIn(mockStatus.signedToday, sys.localStorage, this.getSignInUserId()) && !this.signInAutoPopupShown) {
                this.signInAutoPopupShown = true;
                this.openSignInOverlay();
            }
            this.signInInitializing = false;
            return;
        }

        try {
            const user = await AuthManager.ensureLogin();
            this.signInUserId = user.id;
            const status = await this.fetchSignInStatus();
            this.applySignInStatus(status);
            if (shouldAutoPopupSignIn(status.signedToday, sys.localStorage, this.getSignInUserId()) && !this.signInAutoPopupShown) {
                this.signInAutoPopupShown = true;
                this.openSignInOverlay();
            }
        } catch (error) {
            console.warn('[MainMenuUI] initializeSignInFeature error load sign-in status failed:', error);
            if (!cachedSignedToday) {
                this.updatePointsBadge(null, '--');
                this.updateSignInEntryState('签到状态加载失败');
            }
        } finally {
            this.signInInitializing = false;
        }
    }

    /**
     * 拉载签到状态，遇到 token 失效时自动刷新一次
     */
    private async fetchSignInStatus(forceRefresh: boolean = false): Promise<SignInStatusResponse> {
        if (forceRefresh) {
            AuthManager.clear();
        }

        const user = await AuthManager.ensureLogin(forceRefresh);
        this.signInUserId = user.id;
        try {
            return await SignInApi.fetchStatus();
        } catch (error) {
            if (!forceRefresh && this.isUnauthorizedError(error)) {
                return this.fetchSignInStatus(true);
            }
            throw error;
        }
    }

    /**
     * 打开签到弹层
     */
    private openSignInOverlay() {
        if (!this.signInStatus) {
            const savedPoints = parseInt(sys.localStorage.getItem(this.getSignInStorageKey('animal_chess_total_points')) || '0', 10);
            const savedWeekSignedDays = parseInt(sys.localStorage.getItem(this.getSignInStorageKey('animal_chess_week_signed_days')) || '0', 10);
            const savedWeekContinuousDays = parseInt(sys.localStorage.getItem(this.getSignInStorageKey('animal_chess_week_continuous_days')) || '0', 10);
            const signedToday = hasSignedTodayLocally(sys.localStorage, this.getSignInUserId());
            this.signInStatus = {
                signedToday,
                rewardPoints: 10,
                totalPoints: savedPoints,
                weekSignedDays: savedWeekSignedDays,
                weekContinuousDays: savedWeekContinuousDays,
                signedDates: [],
            };
        }

        if (!this.signInOverlay) {
            this.signInOverlay = new MainMenuSignInOverlay(
                this.node,
                this.scaleFactor,
                () => {
                    void this.handleSignInAction();
                },
                () => undefined,
            );
        }
        this.signInOverlay.show(this.signInStatus);
    }

    /**
     * 执行签到动作
     */
    private async handleSignInAction(): Promise<void> {
        if (!this.signInStatus || this.signInSubmitting) {
            return;
        }
        if (this.signInStatus.signedToday) {
            this.signInStatus.signedToday = true;
            this.showToast('每日只能签到一次哦');
            this.signInOverlay?.hide();
            return;
        }

        // 校验微信昵称授权状态
        const storedUser = AuthManager.getStoredUser();
        const hasValidNickname = !!storedUser && typeof storedUser.nickname === 'string' && storedUser.nickname.trim().length > 0;

        if (AuthManager.isWechatSupported()) {
            if (!hasValidNickname) {
                // 未授权微信昵称，提示并拉起授权弹窗
                this.signInOverlay?.hide();
                this.showProfileAuthorizationForSignIn();
                return;
            }
        } else {
            // 本地测试模式下，若昵称为空则自动预设测试昵称
            if (!hasValidNickname) {
                AuthManager.updateStoredUser({ nickname: '森林玩家' });
            }
        }

        this.signInSubmitting = true;
        try {
            let result: SignInStatusResponse;
            if (AuthManager.isWechatSupported()) {
                result = await this.submitSignIn();
            } else {
                // 非微信/本地测试模式下的 Mock 签到逻辑
                result = {
                    signedToday: true,
                    rewardPoints: 10,
                    totalPoints: this.signInStatus.totalPoints + 10,
                    weekSignedDays: this.signInStatus.weekSignedDays + 1,
                    weekContinuousDays: this.signInStatus.weekContinuousDays + 1,
                    signedDates: [],
                };
            }
            markSignedTodayLocally(sys.localStorage, this.getSignInUserId());
            this.applySignInStatus(result);
            this.signInOverlay?.hide();
            SignInSuccessAnimation.play(this.node, result.rewardPoints, this.scaleFactor);
        } catch (error) {
            console.warn('[MainMenuUI] handleSignInAction error sign-in request failed:', error);
            this.showToast('签到失败，请稍后重试');
            return;
        } finally {
            this.signInSubmitting = false;
        }
    }

    /**
     * 为签到流程唤起微信昵称授权弹窗
     */
    private showProfileAuthorizationForSignIn(): void {
        const wxObj = (globalThis as any).wx;
        if (!wxObj || typeof wxObj.createUserInfoButton !== 'function') {
            // 微信原生按钮不可用时（如测试环境），预设默认昵称后自动完成签到
            AuthManager.updateStoredUser({ nickname: '微信用户' });
            void this.handleSignInAction();
            return;
        }

        const overlay = new MainMenuProfileOverlay(
            this.node,
            this.scaleFactor,
            (profile) => {
                void (async () => {
                    const nickname = typeof profile.nickName === 'string' ? profile.nickName.trim() : '';
                    const avatarUrl = typeof profile.avatarUrl === 'string' ? profile.avatarUrl.trim() : '';
                    overlay.hide();
                    if (!nickname) {
                        this.showToast('授权微信昵称失败，请重试');
                        return;
                    }
                    try {
                        if (!AuthManager.getToken()) {
                            await AuthManager.ensureLogin();
                        }
                        const updatedUser = await UserProfileApi.updateProfile({ nickname, avatarUrl });
                        this.updateProfileDisplay(updatedUser ?? AuthManager.getStoredUser());
                        this.showToast('昵称授权成功！正在完成签到...');
                        // 自动无缝续接完成签到
                        void this.handleSignInAction();
                    } catch (err) {
                        console.warn('[MainMenuUI] updateProfile for sign-in failed:', err);
                        this.showToast('资料保存失败，请稍后重试');
                    }
                })();
            },
            () => {
                // 用户跳过或暂不授权
                this.showToast('签到需要授权微信昵称');
            },
        );

        overlay.show();
    }


    /**
     * 提交签到请求，遇到 token 失效时自动刷新一次
     */
    private async submitSignIn(forceRefresh: boolean = false): Promise<SignInStatusResponse> {
        if (forceRefresh) {
            AuthManager.clear();
        }

        const user = await AuthManager.ensureLogin(forceRefresh);
        this.signInUserId = user.id;
        try {
            return await SignInApi.signIn();
        } catch (error) {
            if (!forceRefresh && this.isUnauthorizedError(error)) {
                return this.submitSignIn(true);
            }
            throw error;
        }
    }

    /**
     * 同步签到状态到主菜单 UI
     */
    private applySignInStatus(status: SignInStatusResponse) {
        this.signInStatus = status;
        if (status.signedToday) {
            markSignedTodayLocally(sys.localStorage, this.getSignInUserId());
        }
        sys.localStorage.setItem(this.getSignInStorageKey('animal_chess_total_points'), String(status.totalPoints));
        sys.localStorage.setItem(this.getSignInStorageKey('animal_chess_week_signed_days'), String(status.weekSignedDays));
        sys.localStorage.setItem(this.getSignInStorageKey('animal_chess_week_continuous_days'), String(status.weekContinuousDays));

        if (this.signInEntryButton) {
            this.signInEntryButton.active = true;
        }

        if (this.signInNotifyTag) {
            this.signInNotifyTag.active = !status.signedToday;
        }

        if (this.signInEntryTitleLabel) {
            this.signInEntryTitleLabel.string = status.signedToday ? '今日已签到' : '森林签到';
        }
        this.updatePointsBadge(status.totalPoints);
        this.updateSignInEntryState(status.signedToday ? `已领奖励` : `可领 +${status.rewardPoints} 积分`);
        this.signInOverlay?.updateState(status);
    }

    /**
     * 更新首页积分展示文案
     */
    private updatePointsBadge(totalPoints: number | null, fallbackText?: string) {
        if (this.pointsBadgeValueLabel) {
            this.pointsBadgeValueLabel.string = totalPoints === null
                ? (fallbackText ?? '--')
                : `${totalPoints}`;
        }
    }

    /**
     * 更新主菜单签到入口文案
     */
    private updateSignInEntryState(statusText: string) {
        if (this.signInEntryStatusLabel) {
            this.signInEntryStatusLabel.string = statusText;
        }
    }

    /**
     * 判断是否为未授权错误
     */
    private isUnauthorizedError(error: unknown): boolean {
        return error instanceof HttpError && error.status === 401;
    }

    private onStartGame() {
        console.log('Start Game Clicked!');
        if (this.isStartTransitioning) {
            return;
        }
        this.isStartTransitioning = true;
        this.playStartGameTransition();
    }

    /**
     * 播放“穿过森林”主题过渡：点击反馈、叶幕合拢、提示出现后再进入模式选择。
     */
    /**
     * 播放“穿过森林”主题极简高奢过渡：轻量翡翠波纹展开、顺滑对角风叶与精细提亮文字。
     */
    private playStartGameTransition(): void {
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        if (!uiTrans) {
            this.node.emit('start-game');
            return;
        }

        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const scaleFactor = this.scaleFactor;

        const overlay = new Node('StartTransitionOverlay');
        overlay.layer = 33554432;
        overlay.addComponent(UITransform).setContentSize(cw, ch);
        const overlayOpacity = overlay.addComponent(UIOpacity);
        overlayOpacity.opacity = 0;
        canvas.addChild(overlay);

        // 1. 通透清爽的翡翠玉石半透明背景
        const shade = this.createRectNode('StartTransitionShade', '#072e18', cw, ch, 0, 215);
        overlay.addChild(shade);

        // 2. 极简翡翠高光波纹（从中心舒展散开）
        const pathGlow = this.createCircleNode('StartTransitionPathGlow', '#8fe16d', Math.max(cw, ch) * 0.22, 110);
        pathGlow.setPosition(0, 0, 0);
        pathGlow.setScale(new Vec3(0.2, 0.2, 1));
        overlay.addChild(pathGlow);

        // 3. 高对比度极简发光标题与副标题
        const title = this.createLabelNode('StartTransitionTitle', '穿过森林', 38 * scaleFactor, '#fff9c4', true);
        title.setPosition(0, 20 * scaleFactor, 0);
        title.setScale(new Vec3(0.88, 0.88, 1));
        const titleOpacity = title.addComponent(UIOpacity);
        titleOpacity.opacity = 0;
        overlay.addChild(title);

        const subtitle = this.createLabelNode('StartTransitionSubtitle', '新的对局入口正在打开', 18 * scaleFactor, '#e8f5e9', false);
        subtitle.setPosition(0, -20 * scaleFactor, 0);
        const subtitleOpacity = subtitle.addComponent(UIOpacity);
        subtitleOpacity.opacity = 0;
        overlay.addChild(subtitle);

        // 4. 精简 5 片高清对角线流线风叶（顺滑抛物线）
        const leafCount = 5;
        for (let i = 0; i < leafCount; i += 1) {
            const leaf = this.createStartTransitionLeaf(i, scaleFactor);
            const startX = -cw * 0.55 + i * cw * 0.24;
            const startY = -ch * 0.4 + i * ch * 0.18;
            const endX = startX + 160 * scaleFactor;
            const endY = startY + 120 * scaleFactor;

            leaf.setPosition(startX, startY, 0);
            leaf.angle = -25 + i * 10;
            leaf.setScale(new Vec3(0.7, 0.7, 1));
            overlay.addChild(leaf);

            tween(leaf)
                .delay(i * 0.03)
                .to(0.35, {
                    position: new Vec3(endX, endY, 0),
                    angle: 15 - i * 5,
                    scale: new Vec3(1.1, 1.1, 1),
                }, { easing: 'cubicOut' })
                .start();
        }

        // 5. 快速响应调度 (0.35s 黄金交互区间)
        tween(overlayOpacity)
            .to(0.14, { opacity: 255 }, { easing: 'quadOut' })
            .delay(0.18)
            .to(0.08, { opacity: 235 }, { easing: 'quadOut' })
            .call(() => {
                this.node.emit('start-game');
            })
            .start();

        tween(pathGlow)
            .to(0.35, { scale: new Vec3(2.8, 2.8, 1) }, { easing: 'cubicOut' })
            .start();

        tween(title)
            .to(0.24, { scale: new Vec3(1.0, 1.0, 1) }, { easing: 'backOut' })
            .start();
        tween(titleOpacity)
            .to(0.16, { opacity: 255 }, { easing: 'quadOut' })
            .start();

        tween(subtitleOpacity)
            .delay(0.06)
            .to(0.18, { opacity: 230 }, { easing: 'quadOut' })
            .start();
    }

    private createStartTransitionLeaf(index: number, scaleFactor: number): Node {
        const leaf = new Node('StartTransitionLeaf');
        leaf.layer = 33554432;
        const w = (64 + (index % 3) * 6) * scaleFactor;
        const h = (38 + (index % 2) * 6) * scaleFactor;
        leaf.addComponent(UITransform).setContentSize(w, h);
        const g = leaf.addComponent(Graphics);
        
        g.fillColor = new Color(139, 195, 74, 240);
        g.strokeColor = new Color(46, 125, 50, 220);
        g.lineWidth = Math.max(2, 2.5 * scaleFactor);
        g.ellipse(0, 0, w / 2, h / 2);
        g.fill();
        g.stroke();

        g.strokeColor = new Color(255, 255, 255, 180);
        g.lineWidth = Math.max(1.2, 1.6 * scaleFactor);
        g.moveTo(-w * 0.35, 0);
        g.quadraticCurveTo(0, h * 0.12, w * 0.35, 0);
        g.stroke();
        return leaf;
    }

    private onExitGame() {
        console.log('Exit Clicked!');
        this.node.emit('exit-game');
    }

    private settingsPanel: Node | null = null;
    private rulesPanel: Node | null = null;
    private musicBtnLabel: Label | null = null;
    private soundBtnLabel: Label | null = null;
    private musicToggleUpdater: ((isOn: boolean, animate?: boolean) => void) | null = null;
    private soundToggleUpdater: ((isOn: boolean, animate?: boolean) => void) | null = null;
    private effectsToggleUpdater: ((isOn: boolean, animate?: boolean) => void) | null = null;

    private onRulesClicked() {
        console.log('Rules Clicked!');
        
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;

        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.min(cw / refW, ch / refH);

        // 如果存在则销毁重建，确保每次自适应正确
        if (this.rulesPanel) {
            this.rulesPanel.destroy();
            this.rulesPanel = null;
        }

        // 1. 创建全屏遮罩防穿透 (深色高质感半透明蒙层)
        this.rulesPanel = new Node('RulesPanel');
        this.rulesPanel.layer = 33554432; // UI_2D
        this.rulesPanel.addComponent(UITransform).setContentSize(cw, ch);
        canvas.addChild(this.rulesPanel);

        // 深半透明背景，添加 Button 拦截触摸事件
        const mask = this.createRectNode('Mask', '#000000', cw, ch, 0, 180);
        mask.name = 'Mask';
        mask.addComponent(Button); // 吞噬事件
        this.rulesPanel.addChild(mask);

        // 2. 创建弹窗主体 (外框架 + 象牙纸张内衬)
        const dialogWidth = Math.min(cw * 0.92, 650 * scaleFactor);
        const dialogHeight = Math.min(ch * 0.88, 880 * scaleFactor);
        const dialogRadius = 36 * scaleFactor;

        // 弹窗外框 (深色木纹/深林边框感)
        const outerBorderWidth = dialogWidth + 12 * scaleFactor;
        const outerBorderHeight = dialogHeight + 12 * scaleFactor;
        const outerFrame = this.createRectNode('OuterFrame', '#23371f', outerBorderWidth, outerBorderHeight, dialogRadius + 6 * scaleFactor);
        outerFrame.name = 'DialogNode';
        this.rulesPanel.addChild(outerFrame);

        // 主弹窗面板
        const dialog = this.createRectNode('Dialog', '#FDFBF7', dialogWidth, dialogHeight, dialogRadius);
        outerFrame.addChild(dialog);

        // 3. 顶栏 (Header Ribbon)
        const headerHeight = 90 * scaleFactor;
        const headerRibbon = this.createRectNode('HeaderRibbon', '#1b5e20', dialogWidth, headerHeight, 0);
        headerRibbon.setPosition(0, dialogHeight / 2 - headerHeight / 2, 0);

        // 剪裁顶栏上边圆角
        const headerG = headerRibbon.getComponent(Graphics);
        if (headerG) {
            headerG.clear();
            headerG.fillColor = new Color(27, 94, 32, 255);
            headerG.roundRect(-dialogWidth / 2, -headerHeight / 2, dialogWidth, headerHeight, dialogRadius);
            headerG.fill();
            // 底部平直矩形填充覆盖
            headerG.rect(-dialogWidth / 2, -headerHeight / 2, dialogWidth, headerHeight / 2);
            headerG.fill();
        }
        dialog.addChild(headerRibbon);

        // 顶栏标题
        const titleFontSize = 36 * scaleFactor;
        const title = this.createLabelNode('Title', '玩法规则说明', titleFontSize, '#ffffff', true);
        title.setPosition(0, 0, 0);
        headerRibbon.addChild(title);

        // 右上角关闭按钮 (✕)
        const closeIconRadius = 22 * scaleFactor;
        const closeIconBtn = this.createCircleNode('CloseIconBtn', '#e74c3c', closeIconRadius);
        closeIconBtn.setPosition(dialogWidth / 2 - 42 * scaleFactor, dialogHeight / 2 - headerHeight / 2, 0);
        dialog.addChild(closeIconBtn);

        const closeCrossLabel = this.createLabelNode('CloseCross', '✕', 22 * scaleFactor, '#ffffff', true);
        closeIconBtn.addChild(closeCrossLabel);

        const closeDialogFunc = () => {
            AudioSynth.playClick();
            if (outerFrame) {
                tween(outerFrame)
                    .to(0.18, { scale: new Vec3(0.8, 0.8, 1.0) }, { easing: 'backIn' })
                    .call(() => {
                        if (this.rulesPanel) this.rulesPanel.active = false;
                    })
                    .start();
            } else {
                if (this.rulesPanel) this.rulesPanel.active = false;
            }
        };

        closeIconBtn.addComponent(Button);
        closeIconBtn.on(Node.EventType.TOUCH_END, closeDialogFunc, this);

        // 4. 内容区域滚动容器 (ScrollView)
        const scrollWidth = dialogWidth - 32 * scaleFactor;
        const scrollHeight = dialogHeight - headerHeight - 110 * scaleFactor;

        const scrollNode = new Node('RulesScrollView');
        scrollNode.layer = 33554432;
        scrollNode.addComponent(UITransform).setContentSize(scrollWidth, scrollHeight);
        scrollNode.setPosition(0, (dialogHeight / 2 - headerHeight) - scrollHeight / 2 - 10 * scaleFactor, 0);
        dialog.addChild(scrollNode);

        const scrollView = scrollNode.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;
        scrollView.inertia = true;

        const viewPort = new Node('ViewPort');
        viewPort.layer = 33554432;
        viewPort.addComponent(UITransform).setContentSize(scrollWidth, scrollHeight);
        viewPort.addComponent(Mask);
        scrollNode.addChild(viewPort);

        const content = new Node('Content');
        content.layer = 33554432;
        const contentTrans = content.addComponent(UITransform);
        contentTrans.setAnchorPoint(0.5, 1);
        viewPort.addChild(content);
        scrollView.content = content;

        // 4.1 构建规则卡片
        const cardWidth = scrollWidth - 20 * scaleFactor;

        const card1 = this.createRuleBlockCard(
            'RuleCard1',
            '🦁',
            '一、棋子大小（克制关系）',
            [
                '象 > 狮 > 虎 > 豹 > 狼 > 狗 > 猫 > 鼠',
                '★ 特殊：最小的【鼠】可以吃最大的【象】！'
            ],
            cardWidth,
            scaleFactor
        );

        const card2 = this.createRuleBlockCard(
            'RuleCard2',
            '🌊',
            '二、河道规则（小河）',
            [
                '1.【鼠】可游入河中，在河里不能攻击岸上的象，岸上也无法吃河里的鼠。',
                '2.【狮、虎】可横向或纵向跃过河道，河道无敌鼠阻挡时可吃对岸棋子。'
            ],
            cardWidth,
            scaleFactor
        );

        const card3 = this.createRuleBlockCard(
            'RuleCard3',
            '🏰',
            '三、特殊地形（陷阱与兽穴）',
            [
                '1.【陷阱】：走入敌方陷阱后战力归零，任何敌方棋子皆可直接将其吃掉。',
                '2.【兽穴】：己方无法进入己方兽穴。成功将任何棋子走入敌方兽穴即获胜！'
            ],
            cardWidth,
            scaleFactor
        );

        const cards = [card1, card2, card3];
        const cardGap = 16 * scaleFactor;

        let totalContentHeight = 16 * scaleFactor;
        cards.forEach((card) => {
            const cardTrans = card.getComponent(UITransform);
            const ch = cardTrans ? cardTrans.height : 120 * scaleFactor;
            card.setPosition(0, -totalContentHeight - ch / 2, 0);
            content.addChild(card);
            totalContentHeight += ch + cardGap;
        });

        totalContentHeight += 8 * scaleFactor;
        contentTrans.setContentSize(scrollWidth, totalContentHeight);
        content.setPosition(0, scrollHeight / 2, 0);

        // 5. 底部“确 定”按钮
        const confirmBtnWidth = dialogWidth - 140 * scaleFactor;
        const confirmBtnHeight = 80 * scaleFactor;
        const confirmBtnRadius = 40 * scaleFactor;
        const confirmBtn = this.createRectNode('ConfirmBtn', '#27ae60', confirmBtnWidth, confirmBtnHeight, confirmBtnRadius);
        confirmBtn.setPosition(0, -dialogHeight / 2 + 65 * scaleFactor, 0);
        dialog.addChild(confirmBtn);

        // 按钮亮边描边
        const confirmG = confirmBtn.getComponent(Graphics);
        if (confirmG) {
            confirmG.strokeColor = new Color(255, 255, 255, 100);
            confirmG.lineWidth = 2 * scaleFactor;
            confirmG.roundRect(-confirmBtnWidth / 2, -confirmBtnHeight / 2, confirmBtnWidth, confirmBtnHeight, confirmBtnRadius);
            confirmG.stroke();
        }

        const confirmTxt = this.createLabelNode('ConfirmTxt', '确 定', 30 * scaleFactor, '#ffffff', true);
        confirmBtn.addChild(confirmTxt);

        confirmBtn.addComponent(Button);
        confirmBtn.on(Node.EventType.TOUCH_END, closeDialogFunc, this);

        // 显示并执行弹出动画
        this.rulesPanel.active = true;

        outerFrame.setScale(new Vec3(0.78, 0.78, 1.0));
        tween(outerFrame)
            .to(0.3, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
            .start();
    }

    private createRuleBlockCard(
        name: string,
        icon: string,
        title: string,
        contentLines: string[],
        cardWidth: number,
        scaleFactor: number
    ): Node {
        const titleFontSize = 24 * scaleFactor;
        const iconFontSize = 28 * scaleFactor;
        const lineFontSize = 19 * scaleFactor;
        const textLineWidth = cardWidth - 48 * scaleFactor;

        // 1. 创建标题与图标节点
        const iconNode = this.createLabelNode('Icon', icon, iconFontSize, '#1b5e20', true);
        const titleNode = this.createLabelNode('Title', title, titleFontSize, '#1b5e20', true);
        const titleTrans = titleNode.getComponent(UITransform);
        if (titleTrans) {
            titleTrans.setAnchorPoint(0, 0.5);
        }
        const titleLabel = titleNode.getComponent(Label);
        if (titleLabel) {
            titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        }

        // 2. 依次生成每一行规则文本并计算高度
        const lineNodes: Node[] = [];
        const lineHeights: number[] = [];
        const lineSpacing = 10 * scaleFactor;

        contentLines.forEach((lineText, idx) => {
            const lineNode = this.createLabelNode(`Line_${idx}`, lineText, lineFontSize, '#3a2d1d', false);
            const lineTrans = lineNode.getComponent(UITransform);
            if (lineTrans) {
                lineTrans.setAnchorPoint(0, 1);
                lineTrans.setContentSize(textLineWidth, 0);
            }
            const lineLabel = lineNode.getComponent(Label);
            if (lineLabel) {
                lineLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
                lineLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
                lineLabel.enableWrapText = true;
                lineLabel.updateRenderData(true);
            }
            let h = lineTrans ? lineTrans.height : lineFontSize + 6;
            if (h < lineFontSize) {
                h = lineFontSize + 6;
            }
            lineNodes.push(lineNode);
            lineHeights.push(h);
        });

        // 3. 计算卡片总高度
        const headerHeight = 36 * scaleFactor;
        const topPadding = 18 * scaleFactor;
        const bottomPadding = 18 * scaleFactor;
        const linesTotalHeight = lineHeights.reduce((acc, curr) => acc + curr, 0) + (lineNodes.length - 1) * lineSpacing;
        const cardHeight = topPadding + headerHeight + 12 * scaleFactor + linesTotalHeight + bottomPadding;

        // 4. 创建卡片主节点并绘制背景与描边
        const cardNode = this.createRectNode(name, '#FAF7F0', cardWidth, cardHeight, 18 * scaleFactor);
        const borderG = cardNode.getComponent(Graphics);
        if (borderG) {
            borderG.strokeColor = new Color(215, 200, 175, 255);
            borderG.lineWidth = 2 * scaleFactor;
            borderG.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 18 * scaleFactor);
            borderG.stroke();
        }

        // 5. 将各节点排版定位在卡片内
        const topY = cardHeight / 2;
        const headerCenterY = topY - topPadding - headerHeight / 2;

        iconNode.setPosition(-cardWidth / 2 + 32 * scaleFactor, headerCenterY, 0);
        cardNode.addChild(iconNode);

        titleNode.setPosition(-cardWidth / 2 + 58 * scaleFactor, headerCenterY, 0);
        cardNode.addChild(titleNode);

        let currentY = topY - topPadding - headerHeight - 12 * scaleFactor;
        lineNodes.forEach((lineNode, idx) => {
            lineNode.setPosition(-cardWidth / 2 + 26 * scaleFactor, currentY, 0);
            cardNode.addChild(lineNode);
            currentY -= (lineHeights[idx] + lineSpacing);
        });

        return cardNode;
    }

    private onSettingsGame() {
        console.log('Settings Clicked!');
        
        const canvas = this.node;
        const uiTrans = canvas.getComponent(UITransform);
        const cw = uiTrans.width;
        const ch = uiTrans.height;

        const isPortrait = ch > cw;
        const refW = isPortrait ? 750 : 1280;
        const refH = isPortrait ? 1334 : 720;
        const scaleFactor = Math.min(cw / refW, ch / refH);

        // 如果存在则销毁重建，确保每次打开都获取最新的自适应大小
        if (this.settingsPanel) {
            this.settingsPanel.destroy();
            this.settingsPanel = null;
        }

        // 1. 创建全屏遮罩防穿透 (深色高质感半透明蒙层)
        this.settingsPanel = new Node('SettingsPanel');
        this.settingsPanel.layer = 33554432; // UI_2D
        this.settingsPanel.addComponent(UITransform).setContentSize(cw, ch);
        canvas.addChild(this.settingsPanel);

        // 深半透明背景，添加 Button 拦截触摸事件
        const mask = this.createRectNode('Mask', '#000000', cw, ch, 0, 180);
        mask.name = 'Mask';
        mask.addComponent(Button); // 吞噬事件
        this.settingsPanel.addChild(mask);

        // 2. 创建弹窗主体 (外框架 + 象牙纸张内衬)
        const dialogWidth = Math.min(cw * 0.9, 640 * scaleFactor);
        const dialogHeight = Math.min(ch * 0.85, 780 * scaleFactor);
        const dialogRadius = 36 * scaleFactor;

        // 弹窗外框 (深色木纹/深林边框感)
        const outerBorderWidth = dialogWidth + 12 * scaleFactor;
        const outerBorderHeight = dialogHeight + 12 * scaleFactor;
        const outerFrame = this.createRectNode('OuterFrame', '#23371f', outerBorderWidth, outerBorderHeight, dialogRadius + 6 * scaleFactor);
        outerFrame.name = 'DialogNode';
        this.settingsPanel.addChild(outerFrame);

        // 主弹窗面板
        const dialog = this.createRectNode('Dialog', '#FDFBF7', dialogWidth, dialogHeight, dialogRadius);
        outerFrame.addChild(dialog);

        // 3. 顶栏 (Header Ribbon)
        const headerHeight = 90 * scaleFactor;
        const headerRibbon = this.createRectNode('HeaderRibbon', '#1b5e20', dialogWidth, headerHeight, 0);
        headerRibbon.setPosition(0, dialogHeight / 2 - headerHeight / 2, 0);

        // 剪裁顶栏上边圆角
        const headerG = headerRibbon.getComponent(Graphics);
        if (headerG) {
            headerG.clear();
            headerG.fillColor = new Color(27, 94, 32, 255);
            headerG.roundRect(-dialogWidth / 2, -headerHeight / 2, dialogWidth, headerHeight, dialogRadius);
            headerG.fill();
            // 底部平直矩形填充覆盖
            headerG.rect(-dialogWidth / 2, -headerHeight / 2, dialogWidth, headerHeight / 2);
            headerG.fill();
        }
        dialog.addChild(headerRibbon);

        // 顶栏标题
        const titleFontSize = 36 * scaleFactor;
        const title = this.createLabelNode('Title', '系统设置', titleFontSize, '#ffffff', true);
        title.setPosition(0, 0, 0);
        headerRibbon.addChild(title);

        // 右上角关闭按钮 (✕)
        const closeIconRadius = 22 * scaleFactor;
        const closeIconBtn = this.createCircleNode('CloseIconBtn', '#e74c3c', closeIconRadius);
        closeIconBtn.setPosition(dialogWidth / 2 - 42 * scaleFactor, dialogHeight / 2 - headerHeight / 2, 0);
        dialog.addChild(closeIconBtn);

        const closeCrossLabel = this.createLabelNode('CloseCross', '✕', 22 * scaleFactor, '#ffffff', true);
        closeIconBtn.addChild(closeCrossLabel);

        const closeDialogFunc = () => {
            AudioSynth.playClick();
            if (outerFrame) {
                tween(outerFrame)
                    .to(0.18, { scale: new Vec3(0.8, 0.8, 1.0) }, { easing: 'backIn' })
                    .call(() => {
                        if (this.settingsPanel) this.settingsPanel.active = false;
                    })
                    .start();
            } else {
                if (this.settingsPanel) this.settingsPanel.active = false;
            }
        };

        closeIconBtn.addComponent(Button);
        closeIconBtn.on(Node.EventType.TOUCH_END, closeDialogFunc, this);

        // 4. 读取当前设置状态
        const musicOn = sys.localStorage.getItem('jungle_music_enabled') !== 'false';
        const soundOn = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        const effectsOn = sys.localStorage.getItem('jungle_effects_enabled') !== 'false';

        // 5. 设置项列表 (卡片 Row)
        const rowWidth = dialogWidth - 56 * scaleFactor;
        const rowHeight = 104 * scaleFactor;
        const startY = dialogHeight / 2 - headerHeight - 80 * scaleFactor;
        const rowGap = 124 * scaleFactor;

        // 5.1 背景音乐 Row
        const musicRowInfo = this.createSettingRow(
            'MusicRow',
            '🎵',
            '背景音乐',
            '背景旋律与森林氛围音效',
            rowWidth,
            rowHeight,
            scaleFactor,
            musicOn,
            (newVal) => {
                sys.localStorage.setItem('jungle_music_enabled', newVal ? 'true' : 'false');
                this.node.emit('music-toggle', newVal);
            }
        );
        musicRowInfo.rowNode.setPosition(0, startY, 0);
        dialog.addChild(musicRowInfo.rowNode);
        this.musicToggleUpdater = musicRowInfo.updateState;

        // 5.2 游戏音效 Row
        const soundRowInfo = this.createSettingRow(
            'SoundRow',
            '🔊',
            '游戏音效',
            '按键点击与棋子移动吃子音效',
            rowWidth,
            rowHeight,
            scaleFactor,
            soundOn,
            (newVal) => {
                sys.localStorage.setItem('jungle_sound_enabled', newVal ? 'true' : 'false');
            }
        );
        soundRowInfo.rowNode.setPosition(0, startY - rowGap, 0);
        dialog.addChild(soundRowInfo.rowNode);
        this.soundToggleUpdater = soundRowInfo.updateState;

        // 5.3 画面特效 Row
        const effectsRowInfo = this.createSettingRow(
            'EffectsRow',
            '✨',
            '画面特效',
            '光影萤火虫与高阶模糊特效',
            rowWidth,
            rowHeight,
            scaleFactor,
            effectsOn,
            (newVal) => {
                sys.localStorage.setItem('jungle_effects_enabled', newVal ? 'true' : 'false');
                this.updateBackgroundEffects();
                this.updateFirefliesEffect(scaleFactor);
                this.node.emit('effects-toggle', newVal);
            }
        );
        effectsRowInfo.rowNode.setPosition(0, startY - rowGap * 2, 0);
        dialog.addChild(effectsRowInfo.rowNode);
        this.effectsToggleUpdater = effectsRowInfo.updateState;

        // 6. 底部“确 定”按钮
        const confirmBtnWidth = dialogWidth - 140 * scaleFactor;
        const confirmBtnHeight = 80 * scaleFactor;
        const confirmBtnRadius = 40 * scaleFactor;
        const confirmBtn = this.createRectNode('ConfirmBtn', '#27ae60', confirmBtnWidth, confirmBtnHeight, confirmBtnRadius);
        confirmBtn.setPosition(0, -dialogHeight / 2 + 65 * scaleFactor, 0);
        dialog.addChild(confirmBtn);

        // 按钮亮边描边
        const confirmG = confirmBtn.getComponent(Graphics);
        if (confirmG) {
            confirmG.strokeColor = new Color(255, 255, 255, 100);
            confirmG.lineWidth = 2 * scaleFactor;
            confirmG.roundRect(-confirmBtnWidth / 2, -confirmBtnHeight / 2, confirmBtnWidth, confirmBtnHeight, confirmBtnRadius);
            confirmG.stroke();
        }

        const confirmTxt = this.createLabelNode('ConfirmTxt', '确 定', 30 * scaleFactor, '#ffffff', true);
        confirmBtn.addChild(confirmTxt);

        confirmBtn.addComponent(Button);
        confirmBtn.on(Node.EventType.TOUCH_END, closeDialogFunc, this);

        // 显示并执行弹出动画
        this.settingsPanel.active = true;
        this.updateSettingsUI();

        outerFrame.setScale(new Vec3(0.78, 0.78, 1.0));
        tween(outerFrame)
            .to(0.3, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
            .start();

        // 派发原始事件供外部兼容
        this.node.emit('settings-game');
    }

    private updateSettingsUI() {
        const musicOn = sys.localStorage.getItem('jungle_music_enabled') !== 'false';
        const soundOn = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
        const effectsOn = sys.localStorage.getItem('jungle_effects_enabled') !== 'false';

        if (this.musicToggleUpdater) {
            this.musicToggleUpdater(musicOn, false);
        }
        if (this.soundToggleUpdater) {
            this.soundToggleUpdater(soundOn, false);
        }
        if (this.effectsToggleUpdater) {
            this.effectsToggleUpdater(effectsOn, false);
        }

        if (this.musicBtnLabel && this.musicBtnLabel.isValid) {
            this.musicBtnLabel.string = `背景音乐: ${musicOn ? '开启' : '关闭'}`;
        }
        if (this.soundBtnLabel && this.soundBtnLabel.isValid) {
            this.soundBtnLabel.string = `游戏音效: ${soundOn ? '开启' : '关闭'}`;
        }
        if (this.effectsBtnLabel && this.effectsBtnLabel.isValid) {
            this.effectsBtnLabel.string = `画面特效: ${effectsOn ? '开启' : '关闭'}`;
        }
    }

    private createToggleSwitch(
        scaleFactor: number,
        initialOn: boolean,
        onToggle: (isOn: boolean) => void
    ): { toggleNode: Node; updateState: (isOn: boolean, animate?: boolean) => void } {
        const trackW = 84 * scaleFactor;
        const trackH = 44 * scaleFactor;
        const trackRadius = 22 * scaleFactor;
        const knobRadius = 18 * scaleFactor;
        const knobOffX = -20 * scaleFactor;
        const knobOnX = 20 * scaleFactor;

        const toggleNode = new Node('ToggleSwitch');
        toggleNode.layer = 33554432;
        const uiTrans = toggleNode.addComponent(UITransform);
        uiTrans.width = trackW;
        uiTrans.height = trackH;

        const trackGraphics = toggleNode.addComponent(Graphics);

        const knobNode = new Node('Knob');
        knobNode.layer = 33554432;
        const knobTrans = knobNode.addComponent(UITransform);
        knobTrans.width = knobRadius * 2;
        knobTrans.height = knobRadius * 2;

        const knobGraphics = knobNode.addComponent(Graphics);
        const knobBorderColor = new Color();
        Color.fromHEX(knobBorderColor, '#e2e8f0');
        knobGraphics.fillColor = knobBorderColor;
        knobGraphics.circle(0, 0, knobRadius);
        knobGraphics.fill();

        const knobInnerColor = new Color();
        Color.fromHEX(knobInnerColor, '#ffffff');
        knobGraphics.fillColor = knobInnerColor;
        knobGraphics.circle(0, 0, knobRadius - 2 * scaleFactor);
        knobGraphics.fill();

        toggleNode.addChild(knobNode);

        let currentOn = initialOn;

        const drawTrack = (isOn: boolean) => {
            trackGraphics.clear();
            const colorHex = isOn ? '#2ecc71' : '#bdc3c7';
            const color = new Color();
            Color.fromHEX(color, colorHex);
            trackGraphics.fillColor = color;
            trackGraphics.roundRect(-trackW / 2, -trackH / 2, trackW, trackH, trackRadius);
            trackGraphics.fill();
        };

        const updateState = (isOn: boolean, animate: boolean = true) => {
            currentOn = isOn;
            drawTrack(isOn);
            const targetX = isOn ? knobOnX : knobOffX;
            if (animate) {
                tween(knobNode)
                    .to(0.15, { position: new Vec3(targetX, 0, 0) }, { easing: 'sineOut' })
                    .start();
            } else {
                knobNode.setPosition(targetX, 0, 0);
            }
        };

        updateState(initialOn, false);

        return { toggleNode, updateState };
    }

    private createSettingRow(
        name: string,
        icon: string,
        title: string,
        subtitle: string,
        rowWidth: number,
        rowHeight: number,
        scaleFactor: number,
        initialOn: boolean,
        onToggle: (isOn: boolean) => void
    ): { rowNode: Node; updateState: (isOn: boolean, animate?: boolean) => void } {
        const rowNode = this.createRectNode(name, '#FAF7F0', rowWidth, rowHeight, 20 * scaleFactor);

        const borderG = rowNode.getComponent(Graphics);
        if (borderG) {
            borderG.strokeColor = new Color(215, 200, 175, 255);
            borderG.lineWidth = 2 * scaleFactor;
            borderG.roundRect(-rowWidth / 2, -rowHeight / 2, rowWidth, rowHeight, 20 * scaleFactor);
            borderG.stroke();
        }

        const iconNode = this.createLabelNode('Icon', icon, 32 * scaleFactor, '#2c3e50', true);
        iconNode.setPosition(-rowWidth / 2 + 45 * scaleFactor, 0, 0);
        rowNode.addChild(iconNode);

        const textStartX = -rowWidth / 2 + 85 * scaleFactor;

        const titleNode = this.createLabelNode('Title', title, 24 * scaleFactor, '#2d3748', true);
        const titleTrans = titleNode.getComponent(UITransform);
        if (titleTrans) {
            titleTrans.setAnchorPoint(0, 0.5);
        }
        const titleLabel = titleNode.getComponent(Label);
        if (titleLabel) {
            titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        }
        titleNode.setPosition(textStartX, 13 * scaleFactor, 0);
        rowNode.addChild(titleNode);

        const subNode = this.createLabelNode('Subtitle', subtitle, 16 * scaleFactor, '#718096', false);
        const subTrans = subNode.getComponent(UITransform);
        if (subTrans) {
            subTrans.setAnchorPoint(0, 0.5);
        }
        const subLabel = subNode.getComponent(Label);
        if (subLabel) {
            subLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        }
        subNode.setPosition(textStartX, -14 * scaleFactor, 0);
        rowNode.addChild(subNode);

        let isOn = initialOn;
        const { toggleNode, updateState } = this.createToggleSwitch(scaleFactor, initialOn, (newState) => {
            isOn = newState;
            onToggle(isOn);
        });
        toggleNode.setPosition(rowWidth / 2 - 65 * scaleFactor, 0, 0);
        rowNode.addChild(toggleNode);

        rowNode.addComponent(Button);
        rowNode.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            isOn = !isOn;
            updateState(isOn, true);
            onToggle(isOn);
        }, this);

        return { rowNode, updateState };
    }

    private updateBackgroundEffects() {
        const effectsOn = sys.localStorage.getItem('jungle_effects_enabled') !== 'false';
        const bgNode = this.node.getChildByName('Background');
        if (!bgNode) return;

        const sharpNode = bgNode.getChildByName('BgSharpHalf');
        if (sharpNode) {
            const sprite = sharpNode.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(255, 255, 255, effectsOn ? 128 : 255);
            }
        }

        for (let i = 1; i <= 4; i++) {
            const blurNode = bgNode.getChildByName(`BgBlurLayer${i}`);
            if (blurNode) {
                blurNode.active = effectsOn;
            }
        }
    }

    private updateFirefliesEffect(scaleFactor: number) {
        const effectsOn = sys.localStorage.getItem('jungle_effects_enabled') !== 'false';
        const canvas = this.node;
        if (effectsOn) {
            if (!canvas.getChildByName('ForestFirefliesLayer')) {
                this.createForestFireflies(canvas, scaleFactor);
            }
        } else {
            const layer = canvas.getChildByName('ForestFirefliesLayer');
            if (layer) {
                layer.destroy();
            }
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

    private safeLoadUntrimmedSprite(path: string, sprite: Sprite) {
        resources.load(`${path}/texture`, Texture2D, (err, tex) => {
            if (!err && tex) {
                if (sprite && sprite.isValid) {
                    const sf = new SpriteFrame();
                    sf.texture = tex;
                    sprite.spriteFrame = sf;
                }
            } else {
                this.safeLoadSprite(path, sprite);
            }
        });
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

        const particleCount = 4;
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

    /**
     * 浮条消息 Toast 提示
     */
    private showToast(message: string) {
        const toast = new Node('ToastNode');
        toast.layer = 33554432;
        const uiTrans = toast.addComponent(UITransform);
        uiTrans.setContentSize(320 * this.scaleFactor, 54 * this.scaleFactor);

        const bg = toast.addComponent(Graphics);
        bg.fillColor = new Color(20, 48, 22, 235);
        bg.roundRect(-160 * this.scaleFactor, -27 * this.scaleFactor, 320 * this.scaleFactor, 54 * this.scaleFactor, 27 * this.scaleFactor);
        bg.fill();
        bg.strokeColor = new Color(255, 220, 120, 220);
        bg.lineWidth = 2 * this.scaleFactor;
        bg.roundRect(-160 * this.scaleFactor, -27 * this.scaleFactor, 320 * this.scaleFactor, 54 * this.scaleFactor, 27 * this.scaleFactor);
        bg.stroke();

        const labelNode = new Node('ToastLabel');
        labelNode.layer = 33554432;
        const label = labelNode.addComponent(Label);
        label.string = message;
        label.fontSize = 22 * this.scaleFactor;
        label.lineHeight = 26 * this.scaleFactor;
        label.color = new Color(255, 245, 210, 255);
        label.isBold = true;
        toast.addChild(labelNode);

        toast.setPosition(0, 50 * this.scaleFactor, 0);
        toast.setScale(new Vec3(0.5, 0.5, 1));
        this.node.addChild(toast);

        tween(toast)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .delay(1.5)
            .to(0.2, { scale: new Vec3(0.6, 0.6, 1) })
            .call(() => toast.destroy())
            .start();
    }
}
