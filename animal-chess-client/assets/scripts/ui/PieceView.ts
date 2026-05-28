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
    private useFullPieceArt = false;

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

    private readonly fullPieceLayout = {
        shadowPos: new Vec3(0, -36, 0),
        shadowScale: new Vec3(0.70, 0.20, 1),
        basePos: new Vec3(0, 0, 0),
        baseScale: new Vec3(0.01, 0.01, 1),
        animalPos: new Vec3(0, 0, 0),
        animalScale: new Vec3(1.0, 1.0, 1),
        labelPos: new Vec3(0, -34, 0),
        shadowSelectedPos: new Vec3(0, -38, 0),
        shadowSelectedScale: new Vec3(0.72, 0.20, 1),
        baseSelectedScale: new Vec3(0.01, 0.01, 1),
        animalSelectedPos: new Vec3(0, 0, 0),
        animalSelectedScale: new Vec3(1.06, 1.06, 1),
        labelSelectedPos: new Vec3(0, -38, 0),
    };

    private get currentLayout() {
        return this.useFullPieceArt ? this.fullPieceLayout : this.layout;
    }

    public init(data: Piece, animalSF: SpriteFrame, baseSF: SpriteFrame, walkFrames: SpriteFrame[] = [], useFullPieceArt: boolean = false): void {
        this.pieceData = data;
        this.staticAnimalFrame = animalSF ?? null;
        this.walkFrames = walkFrames.filter(frame => !!frame);
        this.walkFrameIndex = 0;
        this.isWalking = false;
        this.useFullPieceArt = useFullPieceArt;

        this.ensureShadowNode();

        if (this.shadowSprite) {
            if (baseSF) {
                this.shadowSprite.spriteFrame = baseSF;
            }
            this.shadowSprite.color = new Color(0, 0, 0, 105);
            this.shadowSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        }
        if (this.shadowOpacity && useFullPieceArt) {
            this.shadowOpacity.opacity = 0;
        }

        if (this.baseSprite) {
            if (baseSF) {
                this.baseSprite.spriteFrame = baseSF;
            }
            this.baseSprite.color = new Color(255, 255, 255, 0);
        }

        if (this.animalSprite) {
            if (animalSF) {
                this.animalSprite.spriteFrame = animalSF;
            }
            this.animalSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            this.animalSprite.color = new Color(255, 255, 255, 255);
            this.animalSprite.node.setScale(new Vec3(1, 1, 1));
            const transform = this.animalSprite.node.getComponent(UITransform);
            if (transform && useFullPieceArt) {
                transform.setContentSize(new Size(92, 92));
            }
        }

        if (this.nameLabel) {
            this.nameLabel.string = '';
            this.nameLabel.node.active = false;
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
            if (!this.useFullPieceArt) {
                this.startWalkAnimation();
            }
            this.playSelectedLayout(true);
        } else {
            this.stopWalkAnimation(true);
            this.playSelectedLayout(false);
        }
    }

    public smoothMoveTo(targetPos: Vec3, callback?: () => void): void {
        this.stopAllTweens();
        this.stopWalkAnimation(false);
        
        const currentPos = this.node.position.clone();
        const distance = Vec3.distance(currentPos, targetPos);

        // 姣忎釜鏍煎瓙澶у皬鏄?100 鍍忕礌锛岃法娌宠烦璺冭窛绂昏嚦灏戝湪 300 鍍忕礌浠ヤ笂
        const isJumping = distance > 150;

        if (isJumping) {
            // 鍒濆鍖栧竷灞€
            this.applyDefaultLayout(true);
            const layout = this.currentLayout;

            // 1. 涓昏妭鐐瑰湪姘村钩闈㈠钩绉伙紝骞跺湪钀藉湴鏃跺鍔犳尋鍘嬪弽寮瑰姩鏁堬紙浣撶幇璺宠惤鐨勭墿鐞嗗弽棣堬級
            const jumpDuration = 0.52;
            tween(this.node)
                .to(jumpDuration, { position: targetPos }, { easing: 'sineInOut' })
                .to(0.10, { scale: new Vec3(1.06, 0.92, 1) }, { easing: 'quadOut' }) // 钀藉湴鎸ゅ帇鎵佸钩
                .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }) // 鎭㈠
                .call(() => callback?.())
                .start();

            // 2. 瀛愯妭鐐癸紙Animal, Base, NameLabel锛夊湪鍨傜洿鏂瑰悜鍋氭姏鐗╃嚎鍗囬檷锛屽苟缁欏姩鐗╁鍔犵┖涓€炬枩寰姩
            if (this.animalSprite) {
                const animNode = this.animalSprite.node;
                const startY = layout.animalPos.y;
                const peakY = startY + 130; // 绌轰腑鑵捐捣楂樺害
                
                // 鏍规嵁闃佃惀锛堟湞鍚戯級鍐冲畾绌轰腑鍊炬枩瑙掑害锛屼娇鑵剧┖鏇存湁鍔ㄦ劅
                const isBlue = this.pieceData.camp === Camp.BLUE;
                const tiltAngle = isBlue ? -15 : 15;

                tween(animNode)
                    .parallel(
                        // 鍗囬檷鎶涚墿绾?                        tween().to(jumpDuration * 0.5, { position: new Vec3(0, peakY, 0) }, { easing: 'cubicOut' })
                              .to(jumpDuration * 0.5, { position: layout.animalPos }, { easing: 'cubicIn' }),
                        // 绌轰腑鏃嬭浆鍊炬枩
                        tween().to(jumpDuration * 0.3, { angle: tiltAngle })
                              .to(jumpDuration * 0.4, { angle: -tiltAngle * 0.5 })
                              .to(jumpDuration * 0.3, { angle: 0 })
                    )
                    .start();
            }

            if (this.baseSprite) {
                const baseNode = this.baseSprite.node;
                const startY = layout.basePos.y;
                const peakY = startY + 110;

                tween(baseNode)
                    .to(jumpDuration * 0.5, { position: new Vec3(0, peakY, 0) }, { easing: 'cubicOut' })
                    .to(jumpDuration * 0.5, { position: layout.basePos }, { easing: 'cubicIn' })
                    .start();
            }

            if (this.nameLabel) {
                const labelNode = this.nameLabel.node;
                const startY = layout.labelPos.y;
                const peakY = startY + 110;

                tween(labelNode)
                    .to(jumpDuration * 0.5, { position: new Vec3(0, peakY, 0) }, { easing: 'cubicOut' })
                    .to(jumpDuration * 0.5, { position: layout.labelPos }, { easing: 'cubicIn' })
                    .start();
            }

            // 3. 闃村奖鑺傜偣锛圫hadow锛夊湪璺宠穬鑷虫渶楂樼偣鏃讹紝姣斾緥缂╁皬銆侀€忔槑搴﹀彉娣★紙琛ㄧ幇楂樺害鍙樺寲甯︽潵鐨勬姇褰辫“鍑忥級
            if (this.shadowNode) {
                const startScale = layout.shadowScale;
                const peakScale = new Vec3(startScale.x * 0.4, startScale.y * 0.4, 1);

                tween(this.shadowNode)
                    .to(jumpDuration * 0.5, { scale: peakScale }, { easing: 'sineOut' })
                    .to(jumpDuration * 0.5, { scale: startScale }, { easing: 'sineIn' })
                    .start();
            }

            if (this.shadowOpacity) {
                const startOpacity = this.useFullPieceArt ? 0 : 105;
                const peakOpacity = 25; // 鏈€娣℃椂鐨勯€忔槑搴?
                tween(this.shadowOpacity)
                    .to(jumpDuration * 0.5, { opacity: peakOpacity }, { easing: 'sineOut' })
                    .to(jumpDuration * 0.5, { opacity: startOpacity }, { easing: 'sineIn' })
                    .start();
            }
        } else {
            // 鏅€氫竴鏍肩Щ鍔紙淇濈暀鍘熸湁鐨勬尋鍘嬪拰鍥炲脊锛?
            this.applyDefaultLayout(false);

            tween(this.node)
                .to(0.08, { scale: new Vec3(1.03, 0.98, 1) }, { easing: 'quadOut' })
                .to(0.28, { position: targetPos }, { easing: 'cubicOut' })
                .to(0.10, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .call(() => callback?.())
                .start();

            this.playMoveBounce();
        }
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
        const layout = this.currentLayout;
        const duration = immediate ? 0 : 0.14;
        this.applyLayoutTargets(
            layout.shadowPos,
            layout.shadowScale,
            layout.basePos,
            layout.baseScale,
            layout.animalPos,
            layout.animalScale,
            layout.labelPos,
            duration,
            true
        );
    }

    private playSelectedLayout(selected: boolean): void {
        const layout = this.currentLayout;
        if (selected) {
            this.applyLayoutTargets(
                layout.shadowSelectedPos,
                layout.shadowSelectedScale,
                layout.basePos,
                layout.baseSelectedScale,
                layout.animalSelectedPos,
                layout.animalSelectedScale,
                layout.labelSelectedPos,
                0.15,
                false
            );
        } else {
            this.applyDefaultLayout(false);
        }
    }

    private playAttackLayout(pressed: boolean): void {
        const layout = this.currentLayout;
        if (pressed) {
            const animalPos = this.useFullPieceArt ? layout.animalPos : new Vec3(0, 12, 0);
            this.applyLayoutTargets(
                layout.shadowPos,
                new Vec3(0.72, 0.24, 1),
                layout.basePos,
                layout.baseScale,
                animalPos,
                new Vec3(1.04, 0.96, 1),
                layout.labelPos,
                0.10,
                false
            );
        } else {
            this.applyDefaultLayout(false);
        }
    }

    private playMoveBounce(): void {
        const layout = this.currentLayout;
        if (this.useFullPieceArt) {
            if (this.animalSprite) {
                tween(this.animalSprite.node)
                    .to(0.10, { scale: new Vec3(1.02, 0.98, 1) }, { easing: 'sineOut' })
                    .to(0.10, { position: layout.animalPos, scale: layout.animalScale }, { easing: 'backOut' })
                    .start();
            }
            return;
        }
        if (this.shadowNode) {
            tween(this.shadowNode)
                .to(0.10, { scale: new Vec3(0.70, 0.25, 1) }, { easing: 'sineOut' })
                .to(0.10, { scale: layout.shadowScale }, { easing: 'backOut' })
                .start();
        }
        if (this.baseSprite) {
            tween(this.baseSprite.node)
                .to(0.10, { scale: new Vec3(1.03, 0.72, 1) }, { easing: 'sineOut' })
                .to(0.10, { scale: layout.baseScale }, { easing: 'backOut' })
                .start();
        }
        if (this.animalSprite) {
            tween(this.animalSprite.node)
                .to(0.10, { position: new Vec3(0, 24, 0) }, { easing: 'sineOut' })
                .to(0.10, { position: layout.animalPos }, { easing: 'backOut' })
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
                .to(duration, { opacity: this.useFullPieceArt ? 0 : 105 }, { easing: 'quadOut' })
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
            case 1: return '榧?;
            case 2: return '鐚?;
            case 3: return '鐙?;
            case 4: return '鐙?;
            case 5: return '璞?;
            case 6: return '铏?;
            case 7: return '鐙?;
            case 8: return '璞?;
            default: return '';
        }
    }
}
