import { Button, Color, Graphics, Label, Node, UITransform } from 'cc';

export interface WechatUserInfo {
    nickName?: string;
    avatarUrl?: string;
}

export class MainMenuProfileOverlay {
    private readonly root: Node;
    private nativeButton: any = null;
    private readonly onAuthorized: (profile: WechatUserInfo) => void;
    private readonly onClose?: () => void;
    private readonly scaleFactor: number;

    public constructor(
        parent: Node,
        scaleFactor: number,
        onAuthorized: (profile: WechatUserInfo) => void,
        onClose?: () => void,
    ) {
        this.onAuthorized = onAuthorized;
        this.onClose = onClose;
        this.scaleFactor = scaleFactor;
        this.root = new Node('MainMenuProfileOverlay');
        this.root.layer = 33554432;
        this.root.addComponent(UITransform).setContentSize(520 * scaleFactor, 260 * scaleFactor);
        const graphics = this.root.addComponent(Graphics);
        graphics.fillColor = new Color(20, 56, 23, 245);
        graphics.roundRect(-260 * scaleFactor, -130 * scaleFactor, 520 * scaleFactor, 260 * scaleFactor, 24 * scaleFactor);
        graphics.fill();
        const title = new Node('Title');
        const label = title.addComponent(Label);
        label.string = '授权微信昵称';
        label.fontSize = 28 * scaleFactor;
        label.color = new Color(255, 235, 170, 255);
        title.setPosition(0, 70 * scaleFactor, 0);
        this.root.addChild(title);
        const hint = new Node('Hint');
        const hintLabel = hint.addComponent(Label);
        hintLabel.string = '每日签到需要授权微信昵称才能领取奖励哦';
        hintLabel.fontSize = 18 * scaleFactor;
        hintLabel.color = new Color(220, 240, 210, 255);
        hint.setPosition(0, 20 * scaleFactor, 0);
        this.root.addChild(hint);
        const auth = this.createAuthButton(scaleFactor);
        auth.setPosition(0, -35 * scaleFactor, 0);
        this.root.addChild(auth);
        const skip = new Node('Skip');
        const skipLabel = skip.addComponent(Label);
        skipLabel.string = '暂不授权';
        skipLabel.fontSize = 18 * scaleFactor;
        skipLabel.color = new Color(190, 220, 180, 255);
        skip.addComponent(UITransform).setContentSize(180 * scaleFactor, 44 * scaleFactor);
        skip.setPosition(0, -95 * scaleFactor, 0);
        skip.addComponent(Button);
        skip.on(Node.EventType.TOUCH_END, () => {
            this.hide();
            this.onClose?.();
        });
        this.root.addChild(skip);
        parent.addChild(this.root);
        this.root.active = false;
    }


    public show(): void {
        if (!this.root.isValid) {
            return;
        }
        this.root.active = true;
        this.createNativeButton();
    }

    public hide(): void {
        this.destroyNativeButton();
        if (this.root.isValid) {
            this.root.active = false;
        }
    }

    public destroy(): void {
        this.destroyNativeButton();
        if (this.root.isValid) {
            this.root.destroy();
        }
    }

    private createNativeButton(): void {
        const wxObj = (globalThis as any).wx;
        if (!wxObj || typeof wxObj.createUserInfoButton !== 'function') {
            console.log('[MainMenuProfileOverlay] createNativeButton skipped: unavailable');
            this.hide();
            return;
        }
        this.destroyNativeButton();
        const info = typeof wxObj.getSystemInfoSync === 'function' ? wxObj.getSystemInfoSync() : { windowWidth: 375, windowHeight: 667 };
        const windowWidth = Number(info.windowWidth || 375);
        const windowHeight = Number(info.windowHeight || 667);
        const width = Math.min(240, Math.max(160, windowWidth * 0.55));
        const height = Math.max(44, 48 * this.scaleFactor);
        this.nativeButton = wxObj.createUserInfoButton({
            type: 'text',
            text: '',
            style: {
                left: (windowWidth - width) / 2,
                top: windowHeight / 2 + 35 * this.scaleFactor - height / 2,
                width,
                height,
                color: 'rgba(255,255,255,0)',
                backgroundColor: 'rgba(255,255,255,0)',
                borderColor: 'rgba(255,255,255,0)',
                borderWidth: 0,
                borderRadius: 12,
                fontSize: 16,
                textAlign: 'center',
            },
        });
        if (this.nativeButton && typeof this.nativeButton.onTap === 'function') {
            this.nativeButton.onTap((result: any) => {
                this.destroyNativeButton();
                if (result && result.userInfo) {
                    this.onAuthorized(result.userInfo);
                    return;
                }
                this.hide();
            });
        }
    }

    private createAuthButton(scaleFactor: number): Node {
        const width = 240 * scaleFactor;
        const height = 48 * scaleFactor;
        const radius = 12 * scaleFactor;
        const node = new Node('AuthorizeButton');
        node.layer = 33554432;
        node.addComponent(UITransform).setContentSize(width, height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = new Color(43, 135, 53, 255);
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.fill();
        graphics.strokeColor = new Color(255, 230, 150, 255);
        graphics.lineWidth = 1 * scaleFactor;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.stroke();

        const text = new Node('AuthorizeLabel');
        text.layer = 33554432;
        const label = text.addComponent(Label);
        label.string = '授权微信资料';
        label.fontSize = 18 * scaleFactor;
        label.lineHeight = 22 * scaleFactor;
        label.color = new Color(255, 255, 255, 255);
        label.isBold = true;
        node.addChild(text);
        return node;
    }

    private destroyNativeButton(): void {
        if (this.nativeButton && typeof this.nativeButton.destroy === 'function') {
            this.nativeButton.destroy();
        }
        this.nativeButton = null;
    }
}
