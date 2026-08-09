import { Button, Color, EventTouch, Graphics, Label, Node, UITransform } from 'cc';

export interface WechatUserInfo {
    nickName?: string;
    avatarUrl?: string;
}

export class MainMenuProfileOverlay {
    private readonly root: Node;
    private readonly dialog: Node;
    private readonly nicknameLabel: Label;
    private inputContainerNode: Node | null = null;
    private currentNickname: string = '';
    private readonly onAuthorized: (profile: WechatUserInfo) => void;
    private readonly onClose?: () => void;
    private readonly scaleFactor: number;

    public constructor(
        parent: Node,
        scaleFactor: number,
        onAuthorized: (profile: WechatUserInfo) => void,
        onClose?: () => void,
        initialNickname?: string,
    ) {
        this.onAuthorized = onAuthorized;
        this.onClose = onClose;
        this.scaleFactor = scaleFactor;

        const parentTransform = parent.getComponent(UITransform);
        const width = parentTransform ? parentTransform.width : 1280;
        const height = parentTransform ? parentTransform.height : 720;

        // 1. 全屏根节点
        this.root = new Node('MainMenuProfileOverlay');
        this.root.layer = 33554432;
        this.root.addComponent(UITransform).setContentSize(width, height);

        // 2. 全屏防穿透遮罩
        const mask = new Node('Mask');
        mask.layer = 33554432;
        mask.addComponent(UITransform).setContentSize(width, height);
        const maskG = mask.addComponent(Graphics);
        maskG.fillColor = new Color(5, 18, 8, 180);
        maskG.rect(-width / 2, -height / 2, width, height);
        maskG.fill();
        mask.addComponent(Button);

        const stopPropagation = (e: EventTouch) => {
            e.propagationStopped = true;
        };
        mask.on(Node.EventType.TOUCH_START, stopPropagation);
        mask.on(Node.EventType.TOUCH_MOVE, stopPropagation);
        mask.on(Node.EventType.TOUCH_END, stopPropagation);
        this.root.addChild(mask);

        // 3. 对话框主面板
        const dialogW = 540 * scaleFactor;
        const dialogH = 295 * scaleFactor;
        this.dialog = new Node('Dialog');
        this.dialog.layer = 33554432;
        this.dialog.addComponent(UITransform).setContentSize(dialogW, dialogH);
        this.dialog.on(Node.EventType.TOUCH_START, stopPropagation);
        this.dialog.on(Node.EventType.TOUCH_MOVE, stopPropagation);
        this.dialog.on(Node.EventType.TOUCH_END, stopPropagation);

        const graphics = this.dialog.addComponent(Graphics);
        graphics.fillColor = new Color(20, 56, 23, 250);
        graphics.roundRect(-dialogW / 2, -dialogH / 2, dialogW, dialogH, 24 * scaleFactor);
        graphics.fill();
        graphics.strokeColor = new Color(255, 230, 150, 230);
        graphics.lineWidth = 3 * scaleFactor;
        graphics.roundRect(-dialogW / 2, -dialogH / 2, dialogW, dialogH, 24 * scaleFactor);
        graphics.stroke();
        this.root.addChild(this.dialog);

        // 3.1 右上角关闭按钮 (✕)
        const closeBtnSize = 36 * scaleFactor;
        const closeBtn = new Node('CloseButton');
        closeBtn.layer = 33554432;
        closeBtn.addComponent(UITransform).setContentSize(closeBtnSize, closeBtnSize);
        closeBtn.setPosition(dialogW / 2 - 28 * scaleFactor, dialogH / 2 - 28 * scaleFactor, 0);

        const closeG = closeBtn.addComponent(Graphics);
        closeG.fillColor = new Color(10, 34, 12, 200);
        closeG.circle(0, 0, closeBtnSize / 2);
        closeG.fill();
        closeG.strokeColor = new Color(255, 220, 130, 220);
        closeG.lineWidth = 1.5 * scaleFactor;
        closeG.circle(0, 0, closeBtnSize / 2);
        closeG.stroke();

        closeG.strokeColor = new Color(240, 225, 175, 255);
        closeG.lineWidth = 2.5 * scaleFactor;
        const crossR = 7 * scaleFactor;
        closeG.moveTo(-crossR, crossR);
        closeG.lineTo(crossR, -crossR);
        closeG.moveTo(crossR, crossR);
        closeG.lineTo(-crossR, -crossR);
        closeG.stroke();

        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            stopPropagation(e);
            this.hide();
            this.onClose?.();
        });
        this.dialog.addChild(closeBtn);

        // 4. 标题与提示文案
        const title = new Node('Title');
        title.layer = 33554432;
        const label = title.addComponent(Label);
        label.string = '设置玩家昵称';
        label.fontSize = 26 * scaleFactor;
        label.color = new Color(255, 235, 170, 255);
        label.isBold = true;
        title.setPosition(0, 92 * scaleFactor, 0);
        this.dialog.addChild(title);

        const hint = new Node('Hint');
        hint.layer = 33554432;
        const hintLabel = hint.addComponent(Label);
        hintLabel.string = '在下方弹出框中输入昵称后点击【完成】';
        hintLabel.fontSize = 16 * scaleFactor;
        hintLabel.color = new Color(220, 240, 210, 255);
        hint.setPosition(0, 48 * scaleFactor, 0);
        this.dialog.addChild(hint);

        // 5. 玩家昵称输入框 UI
        const inputW = 360 * scaleFactor;
        const inputH = 48 * scaleFactor;
        this.inputContainerNode = new Node('InputContainer');
        this.inputContainerNode.layer = 33554432;
        this.inputContainerNode.addComponent(UITransform).setContentSize(inputW, inputH);
        const inputG = this.inputContainerNode.addComponent(Graphics);
        inputG.fillColor = new Color(12, 38, 15, 255);
        inputG.roundRect(-inputW / 2, -inputH / 2, inputW, inputH, 12 * scaleFactor);
        inputG.fill();
        inputG.strokeColor = new Color(255, 220, 130, 200);
        inputG.lineWidth = 2 * scaleFactor;
        inputG.roundRect(-inputW / 2, -inputH / 2, inputW, inputH, 12 * scaleFactor);
        inputG.stroke();
        this.inputContainerNode.setPosition(0, -8 * scaleFactor, 0);
        this.inputContainerNode.addComponent(Button);

        const nicknameTextNode = new Node('NicknameText');
        nicknameTextNode.layer = 33554432;
        this.nicknameLabel = nicknameTextNode.addComponent(Label);
        this.nicknameLabel.string = '点击输入玩家昵称';
        this.nicknameLabel.fontSize = 19 * scaleFactor;
        this.nicknameLabel.color = new Color(160, 190, 155, 255);
        this.nicknameLabel.isBold = true;
        this.inputContainerNode.addChild(nicknameTextNode);
        this.dialog.addChild(this.inputContainerNode);

        // 点击 Cocos 输入框唤起微信键盘
        this.inputContainerNode.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            stopPropagation(e);
            this.triggerNicknameKeyboard();
        });

        // 6. 保存并完成签到按钮 (布局居中对齐)
        const saveBtnW = 280 * scaleFactor;
        const saveBtnH = 50 * scaleFactor;
        const saveBtn = new Node('SaveButton');
        saveBtn.layer = 33554432;
        saveBtn.addComponent(UITransform).setContentSize(saveBtnW, saveBtnH);
        const saveG = saveBtn.addComponent(Graphics);
        saveG.fillColor = new Color(43, 135, 53, 255);
        saveG.roundRect(-saveBtnW / 2, -saveBtnH / 2, saveBtnW, saveBtnH, 14 * scaleFactor);
        saveG.fill();
        saveG.strokeColor = new Color(255, 230, 150, 255);
        saveG.lineWidth = 2 * scaleFactor;
        saveG.roundRect(-saveBtnW / 2, -saveBtnH / 2, saveBtnW, saveBtnH, 14 * scaleFactor);
        saveG.stroke();
        saveBtn.setPosition(0, -76 * scaleFactor, 0);

        const saveTxtNode = new Node('SaveTxt');
        saveTxtNode.layer = 33554432;
        const saveLbl = saveTxtNode.addComponent(Label);
        saveLbl.string = '保存并完成签到';
        saveLbl.fontSize = 20 * scaleFactor;
        saveLbl.color = Color.WHITE;
        saveLbl.isBold = true;
        saveBtn.addChild(saveTxtNode);
        saveBtn.addComponent(Button);

        saveBtn.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            stopPropagation(e);
            this.confirmAndSubmit();
        });
        this.dialog.addChild(saveBtn);

        parent.addChild(this.root);
        this.root.active = false;
        if (initialNickname) {
            this.updateNicknameDisplay(initialNickname);
        }
    }

    public isShowing(): boolean {
        return this.root.isValid && this.root.active;
    }

    public show(initialNickname?: string): void {
        if (!this.root.isValid) {
            return;
        }
        if (initialNickname) {
            this.updateNicknameDisplay(initialNickname);
        }
        this.root.active = true;
    }

    public hide(): void {
        if (this.root.isValid) {
            this.root.active = false;
        }
    }

    public destroy(): void {
        if (this.root.isValid) {
            this.root.destroy();
        }
    }

    private updateNicknameDisplay(value: string): void {
        const trimmed = value.trim();
        this.currentNickname = trimmed;
        if (trimmed) {
            this.nicknameLabel.string = trimmed;
            this.nicknameLabel.color = new Color(255, 235, 170, 255);
        } else {
            this.nicknameLabel.string = '点击输入玩家昵称';
            this.nicknameLabel.color = new Color(160, 190, 155, 255);
        }
    }

    private confirmAndSubmit(): void {
        const nickname = this.currentNickname.trim() || '微信用户';
        this.hide();
        this.onAuthorized({ nickName: nickname });
    }

    private triggerNicknameKeyboard(): void {
        const wxObj = (globalThis as any).wx;
        if (wxObj && typeof wxObj.showKeyboard === 'function') {
            wxObj.showKeyboard({
                defaultValue: this.currentNickname || '',
                maxLength: 16,
                multiple: false,
                confirmHold: false,
                confirmType: 'done',
            });

            const onInput = (res: any) => {
                if (res && typeof res.value === 'string') {
                    this.updateNicknameDisplay(res.value);
                }
            };
            const onConfirm = (res: any) => {
                if (res && typeof res.value === 'string') {
                    this.updateNicknameDisplay(res.value);
                }
                if (typeof wxObj.hideKeyboard === 'function') {
                    wxObj.hideKeyboard({});
                }
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
            return;
        }

        const inputVal = (globalThis as any).prompt ? (globalThis as any).prompt('请输入玩家昵称：', this.currentNickname || '玩家') : null;
        if (typeof inputVal === 'string') {
            this.updateNicknameDisplay(inputVal);
        }
    }
}

