export type QuickChatKind = 'phrase' | 'sticker';

export interface QuickChatItem {
  readonly id: string;
  readonly kind: QuickChatKind;
  readonly label: string;
  readonly message: string;
  readonly emoji?: string;
}

export const QUICK_CHAT_PHRASES: readonly QuickChatItem[] = [
  { id: 'nice-move', kind: 'phrase', label: '漂亮', message: '漂亮！' },
  { id: 'steady', kind: 'phrase', label: '稳住', message: '稳住别浪' },
  { id: 'hurry-up', kind: 'phrase', label: '快点呀', message: '快点呀' },
  { id: 'my-turn', kind: 'phrase', label: '看我一手', message: '看我一手' },
  { id: 'counter', kind: 'phrase', label: '准备反杀', message: '准备反杀' },
  { id: 'mouse-safe', kind: 'phrase', label: '别吃我鼠', message: '别吃我鼠' },
  { id: 'good-game', kind: 'phrase', label: '承让', message: '承让承让' },
  { id: 'danger', kind: 'phrase', label: '进陷阱啦', message: '进陷阱啦' },
];

export const QUICK_CHAT_STICKERS: readonly QuickChatItem[] = [
  { id: 'sticker-smile', kind: 'sticker', label: '开心', message: '嘿嘿', emoji: '😄' },
  { id: 'sticker-cool', kind: 'sticker', label: '自信', message: '稳了', emoji: '😎' },
  { id: 'sticker-think', kind: 'sticker', label: '思考', message: '让我想想', emoji: '🤔' },
  { id: 'sticker-wow', kind: 'sticker', label: '惊讶', message: '厉害', emoji: '😮' },
  { id: 'sticker-cry', kind: 'sticker', label: '委屈', message: '别吃我', emoji: '🥺' },
  { id: 'sticker-fire', kind: 'sticker', label: '燃了', message: '上强度', emoji: '🔥' },
  { id: 'sticker-clap', kind: 'sticker', label: '鼓掌', message: '好棋', emoji: '👏' },
  { id: 'sticker-sweat', kind: 'sticker', label: '紧张', message: '危险', emoji: '😅' },
];
