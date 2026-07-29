export type QuickChatKind = 'phrase' | 'sticker';

export interface QuickChatItem {
    readonly id: string;
    readonly kind: QuickChatKind;
    readonly label: string;
    readonly message: string;
    readonly emoji?: string;
    readonly icon?: string;
}

export const QUICK_CHAT_PHRASES: readonly QuickChatItem[] = [
    { id: 'nice-move', kind: 'phrase', label: '漂亮一手', message: '漂亮！这步棋妙啊！', icon: '✨' },
    { id: 'steady', kind: 'phrase', label: '稳住别浪', message: '稳住别浪，咱们能赢！', icon: '🛡️' },
    { id: 'hurry-up', kind: 'phrase', label: '快点出招', message: '快点呀，等得花都谢了~', icon: '⏳' },
    { id: 'my-turn', kind: 'phrase', label: '看我大招', message: '看我大招！准备接招吧！', icon: '⚡' },
    { id: 'counter', kind: 'phrase', label: '逆风反杀', message: '别高兴太早，准备反杀！', icon: '🔥' },
    { id: 'mouse-safe', kind: 'phrase', label: '手下留鼠', message: '大哥手下留情，别吃我鼠！', icon: '🐭' },
    { id: 'good-game', kind: 'phrase', label: '精彩对局', message: '承让承让，打得真精彩！', icon: '🤝' },
    { id: 'danger', kind: 'phrase', label: '落入陷阱', message: '哈哈，你进我的陷阱啦！', icon: '🕳️' },
];

export const QUICK_CHAT_STICKERS: readonly QuickChatItem[] = [
    { id: 'sticker-smile', kind: 'sticker', label: '得意', message: '嘿嘿', emoji: '😄' },
    { id: 'sticker-cool', kind: 'sticker', label: '拿捏', message: '稳了', emoji: '😎' },
    { id: 'sticker-think', kind: 'sticker', label: '深思', message: '让我想想', emoji: '🤔' },
    { id: 'sticker-wow', kind: 'sticker', label: '秀啊', message: '厉害', emoji: '😮' },
    { id: 'sticker-cry', kind: 'sticker', label: '求饶', message: '别吃我', emoji: '🥺' },
    { id: 'sticker-fire', kind: 'sticker', label: '上强度', message: '上强度！', emoji: '🔥' },
    { id: 'sticker-clap', kind: 'sticker', label: '妙极了', message: '好棋', emoji: '👏' },
    { id: 'sticker-sweat', kind: 'sticker', label: '汗流浃背', message: '危险', emoji: '😅' },
];

