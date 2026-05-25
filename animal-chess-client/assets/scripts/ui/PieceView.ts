import { _decorator, Component, Node, Sprite, Label, tween, Tween, Vec3, SpriteFrame, Color } from 'cc';
import { Piece, Camp } from '../engine/LocalEngine';

const { ccclass, property } = _decorator;

@ccclass('PieceView')
export class PieceView extends Component {
    @property(Sprite)
    public animalSprite: Sprite = null!; // 动物全身图

    @property(Sprite)
    public baseSprite: Sprite = null!;   // 棋子底座 (用于区分阵营)

    @property(Label)
    public nameLabel: Label = null!;     // 动物名字与等级文本 (可选)

    private pieceData!: Piece;

    /**
     * 初始化棋子视觉状态
     * @param data 棋子逻辑数据
     * @param animalSF 动物全身图贴图
     * @param baseSF 底座贴图 (红/蓝)
     */
    public init(data: Piece, animalSF: SpriteFrame, baseSF: SpriteFrame): void {
        this.pieceData = data;

        // 设置贴图并应用阵营视觉差异
        if (this.animalSprite) {
            if (animalSF) {
                this.animalSprite.spriteFrame = animalSF;
            }
            
            // 1. 动物贴图的微弱色调（阵营偏色），让角色本身也有红蓝队的归属感
            this.animalSprite.color = data.camp === Camp.RED 
                ? new Color(255, 210, 210, 255)   // 红方：粉红暖色调
                : new Color(210, 230, 255, 255);  // 蓝方：粉蓝冷色调

            // 2. 蓝方动物朝向镜像翻转（水平翻转），与红方形成对峙效果
            if (data.camp === Camp.BLUE) {
                this.animalSprite.node.setScale(new Vec3(-1, 1, 1));
            } else {
                this.animalSprite.node.setScale(new Vec3(1, 1, 1));
            }
        }

        if (this.baseSprite) {
            if (baseSF) {
                this.baseSprite.spriteFrame = baseSF;
            }
            
            // 3. 棋子底座颜色深度区分：红方为亮红/珊瑚红，蓝方为亮蓝/天空蓝
            this.baseSprite.color = data.camp === Camp.RED
                ? new Color(240, 80, 80, 255)
                : new Color(70, 140, 240, 255);
        }

        // 设置文本，显示“鼠 (1)”或“象 (8)”等，方便新手识别
        if (this.nameLabel) {
            this.nameLabel.string = `${this.getChineseName(data.type)} (${data.type})`;
            // 红蓝阵营文本颜色区分，加深文本对比度
            this.nameLabel.color = data.camp === Camp.RED ? new Color(220, 30, 30) : new Color(30, 90, 220);
        }

        // 缩放还原
        this.node.setScale(new Vec3(1, 1, 1));
    }

    public getPieceData(): Piece {
        return this.pieceData;
    }

