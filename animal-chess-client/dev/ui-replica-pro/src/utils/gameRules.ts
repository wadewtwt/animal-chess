import { Board, BoardCell, Piece, Position, AnimalType, Difficulty } from '../types';

export const BOARD_ROWS = 9;
export const BOARD_COLS = 7;

// Trap positions
export const TRAPS = [
  // Top side (Player 2 - Gold Team) traps
  { row: 0, col: 2, owner: 'player2' },
  { row: 0, col: 4, owner: 'player2' },
  { row: 1, col: 3, owner: 'player2' },
  // Bottom side (Player 1 - Green Team) traps
  { row: 8, col: 2, owner: 'player1' },
  { row: 8, col: 4, owner: 'player1' },
  { row: 7, col: 3, owner: 'player1' },
];

// Den positions
export const DENS = {
  player2: { row: 0, col: 3 }, // Top player's den
  player1: { row: 8, col: 3 }, // Bottom player's den
};

// River definitions
// Columns 1, 2 and 4, 5 in rows 3, 4, 5 are water
export function isRiver(row: number, col: number): boolean {
  const insideRows = row >= 3 && row <= 5;
  const leftRiverCols = col === 1 || col === 2;
  const rightRiverCols = col === 4 || col === 5;
  return insideRows && (leftRiverCols || rightRiverCols);
}

// Check if cell is a trap on opponent's side
export function getTrapOwner(row: number, col: number): 'player1' | 'player2' | null {
  const found = TRAPS.find(t => t.row === row && t.col === col);
  return found ? (found.owner as 'player1' | 'player2') : null;
}

// Create initial board setup
export function createInitialBoard(): Board {
  const board: Board = Array(BOARD_ROWS)
    .fill(null)
    .map(() => Array(BOARD_COLS).fill(null));

  // Helper code to create pieces
  const p = (id: string, type: AnimalType, owner: 'player1' | 'player2', rank: number): Piece => ({
    id,
    type,
    owner,
    rank,
  });

  // Player 2 Pieces (Top side, starts row 0..2)
  board[0][0] = p('p2_lion', 'lion', 'player2', 7);
  board[0][6] = p('p2_tiger', 'tiger', 'player2', 6);
  board[1][1] = p('p2_dog', 'dog', 'player2', 3);
  board[1][5] = p('p2_cat', 'cat', 'player2', 2);
  board[2][0] = p('p2_rat', 'rat', 'player2', 1);
  board[2][2] = p('p2_leopard', 'leopard', 'player2', 5);
  board[2][4] = p('p2_wolf', 'wolf', 'player2', 4);
  board[2][6] = p('p2_elephant', 'elephant', 'player2', 8);

  // Player 1 Pieces (Bottom side, starts row 6..8)
  board[8][0] = p('p1_tiger', 'tiger', 'player1', 6);
  board[8][6] = p('p1_lion', 'lion', 'player1', 7);
  board[7][1] = p('p1_cat', 'cat', 'player1', 2);
  board[7][5] = p('p1_dog', 'dog', 'player1', 3);
  board[6][0] = p('p1_elephant', 'elephant', 'player1', 8);
  board[6][2] = p('p1_wolf', 'wolf', 'player1', 4);
  board[6][4] = p('p1_leopard', 'leopard', 'player1', 5);
  board[6][6] = p('p1_rat', 'rat', 'player1', 1);

  return board;
}

