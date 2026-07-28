export type AnimalType = 'elephant' | 'lion' | 'tiger' | 'leopard' | 'wolf' | 'dog' | 'cat' | 'rat';

export interface Piece {
  id: string;
  type: AnimalType;
  owner: 'player1' | 'player2'; // player1 = green team, player2 = gold/red team
  rank: number; // 1 = rat, 8 = elephant
}

export interface Position {
  row: number; // 0 to 8
  col: number; // 0 to 6
}

export type BoardCell = Piece | null;

export type Board = BoardCell[][];

export type GameMode = 'main_menu' | 'mode_select' | 'playing' | 'game_over' | 'create_room' | 'loading';

export type GameSubMode = 'local_2p' | 'vs_ai' | 'room_match';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameSettings {
  soundEnabled: boolean;
  playerName: string;
  aiDifficulty: Difficulty;
}

export interface GameStats {
  stepsCount: number;
  timeSpent: number; // in seconds
  rankedPointsAdded: number;
  xp: number;
  diamonds: number;
  bills: number;
}
