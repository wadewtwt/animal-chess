import React, { useState } from 'react';
import { Difficulty } from '../types';
import { MonkeyExplorer } from './GameAvatars';
import { jungleAudio } from '../utils/audio';
import { Landmark, X, ShieldAlert, CheckCircle, Smile, Frown, Key, Info } from 'lucide-react';

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
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-[#fffadf] rounded-[2.5rem] border-6 border-[#006e1c] p-6 max-w-sm w-full relative shadow-2xl space-y-6">
          {/* Custom red absolute close badge from standard screenshot style */}
          <button 
            onClick={() => handleTap(onCloseAll)}
            className="absolute -top-3 -right-3 w-10 h-10 bg-[#b71c1c] text-white font-extrabold text-[11px] rounded-full flex items-center justify-center border-4 border-white active:scale-90 hover:bg-red-700 shadow-md"
          >
            close
          </button>

          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-3xl font-black text-[#006e1c] tracking-wide">选择难度</h2>
            <p className="text-xs text-[#3f4a3c] font-semibold">
              挑选适合你的对手开始练习
            </p>
          </div>

          {/* Option list Container */}
          <div className="space-y-4">
            {/* Option Simple */}
            <label 
              onClick={() => setSelectedDiff('easy')}
              className={`flex items-center justify-between p-4 rounded-3xl border-3 cursor-pointer transition-all ${selectedDiff === 'easy' ? 'bg-[#c8e6c9]/40 border-[#006e1c]' : 'bg-[#fff] border-[#eae4b1]'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#a5d6a7] flex items-center justify-center text-[#1b5e20] shadow-sm">
                  <Smile size={22} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <span className="text-xs text-gray-400 font-bold block leading-none">sentiment_satisfied</span>
                  <span className="text-base font-black text-[#1b5e20] mt-0.5 block">简单</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-3 border-[#eae4b1] flex items-center justify-center">
                {selectedDiff === 'easy' && <div className="w-3 h-3 rounded-full bg-[#006e1c]" />}
              </div>
            </label>

            {/* Option Medium */}
            <label 
              onClick={() => setSelectedDiff('medium')}
              className={`flex items-center justify-between p-4 rounded-3xl border-3 cursor-pointer transition-all ${selectedDiff === 'medium' ? 'bg-[#ffe082]/30 border-[#e18500]' : 'bg-[#fff] border-[#eae4b1]'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ffcc80] flex items-center justify-center text-[#e65100] shadow-sm">
                  {/* Flat smiling / neutral Face */}
                  <span className="text-xl">😐</span>
                </div>
                <div className="text-left">
                  <span className="text-xs text-gray-400 font-bold block leading-none">sentiment_neutral</span>
                  <span className="text-base font-black text-[#e65100] mt-0.5 block">中等</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-3 border-[#eae4b1] flex items-center justify-center">
                {selectedDiff === 'medium' && <div className="w-3 h-3 rounded-full bg-[#e18500]" />}
              </div>
            </label>

            {/* Option Hard */}
            <label 
              onClick={() => setSelectedDiff('hard')}
              className={`flex items-center justify-between p-4 rounded-3xl border-3 cursor-pointer transition-all ${selectedDiff === 'hard' ? 'bg-[#ff8a80]/20 border-red-500' : 'bg-[#fff] border-[#eae4b1]'}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ffab91] flex items-center justify-center text-[#c62828] shadow-sm">
                  <Frown size={22} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <span className="text-xs text-gray-400 font-bold block leading-none">sentiment_very_dissatisfied</span>
                  <span className="text-base font-black text-[#c62828] mt-0.5 block">困难</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full border-3 border-[#eae4b1] flex items-center justify-center">
                {selectedDiff === 'hard' && <div className="w-3 h-3 rounded-full bg-[#d32f2f]" />}
              </div>
            </label>
          </div>

          {/* Action Row */}
          <div className="space-y-3">
            <button 
              id="dialog_ai_confirm"
              onClick={() => {
                jungleAudio.playSuccess();
                onSelectDifficulty(selectedDiff);
              }}
              className="w-full py-3.5 bg-[#006e1c] hover:bg-[#005313] text-white font-extrabold text-base rounded-full border-b-4 border-[#003c0b] shadow-lg active:translate-y-0.5 active:border-b-2"
            >
              开始挑战
            </button>
            <button 
              onClick={() => handleTap(onCloseAll)}
              className="w-full text-center text-sm font-bold text-[#3f4a3c] hover:underline"
            >
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
