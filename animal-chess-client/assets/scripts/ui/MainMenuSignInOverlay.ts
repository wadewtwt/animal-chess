import { Button, Color, Graphics, Label, Node, tween, UITransform, Vec3 } from 'cc';
import { AudioSynth } from '../utils/AudioSynth';

export interface MainMenuSignInState {
    signedToday: boolean;
    rewardPoints: number;
    totalPoints: number;
    weekSignedDays: number;
    weekContinuousDays: number;
    weeklyRecords?: MainMenuWeeklyRecordState[];
}

export interface MainMenuWeeklyRecordState {
    weekday: string;
    checkedIn: boolean;
    awardedPoints: number;
    status: string;
}

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/**
 * 主菜单签到弹层 - 森林童话重绘版 (/agency-game-designer)
 */
export class MainMenuSignInOverlay {
    private readonly root: Node;
    private readonly dialog: Node;
    private readonly pointsValueLabel: Label;
    private readonly weekProgressLabel: Label;
    private readonly streakValueLabel: Label;
    private readonly actionBtn: Node;
    private readonly actionLabel: Label;
    private readonly actionGlow: Node;
    private readonly dayCardsNode: Node;

    private state: MainMenuSignInState | null = null;

    constructor(
        parent: Node,
        private readonly scaleFactor: number,
        private readonly onAction: () => void,
        private readonly onClose: () => void,
    ) {
        const parentTransform = parent.getComponent(UITransform)!;
        const width = parentTransform.width;
        const height = parentTransform.height;

        this.root = new Node('MainMenuSignInOverlay');
        this.root.layer = 33554432;
        this.root.addComponent(UITransform).setContentSize(width, height);
        this.root.active = false;
        parent.addChild(this.root);

        // 1. 遮罩层 (防穿透与全屏深色模糊感)
        const mask = this.createRectNode('Mask', width, height, new Color(5, 18, 8, 175));
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            this.hide();
            this.onClose();
        });
        this.root.addChild(mask);

        // 2. 主对话框尺寸计算
        const dialogW = Math.min(width * 0.90, 490 * scaleFactor);
        const dialogH = Math.min(height * 0.82, 650 * scaleFactor);
        this.dialog = this.createPanel(dialogW, dialogH);
        this.root.addChild(this.dialog);

        // 3. 顶部关闭按钮 (✕) 置于右上角
        const closeBtn = this.createCircleNode('CloseBtn', 46 * scaleFactor, new Color(255, 255, 255, 30));
        closeBtn.setPosition(dialogW / 2 - 38 * scaleFactor, dialogH / 2 - 38 * scaleFactor, 0);
        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, () => {
            AudioSynth.playClick();
            this.hide();
            this.onClose();
        });
        const closeCross = this.createLabelNode('CloseCross', '✕', 22 * scaleFactor, new Color(255, 246, 217, 255), true);
        closeBtn.addChild(closeCross);
        this.dialog.addChild(closeBtn);

        // 4. 标题与副标题
        const titleY = dialogH / 2 - 50 * scaleFactor;
        const title = this.createLabelNode('Title', '森林签到礼', 36 * scaleFactor, new Color(255, 245, 204, 255), true);
        title.setPosition(0, titleY, 0);
        this.dialog.addChild(title);

        const subtitleY = dialogH / 2 - 88 * scaleFactor;
        const subtitle = this.createLabelNode('Subtitle', '每日签到领积分 · 连续签到按周重置', 17 * scaleFactor, new Color(201, 235, 183, 255), false);
        subtitle.setPosition(0, subtitleY, 0);
        this.dialog.addChild(subtitle);

        // 5. 顶部积分与统计摘要卡片
        const summaryW = dialogW - 44 * scaleFactor;
        const summaryH = 100 * scaleFactor;
        const summaryY = dialogH / 2 - 172 * scaleFactor;
        const summaryCard = this.createRectNode('SummaryCard', summaryW, summaryH, new Color(17, 48, 20, 240), 22 * scaleFactor);
        summaryCard.setPosition(0, summaryY, 0);
        
        // 摘要卡片金色细边线
        const summaryG = summaryCard.getComponent(Graphics)!;
        summaryG.strokeColor = new Color(245, 222, 142, 130);
        summaryG.lineWidth = 2 * scaleFactor;
        summaryG.roundRect(-summaryW / 2, -summaryH / 2, summaryW, summaryH, 22 * scaleFactor);
        summaryG.stroke();
        this.dialog.addChild(summaryCard);

        // 左侧：当前总积分
        const pointsTitle = this.createLabelNode('PointsTitle', '当前总积分', 16 * scaleFactor, new Color(185, 218, 172, 255), false);
        pointsTitle.setPosition(-summaryW / 4, 18 * scaleFactor, 0);
        summaryCard.addChild(pointsTitle);

        this.pointsValueLabel = this.createLabelNode('PointsValue', '0', 32 * scaleFactor, new Color(255, 224, 115, 255), true).getComponent(Label)!;
        this.pointsValueLabel.node.setPosition(-summaryW / 4, -16 * scaleFactor, 0);
        summaryCard.addChild(this.pointsValueLabel.node);

        // 中间分割线
        const divider = this.createRectNode('Divider', 2 * scaleFactor, 54 * scaleFactor, new Color(255, 255, 255, 35));
        divider.setPosition(0, 0, 0);
        summaryCard.addChild(divider);

        // 右侧：本周进度与连签
        this.weekProgressLabel = this.createLabelNode('WeekProgress', '本周已签 0/7 天', 18 * scaleFactor, new Color(238, 247, 222, 255), true).getComponent(Label)!;
        this.weekProgressLabel.node.setPosition(summaryW / 4, 18 * scaleFactor, 0);
        summaryCard.addChild(this.weekProgressLabel.node);

        this.streakValueLabel = this.createLabelNode('StreakValue', '连续签到 0 天', 16 * scaleFactor, new Color(255, 212, 112, 255), false).getComponent(Label)!;
        this.streakValueLabel.node.setPosition(summaryW / 4, -16 * scaleFactor, 0);
        summaryCard.addChild(this.streakValueLabel.node);

        // 6. 中间：7 天周签到进度轨道卡片 (7-Day Weekly Matrix)
        const trackerW = dialogW - 44 * scaleFactor;
        const trackerH = 184 * scaleFactor;
        const trackerY = dialogH / 2 - 335 * scaleFactor;
        const trackerCard = this.createRectNode('TrackerCard', trackerW, trackerH, new Color(14, 40, 16, 230), 22 * scaleFactor);
        trackerCard.setPosition(0, trackerY, 0);

        const trackerTitle = this.createLabelNode('TrackerTitle', '本周签到轨迹', 18 * scaleFactor, new Color(230, 245, 215, 255), true);
        trackerTitle.setPosition(0, trackerH / 2 - 22 * scaleFactor, 0);
        trackerCard.addChild(trackerTitle);

        this.dayCardsNode = new Node('DayCardsNode');
        this.dayCardsNode.layer = 33554432;
        this.dayCardsNode.setPosition(0, -12 * scaleFactor, 0);
        trackerCard.addChild(this.dayCardsNode);
        this.dialog.addChild(trackerCard);

        // 7. 置底：主签到按钮 (Action Button at the Bottom)
        const btnW = dialogW - 56 * scaleFactor;
        const btnH = 82 * scaleFactor;
        const btnY = -dialogH / 2 + 65 * scaleFactor; // 精确摆放在最底部

        this.actionBtn = this.createRectNode('ActionBtn', btnW, btnH, new Color(230, 148, 28, 255), 41 * scaleFactor);
        this.actionBtn.setPosition(0, btnY, 0);
        this.actionBtn.addComponent(Button);

        // 按钮顶部 3D 高光条
        this.actionGlow = this.createRectNode('ActionGlow', btnW - 20 * scaleFactor, btnH * 0.26, new Color(255, 255, 255, 80), (btnH * 0.26) / 2);
        this.actionGlow.setPosition(0, btnH * 0.25, 0);
        this.actionBtn.addChild(this.actionGlow);

        this.actionLabel = this.createLabelNode('ActionLabel', '立即签到 +10 积分', 26 * scaleFactor, new Color(255, 255, 255, 255), true).getComponent(Label)!;
        this.actionBtn.addChild(this.actionLabel.node);

        this.actionBtn.on(Node.EventType.TOUCH_START, () => {
            if (this.state && !this.state.signedToday) {
                this.actionBtn.setScale(new Vec3(0.95, 0.95, 1));
            }
        });
        this.actionBtn.on(Node.EventType.TOUCH_END, () => {
            this.actionBtn.setScale(new Vec3(1, 1, 1));
            AudioSynth.playClick();
            this.onAction();
        });
        this.actionBtn.on(Node.EventType.TOUCH_CANCEL, () => {
            this.actionBtn.setScale(new Vec3(1, 1, 1));
        });
        this.dialog.addChild(this.actionBtn);
    }

    public show(state: MainMenuSignInState): void {
        this.updateState(state);
        this.root.active = true;
        this.dialog.setScale(new Vec3(0.80, 0.80, 1));
        tween(this.dialog).stop();
        tween(this.dialog).to(0.24, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    }

    public hide(): void {
        if (!this.root.active) {
            return;
        }

        tween(this.dialog).stop();
        tween(this.dialog)
            .to(0.18, { scale: new Vec3(0.85, 0.85, 1) }, { easing: 'backIn' })
            .call(() => {
                this.root.active = false;
            })
            .start();
    }

    public updateState(state: MainMenuSignInState): void {
        this.state = state;
        this.pointsValueLabel.string = `${state.totalPoints}`;
        this.weekProgressLabel.string = `本周已签 ${state.weekSignedDays}/7 天`;
        this.streakValueLabel.string = `连续签到 ${state.weekContinuousDays} 天`;

        // 重新构建 7 天卡片矩阵
        this.buildDayCards(state);

        // 更新底部按钮外观状态
        const btnG = this.actionBtn.getComponent(Graphics)!;
        btnG.clear();
        const btnW = (this.dialog.getComponent(UITransform)!.width) - 56 * this.scaleFactor;
        const btnH = 82 * this.scaleFactor;

        if (state.signedToday) {
            btnG.fillColor = new Color(52, 85, 48, 255);
            btnG.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 41 * this.scaleFactor);
            btnG.fill();
            this.actionGlow.active = false;
            this.actionLabel.string = '今天已签到';
            this.actionLabel.color = new Color(175, 205, 168, 255);
        } else {
            btnG.fillColor = new Color(38, 165, 52, 255);
            btnG.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 41 * this.scaleFactor);
            btnG.fill();
            btnG.strokeColor = new Color(255, 235, 150, 200);
            btnG.lineWidth = 3 * this.scaleFactor;
            btnG.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, 41 * this.scaleFactor);
            btnG.stroke();
            this.actionGlow.active = true;
            this.actionLabel.string = state.rewardPoints > 0
                ? `立即签到 +${state.rewardPoints} 积分`
                : '立即签到';
            this.actionLabel.color = new Color(255, 255, 255, 255);
        }
    }

    public destroy(): void {
        this.root.destroy();
    }

    /**
     * 生成周一至周日 7 天卡片展示
     */
    private buildDayCards(state: MainMenuSignInState): void {
        this.dayCardsNode.destroyAllChildren();

        const dialogW = this.dialog.getComponent(UITransform)!.width;
        const containerW = dialogW - 56 * this.scaleFactor;
        const cardGap = 6 * this.scaleFactor;
        const cardW = (containerW - cardGap * 6) / 7;
        const cardH = 114 * this.scaleFactor;
        const startX = -containerW / 2 + cardW / 2;

        const weeklyRecords = this.resolveWeeklyRecords(state);
        const todayIndex = this.getMondayBasedWeekdayIndex(new Date());

        for (let i = 0; i < 7; i++) {
            const record = weeklyRecords[i];
            const isSigned = record.checkedIn;
            const isToday = i === todayIndex;

            const card = new Node(`DayCard_${i}`);
            card.layer = 33554432;
            card.setPosition(startX + i * (cardW + cardGap), 0, 0);
            card.addComponent(UITransform).setContentSize(cardW, cardH);

            const cardG = card.addComponent(Graphics);
            cardG.clear();

            if (isSigned) {
                // 已签到：暗绿地 + 金/绿描边
                cardG.fillColor = new Color(34, 78, 30, 240);
                cardG.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12 * this.scaleFactor);
                cardG.fill();
                cardG.strokeColor = new Color(135, 205, 110, 180);
                cardG.lineWidth = 2 * this.scaleFactor;
                cardG.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12 * this.scaleFactor);
                cardG.stroke();
            } else if (isToday) {
                // 今日待签：暖金高亮底 + 金色闪耀外框
                cardG.fillColor = new Color(74, 60, 20, 250);
                cardG.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12 * this.scaleFactor);
                cardG.fill();
                cardG.strokeColor = new Color(255, 218, 88, 255);
                cardG.lineWidth = 3 * this.scaleFactor;
                cardG.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12 * this.scaleFactor);
                cardG.stroke();
            } else {
                // 未到天数：极简微透底
                cardG.fillColor = new Color(22, 50, 24, 180);
                cardG.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 12 * this.scaleFactor);
                cardG.fill();
            }

            // 1. 周几 Label
            const dayName = record.weekday || WEEK_DAYS[i];
            const dayColor = isToday ? new Color(255, 230, 130, 255) : new Color(190, 220, 180, 255);
            const dayLabel = this.createLabelNode('DayName', dayName, 15 * this.scaleFactor, dayColor, isToday);
            dayLabel.setPosition(0, cardH / 2 - 20 * this.scaleFactor, 0);
            card.addChild(dayLabel);

            // 2. 状态 Icon 或 奖励值 Label
            if (isSigned) {
                const checkLabel = this.createLabelNode('CheckIcon', '✓', 26 * this.scaleFactor, new Color(130, 240, 110, 255), true);
                checkLabel.setPosition(0, -6 * this.scaleFactor, 0);
                card.addChild(checkLabel);
            } else {
                const rewardTxt = isToday && state.rewardPoints > 0 ? `+${state.rewardPoints}` : '';
                const rewardColor = isToday ? new Color(255, 215, 75, 255) : new Color(160, 195, 150, 255);
                const rewardLabel = this.createLabelNode('RewardTxt', rewardTxt, 16 * this.scaleFactor, rewardColor, true);
                rewardLabel.setPosition(0, -6 * this.scaleFactor, 0);
                card.addChild(rewardLabel);
            }

            // 3. 底部状态 Tag
            const statusTxt = isSigned ? '已签' : (isToday ? '今天' : '未签');
            const statusColor = isSigned
                ? new Color(140, 210, 120, 255)
                : (isToday ? new Color(255, 220, 100, 255) : new Color(125, 155, 120, 255));
            const statusLabel = this.createLabelNode('StatusTxt', statusTxt, 13 * this.scaleFactor, statusColor, isToday);
            statusLabel.setPosition(0, -cardH / 2 + 18 * this.scaleFactor, 0);
            card.addChild(statusLabel);

            this.dayCardsNode.addChild(card);
        }
    }

    private resolveWeeklyRecords(state: MainMenuSignInState): MainMenuWeeklyRecordState[] {
        if (state.weeklyRecords && state.weeklyRecords.length >= 7) {
            return state.weeklyRecords.slice(0, 7);
        }

        const todayIndex = this.getMondayBasedWeekdayIndex(new Date());
        const signedCount = Math.max(0, Math.min(7, state.weekSignedDays));
        const records: MainMenuWeeklyRecordState[] = [];

        for (let i = 0; i < 7; i++) {
            const checkedIn = state.signedToday && i === todayIndex
                ? true
                : i < signedCount && (!state.signedToday || i !== todayIndex);
            records.push({
                weekday: WEEK_DAYS[i],
                checkedIn,
                awardedPoints: checkedIn ? state.rewardPoints : 0,
                status: checkedIn ? 'checked_in' : 'pending',
            });
        }

        return records;
    }

    private getMondayBasedWeekdayIndex(today: Date): number {
        const weekday = today.getDay();
        return weekday === 0 ? 6 : weekday - 1;
    }

    private createPanel(width: number, height: number): Node {
        const panel = this.createRectNode('Dialog', width, height, new Color(20, 56, 23, 250), 32 * this.scaleFactor);
        panel.setPosition(0, 0, 0);

        const border = panel.addComponent(Graphics);
        border.lineWidth = 4 * this.scaleFactor;
        border.strokeColor = new Color(255, 225, 140, 230);
        border.roundRect(-width / 2, -height / 2, width, height, 32 * this.scaleFactor);
        border.stroke();
        return panel;
    }

    private createRectNode(name: string, width: number, height: number, color: Color, radius: number = 0): Node {
        const node = new Node(name);
        node.layer = 33554432;
        node.addComponent(UITransform).setContentSize(width, height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = color;
        if (radius > 0) {
            graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        } else {
            graphics.rect(-width / 2, -height / 2, width, height);
        }
        graphics.fill();
        return node;
    }

    private createCircleNode(name: string, diameter: number, color: Color): Node {
        const node = new Node(name);
        node.layer = 33554432;
        node.addComponent(UITransform).setContentSize(diameter, diameter);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.circle(0, 0, diameter / 2);
        graphics.fill();
        return node;
    }

    private createLabelNode(name: string, text: string, fontSize: number, color: Color, bold: boolean): Node {
        const node = new Node(name);
        node.layer = 33554432;
        node.addComponent(UITransform);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.color = color;
        label.isBold = bold;
        return node;
    }
}
