import { _decorator, Component, Node, Sprite, Label, tween, Tween, Vec3, SpriteFrame, Color, UITransform, Size, UIOpacity, math } from 'cc';
import { Piece, Camp } from '../engine/LocalEngine';

const { ccclass, property } = _decorator;

@ccclass('PieceView')
export class PieceView extends Component {
    @property(Sprite)
    public animalSprite: Sprite = null!;

    @property(Sprite)
    public baseSprite: Sprite = null!;

    @property(Label)
    public nameLabel: Label = null!;

    private pieceData!: Piece;
    private staticAnimalFrame: SpriteFrame | null = null;
    private walkFrames: SpriteFrame[] = [];
    private walkFrameIndex = 0;
    private isWalking = false;

    private shadowNode: Node | null = null;
    private shadowSprite: Sprite | null = null;
    private shadowOpacity: UIOpacity | null = null;

    private readonly layout = {
        shadowPos: new Vec3(0, -34, 0),
        shadowScale: new Vec3(0.82, 0.28, 1),
        basePos: new Vec3(0, -12, 0),
        baseScale: new Vec3(1, 0.78, 1),
        animalPos: new Vec3(0, 18, 0),
        animalScale: new Vec3(1, 1, 1),
        labelPos: new Vec3(0, -26, 0),
        shadowSelectedPos: new Vec3(0, -40, 0),
        shadowSelectedScale: new Vec3(0.68, 0.22, 1),
        baseSelectedScale: new Vec3(1.06, 0.70, 1),
        animalSelectedPos: new Vec3(0, 30, 0),
        animalSelectedScale: new Vec3(1.08, 1.08, 1),
        labelSelectedPos: new Vec3(0, -30, 0),
    };

    public init(data: Piece, animalSF: SpriteFrame, baseSF: SpriteFrame, walkFrames: SpriteFrame[] = []): void {
        this.pieceData = data;
        this.staticAnimalFrame = animalSF ?? null;
        this.walkFrames = walkFrames.filter(frame => !!frame);
        this.walkFrameIndex = 0;
        this.isWalking = false;

        this.ensureShadowNode();

        if (this.shadowSprite) {
            if (baseSF) {
                this.shadowSprite.spriteFrame = baseSF;
            }
            this.shadowSprite.color = new Color(0, 0, 0, 105);
            this.shadowSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }

        if (this.baseSprite) {
            if (baseSF) {
                this.baseSprite.spriteFrame = baseSF;
            }
            this.baseSprite.color = data.camp === Camp.RED
                ? new Color(240, 90, 90, 255)
                : new Color(80, 145, 245, 255);
        }

        if (this.animalSprite) {
            if (animalSF) {
                this.animalSprite.spriteFrame = animalSF;
            }
            this.animalSprite.color = data.camp === Camp.RED
                ? new Color(255, 220, 220, 255)
                : new Color(220, 235, 255, 255);
            this.animalSprite.node.setScale(new Vec3(data.camp === Camp.BLUE ? -1 : 1, 1, 1));
        }

        if (this.nameLabel) {
            this.nameLabel.string = `${this.getChineseName(data.type)} (${data.type})`;
            this.nameLabel.color = data.camp === Camp.RED ? new Color(220, 30, 30) : new Color(30, 90, 220);
        }

        this.applyDefaultLayout(true);
        this.node.setScale(new Vec3(1, 1, 1));
    }

    public getPieceData(): Piece {
        return this.pieceData;
    }

    public setSelected(selected: boolean): void {
        this.stopAllTweens();
        if (selected) {
            this.startWalkAnimation();
            this.playSelectedLayout(true);
        } else {
            this.stopWalkAnimation(true);
            this.playSelectedLayout(false);
        }
    }

