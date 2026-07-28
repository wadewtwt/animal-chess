import React, { useState } from 'react';
import { MessageCircle, Smile, X } from 'lucide-react';
import {
  QUICK_CHAT_PHRASES,
  QUICK_CHAT_STICKERS,
} from '../data/QuickChatConfig';
import type { QuickChatItem, QuickChatKind } from '../data/QuickChatConfig';

interface QuickChatPanelProps {
  disabled?: boolean;
  onSend: (item: QuickChatItem) => void;
}

const tabs: readonly { kind: QuickChatKind; label: string }[] = [
  { kind: 'phrase', label: '短语' },
  { kind: 'sticker', label: '表情' },
];

export const QuickChatPanel: React.FC<QuickChatPanelProps> = ({ disabled = false, onSend }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeKind, setActiveKind] = useState<QuickChatKind>('phrase');

  const activeItems = activeKind === 'phrase' ? QUICK_CHAT_PHRASES : QUICK_CHAT_STICKERS;

  const handleOpen = (kind: QuickChatKind) => {
    if (disabled) return;
    setActiveKind(kind);
    setIsOpen(true);
  };

  const handleSend = (item: QuickChatItem) => {
    if (disabled) return;
    onSend(item);
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center gap-2">
      {isOpen && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 w-[min(20rem,calc(100vw-2rem))] bg-[#fffadf]/98 border-2 border-[#e1dca9] rounded-2xl shadow-2xl p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex bg-[#f2e9b8] rounded-full p-1 flex-1">
              {tabs.map((tab) => (
                <button
                  key={tab.kind}
                  type="button"
                  onClick={() => setActiveKind(tab.kind)}
                  className={`flex-1 h-8 rounded-full text-xs font-black transition-all ${
                    activeKind === tab.kind
                      ? 'bg-[#006e1c] text-white shadow-sm'
                      : 'text-[#5d4037] active:bg-white/70'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 bg-white border border-[#e1dca9] rounded-full flex items-center justify-center text-[#5d4037] active:scale-95"
              aria-label="关闭快捷聊天"
            >
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {activeItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSend(item)}
                className="min-h-12 bg-white border border-[#eadfa2] rounded-xl px-1 py-2 flex flex-col items-center justify-center gap-0.5 text-[#3e2723] active:scale-95 shadow-sm"
              >
                {item.kind === 'sticker' && (
                  <span className="text-xl leading-none" aria-hidden="true">
                    {item.emoji}
                  </span>
                )}
                <span className="text-[11px] font-black leading-tight text-center break-words">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => handleOpen('phrase')}
        className="w-9 h-9 bg-white/90 border border-[#eae4b1] text-[#006e1c] rounded-full flex items-center justify-center active:scale-95 shadow-sm disabled:opacity-50"
        aria-label="打开常用短语"
      >
        <MessageCircle size={16} />
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => handleOpen('sticker')}
        className="w-9 h-9 bg-white/90 border border-[#eae4b1] text-[#e18500] rounded-full flex items-center justify-center active:scale-95 shadow-sm disabled:opacity-50"
        aria-label="打开表情包"
      >
        <Smile size={16} />
      </button>
    </div>
  );
};
