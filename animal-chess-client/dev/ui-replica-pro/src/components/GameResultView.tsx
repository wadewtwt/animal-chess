import React from 'react';
import { GameStats } from '../types';
import { jungleAudio } from '../utils/audio';
import { Timer, ArrowLeft, RotateCcw, Home, Columns, Sparkles } from 'lucide-react';

interface GameResultViewProps {
  stats: GameStats;
  winner: 'player1' | 'player2' | 'draw' | null;
  gameSubMode: 'local_2p' | 'vs_ai' | 'room_match';
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export const GameResultView: React.FC<GameResultViewProps> = ({
  stats,
  winner,
  gameSubMode,
  onPlayAgain,
  onReturnToLobby,
}) => {
  // Format total seconds to MM:SS string
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isAIWinner = winner === 'player2' && gameSubMode === 'vs_ai';
  const isP1Winner = winner === 'player1';

  // Play click helpers
  const handleTap = (action: () => void) => {
    jungleAudio.playClick();
    action();
  };

  return (
    <div className="min-h-screen bg-[#fffadf] p-4 flex flex-col justify-between font-sans select-none max-w-sm mx-auto w-full relative">
      {/* Top Banner Row */}
      <div className="flex items-center justify-between pb-2">
        <button 
          onClick={() => handleTap(onReturnToLobby)}
          className="w-10 h-10 bg-[#fbf5c1] hover:bg-white flex items-center justify-center rounded-full border-2 border-[#eae4b1] text-[#006e1c] active:scale-95"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>

        <h1 className="text-[#006e1c] font-black text-xl tracking-wider uppercase">
          Jungle Tactics
        </h1>

        <div className="bg-[#006e1c] text-white font-bold text-xs py-1.5 px-3.5 rounded-full shadow-inner border border-white/20">
          XP: 1250
        </div>
      </div>

      {/* Dynamic Celebration Heading based on winner status */}
      <div className="text-center py-4 space-y-1">
        {winner === 'draw' ? (
          <h2 className="text-3xl font-black text-[#8b5000]">双方平局！</h2>
        ) : isP1Winner ? (
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#006e1c] tracking-wide animate-bounce">
              🎉 战役胜利！
            </h2>
            <p className="text-xs text-[#1b5e20] font-bold">
              你成功突破并占领了对方的兽穴！
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#ba1a1a] tracking-wide">
              💀 战败重来！
            </h2>
            <p className="text-xs text-[#a3000b] font-semibold">
              没关系，再磨练一下策略重新探索丛林吧！
            </p>
          </div>
        )}
      </div>

      {/* Main Stats scorecard (Matches SCREEN 1 Layout perfectly) */}
      <div className="flex-1 flex flex-col justify-center space-y-5 py-2">
        
        {/* Row 1: Dual Grid Indicators */}
        <div className="grid grid-cols-2 gap-4">
          {/* Card A: Steps count */}
          <div className="bg-[#fff] rounded-[2rem] border-3 border-[#e1f5fe]/80 p-4 flex flex-col items-center justify-center text-center shadow-md relative overflow-hidden group">
            {/* Soft inner active sheen */}
            <div className="absolute top-1 left-2 right-2 h-1 bg-sky-200/20 rounded-full" />
            
            {/* Running green icon */}
            <div className="w-10 h-10 bg-[#e8f5e9] text-[#006e1c] rounded-full flex items-center justify-center mb-1">
              <svg viewBox="0 0 100 100" className="w-6 h-6 fill-current">
                <path d="M50,15 C55,15 55,25 50,25 C45,25 45,15 50,15 Z M35,45 L40,30 L50,33 L45,55 L35,85 L25,85 L35,60 Z M52,35 L62,45 L72,35 L68,30 L58,32 L52,35 Z" />
              </svg>
            </div>

            <span className="text-xs text-[#3f4a3c]/80 font-bold block mb-1">总步数</span>
            <span className="text-3xl font-extrabold text-[#006e1c] font-mono leading-none">
              {stats.stepsCount}
            </span>
          </div>

          {/* Card B: Duration spent */}
          <div className="bg-[#fff] rounded-[2rem] border-3 border-[#fee2e2]/80 p-4 flex flex-col items-center justify-center text-center shadow-md relative overflow-hidden group">
            <div className="absolute top-1 left-2 right-2 h-1 bg-red-200/20 rounded-full" />

            {/* Stopwatch golden icon */}
            <div className="w-10 h-10 bg-[#fffde7] text-[#8b5000] rounded-full flex items-center justify-center mb-1">
              <Timer size={20} strokeWidth={2.5} />
            </div>

            <span className="text-xs text-[#3f4a3c]/80 font-bold block mb-1">总用时</span>
            <span className="text-3xl font-extrabold text-[#8b5000] font-mono leading-none">
              {formatTime(stats.timeSpent)}
            </span>
          </div>
        </div>

        {/* Row 2: Gold Ranked Points Segment */}
        <div className="bg-gradient-to-r from-[#fbf5c1] to-[#f5f0bc] border-3 border-[#d8c35c]/50 rounded-[1.8rem] p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
          {/* Sparkles backdrop */}
          <div className="absolute inset-0 opacity-10 bg-grid-pattern pointer-events-none" />

          <div className="flex items-center gap-3">
            {/* Gold round star trophy label */}
            <div className="w-12 h-12 bg-[#f9e534] border-3 border-white rounded-full flex items-center justify-center shadow-md text-amber-800 text-lg font-bold">
              ★
            </div>
            <div className="text-left">
              <h3 className="text-sm font-extrabold text-[#1e1c00]">排位积分</h3>
              <p className="text-[10px] text-gray-500 font-bold tracking-tight mt-0.5">
                距离白金段位还差 <span className="text-[#006e1c] font-bold">50</span> 分
              </p>
            </div>
          </div>

          {/* Points badge indicator */}
          <div className="bg-[#fffdf0] border-2 border-[#f9e534] text-[#8b5000] font-black text-sm px-4 py-1.5 rounded-2xl shadow-inner font-mono">
            +{isP1Winner ? stats.rankedPointsAdded : 5}
          </div>
        </div>

        {/* Row 3: Rewards dotted layout (获得奖励) */}
        <div className="border-4 border-dashed border-[#eae4b1] rounded-[2rem] p-5 text-center space-y-4">
          <h4 className="text-xs font-black text-[#8b5000] tracking-widest uppercase bg-[#fbf5c1]/60 px-4 py-1 rounded-full border border-[#eae4b1] w-max mx-auto">
            获得奖励
          </h4>

          <div className="flex items-center justify-center gap-8">
            {/* Reward 1: Dollar bills */}
            <div className="flex flex-col items-center space-y-1.5">
              <div className="w-14 h-14 bg-[#e8f5e9] border-3 border-[#c8e6c9] rounded-full flex items-center justify-center shadow-md text-2xl">
                💵
              </div>
              <span className="font-mono font-black text-gray-800 text-base">
                {isP1Winner ? stats.bills : 50}
              </span>
            </div>

            {/* Reward 2: Shiny Diamonds */}
            <div className="flex flex-col items-center space-y-1.5">
              <div className="w-14 h-14 bg-[#fff3e0] border-3 border-[#ffe0b2] rounded-full flex items-center justify-center shadow-md text-2xl">
                💎
              </div>
              <span className="font-mono font-black text-gray-800 text-base">
                {isP1Winner ? stats.diamonds : 2}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Action Row buttons (Matches Screenshot bottom) */}
      <div className="space-y-4 pb-4">
        {/* Play again button */}
        <button 
          id="btn_result_play_again"
          onClick={() => handleTap(onPlayAgain)}
          className="w-full py-4 bg-gradient-to-r from-[#2dba45] to-[#006e1c] hover:opacity-95 text-white font-extrabold text-base rounded-full border-b-6 border-[#003c0b] shadow-xl active:translate-y-1 active:border-b-2 transform active:scale-95 transition-all text-center flex items-center justify-center"
        >
          🔄 再来一局
        </button>

        {/* Home lobby button */}
        <button 
          id="btn_result_lobby"
          onClick={() => handleTap(onReturnToLobby)}
          className="w-full py-3.5 bg-[#f5eab4] hover:bg-[#eae0a5] text-[#3c3a1e] font-extrabold text-sm rounded-full border-b-4 border-[#3f4a3c]/40 active:translate-y-0.5 active:border-b-2 flex items-center justify-center gap-1.5 shadow-md"
        >
          <Home size={15} /> 返回大厅
        </button>
      </div>
    </div>
  );
};
