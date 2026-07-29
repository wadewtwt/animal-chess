import { _decorator, Component, Node, Label, Color, UITransform, Graphics, Vec3, tween, Button, director, resources, SpriteFrame, Sprite, Texture2D, ImageAsset, UIOpacity, sys } from 'cc';
import { AudioSynth } from '../utils/AudioSynth';
const { ccclass } = _decorator;

@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
    private scaleFactor: number = 1.0;
    private effectsBtnLabel: Label | null = null;
    
    onLoad() {
        this.buildUI();
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

    private onStartGame() {
        console.log('Start Game Clicked!');
        this.node.emit('start-game');
    }

    private onExitGame() {
        console.log('Exit Clicked!');
        this.node.emit('exit-game');
    }

    private settingsPanel: Node | null = null;
    private rulesPanel: Node | null = null;
    private musicBtnLabel: Label | null = null;
    private soundBtnLabel: Label | null = null;

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

        // 1. 创建全屏遮罩防穿透
        this.rulesPanel = new Node('RulesPanel');
        this.rulesPanel.layer = 33554432; // UI_2D
        this.rulesPanel.addComponent(UITransform).setContentSize(cw, ch);
        canvas.addChild(this.rulesPanel);

        // 灰色半透明背景，添加 Button 拦截触摸事件
        const mask = this.createRectNode('Mask', '#000000', cw, ch, 0, 150);
        mask.name = 'Mask';
        mask.addComponent(Button); // 吞噬事件
        this.rulesPanel.addChild(mask);

        // 2. 创建弹窗主体
        const dialogWidth = Math.min(cw * 0.92, 650 * scaleFactor);
        const dialogHeight = Math.min(ch * 0.85, 920 * scaleFactor);
        const dialogRadius = 40 * scaleFactor;
        const dialog = this.createRectNode('Dialog', '#efe6c8', dialogWidth, dialogHeight, dialogRadius);
        dialog.name = 'DialogNode';
        this.rulesPanel.addChild(dialog);

        // 3. 弹窗标题
        const titleFontSize = 38 * scaleFactor;
        const title = this.createLabelNode('Title', '玩法规则说明', titleFontSize, '#11751e', true);
        title.setPosition(0, dialogHeight / 2 - 64 * scaleFactor, 0);
        dialog.addChild(title);

        // 分割线
        const line = this.createRectNode('Line', '#11751e', dialogWidth - 64 * scaleFactor, 3 * scaleFactor, 0, 40);
        line.setPosition(0, dialogHeight / 2 - 100 * scaleFactor, 0);
        dialog.addChild(line);

        // 4. 玩法内容文本 (配置为左对齐且自动多行换行)
        const rulesTextNode = new Node('RulesText');
        rulesTextNode.layer = 33554432;
        const txtTrans = rulesTextNode.addComponent(UITransform);
        txtTrans.setContentSize(dialogWidth - 60 * scaleFactor, dialogHeight - 240 * scaleFactor);
        
        const label = rulesTextNode.addComponent(Label);
        
        const rulesString = 
            "一、棋子大小（克制关系）\n" +
            "象 > 狮 > 虎 > 豹 > 狼 > 狗 > 猫 > 鼠\n" +
            "★ 特殊：最小的【鼠】可以吃最大的【象】！\n\n" +
            "二、河道规则（小河）\n" +
            "1.【鼠】可以游入河中。在河里的鼠不能吃岸上的象，岸上的棋子也不能吃河里的鼠。\n" +
            "2.【狮、虎】可以横向或纵向跃过河道。若河道中没有敌方的鼠阻挡，则可直接吃掉河对岸更小的棋子。\n\n" +
            "三、特殊地形\n" +
            "1.【陷阱】：棋子走入敌方陷阱后战力归零，任何敌方棋子皆可直接将其吃掉。\n" +
            "2.【兽穴】：己方棋子无法进入己方兽穴。若成功将任何棋子走入敌方【兽穴】，即获得本局胜利！";

        label.string = rulesString;
        label.fontSize = (isPortrait ? 22 : 18) * scaleFactor;
        label.lineHeight = (isPortrait ? 32 : 25) * scaleFactor;
        label.isBold = true;
        label.overflow = Label.Overflow.CLAMP;
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.TOP;
        
        const color = new Color();
        Color.fromHEX(color, '#3f3600'); // 深褐色字
        label.color = color;
        
        rulesTextNode.setPosition(0, (isPortrait ? 15 : 25) * scaleFactor, 0);
        dialog.addChild(rulesTextNode);

        // 5. 确定/关闭按钮
        const btnFontSize = 30 * scaleFactor;
        const closeBtnWidth = dialogWidth - 160 * scaleFactor;
        const closeBtnHeight = 84 * scaleFactor;
        const closeBtnRadius = 42 * scaleFactor;
        const closeBtn = this.createRectNode('CloseBtn', '#168f25', closeBtnWidth, closeBtnHeight, closeBtnRadius);
        closeBtn.setPosition(0, -dialogHeight / 2 + 76 * scaleFactor, 0);
        dialog.addChild(closeBtn);

        const closeTxt = this.createLabelNode('CloseTxt', '确 定', btnFontSize, '#ffffff', true);
        closeBtn.addChild(closeTxt);

        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            const dialogNode = this.rulesPanel!.getChildByName('DialogNode');
            if (dialogNode) {
                tween(dialogNode)
                    .to(0.2, { scale: new Vec3(0.78, 0.78, 1.0) }, { easing: 'backIn' })
                    .call(() => {
                        this.rulesPanel!.active = false;
                    })
                    .start();
            } else {
                this.rulesPanel!.active = false;
            }
        }, this);

        // 显示并执行弹出动画
        this.rulesPanel.active = true;

        const dialogNode = this.rulesPanel.getChildByName('DialogNode');
        if (dialogNode) {
            dialogNode.setScale(new Vec3(0.78, 0.78, 1.0));
            tween(dialogNode)
                .to(0.3, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
                .start();
        }
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

        // 2. 创建弹窗主体 (自适应放大)
        const dialogWidth = Math.min(cw * 0.9, 620 * scaleFactor);
        const dialogHeight = Math.min(ch * 0.8, 760 * scaleFactor);
        const dialogRadius = 40 * scaleFactor;
        const dialog = this.createRectNode('Dialog', '#efe6c8', dialogWidth, dialogHeight, dialogRadius);
        dialog.name = 'DialogNode';
        this.settingsPanel.addChild(dialog);

        // 3. 弹窗标题 (字号放大至 40)
        const titleFontSize = 40 * scaleFactor;
        const title = this.createLabelNode('Title', '系统设置', titleFontSize, '#11751e', true);
        title.setPosition(0, dialogHeight / 2 - 64 * scaleFactor, 0);
        dialog.addChild(title);

        // 分割线
        const line = this.createRectNode('Line', '#11751e', dialogWidth - 96 * scaleFactor, 3 * scaleFactor, 0, 40);
        line.setPosition(0, dialogHeight / 2 - 100 * scaleFactor, 0);
        dialog.addChild(line);

        // 4. 背景音乐开关按钮 (高宽及字号放大)
        const btnWidth = dialogWidth - 80 * scaleFactor;
        const btnHeight = 96 * scaleFactor;
        const btnGap = 28 * scaleFactor;
        const musicBtnY = dialogHeight / 2 - 190 * scaleFactor;
        const musicBtnRadius = 28 * scaleFactor;
        const btnFontSize = 30 * scaleFactor;

        const musicBtn = this.createRectNode('MusicBtn', '#f6ebbf', btnWidth, btnHeight, musicBtnRadius);
        musicBtn.setPosition(0, musicBtnY, 0);
        dialog.addChild(musicBtn);

        const musicLabelNode = this.createLabelNode('MusicLabel', '', btnFontSize, '#5b4b1c', true);
        this.musicBtnLabel = musicLabelNode.getComponent(Label);
        musicBtn.addChild(musicLabelNode);

        musicBtn.addComponent(Button);
        musicBtn.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            let musicOn = sys.localStorage.getItem('jungle_music_enabled') !== 'false';
            musicOn = !musicOn;
            sys.localStorage.setItem('jungle_music_enabled', musicOn ? 'true' : 'false');
            this.updateSettingsUI();
            // 触发音乐开关事件
            this.node.emit('music-toggle', musicOn);
        }, this);

        // 5. 游戏音效开关按钮
        const soundBtn = this.createRectNode('SoundBtn', '#f6ebbf', btnWidth, btnHeight, musicBtnRadius);
        soundBtn.setPosition(0, musicBtnY - btnHeight - btnGap, 0);
        dialog.addChild(soundBtn);

        const soundLabelNode = this.createLabelNode('SoundLabel', '', btnFontSize, '#5b4b1c', true);
        this.soundBtnLabel = soundLabelNode.getComponent(Label);
        soundBtn.addChild(soundLabelNode);

        soundBtn.addComponent(Button);
        soundBtn.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            let soundOn = sys.localStorage.getItem('jungle_sound_enabled') !== 'false';
            soundOn = !soundOn;
            sys.localStorage.setItem('jungle_sound_enabled', soundOn ? 'true' : 'false');
            this.updateSettingsUI();
        }, this);

        // 5.1 画面特效开关按钮
        const effectsBtn = this.createRectNode('EffectsBtn', '#f6ebbf', btnWidth, btnHeight, musicBtnRadius);
        effectsBtn.setPosition(0, musicBtnY - (btnHeight + btnGap) * 2, 0);
        dialog.addChild(effectsBtn);

        const effectsLabelNode = this.createLabelNode('EffectsLabel', '', btnFontSize, '#5b4b1c', true);
        this.effectsBtnLabel = effectsLabelNode.getComponent(Label);
        effectsBtn.addChild(effectsLabelNode);

        effectsBtn.addComponent(Button);
        effectsBtn.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            let effectsOn = sys.localStorage.getItem('jungle_effects_enabled') !== 'false';
            effectsOn = !effectsOn;
            sys.localStorage.setItem('jungle_effects_enabled', effectsOn ? 'true' : 'false');
            this.updateSettingsUI();
            this.updateBackgroundEffects();
            this.updateFirefliesEffect(scaleFactor);
            // 触发画面特效开关事件
            this.node.emit('effects-toggle', effectsOn);
        }, this);

        // 6. 关闭按钮 (确定按钮已放大)
        const closeBtnWidth = dialogWidth - 160 * scaleFactor;
        const closeBtnHeight = 84 * scaleFactor;
        const closeBtnRadius = 42 * scaleFactor;
        const closeBtn = this.createRectNode('CloseBtn', '#168f25', closeBtnWidth, closeBtnHeight, closeBtnRadius);
        closeBtn.setPosition(0, -dialogHeight / 2 + 76 * scaleFactor, 0);
        dialog.addChild(closeBtn);

        const closeTxt = this.createLabelNode('CloseTxt', '确 定', btnFontSize, '#ffffff', true);
        closeBtn.addChild(closeTxt);

        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
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
        const effectsOn = sys.localStorage.getItem('jungle_effects_enabled') !== 'false';

        if (this.musicBtnLabel) {
            this.musicBtnLabel.string = `背景音乐: ${musicOn ? '开启' : '关闭'}`;
        }
        if (this.soundBtnLabel) {
            this.soundBtnLabel.string = `游戏音效: ${soundOn ? '开启' : '关闭'}`;
        }
        if (this.effectsBtnLabel) {
            this.effectsBtnLabel.string = `画面特效: ${effectsOn ? '开启' : '关闭'}`;
        }
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
}
