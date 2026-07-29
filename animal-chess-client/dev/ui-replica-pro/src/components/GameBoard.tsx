import React, { useState, useEffect, useRef } from 'react';
import { Board, Position, Piece, GameSubMode, Difficulty, GameStats } from '../types';
import { 
  createInitialBoard, 
  isValidMove, 
  getValidMoves, 
  getWinner, 
  findBestMoveAI, 
  isRiver, 
  getTrapOwner, 
  DENS, 
  BOARD_ROWS, 
  BOARD_COLS,
  cloneBoard
} from '../utils/gameRules';
import { AnimalAvatar } from './AnimalAvatar';
import { QuickChatPanel } from './QuickChatPanel';
import type { QuickChatItem } from '../data/QuickChatConfig';
import { jungleAudio } from '../utils/audio';
import { Volume2, VolumeX, RefreshCw, Trophy, ArrowLeft, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface GameBoardProps {
  gameSubMode: GameSubMode;
  difficulty: Difficulty;
  playerName: string;
  onGameOver: (stats: GameStats, winner: 'player1' | 'player2' | 'draw') => void;
  onExitGame: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameSubMode,
  difficulty,
  playerName,
  onGameOver,
  onExitGame,
}) => {
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [playerTurn, setPlayerTurn] = useState<'player1' | 'player2'>('player1'); // player1 = human (Green), player2 = Second Player / AI (Gold)
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validTargets, setValidTargets] = useState<Position[]>([]);
  
  // Game metrics
  const [steps, setSteps] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [winner, setWinner] = useState<'player1' | 'player2' | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [soundOn, setSoundOn] = useState(() => jungleAudio.isEnabled());
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [quickChatToast, setQuickChatToast] = useState<QuickChatItem | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const quickChatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Tick game duration timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (quickChatTimerRef.current) clearTimeout(quickChatTimerRef.current);
    };
  }, []);

  // 2. Play settings sound toggle
  const toggleSound = () => {
    const nextVal = !soundOn;
    jungleAudio.setSoundEnabled(nextVal);
    setSoundOn(nextVal);
    jungleAudio.playClick();
  };

  const handleQuickChatSend = (item: QuickChatItem) => {
    jungleAudio.playClick();
    setQuickChatToast(item);

    if (quickChatTimerRef.current) {
      clearTimeout(quickChatTimerRef.current);
    }

    quickChatTimerRef.current = setTimeout(() => {
      setQuickChatToast(null);
    }, 2000);
  };

  // 3. AI Turn calculation trigger
  useEffect(() => {
    if (gameSubMode === 'vs_ai' && playerTurn === 'player2' && !winner) {
      setIsAiThinking(true);
      
      // Delay AI slightly to simulate thinking and prevent instant jarring moves
      const aiTimer = setTimeout(() => {
        const aiMove = findBestMoveAI(board, difficulty, 'player2');
        
        if (aiMove) {
          executeMove(aiMove.from, aiMove.to);
        } else {
          // AI has no moves, player 1 wins!
          handleGameOver('player1');
        }
        setIsAiThinking(false);
      }, 700);

      return () => clearTimeout(aiTimer);
    }
  }, [playerTurn, gameSubMode, board, winner]);

  // Execute a verified coordinate move
  const executeMove = (from: Position, to: Position) => {
    const targetCell = board[to.row][to.col];
    const isCapture = targetCell !== null;
    const movingPiece = board[from.row][from.col];

    if (!movingPiece) return;

    // Apply board change
    const newBoard = cloneBoard(board);
    newBoard[to.row][to.col] = { ...movingPiece };
    newBoard[from.row][from.col] = null;

    setBoard(newBoard);
    setLastMove({ from, to });

    // Audio SFX feedback
    if (isCapture) {
      jungleAudio.playCapture();
    } else {
      jungleAudio.playMove();
    }

    // Is the landing cell an opponent's trap? Alert warning!
    const cellTrapOwner = getTrapOwner(to.row, to.col);
    if (cellTrapOwner && cellTrapOwner !== movingPiece.owner) {
      jungleAudio.playTrapAlert();
    }

    // Step Increment
    setSteps(prev => prev + 1);

    // Clear highlights
    setSelectedPos(null);
    setValidTargets([]);

    // Check game over triggers
    const currentWinner = getWinner(newBoard);
    if (currentWinner) {
      handleGameOver(currentWinner);
      return;
    }

    // Switch turn
    const nextTurn = playerTurn === 'player1' ? 'player2' : 'player1';
    setPlayerTurn(nextTurn);
  };

  // Dispatch final game scores
  const handleGameOver = (endWinner: 'player1' | 'player2') => {
    setWinner(endWinner);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Play big win/lose melody
    if (endWinner === 'player1') {
      jungleAudio.playWin();
    } else {
      jungleAudio.playError();
    }

    // Trigger parent statistics dispatch
    const stats: GameStats = {
      stepsCount: steps,
      timeSpent: elapsedTime,
      rankedPointsAdded: endWinner === 'player1' ? 35 : 5,
      xp: 1250,
      diamonds: endWinner === 'player1' ? 10 : 2,
      bills: endWinner === 'player1' ? 500 : 50,
    };

    setTimeout(() => {
      onGameOver(stats, endWinner);
    }, 1800);
  };

  // Capture user cell click events
  const handleCellClick = (row: number, col: number) => {
    if (winner || isAiThinking) return;

    // Blocking clicks on player2 piece selections in VS AI mode
    if (gameSubMode === 'vs_ai' && playerTurn === 'player2') return;

    const clickedPiece = board[row][col];

    // If a piece from the turn owner is clicked -> SELECT it, show targets
    if (clickedPiece && clickedPiece.owner === playerTurn) {
      jungleAudio.playTick();
      const pos = { row, col };
      setSelectedPos(pos);
      const targets = getValidMoves(board, pos, playerTurn);
      setValidTargets(targets);
      return;
    }

    // If destination is a valid highlight dot -> EXECUTE move!
    const isTarget = validTargets.some(t => t.row === row && t.col === col);
    if (selectedPos && isTarget) {
      executeMove(selectedPos, { row, col });
      return;
    }

    // Clicked elsewhere on board -> RESET selection
    setSelectedPos(null);
    setValidTargets([]);
  };

  // Render cell backgrounds (Water, Trap, Den, Land)
  const renderCellClass = (row: number, col: number): string => {
    const isSelected = selectedPos && selectedPos.row === row && selectedPos.col === col;
    const isTarget = validTargets.some(t => t.row === row && t.col === col);
    const inLastMove = lastMove && ((lastMove.from.row === row && lastMove.from.col === col) || (lastMove.to.row === row && lastMove.to.col === col));

    let base = 'relative aspect-square border flex items-center justify-center transition-all ';

    if (isRiver(row, col)) {
      base += 'bg-gradient-to-b from-sky-400 to-blue-500 border-sky-600 shadow-inner ';
    } else if (getTrapOwner(row, col)) {
      base += 'bg-[#eae4b1] border-[#c0ba85] ';
    } else if ((row === DENS.player1.row && col === DENS.player1.col) || (row === DENS.player2.row && col === DENS.player2.col)) {
      base += 'bg-[#ffed9e] border-amber-600 shadow-md ';
    } else {
      // Grass land pattern
      const isEven = (row + col) % 2 === 0;
      base += isEven ? 'bg-[#fffdf2] border-[#f4edd0] ' : 'bg-[#fffbee] border-[#eae3be] ';
    }

    if (isSelected) base += 'ring-4 ring-[#006e1c] ring-inset z-20 scale-102 ';
    else if (inLastMove) base += 'bg-yellow-200/50 ';

    return base;
  };

  // Render timer label
  const formatTimer = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#fffadf] flex flex-col justify-between font-sans select-none relative max-w-sm sm:max-w-md mx-auto w-full border-x-2 border-[#eae4b1] shadow-2xl p-4">
      
      {/* Top HUD panel */}
      <div className="bg-[#fbf5c1] border-3 border-[#eae4b1] p-3 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              jungleAudio.playClick();
              if (confirm('确认认输并返回大厅吗？对方会算赢哦。')) {
                onExitGame();
              }
            }}
            className="w-8 h-8 bg-white text-red-700 active:scale-90 border-2 border-red-200 rounded-full flex items-center justify-center shadow-sm"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-gray-500 leading-none block">MODE</span>
            <span className="text-xs font-black text-gray-800">
              {gameSubMode === 'vs_ai' ? `人机挑战 (${difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'})` : '本地双人'}
            </span>
          </div>
        </div>

        {/* Steps and Timer Indicators */}
        <div className="flex items-center gap-3">
          <div className="text-center bg-white px-3 py-1 rounded-xl border border-[#eae4b1] shadow-inner font-mono text-sm font-extrabold text-[#006e1c]">
            <span className="text-[9px] font-sans font-bold text-gray-400 block leading-none">STEPS</span>
            {steps}
          </div>

          <div className="text-center bg-white px-3 py-1 rounded-xl border border-[#eae4b1] shadow-inner font-mono text-sm font-extrabold text-[#e18500]">
            <span className="text-[9px] font-sans font-bold text-gray-400 block leading-none">TIME</span>
            {formatTimer(elapsedTime)}
          </div>
        </div>

        {/* Sound toggle */}
        <button 
          onClick={toggleSound}
          className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#006e1c] border-2 border-[#eae4b1] active:scale-95 shadow-sm"
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* Active turn notification banner */}
      <div className="py-2 flex items-center justify-center gap-2">
        <div className={`px-4 py-1.5 rounded-full text-xs font-black shadow-md border-2 ${playerTurn === 'player1' ? 'bg-[#c8e6c9] text-[#1b5e20] border-[#006e1c]' : 'bg-[#fff3e0] text-[#e65100] border-[#ff9800] animate-pulse'}`}>
          {playerTurn === 'player1' ? `🟢 轮到 ${playerName} 移动` : gameSubMode === 'vs_ai' ? '🤖 丛林AI 算棋中...' : '🟡 轮到 黄金战队 移动'}
        </div>
      </div>

      {/* THE 7x9 ANIMAL CHESS GAME BOARD */}
      <div className="bg-[#5d4037] p-2 rounded-[1.5rem] border-4 border-[#3e2723] shadow-xl flex-1 flex flex-col justify-center my-1">
        <div className="grid grid-cols-7 gap-1 bg-[#8d6e63] p-1.5 rounded-2xl w-full h-full relative">
          {quickChatToast && (
            <div className={`absolute left-1/2 top-5 -translate-x-1/2 z-50 pointer-events-none flex items-center gap-2 max-w-[88%] ${
              quickChatToast.kind === 'sticker'
                ? 'bg-white border-3 border-[#ffcc58] rounded-2xl px-4 py-3 shadow-2xl animate-bounce'
                : 'bg-white border-2 border-[#e1dca9] rounded-2xl px-4 py-2 shadow-xl'
            }`}>
              {quickChatToast.kind === 'sticker' && (
                <span className="text-4xl leading-none" aria-hidden="true">
                  {quickChatToast.emoji}
                </span>
              )}
              <span className={`font-black text-[#3e2723] text-center leading-tight ${
                quickChatToast.kind === 'sticker' ? 'text-sm' : 'text-base'
              }`}>
                {quickChatToast.message}
              </span>
            </div>
          )}
          
          {board.map((rowArr, rIdx) =>
            rowArr.map((cell, cIdx) => {
              const isTarget = validTargets.some(t => t.row === rIdx && t.col === cIdx);
              const cellTrapOwner = getTrapOwner(rIdx, cIdx);
              const isP1Trap = cellTrapOwner === 'player1';
              const isP2Trap = cellTrapOwner === 'player2';
              const isCellDen = (rIdx === DENS.player1.row && cIdx === DENS.player1.col) || (rIdx === DENS.player2.row && cIdx === DENS.player2.col);
              const isCellRiver = isRiver(rIdx, cIdx);

              return (
                <div 
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  className={renderCellClass(rIdx, cIdx)}
                >
                  {/* Decorative River Water Ripple vector */}
                  {isCellRiver && (
                    <div className="absolute inset-x-0.5 bottom-0.5 top-0.5 opacity-20 pointer-events-none overflow-hidden flex flex-col justify-around">
                      <div className="h-0.5 w-full bg-white rounded-full animate-pulse" />
                      <div className="h-0.5 w-full bg-white rounded-full animate-pulse [animation-delay:1s]" />
                    </div>
                  )}

                  {/* Decorative Trap Labels */}
                  {cellTrapOwner && (
                    <div className="absolute inset-0.5 border border-dashed border-red-500/40 rounded flex items-center justify-center opacity-40 pointer-events-none">
                      <span className="text-[8px] font-bold text-red-800 rotate-12">陷阱</span>
                    </div>
                  )}

                  {/* Decorative Den Labels */}
                  {isCellDen && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none scale-90 z-0">
                      <div className="w-8 h-8 rounded-full border-2 border-double border-amber-800/50 flex items-center justify-center">
                        <span className="text-[10px] font-black text-amber-900 leading-none">穴</span>
                      </div>
                    </div>
                  )}

                  {/* Animal Piece Renderer */}
                  {cell && (
                    <div className="relative w-10/12 h-10/12 z-10">
                      <AnimalAvatar 
                        type={cell.type} 
                        owner={cell.owner} 
                        size="100%" 
                      />
                    </div>
                  )}

                  {/* Valid move target bubble */}
                  {isTarget && (
                    <div className="absolute w-4 h-4 bg-[#ffeb3b]/90 border-2 border-[#ff9800] rounded-full z-30 shadow cursor-pointer animate-ping" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Surrender Board Actions bottom bar */}
      <div className="pt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2">
        <button 
          onClick={() => {
            jungleAudio.playClick();
            if (confirm('确认重新开始本局对战吗？')) {
              setBoard(createInitialBoard());
              setPlayerTurn('player1');
              setSteps(0);
              setElapsedTime(0);
              setSelectedPos(null);
              setValidTargets([]);
              setLastMove(null);
            }
          }}
          className="justify-self-start bg-white/80 border border-[#eae4b1] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 hover:bg-white active:scale-95 shadow-sm"
        >
          <RotateCcw size={13} /> 重新开始
        </button>

        <QuickChatPanel
          disabled={Boolean(winner) || isAiThinking}
          onSend={handleQuickChatSend}
        />

        <button 
          onClick={() => {
            jungleAudio.playClick();
            if (confirm('是否认输？认输将视为对方直接获胜。')) {
              handleGameOver(playerTurn === 'player1' ? 'player2' : 'player1');
            }
          }}
          className="justify-self-end bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 hover:bg-red-100 active:scale-95 shadow-sm"
        >
          🏳️ 认输
        </button>
      </div>
    </div>
  );
};