// Check standard movement validation
export function isValidMove(
  board: Board,
  from: Position,
  to: Position,
  playerTurn: 'player1' | 'player2'
): boolean {
  // 1. Boundaries Check
  if (to.row < 0 || to.row >= BOARD_ROWS || to.col < 0 || to.col >= BOARD_COLS) return false;

  const piece = board[from.row][from.col];
  if (!piece || piece.owner !== playerTurn) return false;

  // 2. Cannot enter own Den
  const ownDen = DENS[playerTurn];
  if (to.row === ownDen.row && to.col === ownDen.col) return false;

  // 3. Simple distance check: standard animal chess pieces can only move 1 square up, down, left, or right unless jump rules apply
  const rDiff = to.row - from.row;
  const cDiff = to.col - from.col;
  const rAbs = Math.abs(rDiff);
  const cAbs = Math.abs(cDiff);

  // Friendly cell capture block
  const targetCell = board[to.row][to.col];
  if (targetCell && targetCell.owner === playerTurn) return false;

  const fromRiver = isRiver(from.row, from.col);
  const toRiver = isRiver(to.row, to.col);

  // --- SPECIAL MOVES REGULATION ---

  // A. Rat River Logic
  if (piece.type === 'rat') {
    // Rats can only move 1 step orthogonal
    if (!((rAbs === 1 && cAbs === 0) || (rAbs === 0 && cAbs === 1))) return false;

    // Rat entering river is allowed. Rat capturing from river to land:
    // Rat in river cannot capture an opponent on land (even Elephant or other Rat).
    if (fromRiver && !toRiver && targetCell) {
      return false; // Cannot capture land pieces from the river
    }

    // Capture logic for Rat
    if (targetCell) {
      return canCapture(piece, targetCell, false, to.row, to.col);
    }
    return true;
  }

  // B. Tiger & Lion River Jump Logic
  const canJump = piece.type === 'tiger' || piece.type === 'lion';
  if (canJump && !fromRiver) {
    // If attempting a multi-square jump across water:
    if (rAbs > 1 || cAbs > 1) {
      if (rAbs > 0 && cAbs > 0) return false; // Diagonal movement is completely banned

      // Jump horizontally over river
      if (rDiff === 0 && cAbs === 3) {
        // Must cross a river column
        const midCols = [from.col + Math.sign(cDiff), from.col + 2 * Math.sign(cDiff)];
        // Check if all crossed cells are river AND there is no Rat in them
        const isPathWater = midCols.every(c => isRiver(from.row, c));
        const isPathBlocked = midCols.some(c => board[from.row][c] !== null);
        if (isPathWater && !isPathBlocked) {
          if (targetCell) return canCapture(piece, targetCell, false, to.row, to.col);
          return true;
        }
      }

      // Jump vertically over river
      if (cDiff === 0 && rAbs === 4) {
        const midRows = [
          from.row + Math.sign(rDiff),
          from.row + 2 * Math.sign(rDiff),
          from.row + 3 * Math.sign(rDiff),
        ];
        const isPathWater = midRows.every(r => isRiver(r, from.col));
        const isPathBlocked = midRows.some(r => board[r][from.col] !== null);
        if (isPathWater && !isPathBlocked) {
          if (targetCell) return canCapture(piece, targetCell, false, to.row, to.col);
          return true;
        }
      }

      return false; // Jump constraints failed
    }
  }

  // C. Normal 1-step moves for other beasts
  if (!((rAbs === 1 && cAbs === 0) || (rAbs === 0 && cAbs === 1))) return false;

  // Normal animals can never enter the river
  if (toRiver) return false;

  // Capture evaluation
  if (targetCell) {
    // Is target in opponent's trap?
    const targetTrapOwner = getTrapOwner(to.row, to.col);
    const targetIsInOpponentTrap = targetTrapOwner !== null && targetTrapOwner !== targetCell.owner;
    return canCapture(piece, targetCell, targetIsInOpponentTrap, to.row, to.col);
  }

  return true;
}

// Rules for standard captures
export function canCapture(
  attacker: Piece,
  defender: Piece,
  defenderInOwnTrap: boolean,
  defRow: number,
  defCol: number
): boolean {
  // If defender is trapped on opponent's cell, its rank drops to 0, making it fully vulnerable
  const trapOwner = getTrapOwner(defRow, defCol);
  const isTrapped = trapOwner !== null && trapOwner === defender.owner; // trap owner is matching defender's opponent (i.e. defender is trapped in opponent's trap)

  if (isTrapped || defenderInOwnTrap) {
    return true; // Any attacker can capture a trapped animal!
  }

  // Rat vs Elephant exception
  if (attacker.type === 'rat' && defender.type === 'elephant') {
    return true; // Rat defeats Elephant
  }
  if (attacker.type === 'elephant' && defender.type === 'rat') {
    return false; // Elephant cannot capture the Rat
  }

  // Rank Comparison: equal or higher captures lower
  return attacker.rank >= defender.rank;
}

// Get all legal target coordinates for a cell
export function getValidMoves(board: Board, pos: Position, playerTurn: 'player1' | 'player2'): Position[] {
  const list: Position[] = [];
  const piece = board[pos.row][pos.col];
  if (!piece || piece.owner !== playerTurn) return list;

  // We check orthogonal jumps or actions within a range boundary
  const directions = [
    { r: -1, c: 0 },
    { r: 1, c: 0 },
    { r: 0, c: -1 },
    { r: 0, c: 1 },
    // Tiger/Lion jump potentials
    { r: -4, c: 0 },
    { r: 4, c: 0 },
    { r: 0, c: -3 },
    { r: 0, c: 3 },
  ];

  for (const dir of directions) {
    const to = { row: pos.row + dir.r, col: pos.col + dir.c };
    if (isValidMove(board, pos, to, playerTurn)) {
      list.push(to);
    }
  }

  return list;
}

// Check who won
export function getWinner(board: Board): 'player1' | 'player2' | null {
  // Victory type A: Opponent enters Player Den
  const blueInP1Den = board[DENS.player1.row][DENS.player1.col];
  if (blueInP1Den && blueInP1Den.owner === 'player2') return 'player2';

  const redInP2Den = board[DENS.player2.row][DENS.player2.col];
  if (redInP2Den && redInP2Den.owner === 'player1') return 'player1';

  // Victory type B: Complete wipeout of pieces
  let p1Pieces = 0;
  let p2Pieces = 0;

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const piece = board[r][c];
      if (piece) {
        if (piece.owner === 'player1') p1Pieces++;
        else p2Pieces++;
      }
    }
  }

  if (p1Pieces === 0) return 'player2';
  if (p2Pieces === 0) return 'player1';

  return null;
}

