import { Color, Graphics, Label, Node, tween, UITransform, UIOpacity, Vec3, _decorator } from 'cc';
import { AudioSynth } from '../utils/AudioSynth';

const { ccclass } = _decorator;

@ccclass('SignInSuccessAnimation')
export class SignInSuccessAnimation {
    public static play(parent: Node, rewardPoints: number, scaleFactor: number): void {
        AudioSynth.playJoyfulClick();

        const overlay = new Node('SignInSuccessOverlay');
        overlay.layer = 33554432;
        overlay.addComponent(UITransform).setContentSize(parent.getComponent(UITransform)!.contentSize);
        parent.addChild(overlay);

        const opacity = overlay.addComponent(UIOpacity);
        opacity.opacity = 0;

        const badge = this.createBadge(scaleFactor, rewardPoints);
        badge.setPosition(0, 40 * scaleFactor, 0);
        badge.setScale(new Vec3(0.68, 0.68, 1));
        overlay.addChild(badge);

        for (let i = 0; i < 10; i++) {
            const sparkle = this.createSparkle(scaleFactor);
            sparkle.setPosition(0, 48 * scaleFactor, 0);
            overlay.addChild(sparkle);
            const angle = (Math.PI * 2 * i) / 10;
            const targetX = Math.cos(angle) * (110 + (i % 3) * 18) * scaleFactor;
            const targetY = Math.sin(angle) * (90 + (i % 2) * 24) * scaleFactor + 40 * scaleFactor;
            const sparkleOpacity = sparkle.addComponent(UIOpacity);
            sparkleOpacity.opacity = 0;
            tween(sparkleOpacity).to(0.12, { opacity: 255 }).to(0.45, { opacity: 0 }).start();
            tween(sparkle)
                .to(0.55, { position: new Vec3(targetX, targetY, 0), scale: new Vec3(1.2, 1.2, 1) }, { easing: 'sineOut' })
                .call(() => sparkle.destroy())
                .start();
        }

        tween(opacity).to(0.12, { opacity: 255 }).delay(1.0).to(0.25, { opacity: 0 }).call(() => overlay.destroy()).start();
        tween(badge)
            .to(0.24, { scale: new Vec3(1.06, 1.06, 1), position: new Vec3(0, 70 * scaleFactor, 0) }, { easing: 'backOut' })
            .delay(0.8)
            .to(0.22, { scale: new Vec3(0.94, 0.94, 1) }, { easing: 'sineInOut' })
            .start();
    }


    private static createBadge(scaleFactor: number, rewardPoints: number): Node {
        const badge = new Node('SignInBadge');
        badge.layer = 33554432;
        badge.addComponent(UITransform).setContentSize(420 * scaleFactor, 230 * scaleFactor);

        const glow = new Node('Glow');
        glow.layer = 33554432;
        glow.addComponent(UITransform).setContentSize(440 * scaleFactor, 250 * scaleFactor);
        const glowGraphics = glow.addComponent(Graphics);
        glowGraphics.fillColor = new Color(255, 227, 130, 52);
        glowGraphics.roundRect(-220 * scaleFactor, -125 * scaleFactor, 440 * scaleFactor, 250 * scaleFactor, 50 * scaleFactor);
        glowGraphics.fill();
        badge.addChild(glow);

        const panel = new Node('Panel');
        panel.layer = 33554432;
        panel.addComponent(UITransform).setContentSize(380 * scaleFactor, 200 * scaleFactor);
        const graphics = panel.addComponent(Graphics);
        graphics.fillColor = new Color(36, 84, 28, 235);
        graphics.roundRect(-190 * scaleFactor, -100 * scaleFactor, 380 * scaleFactor, 200 * scaleFactor, 42 * scaleFactor);
        graphics.fill();
        graphics.strokeColor = new Color(255, 233, 163, 220);
        graphics.lineWidth = 4 * scaleFactor;
        graphics.roundRect(-190 * scaleFactor, -100 * scaleFactor, 380 * scaleFactor, 200 * scaleFactor, 42 * scaleFactor);
        graphics.stroke();
        badge.addChild(panel);

        const title = this.createLabel('签到成功', 42 * scaleFactor, new Color(255, 247, 209, 255), true);
        title.setPosition(0, 36 * scaleFactor, 0);
        panel.addChild(title);

        const subtitle = this.createLabel(`恭喜获得 +${rewardPoints} 积分`, 28 * scaleFactor, new Color(255, 218, 120, 255), true);
        subtitle.setPosition(0, -18 * scaleFactor, 0);
        panel.addChild(subtitle);

        const hint = this.createLabel('今日签到已收入囊中', 20 * scaleFactor, new Color(216, 239, 198, 255), false);
        hint.setPosition(0, -58 * scaleFactor, 0);
        panel.addChild(hint);

        return badge;
    }

    private static createSparkle(scaleFactor: number): Node {
        const sparkle = new Node('Sparkle');
        sparkle.layer = 33554432;
        sparkle.addComponent(UITransform).setContentSize(20 * scaleFactor, 20 * scaleFactor);
        const graphics = sparkle.addComponent(Graphics);
        graphics.fillColor = new Color(255, 233, 153, 255);
        graphics.circle(0, 0, 6 * scaleFactor);
        graphics.fill();
        return sparkle;
    }

    private static createLabel(text: string, fontSize: number, color: Color, bold: boolean): Node {
        const node = new Node(text);
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
