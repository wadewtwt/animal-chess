import React, { useState } from 'react';
import { Difficulty } from '../types';
import { MonkeyExplorer } from './GameAvatars';
import { jungleAudio } from '../utils/audio';
import { Landmark, X, ShieldAlert, CheckCircle, Key, Info, Bot, Leaf, Target, Swords, XCircle, Play } from 'lucide-react';

interface ModalsProps {
  difficultyModalOpen: boolean;
  roomMatchModalOpen: boolean;
  joinRoomModalOpen: boolean;
  onCloseAll: () => void;
  onSelectDifficulty: (diff: Difficulty) => void;
  onCreateRoom: () => void;
  onOpenJoinRoom: () => void;
  onJoinRoomWithCode: (code: string) => void;
}

export const Modals: React.FC<ModalsProps> = ({
  difficultyModalOpen,
  roomMatchModalOpen,
  joinRoomModalOpen,
  onCloseAll,
  onSelectDifficulty,
  onCreateRoom,
  onOpenJoinRoom,
  onJoinRoomWithCode,
}) => {
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>('medium');
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // Common tap helper
  const handleTap = (action: () => void) => {
    jungleAudio.playClick();
    action();
  };

  if (!difficultyModalOpen && !roomMatchModalOpen && !joinRoomModalOpen) return null;

  // 1. CHOOSE DIFFICULTY DIALOG (Screen 2)
  if (difficultyModalOpen) {
    const difficultyOptions: Array<{
      key: Difficulty;
      title: string;
      subtitle: string;
      Icon: typeof Leaf;
      accent: string;
      softBg: string;
      text: string;
    }> = [
      {
        key: 'easy',
        title: '简单',
        subtitle: '适合新手，容错更高',
        Icon: Leaf,
        accent: '#4caf50',
        softBg: '#e7f6dc',
        text: '#1b5e20',
      },
      {
        key: 'medium',
        title: '中等',
        subtitle: '推荐默认，节奏均衡',
        Icon: Target,
        accent: '#d68118',
        softBg: '#fff0cf',
        text: '#8a4b00',
      },
      {
        key: 'hard',
        title: '困难',
        subtitle: '更强挑战，适合熟练玩家',
        Icon: Swords,
        accent: '#d94b45',
        softBg: '#ffe1dc',
        text: '#9b1c18',
      },
    ];

    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-[#fff8df] rounded-[2.125rem] border-4 border-[#d8c192] p-4 max-w-sm w-full relative shadow-2xl space-y-4">
          <button 
            onClick={() => handleTap(onCloseAll)}
            aria-label="关闭难度选择"
            className="absolute -top-3 -right-3 w-11 h-11 bg-[#d63a2f] text-white rounded-full flex items-center justify-center border-4 border-white active:scale-90 hover:bg-[#b71c1c] shadow-md"
          >
            <X size={22} strokeWidth={3} />
          </button>

          <div className="rounded-[1.75rem] bg-[#e9f4d6] px-4 py-4 border border-white/80 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#146c38] text-[#f7fff2] flex items-center justify-center shadow-sm shrink-0">
              <Bot size={25} strokeWidth={2.7} />
            </div>
            <div className="text-left min-w-0">
              <h2 className="text-2xl font-black text-[#146c38] leading-tight">选择难度</h2>
              <p className="text-xs text-[#647044] font-bold leading-relaxed">
                先选对手节奏，再开始一局练习
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {difficultyOptions.map(({ key, title, subtitle, Icon, accent, softBg, text }) => {
              const selected = selectedDiff === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDiff(key)}
                  className={`w-full min-h-[92px] flex items-center justify-between gap-3 rounded-[1.375rem] border-3 px-4 text-left cursor-pointer transition-all active:scale-[0.99] ${
                    selected ? 'bg-white border-[#146c38] shadow-md scale-[1.015]' : 'bg-[#fffdfa] border-[#e3d4b0] shadow-sm'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-sm shrink-0"
                      style={{ backgroundColor: selected ? accent : softBg, color: selected ? '#ffffff' : text }}
                    >
                      <Icon size={24} strokeWidth={2.6} />
                    </span>
                    <span className="min-w-0">
                      <span className="text-lg font-black block leading-tight" style={{ color: selected ? accent : '#66572d' }}>
                        {title}
                      </span>
                      <span className="text-xs font-bold text-[#8a7c5d] block leading-relaxed mt-1">
                        {subtitle}
                      </span>
                    </span>
                  </span>
                  <span
                    className="w-7 h-7 rounded-full border-3 flex items-center justify-center shrink-0"
                    style={{ borderColor: selected ? accent : '#ded1ad' }}
                  >
                    {selected && <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: accent }} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2 pt-1">
            <button 
              id="dialog_ai_confirm"
              onClick={() => {
                jungleAudio.playSuccess();
                onSelectDifficulty(selectedDiff);
              }}
              className="w-full min-h-[52px] bg-[#13883a] hover:bg-[#0f7430] text-white font-extrabold text-base rounded-full border-b-5 border-[#074f14] shadow-lg active:translate-y-0.5 active:border-b-2 flex items-center justify-center gap-2"
            >
              <Play size={18} fill="currentColor" strokeWidth={2.6} />
              开始挑战
            </button>
            <button 
              onClick={() => handleTap(onCloseAll)}
              className="w-full min-h-[42px] text-center text-sm font-bold text-[#6d624b] hover:text-[#3f4a3c] flex items-center justify-center gap-1.5"
            >
              <XCircle size={16} strokeWidth={2.4} />
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. ROOM MATCH LOBBY SELECTION MODAL (Screen 4)
  if (roomMatchModalOpen) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-[#fffadf] rounded-[2.5rem] border-6 border-[#e18500] p-6 max-w-sm w-full relative shadow-3xl text-center space-y-6">
          
          {/* Custom Red Absolute Circular Close Mark */}
          <button 
            onClick={() => handleTap(onCloseAll)}
            className="absolute -top-3 -right-3 w-10 h-10 bg-[#b71c1c] text-white font-black text-sm rounded-full flex items-center justify-center border-4 border-white active:scale-90 shadow-md text-center"
          >
            ✕
          </button>

          <h2 className="text-2xl font-black text-[#e18500] tracking-wide">房间对战</h2>

          {/* Centered Monkey Ranger Visual */}
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-2xl border-4 border-[#e1dca9] shadow-inner bg-[#fffadf] overflow-hidden">
              <MonkeyExplorer size="100%" />
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#3f4a3c] font-bold leading-relaxed px-4">
            邀请你的好友进行一场森林对决，或者加入已有的房间！
          </p>

          {/* Bouncy Action Buttons exact to visual */}
          <div className="space-y-4 px-2">
            {/* Create Room Bouncy Green Button */}
            <button 
              id="room_create_btn"
              onClick={() => handleTap(onCreateRoom)}
              className="w-full py-4 bg-[#69bd72] hover:bg-[#4caf50] text-white font-black text-sm sm:text-base rounded-full border-b-6 border-[#2e7d32] shadow-md active:translate-y-0.5 active:border-b-2 flex items-center justify-center gap-1.5"
            >
              ➕ 创建房间
            </button>

            {/* Join Room Bouncy Orange Button */}
            <button 
              id="room_join_trigger_btn"
              onClick={() => handleTap(onOpenJoinRoom)}
              className="w-full py-4 bg-[#ff9800] hover:bg-[#fb8c00] text-white font-black text-sm sm:text-base rounded-full border-b-6 border-[#e65100] shadow-md active:translate-y-0.5 active:border-b-2"
            >
              加入房间
            </button>
          </div>

          {/* Bottom stats details */}
          <div className="bg-white/60 rounded-2xl p-2.5 border border-[#eae4b1] flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#6f7a6b]">
            <Info size={13} className="text-[#006e1c]" />
            目前有 <span className="text-[#006e1c] font-mono">243</span> 个公开房间
          </div>
        </div>
      </div>
    );
  }

  // 3. CODE INPUT JOIN ROOM DIALOG (Screen 3)
  if (joinRoomModalOpen) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-[#fffadf] rounded-[2.5rem] border-6 border-[#006e1c] p-6 max-w-sm w-full relative shadow-3xl text-center space-y-6">
          
          <button 
            onClick={() => handleTap(onCloseAll)}
            className="absolute -top-3 -right-3 w-10 h-10 bg-gray-400 text-white font-black text-sm rounded-full flex items-center justify-center border-4 border-white active:scale-90 shadow-md text-center"
          >
            ✕
          </button>

          {/* Headings */}
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#006e1c] tracking-wide">加入房间</h2>
            <p className="text-xs text-[#3f4a3c] font-semibold">
              输入好友分享的房间代码
            </p>
          </div>

          {/* Physical Recessed input field with Key icon */}
          <div className="relative max-w-[260px] mx-auto">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#b5a642]">
              <Key size={18} />
            </div>
            
            <input 
              type="text" 
              maxLength={6}
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="输入 6 位房间代码..."
              className="w-full bg-[#fbf5c1] border-3 border-[#eae4b1] outline-none rounded-2xl pl-12 pr-4 py-3.5 text-center font-bold text-gray-800 tracking-wider placeholder-gray-500/70 focus:border-[#006e1c] shadow-inner text-sm"
            />
          </div>

          {/* Actions */}
          <div className="space-y-4 px-2">
            <button 
              onClick={() => {
                if (roomCodeInput.length === 6) {
                  jungleAudio.playSuccess();
                  onJoinRoomWithCode(roomCodeInput);
                } else {
                  jungleAudio.playError();
                  alert('请输入完整的 6 位数字代码！');
                }
              }}
              className="w-full py-3.5 bg-[#006e1c] hover:bg-[#005313] text-white font-extrabold text-sm sm:text-base rounded-full border-b-5 border-[#003c0b] shadow-md active:translate-y-0.5 active:border-b-2"
            >
              立即进入
            </button>
            <button 
              onClick={() => handleTap(onCloseAll)}
              className="w-full text-center text-sm font-semibold text-[#3f4a3c] hover:underline block"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