    public smoothMoveTo(targetPos: Vec3, callback?: () => void): void {
        this.stopAllTweens();
        this.stopWalkAnimation(false);
        this.applyDefaultLayout(false);

        tween(this.node)
            .to(0.08, { scale: new Vec3(1.03, 0.98, 1) }, { easing: 'quadOut' })
            .to(0.28, { position: targetPos }, { easing: 'cubicOut' })
            .to(0.10, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .call(() => callback?.())
            .start();

        this.playMoveBounce();
    }

    public playEatenAnimation(callback: () => void): void {
        this.stopAllTweens();
        this.stopWalkAnimation(false);

        if (this.shadowOpacity) {
            tween(this.shadowOpacity)
                .to(0.18, { opacity: 0 }, { easing: 'sineIn' })
                .start();
        }
        if (this.shadowNode) {
            tween(this.shadowNode)
                .to(0.18, { scale: new Vec3(0, 0, 1) }, { easing: 'quadIn' })
                .start();
        }

        tween(this.node)
            .to(0.22, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => {
                callback();
                this.node.destroy();
            })
            .start();
    }

    public playAttackLunge(targetPos: Vec3, onImpact: () => void, onComplete: () => void): void {
        this.stopAllTweens();
        this.stopWalkAnimation(false);

        const currentPos = this.node.position.clone();
        const dir = targetPos.clone().subtract(currentPos);
        if (dir.length() < 1) {
            this.smoothMoveTo(targetPos, onComplete);
            return;
        }

        const dirNorm = dir.clone().normalize();
        const windUpPos = currentPos.clone().add(dirNorm.clone().multiplyScalar(-22));

        this.playAttackLayout(true);

        tween(this.node)
            .to(0.10, { position: windUpPos, scale: new Vec3(0.96, 1.04, 1) }, { easing: 'sineOut' })
            .to(0.07, { position: targetPos, scale: new Vec3(1.10, 0.90, 1) }, { easing: 'expoIn' })
            .call(() => onImpact?.())
            .to(0.14, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .call(() => {
                this.playAttackLayout(false);
                onComplete?.();
            })
            .start();
    }

    public playBeatenAnimation(callback: () => void): void {
        this.stopAllTweens();
        this.stopWalkAnimation(false);

        if (this.animalSprite) {
            this.animalSprite.color = new Color(255, 70, 70, 255);
        }

        const originalPos = this.node.position.clone();
        const flyDir = Math.random() > 0.5 ? 1 : -1;
        const targetPos = new Vec3(originalPos.x + 110 * flyDir, originalPos.y - 60, 0);

        if (this.shadowOpacity) {
            tween(this.shadowOpacity)
                .to(0.20, { opacity: 0 }, { easing: 'sineIn' })
                .start();
        }

        if (this.shadowNode) {
            tween(this.shadowNode)
                .to(0.20, { scale: new Vec3(0, 0, 1) }, { easing: 'quadIn' })
                .start();
        }

        if (this.baseSprite) {
            tween(this.baseSprite.node)
                .to(0.20, { scale: new Vec3(0, 0, 1) }, { easing: 'quadIn' })
                .start();
        }

        if (this.nameLabel) {
            tween(this.nameLabel.node)
                .to(0.20, { scale: new Vec3(0, 0, 1) }, { easing: 'quadIn' })
                .start();
        }

        tween(this.node)
            .to(0.03, { position: new Vec3(originalPos.x + 8, originalPos.y + 4, 0) })
            .to(0.03, { position: new Vec3(originalPos.x - 8, originalPos.y - 4, 0) })
            .to(0.03, { position: new Vec3(originalPos.x + 6, originalPos.y - 2, 0) })
            .parallel(
                tween().to(0.32, { position: targetPos }, { easing: 'sineOut' }),
                tween().to(0.32, { scale: new Vec3(0, 0, 1) }),
                tween().to(0.32, { angle: -240 * flyDir } as any)
            )
            .call(() => {
                callback?.();
                this.node.destroy();
            })
            .start();
    }

    private ensureShadowNode(): void {
        if (this.shadowNode && this.shadowSprite) {
            return;
        }

        this.shadowNode = this.node.getChildByName('Shadow');
        if (!this.shadowNode) {
            this.shadowNode = new Node('Shadow');
            this.node.addChild(this.shadowNode);
        }

        this.shadowSprite = this.shadowNode.getComponent(Sprite) ?? this.shadowNode.addComponent(Sprite);
        this.shadowOpacity = this.shadowNode.getComponent(UIOpacity) ?? this.shadowNode.addComponent(UIOpacity);

        const trans = this.shadowNode.getComponent(UITransform) ?? this.shadowNode.addComponent(UITransform);
        trans.setContentSize(new Size(92, 92));
        this.shadowSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    }

    private applyDefaultLayout(immediate: boolean): void {
        const duration = immediate ? 0 : 0.14;
        this.applyLayoutTargets(
            this.layout.shadowPos,
            this.layout.shadowScale,
            this.layout.basePos,
            this.layout.baseScale,
            this.layout.animalPos,
            this.layout.animalScale,
            this.layout.labelPos,
            duration,
            true
        );
    }

    private playSelectedLayout(selected: boolean): void {
        if (selected) {
            this.applyLayoutTargets(
                this.layout.shadowSelectedPos,
                this.layout.shadowSelectedScale,
                this.layout.basePos,
                this.layout.baseSelectedScale,
                this.layout.animalSelectedPos,
                this.layout.animalSelectedScale,
                this.layout.labelSelectedPos,
                0.15,
                false
            );
        } else {
            this.applyDefaultLayout(false);
        }
    }

    private playAttackLayout(pressed: boolean): void {
        if (pressed) {
            this.applyLayoutTargets(
                new Vec3(0, -38, 0),
                new Vec3(0.72, 0.24, 1),
                new Vec3(0, -14, 0),
                new Vec3(0.96, 0.72, 1),
                new Vec3(0, 24, 0),
                new Vec3(1.04, 0.96, 1),
                new Vec3(0, -27, 0),
                0.10,
                false
            );
        } else {
            this.applyDefaultLayout(false);
        }
    }

    private playMoveBounce(): void {
        if (this.shadowNode) {
            tween(this.shadowNode)
                .to(0.10, { scale: new Vec3(0.70, 0.25, 1) }, { easing: 'sineOut' })
                .to(0.10, { scale: this.layout.shadowScale }, { easing: 'backOut' })
                .start();
        }
        if (this.baseSprite) {
            tween(this.baseSprite.node)
                .to(0.10, { scale: new Vec3(1.03, 0.72, 1) }, { easing: 'sineOut' })
                .to(0.10, { scale: this.layout.baseScale }, { easing: 'backOut' })
                .start();
        }
        if (this.animalSprite) {
            tween(this.animalSprite.node)
                .to(0.10, { position: new Vec3(0, 24, 0) }, { easing: 'sineOut' })
                .to(0.10, { position: this.layout.animalPos }, { easing: 'backOut' })
                .start();
        }
    }

    private applyLayoutTargets(
        shadowPos: Vec3,
        shadowScale: Vec3,
        basePos: Vec3,
        baseScale: Vec3,
        animalPos: Vec3,
        animalScale: Vec3,
        labelPos: Vec3,
        duration: number,
        resetOpacity: boolean
    ): void {
        if (this.shadowNode) {
            tween(this.shadowNode).stop();
            tween(this.shadowNode)
                .to(duration, { position: shadowPos, scale: shadowScale }, { easing: 'quadOut' })
                .start();
        }
        if (this.shadowOpacity && resetOpacity) {
            tween(this.shadowOpacity).stop();
            tween(this.shadowOpacity)
                .to(duration, { opacity: 105 }, { easing: 'quadOut' })
                .start();
        }
        if (this.baseSprite) {
            tween(this.baseSprite.node).stop();
            tween(this.baseSprite.node)
                .to(duration, { position: basePos, scale: baseScale }, { easing: 'quadOut' })
                .start();
        }
        if (this.animalSprite) {
            tween(this.animalSprite.node).stop();
            tween(this.animalSprite.node)
                .to(duration, { position: animalPos, scale: animalScale }, { easing: 'quadOut' })
                .start();
        }
        if (this.nameLabel) {
            tween(this.nameLabel.node).stop();
            tween(this.nameLabel.node)
                .to(duration, { position: labelPos }, { easing: 'quadOut' })
                .start();
        }
    }

    private stopAllTweens(): void {
        Tween.stopAllByTarget(this.node);
        if (this.shadowNode) Tween.stopAllByTarget(this.shadowNode);
        if (this.shadowOpacity) Tween.stopAllByTarget(this.shadowOpacity);
        if (this.baseSprite) Tween.stopAllByTarget(this.baseSprite.node);
        if (this.animalSprite) Tween.stopAllByTarget(this.animalSprite.node);
        if (this.nameLabel) Tween.stopAllByTarget(this.nameLabel.node);
    }

    private startWalkAnimation(): void {
        if (!this.animalSprite || this.walkFrames.length === 0 || this.isWalking) {
            return;
        }

        this.isWalking = true;
        this.walkFrameIndex = 0;
        this.animalSprite.spriteFrame = this.walkFrames[0];
        this.schedule(this.advanceWalkFrame, 0.12);
    }

    private stopWalkAnimation(resetToStatic: boolean): void {
        this.unschedule(this.advanceWalkFrame);
        this.isWalking = false;
        this.walkFrameIndex = 0;

        if (resetToStatic && this.animalSprite && this.staticAnimalFrame) {
            this.animalSprite.spriteFrame = this.staticAnimalFrame;
        }
    }

    private advanceWalkFrame = (): void => {
        if (!this.animalSprite || this.walkFrames.length === 0) {
            return;
        }

        this.walkFrameIndex = (this.walkFrameIndex + 1) % this.walkFrames.length;
        this.animalSprite.spriteFrame = this.walkFrames[this.walkFrameIndex];
    };

    private getChineseName(type: number): string {
        switch (type) {
            case 1: return '鼠';
            case 2: return '猫';
            case 3: return '狗';
            case 4: return '狼';
            case 5: return '豹';
            case 6: return '虎';
            case 7: return '狮';
            case 8: return '象';
            default: return '';
        }
    }
}
