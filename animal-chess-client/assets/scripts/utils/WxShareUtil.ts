import { resources, SpriteFrame, Texture2D, ImageAsset } from 'cc';

/**
 * 微信分享辅助工具类
 * 负责微信小游戏分享菜单注册、对局房间分享以及统一分享预览图（loading_bg.png）的管理
 */
export class WxShareUtil {
    private static _shareImageUrl: string = 'textures/loading_bg.png';
    private static _isInitialized: boolean = false;

    /**
     * 初始化分享逻辑（预加载图片资源 & 注册全局胶囊菜单转发监听）
     */
    public static init(): void {
        if (this._isInitialized) {
            return;
        }
        this._isInitialized = true;

        this.loadShareImage();
        this.registerDefaultShareHandler();
    }

    /**
     * 预加载 textures/loading_bg 并获取资源 nativeUrl
     */
    private static loadShareImage(): void {
        resources.load('textures/loading_bg/spriteFrame', SpriteFrame, (err, sf) => {
            if (!err && sf && sf.texture && (sf.texture as any).nativeUrl) {
                this._shareImageUrl = (sf.texture as any).nativeUrl;
            } else {
                resources.load('textures/loading_bg', Texture2D, (err2, tex) => {
                    if (!err2 && tex && tex.nativeUrl) {
                        this._shareImageUrl = tex.nativeUrl;
                    } else {
                        resources.load('textures/loading_bg', ImageAsset, (err3, img) => {
                            if (!err3 && img && img.nativeUrl) {
                                this._shareImageUrl = img.nativeUrl;
                            }
                        });
                    }
                });
            }
        });
    }

    /**
     * 获取分享使用的预览图 URL/路径
     */
    public static getShareImageUrl(): string {
        return this._shareImageUrl || 'textures/loading_bg.png';
    }

    /**
     * 注册微信右上角胶囊菜单默认分享监听
     */
    public static registerDefaultShareHandler(): void {
        const wxObj = (window as any).wx;
        if (typeof wxObj === 'undefined') {
            return;
        }

        try {
            if (typeof wxObj.showShareMenu === 'function') {
                wxObj.showShareMenu({
                    withShareTicket: true,
                    menus: ['shareAppMessage', 'shareTimeline']
                });
            }

            if (typeof wxObj.onShareAppMessage === 'function') {
                wxObj.onShareAppMessage(() => {
                    return {
                        title: '快来和我进行一局斗兽棋对决吧！',
                        imageUrl: this.getShareImageUrl()
                    };
                });
            }

            if (typeof wxObj.onShareTimeline === 'function') {
                wxObj.onShareTimeline(() => {
                    return {
                        title: '斗兽棋 - 经典策略对决！',
                        imageUrl: this.getShareImageUrl()
                    };
                });
            }
        } catch (e) {
            console.warn('[WxShareUtil] registerDefaultShareHandler failed:', e);
        }
    }

    /**
     * 发起特定房间的微信消息分享
     * @param roomCode 房间号
     * @param customTitle 自定义标题
     * @returns 是否成功调起微信原生分享接口
     */
    public static shareRoom(roomCode: string, customTitle?: string): boolean {
        const wxObj = (window as any).wx;
        if (typeof wxObj !== 'undefined' && typeof wxObj.shareAppMessage === 'function') {
            try {
                wxObj.shareAppMessage({
                    title: customTitle || ('快来和我进行一局斗兽棋对决吧！房间号：' + roomCode),
                    query: 'room=' + roomCode,
                    imageUrl: this.getShareImageUrl()
                });
                return true;
            } catch (e) {
                console.warn('[WxShareUtil] shareAppMessage failed:', e);
            }
        }
        return false;
    }
}
