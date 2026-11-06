// Medieval & Classic Chess Engine with Full Rules & AI Solver

export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

export type BoardMatrix = (ChessPiece | null)[][];

export interface ChessMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: ChessPiece;
  captured?: ChessPiece | null;
  isEnPassant?: boolean;
  isCastling?: 'kingside' | 'queenside';
  promotion?: PieceType;
  san?: string;
}

export interface CastlingRights {
  wK: boolean; // White kingside
  wQ: boolean; // White queenside
  bK: boolean; // Black kingside
  bQ: boolean; // Black queenside
}

export interface ChessGameState {
  board: BoardMatrix;
  turn: PieceColor;
  castling: CastlingRights;
  enPassant: { row: number; col: number } | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  history: ChessMove[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  capturedWhite: PieceType[]; // Silver/White pieces captured by Black
  capturedBlack: PieceType[]; // Bronze/Black pieces captured by White
  lastMove: ChessMove | null;
}

// Initial 8x8 Board Setup
export function createInitialBoard(): BoardMatrix {
  const b: BoardMatrix = Array(8).fill(null).map(() => Array(8).fill(null));

  // Black pieces (Rank 8 / Row 0)
  b[0][0] = { type: 'r', color: 'b' };
  b[0][1] = { type: 'n', color: 'b' };
  b[0][2] = { type: 'b', color: 'b' };
  b[0][3] = { type: 'q', color: 'b' };
  b[0][4] = { type: 'k', color: 'b' };
  b[0][5] = { type: 'b', color: 'b' };
  b[0][6] = { type: 'n', color: 'b' };
  b[0][7] = { type: 'r', color: 'b' };

  // Black Pawns (Rank 7 / Row 1)
  for (let c = 0; c < 8; c++) {
    b[1][c] = { type: 'p', color: 'b' };
  }

  // White Pawns (Rank 2 / Row 6)
  for (let c = 0; c < 8; c++) {
    b[6][c] = { type: 'p', color: 'w' };
  }

  // White pieces (Rank 1 / Row 7)
  b[7][0] = { type: 'r', color: 'w' };
  b[7][1] = { type: 'n', color: 'w' };
  b[7][2] = { type: 'b', color: 'w' };
  b[7][3] = { type: 'q', color: 'w' };
  b[7][4] = { type: 'k', color: 'w' };
  b[7][5] = { type: 'b', color: 'w' };
  b[7][6] = { type: 'n', color: 'w' };
  b[7][7] = { type: 'r', color: 'w' };

  return b;
}

export function createInitialGameState(): ChessGameState {
  return {
    board: createInitialBoard(),
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    history: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedWhite: [],
    capturedBlack: [],
    lastMove: null,
  };
}

// Deep clone board
export function cloneBoard(board: BoardMatrix): BoardMatrix {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

// Square helpers: row, col to algebraic "e4", etc.
export function squareToAlgebraic(row: number, col: number): string {
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = String(8 - row);
  return `${file}${rank}`;
}

export function algebraicToSquare(alg: string): { row: number; col: number } | null {
  if (!alg || alg.length < 2) return null;
  const col = alg.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(alg[1], 10);
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  return { row, col };
}

// Check if square is inside board
function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// Find King position
export function findKing(board: BoardMatrix, color: PieceColor): { row: number; col: number } | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

// Check if a square is attacked by opponent
export function isSquareAttacked(
  board: BoardMatrix,
  targetRow: number,
  targetCol: number,
  byColor: PieceColor
): boolean {
  // 1. Pawn attacks
  const pawnDir = byColor === 'w' ? 1 : -1; // White pawns attack up (row-1), so from black's perspective, check row+1
  const enemyPawnRow = targetRow + pawnDir;
  if (enemyPawnRow >= 0 && enemyPawnRow < 8) {
    if (targetCol - 1 >= 0) {
      const p = board[enemyPawnRow][targetCol - 1];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
    if (targetCol + 1 < 8) {
      const p = board[enemyPawnRow][targetCol + 1];
      if (p && p.color === byColor && p.type === 'p') return true;
    }
  }

  // 2. Knight attacks
  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ];
  for (const [dr, dc] of knightOffsets) {
    const r = targetRow + dr;
    const c = targetCol + dc;
    if (inBounds(r, c)) {
      const p = board[r][c];
      if (p && p.color === byColor && p.type === 'n') return true;
    }
  }

  // 3. Orthogonal rays (Rook & Queen)
  const orthoDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of orthoDirs) {
    let r = targetRow + dr;
    let c = targetCol + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // 4. Diagonal rays (Bishop & Queen)
  const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  for (const [dr, dc] of diagDirs) {
    let r = targetRow + dr;
    let c = targetCol + dc;
    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === byColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      r += dr;
      c += dc;
    }
  }

  // 5. King adjacent attack
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = targetRow + dr;
      const c = targetCol + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === 'k') return true;
      }
    }
  }

  return false;
}

