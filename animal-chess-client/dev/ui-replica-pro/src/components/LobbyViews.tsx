import React, { useState, useEffect } from 'react';
import { GameMode, GameSubMode, Difficulty, GameSettings } from '../types';
import { TimExplorer, FrogExplorer } from './GameAvatars';
import { ProductEmblem } from './ProductEmblem';
import { jungleAudio } from '../utils/audio';
import { ArrowLeft, Star, Volume2, VolumeX, Edit2, Share2, HelpCircle, Gamepad2, Users, Trophy, ShoppingBag, Radio } from 'lucide-react';

interface LobbyViewsProps {
  currentMode: GameMode;
  subMode: GameSubMode | null;
  settings: GameSettings;
  setMode: (mode: GameMode) => void;
  setSubMode: (subMode: GameSubMode | null) => void;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  onOpenDifficultyModal: () => void;
  onOpenRoomMatchModal: () => void;
  onStartLocalGame: () => void;
  onStartRoomGame: () => void;
}

export const LobbyViews: React.FC<LobbyViewsProps> = ({
  currentMode,
  subMode,
  settings,
  setMode,
  setSubMode,
  setSettings,
  onOpenDifficultyModal,
  onOpenRoomMatchModal,
  onStartLocalGame,
  onStartRoomGame,
}) => {
  const [progress, setProgress] = useState(0);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);
  const [editNameInput, setEditNameInput] = useState(settings.playerName);
  const [activeTab, setActiveTab] = useState<'lobby' | 'battle' | 'social' | 'shop'>('lobby');

  // 1. Loading screen logic: increment smoothly
  useEffect(() => {
    if (currentMode === 'loading') {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              jungleAudio.playSuccess();
              setMode('main_menu');
            }, 300);
            return 100;
          }
          return prev + Math.floor(Math.random() * 8) + 2;
        });
      }, 120);
      return () => clearInterval(interval);
    }
  }, [currentMode]);

  // Loading Screen (Screen 8)
  if (currentMode === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#042418] to-[#010e0a] flex flex-col justify-between p-6 pb-12 font-sans select-none text-center relative overflow-hidden">
        {/* Ambient jungle sunbeams and leaf shadows */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none blur-3xl" />
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-emerald-900/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-green-950/45 rounded-full blur-3xl pointer-events-none" />

        {/* Top Space / Brand Title Header */}
        <div className="pt-8 z-10 animate-fade-in">
          <h2 className="text-[#a5d6a7] font-black tracking-widest uppercase text-xs sm:text-sm">
            ✦ JUNGLE TACTICS ✦
          </h2>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-widest mt-1 opacity-90 drop-shadow-lg">
            丛林秘境 · 策略大决战
          </h1>
        </div>

        {/* Central Masterpiece: Replication of User's Uploaded Key Art (SVG & CSS) */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 z-10">
          <ProductEmblem />
        </div>

        {/* Bottom Loading Progress Section with Golden Jungle Accents */}
        <div className="w-full max-w-sm mx-auto space-y-6 px-4 z-10">
          <div className="space-y-3">
            <div className="relative flex justify-center">
              {/* Glowing Yellow bubble pointing to the current progress */}
              <div 
                className="bg-[#fff9c4] text-[#a1887f] font-black text-xs px-4 py-1.5 rounded-full shadow-lg border-2 border-[#fbc02d] transform transition-all duration-150 animate-pulse flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                正在载入远古丛林... <span className="font-mono text-emerald-800 text-sm font-black">{Math.min(100, progress)}%</span>
              </div>
            </div>

            {/* Bouncy Progress Track */}
            <div className="relative w-full h-8 bg-black/40 rounded-full p-1 border-2 border-[#a5d6a7]/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 via-green-500 to-[#1b5e20] rounded-full shadow-[0_0_12px_#34d399] transition-all duration-150 relative"
                style={{ width: `${progress}%` }}
              >
                {/* Shiny gloss effect overlay */}
                <span className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent h-1/2 rounded-full" />
                <span className="absolute top-1 right-2 w-2 h-1/2 bg-white/40 rounded-full animate-pulse" />
              </div>
            </div>
          </div>

          <p className="text-xs text-[#a5d6a7]/75 italic bg-[#031c13]/80 px-4 py-3 rounded-2xl border border-[#a5d6a7]/10 shadow-inner">
            小诀窍：大象怕老鼠，老鼠怕猫。制定你强大的策略，突破兽穴！
          </p>
        </div>
      </div>
    );
  }

  // Handle Play tap sound
  const handleTap = (action: () => void) => {
    jungleAudio.playClick();
    action();
  };

  // Toggle internal sound
  const toggleSound = () => {
    const newValue = !settings.soundEnabled;
    jungleAudio.setSoundEnabled(newValue);
    setSettings(prev => ({ ...prev, soundEnabled: newValue }));
    jungleAudio.playClick();
  };

  // 2. Main Menu screen (Screen 6)
  if (currentMode === 'main_menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#042418] to-[#010e0a] flex flex-col justify-between p-4 relative overflow-hidden select-none">
        {/* Ambient jungle sunbeams and leaf shadows */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none blur-3xl shadow-inner" />
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-emerald-900/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-80 h-80 bg-green-950/40 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Card */}
        <div className="w-full bg-[#052b1b]/80 border-2 border-emerald-800/60 rounded-2xl p-3 flex items-center justify-between shadow-lg z-20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-900 rounded-full border-2 border-[#a5d6a7] shadow-inner flex items-center justify-center overflow-hidden">
              <TimExplorer size="100%" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#fafafa] text-sm sm:text-base">
                  {settings.playerName}
                </span>
                <span className="text-[10px] bg-emerald-700 text-yellow-200 px-1.5 py-0.5 rounded font-black leading-none">
                  守护者
                </span>
              </div>
              <p className="text-[11px] text-[#a5d6a7] flex items-center gap-1 mt-0.5">
                <Star size={11} className="fill-[#fbc02d] text-[#fbc02d]" />
                等级 12 · 远古黄金段位
              </p>
            </div>
          </div>

          <div className="bg-[#1b5e20] text-[#fff59d] text-[11px] sm:text-xs font-black py-1.5 px-3 rounded-full flex items-center gap-1 shadow-inner border border-yellow-500/30">
            <span className="font-mono text-yellow-400">★</span> XP: 1250
          </div>
        </div>

        {/* Center Game Mascot and Logo Block */}
        <div className="flex-1 flex flex-col items-center justify-center py-6 min-h-[300px]">
          <ProductEmblem />
        </div>

        {/* Action Button layout */}
        <div className="w-full max-w-xs mx-auto space-y-6 pb-6">
          {/* Main Huge 3D Leaf Green Start Game Button */}
          <button 
            id="btn_start_game"
            onClick={() => handleTap(() => setMode('mode_select'))}
            className="w-full h-15 bg-[#006e1c] text-white hover:bg-[#005313] rounded-full font-bold text-xl tracking-widest border-b-6 border-[#003c0b] shadow-xl transform active:translate-y-1 active:border-b-2 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center"
          >
            开始游戏
          </button>

          {/* Settings and Exit buttons */}
          <div className="grid grid-cols-2 gap-4">
            {/* Exit/Reset button */}
            <button 
              id="btn_exit"
              onClick={() => handleTap(() => setShowSettingsOverlay(true))}
              className="py-3 bg-[#e18500] hover:bg-[#d84315] text-white rounded-2xl font-bold text-sm tracking-wider border-b-4 border-[#4d2b00] active:translate-y-0.5 active:border-b-2 flex items-center justify-center gap-1"
            >
              <Users size={14} /> 玩家名字
            </button>

            {/* Config panel button */}
            <button 
              id="btn_settings"
              onClick={() => handleTap(() => setShowSettingsOverlay(true))}
              className="py-3 bg-[#e1dca9] hover:bg-[#cbf2aa] text-[#1e1c00] rounded-2xl font-bold text-sm border-b-4 border-[#3f4a3c]/50 active:translate-y-0.5 active:border-b-2 flex items-center justify-center gap-1"
            >
              ⚙️ 系统设置
            </button>
          </div>
        </div>

        {/* Audio Mute toggle float */}
        <button 
          onClick={toggleSound}
          className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-full shadow-lg border-2 border-[#eae4b1] text-[#006e1c] active:scale-90 transition-transform"
        >
          {settings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>

        {/* Dynamic Custom Player Name and Audio Settings overlay modal */}
        {showSettingsOverlay && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-[#fffadf] rounded-3xl border-6 border-[#006e1c] p-6 max-w-sm w-full shadow-3xl text-center space-y-6">
              <h2 className="text-2xl font-black text-[#006e1c] tracking-wider">系统设置</h2>
              
              <div className="space-y-4 text-left">
                {/* Section A: Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#3f4a3c] block ml-1">修改勇士昵称</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={editNameInput}
                      onChange={(e) => setEditNameInput(e.target.value)}
                      maxLength={10}
                      className="flex-1 bg-[#fbf5c1] border-2 border-[#eae4b1] outline-none rounded-xl px-4 py-2 text-sm font-semibold focus:border-[#006e1c] text-[#1e1c00]"
                    />
                    <button 
                      onClick={() => {
                        if (editNameInput.trim()) {
                          setSettings(prev => ({ ...prev, playerName: editNameInput.trim() }));
                          jungleAudio.playSuccess();
                        }
                      }}
                      className="bg-[#006e1c] text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-95 border-b-2 border-[#003c0b]"
                    >
                      保存
                    </button>
                  </div>
                </div>

                {/* Section B: Audio Toggle */}
                <div className="flex items-center justify-between bg-[#fbf5c1]/60 p-3 rounded-2xl border border-[#eae4b1] mt-4">
                  <div>
                    <h3 className="text-sm font-bold text-[#1e1c00]">游戏背景音效</h3>
                    <p className="text-[10px] text-[#3f4a3c]/80">开启美妙的水泡与合成战斗反馈</p>
                  </div>
                  <button 
                    onClick={toggleSound}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${settings.soundEnabled ? 'bg-[#006e1c] text-white shadow-inner' : 'bg-gray-300 text-gray-700'}`}
                  >
                    {settings.soundEnabled ? '已开启' : '已关闭'}
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => handleTap(() => setShowSettingsOverlay(false))}
                className="w-full py-2.5 bg-[#ff8a80] hover:bg-red-400 text-white font-extrabold text-sm rounded-xl border-b-4 border-red-800 active:translate-y-0.5 active:border-b-2"
              >
                确认关闭
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Mode Selection (Screen 7)
  if (currentMode === 'mode_select') {
    return (
      <div className="min-h-screen bg-[#fffadf] p-4 flex flex-col justify-between font-sans select-none relative">
        {/* Navigation Head */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => handleTap(() => setMode('main_menu'))}
            className="w-10 h-10 bg-[#fbf5c1] hover:bg-white flex items-center justify-center rounded-full border-2 border-[#eae4b1] text-[#006e1c] active:scale-90 transition-transform shadow-sm"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          
          <h1 className="text-2xl font-black text-[#006e1c]">丛林战棋</h1>

          <div className="bg-[#006e1c] text-white/95 font-bold text-xs py-1.5 px-4 rounded-full flex items-center gap-1 border border-white/20 shadow-inner">
            <span className="text-yellow-300">★</span> XP: 1250
          </div>
        </div>

        {/* Modes Cards Layout */}
        <div className="flex-1 flex flex-col justify-center gap-5 my-6 max-w-sm mx-auto w-full">
          {/* Card A: Local 2 Player (本地双人) */}
          <div className="bg-white rounded-3xl border-4 border-[#eae4b1] shadow-md p-4 flex flex-col items-center text-center relative overflow-hidden group">
            {/* Little design decorations */}
            <div className="absolute top-0 right-0 bg-[#006e1c]/10 text-[#006e1c] font-bold text-[10px] px-3 py-1 rounded-bl-xl border-l border-b border-[#eae4b1]/65">
              1v1 对战
            </div>

            {/* Cute Local Multi logo illustration */}
            <div className="w-16 h-16 bg-[#e1f5fe] rounded-2xl flex items-center justify-center border-2 border-sky-400/40 p-2 my-2 transition-transform group-hover:scale-110">
              <svg viewBox="0 0 100 100" className="w-full h-full text-sky-600">
                <circle cx="35" cy="40" r="15" fill="#4caf50" />
                <path d="M15,80 Q35,62 55,80 Z" fill="#4caf50" />
                <circle cx="65" cy="40" r="15" fill="#ffa726" />
                <path d="M45,80 Q65,62 85,80 Z" fill="#ffa726" />
                <rect x="35" y="65" width="30" height="25" fill="#3e2723" rx="4" />
                <line x1="50" y1="65" x2="50" y2="90" stroke="#fbc02d" strokeWidth="2" strokeDasharray="3" />
              </svg>
            </div>

            <h2 className="text-xl font-black text-[#1e1c00]">本地双人</h2>
            <p className="text-[11px] text-[#3f4a3c]/80 mt-1 max-w-[200px]">
              在一台设备上与身边的朋友进行面对面智勇博弈。
            </p>

            <button 
              id="mode_local_start"
              onClick={() => handleTap(onStartLocalGame)}
              className="mt-4 w-full py-2.5 bg-[#006e1c] hover:bg-[#005313] text-white font-extrabold text-sm rounded-full border-b-4 border-[#003c0b] shadow-md active:translate-y-0.5 active:border-b-2"
            >
              开始
            </button>
          </div>

          {/* Card B: VS AI (人机挑战) */}
          <div className="bg-white rounded-3xl border-4 border-[#eae4b1] shadow-md p-4 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-[#e18500]/10 text-[#e18500] font-bold text-[10px] px-3 py-1 rounded-bl-xl border-l border-b border-[#eae4b1]/65">
              练习场
            </div>

            {/* Cute robot safari ranger illustration */}
            <div className="w-16 h-16 bg-[#fff3e0] rounded-2xl flex items-center justify-center border-2 border-orange-400/40 p-2 my-2 transition-transform group-hover:scale-110">
              <svg viewBox="0 0 100 100" className="w-full h-full text-orange-600">
                <rect x="25" y="30" width="50" height="36" fill="#78909c" rx="8" />
                <rect x="32" y="38" width="12" height="12" fill="#263238" rx="2" />
                <rect x="56" y="38" width="12" height="12" fill="#263238" rx="2" />
                <circle cx="38" cy="44" r="3" fill="#00e676" />
                <circle cx="62" cy="44" r="3" fill="#00e676" />
                <rect x="42" y="52" width="16" height="5" fill="#37474f" rx="1" />
                <line x1="50" y1="30" x2="50" y2="15" stroke="#78909c" strokeWidth="4" />
                <circle cx="50" cy="12" r="5" fill="#ff1744" />
              </svg>
            </div>

            <h2 className="text-xl font-black text-[#5a461d]">人机挑战</h2>
            <p className="text-[11px] text-[#3f4a3c]/80 mt-1 max-w-[200px]">
              挑战由浅入深的三种级别森林AI算法，精练棋艺。
            </p>

            <button 
              id="mode_ai_practice"
              onClick={() => handleTap(onOpenDifficultyModal)}
              className="mt-4 w-full py-2.5 bg-[#8b5000] hover:bg-[#693c00] text-white font-extrabold text-sm rounded-full border-b-4 border-[#3c1e00] shadow-md active:translate-y-0.5 active:border-b-2"
            >
              练习 &gt;
            </button>
          </div>

          {/* Card C: Room Match (房间对战) */}
          <div className="bg-white rounded-3xl border-4 border-[#eae4b1] shadow-md p-4 flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-[#006e1c] text-white font-bold text-[9px] px-3 py-1 rounded-bl-xl border-l border-b border-[#eae4b1]/65">
              热推
            </div>

            {/* Cute social globe explorer visual */}
            <div className="w-16 h-16 bg-[#e8f5e9] rounded-2xl flex items-center justify-center border-2 border-green-400/40 p-2 my-2 transition-transform group-hover:scale-110">
              <svg viewBox="0 0 100 100" className="w-full h-full text-green-700">
                <circle cx="50" cy="50" r="32" fill="#03a9f4" />
                {/* Land masses */}
                <ellipse cx="40" cy="40" rx="12" ry="8" fill="#4caf50" />
                <ellipse cx="62" cy="62" rx="15" ry="10" fill="#4caf50" />
                <ellipse cx="50" cy="50" rx="6" ry="6" fill="#4caf50" />
                <circle cx="50" cy="50" r="32" fill="none" stroke="#2e7d32" strokeWidth="2" />
                {/* Vines wrapped */}
                <path d="M12,50 Q50,90 88,50" fill="none" stroke="#2e7d32" strokeWidth="3" strokeDasharray="3" />
              </svg>
            </div>

            <h2 className="text-xl font-black text-[#1e1c00]">房间对战</h2>
            <p className="text-[11px] text-[#3f4a3c]/80 mt-1 max-w-[200px]">
              专属房间局域联机。创建专属 6 位数代码，邀请好友！
            </p>

            <button 
              id="mode_room_enter"
              onClick={() => handleTap(onOpenRoomMatchModal)}
              className="mt-4 w-full py-2.5 bg-[#4c5c00] hover:bg-[#343e00] text-white font-extrabold text-sm rounded-full border-b-4 border-[#1e2300] shadow-md active:translate-y-0.5 active:border-b-2"
            >
              进入 &gt;
            </button>
          </div>
        </div>

        {/* Small footer text */}
        <div className="text-center pb-2">
          <p className="text-[10px] text-[#3f4a3c]/60 font-medium">
            Jungle Chess Engine v1.2 · Powered by React 19 & Vite
          </p>
        </div>
      </div>
    );
  }

  // 4. Create Room Success state (Screen 5)
  if (currentMode === 'create_room') {
    return (
      <div className="min-h-screen bg-[#fffadf] flex flex-col justify-between font-sans select-none relative pb-15">
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between border-b border-[#eae4b1]">
          <button 
            onClick={() => handleTap(() => setMode('mode_select'))}
            className="w-10 h-10 bg-[#fbf5c1] hover:bg-white flex items-center justify-center rounded-full border-2 border-[#eae4b1] text-[#006e1c] active:scale-90 shadow-sm"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </button>
          <span className="font-extrabold text-[#006e1c] text-lg">丛林战棋</span>
          <div className="bg-[#e1f5fe] text-[#0288d1] font-bold text-xs py-1 px-3 rounded-full flex items-center gap-1 shadow-inner border border-sky-200">
            1,250 💎
          </div>
        </div>

        {/* Success Card Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 max-w-sm mx-auto w-full space-y-6">
          {/* Top Big Success badge */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-18 h-18 bg-[#006e1c] rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white text-3xl font-bold animate-pulse">
              ✓
            </div>
            <h1 className="text-2xl font-black text-[#006e1c] tracking-wide mt-1">
              创建房间成功！
            </h1>
            <p className="text-xs text-[#3f4a3c] font-semibold">
              快叫上你的小伙伴一起来战斗吧
            </p>
          </div>

          {/* Large Room Code Card Container */}
          <div className="w-full bg-white rounded-3xl border-4 border-[#006e1c] shadow-xl p-6 relative flex flex-col items-center">
            {/* Glossy Header pill */}
            <div className="absolute -top-4 bg-[#fbf5c1] border-2 border-[#006e1c] text-[#006e1c] font-black text-xs px-6 py-1 rounded-full shadow-md">
              房间代码
            </div>

            {/* Huge dynamic numeric output */}
            <div className="text-center py-6">
              <span className="text-5xl font-black text-[#006e1c] tracking-widest font-mono select-all">
                823910
              </span>
            </div>

            {/* Inner hint */}
            <div className="w-full border-t border-[#eae4b1]/60 pt-4 text-center">
              <p className="text-xs text-[#3f4a3c]/80 font-bold flex items-center justify-center gap-1.5">
                ⏱ 此代码在 15 分钟内有效
              </p>
            </div>
          </div>

          {/* Action Row buttons */}
          <div className="w-full space-y-4">
            {/* Copy Button */}
            <button 
              onClick={() => {
                navigator.clipboard.writeText('823910');
                jungleAudio.playSuccess();
                alert('已复制房间代码: 823910，快去分享给好友吧！');
              }}
              className="w-full py-3.5 bg-[#e18500] hover:bg-[#d84315] text-white font-extrabold text-sm rounded-full border-b-5 border-[#4d2b00] active:translate-y-0.5 active:border-b-2 flex items-center justify-center gap-2 shadow-md transition-transform"
            >
              <Share2 size={16} /> 复制并分享
            </button>

            {/* Join Room Active Button */}
            <button 
              id="btn_enter_room_from_code"
              onClick={() => handleTap(onStartRoomGame)}
              className="w-full py-4 bg-[#006e1c] hover:bg-[#005313] text-white font-extrabold text-base rounded-full border-b-6 border-[#003c0b] shadow-xl active:translate-y-1 active:border-b-2 transform active:scale-95 transition-all text-center flex items-center justify-center"
            >
              进入房间
            </button>
          </div>

          {/* Decorative Bottom Character portrait (Frog Explorer) */}
          <div className="pt-2">
            <div className="w-20 h-20 bg-[#efebe9] p-1 border-2 border-[#006e1c]/10 rounded-full shadow-inner flex items-center justify-center overflow-hidden">
              <FrogExplorer size="100%" />
            </div>
          </div>
        </div>

        {/* Bottom Interactive Navigation Bar (Screen 5) */}
        <div className="fixed bottom-0 inset-x-0 bg-[#fffadf] border-t-2 border-[#eae4b1] h-[64px] grid grid-cols-4 z-40">
          <button 
            onClick={() => setActiveTab('lobby')}
            className={`flex flex-col items-center justify-center gap-0.5 ${activeTab === 'lobby' ? 'bg-[#ffe082]/40 rounded-t-xl text-[#006e1c] font-black border-t-4 border-[#006e1c]' : 'text-gray-500 font-medium'}`}
          >
            <span className="text-xl">🏠</span>
            <span className="text-[10px]">大厅</span>
          </button>
          <button 
            onClick={() => handleTap(() => { setActiveTab('battle'); setMode('mode_select'); })}
            className={`flex flex-col items-center justify-center gap-0.5 ${activeTab === 'battle' ? 'bg-[#ffe082]/40 rounded-t-xl text-[#006e1c] font-black border-t-4 border-[#006e1c]' : 'text-gray-500 font-medium'}`}
          >
            <span className="text-xl">⚔️</span>
            <span className="text-[10px]">战斗</span>
          </button>
          <button 
            onClick={() => handleTap(() => alert('社交系统维护中，快创建房间邀请朋友吧！'))}
            className="flex flex-col items-center justify-center gap-0.5 text-gray-500"
          >
            <span className="text-xl">👥</span>
            <span className="text-[10px]">社交</span>
          </button>
          <button 
            onClick={() => handleTap(() => alert('森林商店即将开启，敬请期待！'))}
            className="flex flex-col items-center justify-center gap-0.5 text-gray-500"
          >
            <span className="text-xl">🛒</span>
            <span className="text-[10px]">商店</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};