// Check if player has no legal moves left
export function hasNoLegalMoves(board: Board, player: 'player1' | 'player2'): boolean {
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = board[r][c];
      if (cell && cell.owner === player) {
        if (getValidMoves(board, { row: r, col: c }, player).length > 0) {
          return false;
        }
      }
    }
  }
  return true;
}

// Evaluation heuristic for building the AI
function evaluateBoard(board: Board, aiPlayer: 'player1' | 'player2'): number {
  let score = 0;
  const oppPlayer = aiPlayer === 'player1' ? 'player2' : 'player1';

  // Weights
  const PIECE_WEIGHTS: Record<AnimalType, number> = {
    rat: 110,
    cat: 150,
    dog: 200,
    wolf: 300,
    leopard: 400,
    tiger: 750,
    lion: 850,
    elephant: 1000,
  };

  const aiDen = DENS[aiPlayer];
  const oppDen = DENS[oppPlayer];

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const p = board[r][c];
      if (!p) continue;

      const isAI = p.owner === aiPlayer;
      const baseValue = PIECE_WEIGHTS[p.type];

      // Proximity to opponent's den is highly rewarded
      const distToOppDen = Math.abs(r - oppDen.row) + Math.abs(c - oppDen.col);
      const proximityBonus = (16 - distToOppDen) * 15;

      const delta = baseValue + proximityBonus;

      if (isAI) {
        score += delta;
      } else {
        score -= delta;
      }
    }
  }

  return score;
}

// Minimax with Alpha-Beta Pruning for AI moves
export function findBestMoveAI(
  board: Board,
  difficulty: Difficulty,
  aiPlayer: 'player1' | 'player2'
): { from: Position; to: Position } | null {
  const isMax = true;
  let maxDepth = 1; // Easy

  if (difficulty === 'medium') maxDepth = 2;
  else if (difficulty === 'hard') maxDepth = 3;

  let bestMove: { from: Position; to: Position } | null = null;
  let bestScore = -Infinity;

  // Gather all valid moves
  const availableMoves: { from: Position; to: Position }[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = board[r][c];
      if (cell && cell.owner === aiPlayer) {
        const moves = getValidMoves(board, { row: r, col: c }, aiPlayer);
        for (const target of moves) {
          availableMoves.push({ from: { row: r, col: c }, to: target });
        }
      }
    }
  }

  if (availableMoves.length === 0) return null;

  // Simple Mode: random with high capturing bias
  if (difficulty === 'easy') {
    const capturingMoves = availableMoves.filter(m => board[m.to.row][m.to.col] !== null);
    if (capturingMoves.length > 0 && Math.random() < 0.75) {
      return capturingMoves[Math.floor(Math.random() * capturingMoves.length)];
    }
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  // Alpha Beta Pruning lookahead
  function minimax(
    tempBoard: Board,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean
  ): number {
    const winner = getWinner(tempBoard);
    if (winner === aiPlayer) return 10000 + depth;
    if (winner && winner !== aiPlayer) return -10000 - depth;
    if (depth === 0) return evaluateBoard(tempBoard, aiPlayer);

    const activePlayer = maximizing ? aiPlayer : (aiPlayer === 'player1' ? 'player2' : 'player1');

    // Collect moves
    const currentMoves: { from: Position; to: Position }[] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = tempBoard[r][c];
        if (cell && cell.owner === activePlayer) {
          const moves = getValidMoves(tempBoard, { row: r, col: c }, activePlayer);
          for (const target of moves) {
            currentMoves.push({ from: { row: r, col: c }, to: target });
          }
        }
      }
    }

    if (currentMoves.length === 0) {
      return maximizing ? -9000 : 9000;
    }

    if (maximizing) {
      let maxEval = -Infinity;
      for (const move of currentMoves) {
        // Apply Move
        const nextBoard = cloneBoard(tempBoard);
        nextBoard[move.to.row][move.to.col] = nextBoard[move.from.row][move.from.col];
        nextBoard[move.from.row][move.from.col] = null;

        const evaluation = minimax(nextBoard, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of currentMoves) {
        const nextBoard = cloneBoard(tempBoard);
        nextBoard[move.to.row][move.to.col] = nextBoard[move.from.row][move.from.col];
        nextBoard[move.from.row][move.from.col] = null;

        const evaluation = minimax(nextBoard, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // Iterate top level moves
  const alpha = -Infinity;
  const beta = Infinity;

  // Shuffle available moves to add unpredictability between same-weight moves
  const shuffledMoves = [...availableMoves].sort(() => Math.random() - 0.5);

  for (const move of shuffledMoves) {
    const nextBoard = cloneBoard(board);
    nextBoard[move.to.row][move.to.col] = nextBoard[move.from.row][move.from.col];
    nextBoard[move.from.row][move.from.col] = null;

    const score = minimax(nextBoard, maxDepth - 1, alpha, beta, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove || shuffledMoves[0];
}

// Clone helper
export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
}