// Is King in check?
export function isKingInCheck(board: BoardMatrix, color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kingPos.row, kingPos.col, enemyColor);
}

// Generate Pseudo-legal Moves for a piece at (r, c)
export function getPseudoLegalMoves(
  board: BoardMatrix,
  r: number,
  c: number,
  castling: CastlingRights,
  enPassant: { row: number; col: number } | null
): ChessMove[] {
  const piece = board[r][c];
  if (!piece) return [];
  const moves: ChessMove[] = [];
  const color = piece.color;
  const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';

  // PAWN
  if (piece.type === 'p') {
    const forward = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;

    // 1 square ahead
    const r1 = r + forward;
    if (inBounds(r1, c) && !board[r1][c]) {
      if (r1 === promoRow) {
        ['q', 'r', 'b', 'n'].forEach((pr) => {
          moves.push({
            from: { row: r, col: c },
            to: { row: r1, col: c },
            piece,
            promotion: pr as PieceType,
          });
        });
      } else {
        moves.push({ from: { row: r, col: c }, to: { row: r1, col: c }, piece });
      }

      // 2 squares ahead from initial rank
      const r2 = r + forward * 2;
      if (r === startRow && inBounds(r2, c) && !board[r2][c]) {
        moves.push({ from: { row: r, col: c }, to: { row: r2, col: c }, piece });
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const tc = c + dc;
      if (inBounds(r1, tc)) {
        const target = board[r1][tc];
        if (target && target.color === enemyColor) {
          if (r1 === promoRow) {
            ['q', 'r', 'b', 'n'].forEach((pr) => {
              moves.push({
                from: { row: r, col: c },
                to: { row: r1, col: tc },
                piece,
                captured: target,
                promotion: pr as PieceType,
              });
            });
          } else {
            moves.push({
              from: { row: r, col: c },
              to: { row: r1, col: tc },
              piece,
              captured: target,
            });
          }
        } else if (enPassant && enPassant.row === r1 && enPassant.col === tc) {
          // En Passant
          const capturedPawn = board[r][tc];
          moves.push({
            from: { row: r, col: c },
            to: { row: r1, col: tc },
            piece,
            captured: capturedPawn,
            isEnPassant: true,
          });
        }
      }
    }
  }

  // KNIGHT
  else if (piece.type === 'n') {
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of offsets) {
      const tr = r + dr;
      const tc = c + dc;
      if (inBounds(tr, tc)) {
        const dest = board[tr][tc];
        if (!dest) {
          moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, piece });
        } else if (dest.color === enemyColor) {
          moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, piece, captured: dest });
        }
      }
    }
  }

  // BISHOP & QUEEN (Diagonals)
  if (piece.type === 'b' || piece.type === 'q') {
    const diags = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diags) {
      let tr = r + dr;
      let tc = c + dc;
      while (inBounds(tr, tc)) {
        const dest = board[tr][tc];
        if (!dest) {
          moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, piece });
        } else {
          if (dest.color === enemyColor) {
            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, piece, captured: dest });
          }
          break;
        }
        tr += dr;
        tc += dc;
      }
    }
  }

  // ROOK & QUEEN (Orthogonals)
  if (piece.type === 'r' || piece.type === 'q') {
    const orthos = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of orthos) {
      let tr = r + dr;
      let tc = c + dc;
      while (inBounds(tr, tc)) {
        const dest = board[tr][tc];
        if (!dest) {
          moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, piece });
        } else {
          if (dest.color === enemyColor) {
            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, piece, captured: dest });
          }
          break;
        }
        tr += dr;
        tc += dc;
      }
    }
  }

  // KING
  if (piece.type === 'k') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const tr = r + dr;
        const tc = c + dc;
        if (inBounds(tr, tc)) {
          const dest = board[tr][tc];
          if (!dest) {
            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, piece });
          } else if (dest.color === enemyColor) {
            moves.push({ from: { row: r, col: c }, to: { row: tr, col: tc }, piece, captured: dest });
          }
        }
      }
    }

    // Castling
    if (!isKingInCheck(board, color)) {
      const baseRow = color === 'w' ? 7 : 0;
      if (r === baseRow && c === 4) {
        // Kingside
        const canKingside = color === 'w' ? castling.wK : castling.bK;
        if (
          canKingside &&
          !board[baseRow][5] &&
          !board[baseRow][6] &&
          board[baseRow][7]?.type === 'r' &&
          board[baseRow][7]?.color === color &&
          !isSquareAttacked(board, baseRow, 5, enemyColor) &&
          !isSquareAttacked(board, baseRow, 6, enemyColor)
        ) {
          moves.push({
            from: { row: r, col: 4 },
            to: { row: r, col: 6 },
            piece,
            isCastling: 'kingside',
          });
        }

        // Queenside
        const canQueenside = color === 'w' ? castling.wQ : castling.bQ;
        if (
          canQueenside &&
          !board[baseRow][3] &&
          !board[baseRow][2] &&
          !board[baseRow][1] &&
          board[baseRow][0]?.type === 'r' &&
          board[baseRow][0]?.color === color &&
          !isSquareAttacked(board, baseRow, 3, enemyColor) &&
          !isSquareAttacked(board, baseRow, 2, enemyColor)
        ) {
          moves.push({
            from: { row: r, col: 4 },
            to: { row: r, col: 2 },
            piece,
            isCastling: 'queenside',
          });
        }
      }
    }
  }

  return moves;
}

