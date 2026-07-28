/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameMode, GameSubMode, Difficulty, GameSettings, GameStats } from './types';
import { LobbyViews } from './components/LobbyViews';
import { Modals } from './components/Modals';
import { GameBoard } from './components/GameBoard';
import { GameResultView } from './components/GameResultView';
import { jungleAudio } from './utils/audio';

export default function App() {
  const [currentMode, setCurrentMode] = useState<GameMode>('loading');
  const [currentSubMode, setCurrentSubMode] = useState<GameSubMode | null>(null);
  
  // Game dynamic variables
  const [settings, setSettings] = useState<GameSettings>({
    soundEnabled: true,
    playerName: '游侠阿提',
    aiDifficulty: 'medium',
  });

  const [activeStats, setActiveStats] = useState<GameStats>({
    stepsCount: 24,
    timeSpent: 252, // 04:12
    rankedPointsAdded: 35,
    xp: 1250,
    diamonds: 10,
    bills: 500,
  });

  const [winner, setWinner] = useState<'player1' | 'player2' | 'draw' | null>(null);

  // Modal displays toggle triggers
  const [difficultyModalOpen, setDifficultyModalOpen] = useState(false);
  const [roomMatchModalOpen, setRoomMatchModalOpen] = useState(false);
  const [joinRoomModalOpen, setJoinRoomModalOpen] = useState(false);

  // Close overlays helpers
  const handleCloseAllOverlays = () => {
    setDifficultyModalOpen(false);
    setRoomMatchModalOpen(false);
    setJoinRoomModalOpen(false);
  };

  // Human vs Computer initiation
  const handleSelectDifficulty = (diff: Difficulty) => {
    setSettings(prev => ({ ...prev, aiDifficulty: diff }));
    setDifficultyModalOpen(false);
    setCurrentSubMode('vs_ai');
    setCurrentMode('playing');
  };

  // Action room helper success trigger
  const handleCreateRoom = () => {
    setRoomMatchModalOpen(false);
    setCurrentMode('create_room');
  };

  const handleOpenJoinRoom = () => {
    setRoomMatchModalOpen(false);
    setJoinRoomModalOpen(true);
  };

  const handleJoinWithCode = (code: string) => {
    setJoinRoomModalOpen(false);
    setCurrentSubMode('room_match');
    setCurrentMode('playing');
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-0 sm:p-4 selection:bg-[#006e1c]/30">
      {/* Outer framing wrapper simulating a safe, gorgeous premium mobile chassis */}
      <div className="w-full max-w-md bg-[#fffadf] rounded-none sm:rounded-[3rem] shadow-2xl relative overflow-hidden ring-4 ring-[#e1dca9]/30 min-h-screen sm:min-h-[850px] flex flex-col justify-between">
        
        {/* State Routing Screen */}
        {currentMode !== 'playing' && currentMode !== 'game_over' && (
          <LobbyViews 
            currentMode={currentMode}
            subMode={currentSubMode}
            settings={settings}
            setMode={setCurrentMode}
            setSubMode={setCurrentSubMode}
            setSettings={setSettings}
            onOpenDifficultyModal={() => setDifficultyModalOpen(true)}
            onOpenRoomMatchModal={() => setRoomMatchModalOpen(true)}
            onStartLocalGame={() => {
              setCurrentSubMode('local_2p');
              setCurrentMode('playing');
            }}
            onStartRoomGame={() => {
              setCurrentSubMode('room_match');
              setCurrentMode('playing');
            }}
          />
        )}

        {/* Primary Gameplay Screen */}
        {currentMode === 'playing' && currentSubMode && (
          <GameBoard 
            gameSubMode={currentSubMode}
            difficulty={settings.aiDifficulty}
            playerName={settings.playerName}
            onGameOver={(stats, endWinner) => {
              setActiveStats(stats);
              setWinner(endWinner);
              setCurrentMode('game_over');
            }}
            onExitGame={() => {
              setCurrentMode('main_menu');
              setCurrentSubMode(null);
            }}
          />
        )}

        {/* Game results / Scorecard screen (Screen 1) */}
        {currentMode === 'game_over' && (
          <GameResultView 
            stats={activeStats}
            winner={winner}
            gameSubMode={currentSubMode || 'local_2p'}
            onPlayAgain={() => {
              jungleAudio.playClick();
              // Restart game immediately
              setCurrentMode('playing');
            }}
            onReturnToLobby={() => {
              jungleAudio.playClick();
              setCurrentMode('main_menu');
              setCurrentSubMode(null);
              setWinner(null);
            }}
          />
        )}

        {/* Overlays list */}
        <Modals 
          difficultyModalOpen={difficultyModalOpen}
          roomMatchModalOpen={roomMatchModalOpen}
          joinRoomModalOpen={joinRoomModalOpen}
          onCloseAll={handleCloseAllOverlays}
          onSelectDifficulty={handleSelectDifficulty}
          onCreateRoom={handleCreateRoom}
          onOpenJoinRoom={handleOpenJoinRoom}
          onJoinRoomWithCode={handleJoinWithCode}
        />
      </div>
    </div>
  );
}