    /**
     * 播放选中效果 (微弹动+持续轻微悬浮)
     */
    public setSelected(selected: boolean): void {
        console.log("PieceView: setSelected called for piece:", this.pieceData.id, "selected =", selected);
        // 停止当前节点的所有缓动
        Tween.stopAllByTarget(this.node);
        if (selected) {
            // 选中状态：先快速放大，然后持续播放轻微的呼吸缩放动效
            tween(this.node)
                .to(0.15, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.5, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'sineInOut' })
                .to(0.5, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'sineInOut' })
                .union()
                .repeatForever()
                .start();
        } else {
            // 取消选中状态：缩放平滑还原到 1.0
            tween(this.node)
                .to(0.15, { scale: new Vec3(1, 1, 1) })
                .start();
        }
    }

    /**
     * 缓动移动到目标坐标
     */
    public smoothMoveTo(targetPos: Vec3, callback?: () => void): void {
        Tween.stopAllByTarget(this.node);
        // 缩放还原，并播放一个微抛物线的移动动画
        tween(this.node)
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .to(0.35, { position: targetPos }, { easing: 'cubicOut' })
            .call(() => {
                if (callback) callback();
            })
            .start();
    }

    /**
     * 播放被吃掉的动画 (淡出+缩小)
     */
    public playEatenAnimation(callback: () => void): void {
        Tween.stopAllByTarget(this.node);
        // 渐渐变小淡出并销毁
        tween(this.node)
            .to(0.25, { scale: new Vec3(0, 0, 0) })
            .call(() => {
                callback();
                this.node.destroy();
            })
            .start();
    }

    /**
     * 播放主动攻击的冲锋动画（蓄力后退 -> 快速突刺到目标格）
     * @param targetPos 目标世界坐标
     * @param onImpact 击中瞬间的回调（用于触发击碎特效、震屏等）
     * @param onComplete 整个动画结束后的回调
     */
    public playAttackLunge(targetPos: Vec3, onImpact: () => void, onComplete: () => void): void {
        Tween.stopAllByTarget(this.node);

        const currentPos = this.node.position.clone();
        
        // 1. 计算方向向量，用于做反向蓄力
        const dir = targetPos.clone().subtract(currentPos);
        const distance = dir.length();
        if (distance < 1) {
            // 如果距离太近，直接走普通移动
            this.smoothMoveTo(targetPos, onComplete);
            return;
        }

        const dirNorm = dir.clone().normalize();
        
        // 蓄力后退位置：沿着反方向后退 25 像素
        const windUpPos = currentPos.clone().add(dirNorm.clone().multiplyScalar(-25));

        // 2. 蓄力后退 -> 快速突刺
        tween(this.node)
            // 缩放微扁，做蓄力准备
            .to(0.12, { 
                position: windUpPos,
                scale: new Vec3(0.9, 1.1, 1.0)
            }, { easing: 'sineOut' })
            // 快速冲刺击中
            .to(0.08, { 
                position: targetPos,
                scale: new Vec3(1.2, 0.8, 1.0) // 碰撞瞬间压扁
            }, { easing: 'expoIn' })
            .call(() => {
                // 击中瞬间回调
                if (onImpact) onImpact();
            })
            // 缓动恢复正常比例
            .to(0.15, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'backOut' })
            .call(() => {
                if (onComplete) onComplete();
            })
            .start();
    }

    /**
     * 播放受击死亡动画（震颤、瞬间红化反馈、旋转击飞出场）
     * @param callback 动画完成后的销毁回调
     */
    public playBeatenAnimation(callback: () => void): void {
        Tween.stopAllByTarget(this.node);

        // 1. 受击红化视觉反馈
        if (this.animalSprite) {
            this.animalSprite.color = new Color(255, 60, 60, 255); // 闪红
        }

        const originalPos = this.node.position.clone();
        
        // 随机产生一个飞出的方向 (向左或向右旋转飞出)
        const flyDir = Math.random() > 0.5 ? 1 : -1;
        const targetPos = new Vec3(originalPos.x + 100 * flyDir, originalPos.y - 50, 0);

        tween(this.node)
            // 快速左右震颤
            .to(0.03, { position: new Vec3(originalPos.x + 8, originalPos.y + 4, 0) })
            .to(0.03, { position: new Vec3(originalPos.x - 8, originalPos.y - 4, 0) })
            .to(0.03, { position: new Vec3(originalPos.x + 6, originalPos.y - 2, 0) })
            .to(originalPos)
            // 击飞淡出并快速打转
            .parallel(
                tween().to(0.35, { position: targetPos }, { easing: 'sineOut' }),
                tween().to(0.35, { scale: new Vec3(0, 0, 0) }),
                tween().to(0.35, { angle: -270 * flyDir } as any) // 旋转
            )
            .call(() => {
                if (callback) callback();
                this.node.destroy();
            })
            .start();
    }

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