// Make a simulated move on a board (returns new board)
export function makeSimulatedMove(board: BoardMatrix, move: ChessMove): BoardMatrix {
  const nb = cloneBoard(board);
  const { from, to, piece, isEnPassant, isCastling, promotion } = move;

  nb[from.row][from.col] = null;
  const placedPiece: ChessPiece = promotion
    ? { type: promotion, color: piece.color, hasMoved: true }
    : { ...piece, hasMoved: true };

  nb[to.row][to.col] = placedPiece;

  // Handle En Passant pawn removal
  if (isEnPassant) {
    const capturedPawnRow = piece.color === 'w' ? to.row + 1 : to.row - 1;
    nb[capturedPawnRow][to.col] = null;
  }

  // Handle Castling Rook move
  if (isCastling === 'kingside') {
    const rook = nb[to.row][7];
    nb[to.row][7] = null;
    nb[to.row][5] = rook ? { ...rook, hasMoved: true } : null;
  } else if (isCastling === 'queenside') {
    const rook = nb[to.row][0];
    nb[to.row][0] = null;
    nb[to.row][3] = rook ? { ...rook, hasMoved: true } : null;
  }

  return nb;
}

// Get all strictly legal moves for a specific piece
export function getLegalMovesForSquare(
  gameState: ChessGameState,
  row: number,
  col: number
): ChessMove[] {
  const piece = gameState.board[row][col];
  if (!piece || piece.color !== gameState.turn) return [];

  const pseudo = getPseudoLegalMoves(
    gameState.board,
    row,
    col,
    gameState.castling,
    gameState.enPassant
  );

  return pseudo.filter((m) => {
    const simBoard = makeSimulatedMove(gameState.board, m);
    return !isKingInCheck(simBoard, gameState.turn);
  });
}

// Get all legal moves for the current player
export function getAllLegalMoves(gameState: ChessGameState): ChessMove[] {
  const allMoves: ChessMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = gameState.board[r][c];
      if (p && p.color === gameState.turn) {
        allMoves.push(...getLegalMovesForSquare(gameState, r, c));
      }
    }
  }
  return allMoves;
}

