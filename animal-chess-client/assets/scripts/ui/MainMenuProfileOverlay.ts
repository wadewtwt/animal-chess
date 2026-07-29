import { Button, Color, Graphics, Label, Node, UITransform } from 'cc';

export interface WechatUserInfo {
    nickName?: string;
    avatarUrl?: string;
}

export class MainMenuProfileOverlay {
    private readonly root: Node;
    private nativeButton: any = null;
    private readonly onAuthorized: (profile: WechatUserInfo) => void;

    public constructor(parent: Node, scaleFactor: number, onAuthorized: (profile: WechatUserInfo) => void) {
        this.onAuthorized = onAuthorized;
        this.root = new Node('MainMenuProfileOverlay');
        this.root.layer = 33554432;
        this.root.addComponent(UITransform).setContentSize(520 * scaleFactor, 260 * scaleFactor);
        const graphics = this.root.addComponent(Graphics);
        graphics.fillColor = new Color(20, 56, 23, 245);
        graphics.roundRect(-260 * scaleFactor, -130 * scaleFactor, 520 * scaleFactor, 260 * scaleFactor, 24 * scaleFactor);
        graphics.fill();
        const title = new Node('Title');
        const label = title.addComponent(Label);
        label.string = '完善微信资料';
        label.fontSize = 28 * scaleFactor;
        label.color = new Color(255, 235, 170, 255);
        title.setPosition(0, 70 * scaleFactor, 0);
        this.root.addChild(title);
        const hint = new Node('Hint');
        const hintLabel = hint.addComponent(Label);
        hintLabel.string = '授权昵称和头像，可随时跳过';
        hintLabel.fontSize = 20 * scaleFactor;
        hintLabel.color = new Color(220, 240, 210, 255);
        hint.setPosition(0, 20 * scaleFactor, 0);
        this.root.addChild(hint);
        const skip = new Node('Skip');
        const skipLabel = skip.addComponent(Label);
        skipLabel.string = '暂不授权';
        skipLabel.fontSize = 18 * scaleFactor;
        skipLabel.color = new Color(190, 220, 180, 255);
        skip.addComponent(UITransform).setContentSize(180 * scaleFactor, 44 * scaleFactor);
        skip.setPosition(0, -70 * scaleFactor, 0);
        skip.addComponent(Button);
        skip.on(Node.EventType.TOUCH_END, () => this.hide());
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
        const width = Math.min(240, Math.max(160, Number(info.windowWidth || 375) * 0.55));
        const height = 48;
        this.nativeButton = wxObj.createUserInfoButton({
            type: 'text',
            text: '授权微信资料',
            style: {
                left: (Number(info.windowWidth || 375) - width) / 2,
                top: Number(info.windowHeight || 667) / 2 + 35,
                width,
                height,
                color: '#ffffff',
                backgroundColor: '#2b8735',
                borderColor: '#ffe696',
                borderWidth: 1,
                borderRadius: 8,
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

    private destroyNativeButton(): void {
        if (this.nativeButton && typeof this.nativeButton.destroy === 'function') {
            this.nativeButton.destroy();
        }
        this.nativeButton = null;
    }
}