// Format SAN algebraic notation
export function formatSan(gameState: ChessGameState, move: ChessMove): string {
  if (move.isCastling === 'kingside') return 'O-O';
  if (move.isCastling === 'queenside') return 'O-O-O';

  const pieceLetterMap: Record<PieceType, string> = {
    p: '',
    n: 'C', // Cavalo
    b: 'B', // Bispo
    r: 'T', // Torre
    q: 'D', // Dama
    k: 'R', // Rei
  };

  const pLetter = pieceLetterMap[move.piece.type];
  const dest = squareToAlgebraic(move.to.row, move.to.col);
  const isCapture = !!move.captured;

  let san = '';
  if (move.piece.type === 'p') {
    if (isCapture) {
      const fromFile = String.fromCharCode('a'.charCodeAt(0) + move.from.col);
      san = `${fromFile}x${dest}`;
    } else {
      san = dest;
    }
    if (move.promotion) {
      san += `=${pieceLetterMap[move.promotion] || 'D'}`;
    }
  } else {
    san = `${pLetter}${isCapture ? 'x' : ''}${dest}`;
  }

  // Check / Checkmate suffix
  const sim = makeSimulatedMove(gameState.board, move);
  const enemyColor: PieceColor = gameState.turn === 'w' ? 'b' : 'w';
  if (isKingInCheck(sim, enemyColor)) {
    // Check if checkmate
    const tempState: ChessGameState = {
      ...gameState,
      board: sim,
      turn: enemyColor,
    };
    const nextLegal = getAllLegalMoves(tempState);
    if (nextLegal.length === 0) {
      san += '#';
    } else {
      san += '+';
    }
  }

  return san;
}

// Apply Legal Move to Game State
export function applyMove(gameState: ChessGameState, move: ChessMove): ChessGameState {
  const newBoard = makeSimulatedMove(gameState.board, move);
  const nextTurn: PieceColor = gameState.turn === 'w' ? 'b' : 'w';

  // Update Castling rights
  const newCastling: CastlingRights = { ...gameState.castling };
  if (move.piece.type === 'k') {
    if (gameState.turn === 'w') {
      newCastling.wK = false;
      newCastling.wQ = false;
    } else {
      newCastling.bK = false;
      newCastling.bQ = false;
    }
  }
  if (move.piece.type === 'r') {
    if (move.from.row === 7 && move.from.col === 7) newCastling.wK = false;
    if (move.from.row === 7 && move.from.col === 0) newCastling.wQ = false;
    if (move.from.row === 0 && move.from.col === 7) newCastling.bK = false;
    if (move.from.row === 0 && move.from.col === 0) newCastling.bQ = false;
  }

  // If a rook was captured in corner
  if (move.to.row === 7 && move.to.col === 7) newCastling.wK = false;
  if (move.to.row === 7 && move.to.col === 0) newCastling.wQ = false;
  if (move.to.row === 0 && move.to.col === 7) newCastling.bK = false;
  if (move.to.row === 0 && move.to.col === 0) newCastling.bQ = false;

  // En Passant target
  let newEnPassant: { row: number; col: number } | null = null;
  if (move.piece.type === 'p' && Math.abs(move.to.row - move.from.row) === 2) {
    newEnPassant = {
      row: (move.from.row + move.to.row) / 2,
      col: move.from.col,
    };
  }

  // Captured pieces lists
  const capturedWhite = [...gameState.capturedWhite];
  const capturedBlack = [...gameState.capturedBlack];
  if (move.captured) {
    if (move.captured.color === 'w') {
      capturedWhite.push(move.captured.type);
    } else {
      capturedBlack.push(move.captured.type);
    }
  }

  // Generate SAN
  const san = formatSan(gameState, move);
  const moveWithSan: ChessMove = { ...move, san };

  // Next State Check & Mate status
  const tempNextState: ChessGameState = {
    board: newBoard,
    turn: nextTurn,
    castling: newCastling,
    enPassant: newEnPassant,
    halfmoveClock: move.captured || move.piece.type === 'p' ? 0 : gameState.halfmoveClock + 1,
    fullmoveNumber: gameState.turn === 'b' ? gameState.fullmoveNumber + 1 : gameState.fullmoveNumber,
    history: [...gameState.history, moveWithSan],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    capturedWhite,
    capturedBlack,
    lastMove: moveWithSan,
  };

  const inCheck = isKingInCheck(newBoard, nextTurn);
  const nextLegalMoves = getAllLegalMoves(tempNextState);

  const isCheckmate = inCheck && nextLegalMoves.length === 0;
  const isStalemate = !inCheck && nextLegalMoves.length === 0;

  return {
    ...tempNextState,
    isCheck: inCheck,
    isCheckmate,
    isStalemate,
  };
}

// ==========================================
// JARVES CHESS AI ENGINE (MINIMAX + ALPHA-BETA)
// ==========================================

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional bonuses (Piece-Square Tables)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

function evaluateBoard(board: BoardMatrix): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const baseVal = PIECE_VALUES[p.type];
      let positional = 0;

      if (p.type === 'p') {
        positional = p.color === 'w' ? PAWN_PST[r][c] : PAWN_PST[7 - r][c];
      } else if (p.type === 'n') {
        positional = p.color === 'w' ? KNIGHT_PST[r][c] : KNIGHT_PST[7 - r][c];
      }

      const totalVal = baseVal + positional;
      score += p.color === 'w' ? totalVal : -totalVal;
    }
  }
  return score;
}

export type JarvesAiDifficulty = 'easy' | 'medium' | 'hard';

export function getJarvesAiMove(
  gameState: ChessGameState,
  difficulty: JarvesAiDifficulty = 'medium'
): ChessMove | null {
  const legalMoves = getAllLegalMoves(gameState);
  if (legalMoves.length === 0) return null;

  // Level 1: Easy / Casual
  if (difficulty === 'easy') {
    const captures = legalMoves.filter((m) => !!m.captured);
    if (captures.length > 0 && Math.random() < 0.6) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const isWhite = gameState.turn === 'w';
  const enemyColor: PieceColor = isWhite ? 'b' : 'w';

  // Evaluate candidate moves with fast simulated boards
  const scoredCandidates = legalMoves.map((move) => {
    const simBoard = makeSimulatedMove(gameState.board, move);
    let score = evaluateBoard(simBoard);

    // Tactical capture bonus
    if (move.captured) {
      score += (isWhite ? 1 : -1) * (PIECE_VALUES[move.captured.type] * 1.25);
    }

    // Center control bonus (squares d4, e4, d5, e5)
    if ((move.to.row === 3 || move.to.row === 4) && (move.to.col === 3 || move.to.col === 4)) {
      score += isWhite ? 30 : -30;
    }

    // Check bonus
    if (isKingInCheck(simBoard, enemyColor)) {
      score += isWhite ? 60 : -60;
    }

    return { move, simBoard, score };
  });

  // Sort: highest score first for white, lowest first for black
  scoredCandidates.sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));

  // Level 2 (Medium): return top scored move directly (sub-1ms response)
  if (difficulty === 'medium' || scoredCandidates.length <= 1) {
    return scoredCandidates[0].move;
  }

  // Level 3 (Hard): fast 1-ply counter-attack check on top 10 moves
  const topCandidates = scoredCandidates.slice(0, 10);
  let bestMove = topCandidates[0].move;
  let bestScore = isWhite ? -Infinity : Infinity;

  for (const candidate of topCandidates) {
    // Generate opponent responses on this simulated board
    const enemyReplies: ChessMove[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = candidate.simBoard[r][c];
        if (p && p.color === enemyColor) {
          const pseudo = getPseudoLegalMoves(candidate.simBoard, r, c, gameState.castling, null);
          for (const m of pseudo) {
            const nextSim = makeSimulatedMove(candidate.simBoard, m);
            if (!isKingInCheck(nextSim, enemyColor)) {
              enemyReplies.push(m);
            }
          }
        }
      }
    }

    // If opponent has no replies and is in check -> Immediate Checkmate!
    if (enemyReplies.length === 0 && isKingInCheck(candidate.simBoard, enemyColor)) {
      return candidate.move;
    }

    // Sort enemy replies to test most threatening captures first
    enemyReplies.sort((a, b) => {
      const vA = a.captured ? PIECE_VALUES[a.captured.type] : 0;
      const vB = b.captured ? PIECE_VALUES[b.captured.type] : 0;
      return vB - vA;
    });

    let worstCaseScore = candidate.score;
    for (const reply of enemyReplies.slice(0, 6)) {
      const replyBoard = makeSimulatedMove(candidate.simBoard, reply);
      const ev = evaluateBoard(replyBoard);
      if (isWhite) {
        if (ev < worstCaseScore) worstCaseScore = ev;
      } else {
        if (ev > worstCaseScore) worstCaseScore = ev;
      }
    }

    if (isWhite) {
      if (worstCaseScore > bestScore) {
        bestScore = worstCaseScore;
        bestMove = candidate.move;
      }
    } else {
      if (worstCaseScore < bestScore) {
        bestScore = worstCaseScore;
        bestMove = candidate.move;
      }
    }
  }

  return bestMove;
}
