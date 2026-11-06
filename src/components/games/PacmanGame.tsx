import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { retroAudio } from './retroAudio';
import { pollActiveGamepad, triggerGamepadVibration } from './gamepadController';

interface PacmanGameProps {
  onScoreUpdate?: (score: number) => void;
}

// Direction type
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'NONE';

// Maze Tile Types:
// 1 = Wall (Neon Blue)
// 2 = Dot (Pellet, 10pts)
// 3 = Power Pellet (Energizer, 50pts)
// 0 = Empty Path
// 4 = Ghost Pen / Gate
const BASE_MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 3, 1],
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1],
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 2, 1, 1, 1, 0, 1, 0, 1, 1, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 4, 1, 1, 0, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 0],
  [1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1],
  [0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
  [1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 2, 1],
  [1, 3, 2, 1, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 1, 2, 3, 1],
  [1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1],
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

interface Ghost {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  dir: Direction;
  targetX: number;
  targetY: number;
  speed: number;
  frightened: boolean;
  frightenedTimer: number;
  isDead: boolean;
}

export const PacmanGame: React.FC<PacmanGameProps> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('JARVES_PACMAN_HIGH');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 25400 : parsed;
      }
      return 25400;
    } catch {
      return 25400;
    }
  });
  const [lives, setLives] = useState<number>(3);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(retroAudio.getMuted());

  // Grid dimensions
  const CELL_SIZE = 26;
  const COLS = BASE_MAP[0].length; // 19
  const ROWS = BASE_MAP.length;    // 22
  const CANVAS_WIDTH = COLS * CELL_SIZE;  // 494
  const CANVAS_HEIGHT = ROWS * CELL_SIZE + 40; // 572 + bottom padding

  // Mutable Game Refs
  const mazeRef = useRef<number[][]>([]);
  const dotsRemainingRef = useRef<number>(0);

  // Pac-Man state
  const pacmanRef = useRef({
    x: 9 * CELL_SIZE + CELL_SIZE / 2,
    y: 16 * CELL_SIZE + CELL_SIZE / 2,
    gridX: 9,
    gridY: 16,
    dir: 'NONE' as Direction,
    nextDir: 'NONE' as Direction,
    speed: 2.2,
    mouthAngle: 0.2,
    mouthDir: 1,
    radius: 11,
  });

  // Cherries bonus
  const cherryRef = useRef<{ active: boolean; x: number; y: number; timer: number }>({
    active: false,
    x: 9 * CELL_SIZE + CELL_SIZE / 2,
    y: 12 * CELL_SIZE + CELL_SIZE / 2,
    timer: 0,
  });

  // Ghosts state
  const ghostsRef = useRef<Ghost[]>([]);
  const prevGpStartRef = useRef<boolean>(false);

  // Init maze & entities
  const initGame = useCallback(() => {
    // Deep clone maze
    let dots = 0;
    const clone = BASE_MAP.map((row) =>
      row.map((tile) => {
        if (tile === 2 || tile === 3) dots++;
        return tile;
      })
    );
    mazeRef.current = clone;
    dotsRemainingRef.current = dots;

    // Reset Pac-Man
    pacmanRef.current.x = 9 * CELL_SIZE + CELL_SIZE / 2;
    pacmanRef.current.y = 16 * CELL_SIZE + CELL_SIZE / 2;
    pacmanRef.current.dir = 'NONE';
    pacmanRef.current.nextDir = 'NONE';

    // 4 Ghosts matching the user's reference image!
    ghostsRef.current = [
      {
        id: 'blinky',
        name: 'Blinky',
        color: '#FF0000', // Red
        x: 9 * CELL_SIZE + CELL_SIZE / 2,
        y: 8 * CELL_SIZE + CELL_SIZE / 2,
        dir: 'LEFT',
        targetX: 0,
        targetY: 0,
        speed: 1.8,
        frightened: false,
        frightenedTimer: 0,
        isDead: false,
      },
      {
        id: 'pinky',
        name: 'Pinky',
        color: '#FFB8FF', // Pink
        x: 8 * CELL_SIZE + CELL_SIZE / 2,
        y: 10 * CELL_SIZE + CELL_SIZE / 2,
        dir: 'UP',
        targetX: 0,
        targetY: 0,
        speed: 1.7,
        frightened: false,
        frightenedTimer: 0,
        isDead: false,
      },
      {
        id: 'inky',
        name: 'Inky',
        color: '#00F0FF', // Cyan / Light Blue
        x: 9 * CELL_SIZE + CELL_SIZE / 2,
        y: 10 * CELL_SIZE + CELL_SIZE / 2,
        dir: 'RIGHT',
        targetX: 0,
        targetY: 0,
        speed: 1.6,
        frightened: false,
        frightenedTimer: 0,
        isDead: false,
      },
      {
        id: 'clyde',
        name: 'Clyde',
        color: '#FFA500', // Orange
        x: 10 * CELL_SIZE + CELL_SIZE / 2,
        y: 10 * CELL_SIZE + CELL_SIZE / 2,
        dir: 'UP',
        targetX: 0,
        targetY: 0,
        speed: 1.5,
        frightened: false,
        frightenedTimer: 0,
        isDead: false,
      },
    ];

    cherryRef.current = {
      active: true,
      x: 9 * CELL_SIZE + CELL_SIZE / 2,
      y: 12 * CELL_SIZE + CELL_SIZE / 2,
      timer: 800,
    };
  }, [CELL_SIZE]);

  // Start game
  const startGame = () => {
    setScore(0);
    setLives(3);
    setGameState('playing');
    initGame();
    retroAudio.playStartJingle();
  };

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.code || e.key;
      if (['ArrowUp', 'KeyW', 'w', 'W'].includes(key)) {
        pacmanRef.current.nextDir = 'UP';
        e.preventDefault();
      } else if (['ArrowDown', 'KeyS', 's', 'S'].includes(key)) {
        pacmanRef.current.nextDir = 'DOWN';
        e.preventDefault();
      } else if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(key)) {
        pacmanRef.current.nextDir = 'LEFT';
        e.preventDefault();
      } else if (['ArrowRight', 'KeyD', 'd', 'D'].includes(key)) {
        pacmanRef.current.nextDir = 'RIGHT';
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Movement & Collision Helper functions
  const isWall = (gridX: number, gridY: number): boolean => {
    if (gridX < 0 || gridX >= COLS) return false; // wrap tunnel
    if (gridY < 0 || gridY >= ROWS) return true;
    const tile = mazeRef.current[gridY]?.[gridX];
    return tile === 1 || tile === 4;
  };

  const canMove = (x: number, y: number, dir: Direction): boolean => {
    let nextGridX = Math.floor(x / CELL_SIZE);
    let nextGridY = Math.floor(y / CELL_SIZE);

    if (dir === 'UP') nextGridY--;
    if (dir === 'DOWN') nextGridY++;
    if (dir === 'LEFT') nextGridX--;
    if (dir === 'RIGHT') nextGridX++;

    return !isWall(nextGridX, nextGridY);
  };

  // Main Canvas Render & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let animId: number;

    const loop = () => {
      if (!isRunning) return;

      // Poll connected Gamepad / Joystick
      const gp = pollActiveGamepad();

      if (gameState !== 'playing') {
        // Start or restart game on joystick START or action buttons (X / Circle / Square / Triangle)
        if ((gp.start || gp.buttonSouth || gp.shoot) && !prevGpStartRef.current) {
          prevGpStartRef.current = true;
          startGame();
        }
      }
      if (!gp.start && !gp.buttonSouth && !gp.shoot) {
        prevGpStartRef.current = false;
      }

      // 1. UPDATE PHYSICS
      if (gameState === 'playing') {
        const pacman = pacmanRef.current;

        // Joystick directional steering (Supports D-Pad AND Left Analog Stick)
        if (gp.left || gp.right || gp.up || gp.down) {
          const absX = Math.abs(gp.axes[0]);
          const absY = Math.abs(gp.axes[1]);

          if (gp.dpadUp) pacman.nextDir = 'UP';
          else if (gp.dpadDown) pacman.nextDir = 'DOWN';
          else if (gp.dpadLeft) pacman.nextDir = 'LEFT';
          else if (gp.dpadRight) pacman.nextDir = 'RIGHT';
          else if (absX > absY) {
            if (gp.left) pacman.nextDir = 'LEFT';
            else if (gp.right) pacman.nextDir = 'RIGHT';
          } else {
            if (gp.up) pacman.nextDir = 'UP';
            else if (gp.down) pacman.nextDir = 'DOWN';
          }
        }

        // Try to turn if nextDir is aligned with tile center
        const tileCenterX = Math.floor(pacman.x / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
        const tileCenterY = Math.floor(pacman.y / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
        const distToCenter = Math.hypot(pacman.x - tileCenterX, pacman.y - tileCenterY);

        if (pacman.nextDir !== 'NONE' && distToCenter < 5) {
          if (canMove(tileCenterX, tileCenterY, pacman.nextDir)) {
            pacman.x = tileCenterX;
            pacman.y = tileCenterY;
            pacman.dir = pacman.nextDir;
            pacman.nextDir = 'NONE';
          }
        }

        // Move Pac-Man if path is clear
        if (pacman.dir !== 'NONE') {
          let nextX = pacman.x;
          let nextY = pacman.y;

          if (pacman.dir === 'UP') nextY -= pacman.speed;
          if (pacman.dir === 'DOWN') nextY += pacman.speed;
          if (pacman.dir === 'LEFT') nextX -= pacman.speed;
          if (pacman.dir === 'RIGHT') nextX += pacman.speed;

          // Check tunnel wrap-around (left-right exits)
          if (nextX < 0) nextX = CANVAS_WIDTH - 2;
          if (nextX > CANVAS_WIDTH) nextX = 2;

          const currentGridX = Math.floor(nextX / CELL_SIZE);
          const currentGridY = Math.floor(nextY / CELL_SIZE);

          // Wall collision check
          const wallAhead = isWall(currentGridX, currentGridY);
          if (!wallAhead) {
            pacman.x = nextX;
            pacman.y = nextY;

            // Animate mouth
            pacman.mouthAngle += 0.04 * pacman.mouthDir;
            if (pacman.mouthAngle >= 0.45 || pacman.mouthAngle <= 0.02) {
              pacman.mouthDir *= -1;
            }

            // Eat Dot / Pellet
            const tile = mazeRef.current[currentGridY]?.[currentGridX];
            if (tile === 2) {
              mazeRef.current[currentGridY][currentGridX] = 0;
              dotsRemainingRef.current--;
              retroAudio.playWaka();

              setScore((s) => {
                const nextS = s + 10;
                if (nextS > highScore) {
                  setHighScore(nextS);
                  try {
                    localStorage.setItem('JARVES_PACMAN_HIGH', nextS.toString());
                  } catch {}
                }
                if (onScoreUpdate) onScoreUpdate(nextS);
                return nextS;
              });
            } else if (tile === 3) {
              // Power Pellet / Energizer!
              mazeRef.current[currentGridY][currentGridX] = 0;
              dotsRemainingRef.current--;
              retroAudio.playWaka();
              triggerGamepadVibration(120, 0.45, 0.35);

              // Frighten all non-dead ghosts for 350 frames (~7 seconds)
              ghostsRef.current.forEach((g) => {
                if (!g.isDead) {
                  g.frightened = true;
                  g.frightenedTimer = 350;
                }
              });

              setScore((s) => {
                const nextS = s + 50;
                if (nextS > highScore) {
                  setHighScore(nextS);
                  try {
                    localStorage.setItem('JARVES_PACMAN_HIGH', nextS.toString());
                  } catch {}
                }
                return nextS;
              });
            }

            // Check if all dots eaten
            if (dotsRemainingRef.current <= 0) {
              setGameState('victory');
              retroAudio.playStartJingle();
              triggerGamepadVibration(300, 0.6, 0.7);
            }
          }
        }

        // Eat Cherry Fruit
        const cherry = cherryRef.current;
        if (cherry.active) {
          cherry.timer--;
          if (cherry.timer <= 0) cherry.active = false;

          const distToCherry = Math.hypot(pacman.x - cherry.x, pacman.y - cherry.y);
          if (distToCherry < CELL_SIZE * 0.8) {
            cherry.active = false;
            retroAudio.playCherryBonus();
            setScore((s) => s + 100);
          }
        }

        // Update Ghosts
        for (const ghost of ghostsRef.current) {
          // Timer countdown for frightened state
          if (ghost.frightened) {
            ghost.frightenedTimer--;
            if (ghost.frightenedTimer <= 0) {
              ghost.frightened = false;
            }
          }

          // Simple AI path navigation
          const gTileCenterX = Math.floor(ghost.x / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
          const gTileCenterY = Math.floor(ghost.y / CELL_SIZE) * CELL_SIZE + CELL_SIZE / 2;
          const distToGCenter = Math.hypot(ghost.x - gTileCenterX, ghost.y - gTileCenterY);

          if (distToGCenter < 3) {
            // At an intersection: pick best valid direction towards target or random
            const possibleDirs: Direction[] = [];
            const curGridX = Math.floor(ghost.x / CELL_SIZE);
            const curGridY = Math.floor(ghost.y / CELL_SIZE);

            if (ghost.dir !== 'DOWN' && !isWall(curGridX, curGridY - 1)) possibleDirs.push('UP');
            if (ghost.dir !== 'UP' && !isWall(curGridX, curGridY + 1)) possibleDirs.push('DOWN');
            if (ghost.dir !== 'RIGHT' && !isWall(curGridX - 1, curGridY)) possibleDirs.push('LEFT');
            if (ghost.dir !== 'LEFT' && !isWall(curGridX + 1, curGridY)) possibleDirs.push('RIGHT');

            if (possibleDirs.length > 0) {
              if (ghost.frightened) {
                // Random turn when frightened
                ghost.dir = possibleDirs[Math.floor(Math.random() * possibleDirs.length)];
              } else {
                // Chase Pac-Man loosely
                let bestDir = possibleDirs[0];
                let minDist = Infinity;
                for (const d of possibleDirs) {
                  let testX = curGridX;
                  let testY = curGridY;
                  if (d === 'UP') testY--;
                  if (d === 'DOWN') testY++;
                  if (d === 'LEFT') testX--;
                  if (d === 'RIGHT') testX++;

                  const targetX = pacman.x / CELL_SIZE;
                  const targetY = pacman.y / CELL_SIZE;
                  const dist = Math.hypot(testX - targetX, testY - targetY);
                  if (dist < minDist) {
                    minDist = dist;
                    bestDir = d;
                  }
                }
                ghost.dir = bestDir;
              }
            }
          }

          // Move ghost
          const currentSpeed = ghost.frightened ? ghost.speed * 0.65 : ghost.speed;
          if (ghost.dir === 'UP') ghost.y -= currentSpeed;
          if (ghost.dir === 'DOWN') ghost.y += currentSpeed;
          if (ghost.dir === 'LEFT') ghost.x -= currentSpeed;
          if (ghost.dir === 'RIGHT') ghost.x += currentSpeed;

          // Ghost Collision with Pac-Man
          const distToPacman = Math.hypot(ghost.x - pacman.x, ghost.y - pacman.y);
          if (distToPacman < CELL_SIZE * 0.75) {
            if (ghost.frightened) {
              // Pac-Man eats ghost!
              ghost.frightened = false;
              ghost.frightenedTimer = 0;
              ghost.x = 9 * CELL_SIZE + CELL_SIZE / 2;
              ghost.y = 10 * CELL_SIZE + CELL_SIZE / 2;
              retroAudio.playEatGhost();
              triggerGamepadVibration(180, 0.7, 0.8);
              setScore((s) => s + 200);
            } else {
              // Pac-Man is caught by ghost!
              retroAudio.playPacmanDeath();
              triggerGamepadVibration(350, 0.9, 1.0);
              setLives((prev) => {
                const nextLives = prev - 1;
                if (nextLives <= 0) {
                  setGameState('gameover');
                } else {
                  // Reset positions
                  pacman.x = 9 * CELL_SIZE + CELL_SIZE / 2;
                  pacman.y = 16 * CELL_SIZE + CELL_SIZE / 2;
                  pacman.dir = 'NONE';
                  pacman.nextDir = 'NONE';
                }
                return nextLives;
              });
            }
          }
        }
      }

      // 2. RENDER GRAPHICS
      // Black arcade background
      ctx.fillStyle = '#020408';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Top Score HUD
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText('1UP', 30, 18);
      ctx.fillText('HIGH SCORE', CANVAS_WIDTH / 2 - 40, 18);

      ctx.fillStyle = '#FFE600';
      ctx.fillText(score.toString().padStart(5, '0'), 30, 32);
      ctx.fillStyle = '#00F0FF';
      ctx.fillText(highScore.toString().padStart(5, '0'), CANVAS_WIDTH / 2 - 40, 32);

      // Render Labyrinth Maze (Neon Blue Borders like the reference image!)
      const mazeYOffset = 40;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = mazeRef.current[r]?.[c];
          const x = c * CELL_SIZE;
          const y = r * CELL_SIZE + mazeYOffset;

          if (tile === 1) {
            // Neon Blue Wall with glowing border
            ctx.strokeStyle = '#0055FF';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#0033CC';
            ctx.shadowBlur = 4;
            ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
            ctx.shadowBlur = 0;
          } else if (tile === 2) {
            // Regular Dot / Pellet
            ctx.fillStyle = '#FFDDAA';
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === 3) {
            // Power Pellet (Pulsing flashing large circle)
            const pulse = (Math.sin(Date.now() / 150) + 1) * 2;
            ctx.fillStyle = '#FFE4B5';
            ctx.beginPath();
            ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 5 + pulse, 0, Math.PI * 2);
            ctx.fill();
          } else if (tile === 4) {
            // Ghost house gate
            ctx.strokeStyle = '#FFB8DE';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x, y + CELL_SIZE / 2);
            ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE / 2);
            ctx.stroke();
          }
        }
      }

      // Draw Bonus Cherry Fruit (Identical to the uploaded reference image at bottom!)
      const cherry = cherryRef.current;
      if (cherry.active) {
        const cx = cherry.x;
        const cy = cherry.y + mazeYOffset;

        ctx.save();
        // Green dual stems
        ctx.strokeStyle = '#22C55E';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.quadraticCurveTo(cx - 3, cy - 2, cx - 6, cy + 2);
        ctx.moveTo(cx, cy - 8);
        ctx.quadraticCurveTo(cx + 3, cy - 2, cx + 6, cy + 2);
        ctx.stroke();

        // Dual Red Cherries
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(cx - 6, cy + 4, 5, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy + 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // White shine
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - 8, cy + 2, 2, 2);
        ctx.fillRect(cx + 4, cy + 2, 2, 2);
        ctx.restore();
      }

      // Draw Pac-Man
      const pacman = pacmanRef.current;
      ctx.save();
      const px = pacman.x;
      const py = pacman.y + mazeYOffset;

      ctx.fillStyle = '#FFE600'; // Pure bright yellow
      ctx.beginPath();

      // Mouth rotation angle based on direction
      let baseAngle = 0;
      if (pacman.dir === 'RIGHT' || pacman.dir === 'NONE') baseAngle = 0;
      if (pacman.dir === 'DOWN') baseAngle = Math.PI * 0.5;
      if (pacman.dir === 'LEFT') baseAngle = Math.PI;
      if (pacman.dir === 'UP') baseAngle = Math.PI * 1.5;

      const mouthStart = baseAngle + pacman.mouthAngle;
      const mouthEnd = baseAngle + (Math.PI * 2 - pacman.mouthAngle);

      ctx.arc(px, py, pacman.radius, mouthStart, mouthEnd, false);
      ctx.lineTo(px, py);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Draw Ghosts (Blinky, Inky, Clyde, Pinky - exact colors from image!)
      for (const ghost of ghostsRef.current) {
        ctx.save();
        const gx = ghost.x;
        const gy = ghost.y + mazeYOffset;
        const r = 11;

        // Ghost body color (or dark blue if frightened)
        ctx.fillStyle = ghost.frightened
          ? ghost.frightenedTimer < 70 && Math.floor(Date.now() / 120) % 2 === 0
            ? '#FFFFFF' // Flashing white near end of frightened time
            : '#1E40AF' // Deep frightened blue
          : ghost.color;

        // Top dome
        ctx.beginPath();
        ctx.arc(gx, gy - 2, r, Math.PI, 0, false);
        // Bottom wavy skirt
        ctx.lineTo(gx + r, gy + r - 2);
        ctx.lineTo(gx + r * 0.5, gy + r - 6);
        ctx.lineTo(gx, gy + r - 2);
        ctx.lineTo(gx - r * 0.5, gy + r - 6);
        ctx.lineTo(gx - r, gy + r - 2);
        ctx.closePath();
        ctx.fill();

        // Eyes (White circles with blue pupils looking in ghost's direction)
        if (!ghost.frightened) {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(gx - 4, gy - 4, 3.5, 0, Math.PI * 2);
          ctx.arc(gx + 4, gy - 4, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Pupils
          let pupilOffsetX = 0;
          let pupilOffsetY = 0;
          if (ghost.dir === 'LEFT') pupilOffsetX = -1.5;
          if (ghost.dir === 'RIGHT') pupilOffsetX = 1.5;
          if (ghost.dir === 'UP') pupilOffsetY = -1.5;
          if (ghost.dir === 'DOWN') pupilOffsetY = 1.5;

          ctx.fillStyle = '#0000FF';
          ctx.beginPath();
          ctx.arc(gx - 4 + pupilOffsetX, gy - 4 + pupilOffsetY, 1.8, 0, Math.PI * 2);
          ctx.arc(gx + 4 + pupilOffsetX, gy - 4 + pupilOffsetY, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Frightened face (small eyes & wavy mouth)
          ctx.fillStyle = '#FDE047';
          ctx.fillRect(gx - 5, gy - 4, 2, 2);
          ctx.fillRect(gx + 3, gy - 4, 2, 2);

          // Wavy mouth
          ctx.strokeStyle = '#FDE047';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(gx - 6, gy + 3);
          ctx.lineTo(gx - 3, gy + 1);
          ctx.lineTo(gx, gy + 3);
          ctx.lineTo(gx + 3, gy + 1);
          ctx.lineTo(gx + 6, gy + 3);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Bottom Lives & Fruit HUD
      ctx.fillStyle = '#FFE600';
      for (let l = 0; l < lives; l++) {
        ctx.beginPath();
        ctx.arc(30 + l * 24, CANVAS_HEIGHT - 12, 8, 0.25 * Math.PI, 1.75 * Math.PI, false);
        ctx.lineTo(30 + l * 24, CANVAS_HEIGHT - 12);
        ctx.closePath();
        ctx.fill();
      }

      // Overlay Screen for Game Over or Victory or Start
      if (gameState !== 'playing') {
        ctx.save();
        ctx.fillStyle = 'rgba(2, 4, 8, 0.85)';
        ctx.fillRect(0, 40, CANVAS_WIDTH, CANVAS_HEIGHT - 40);

        ctx.textAlign = 'center';
        if (gameState === 'idle') {
          ctx.font = 'bold 26px "Orbitron", sans-serif';
          ctx.fillStyle = '#FFE600';
          ctx.shadowColor = '#FFE600';
          ctx.shadowBlur = 12;
          ctx.fillText('PAC-MAN ARCADE NEON', CANVAS_WIDTH / 2, 230);
          ctx.shadowBlur = 0;

          ctx.font = '14px sans-serif';
          ctx.fillStyle = '#E2E8F0';
          ctx.fillText('Coma todos os pontinhos e fuja dos fantasmas!', CANVAS_WIDTH / 2, 270);

          ctx.font = '12px monospace';
          ctx.fillStyle = '#94A3B8';
          ctx.fillText('🎮 JOYSTICK: [Analógico/D-Pad] Guiar Pac-Man | [START] Iniciar', CANVAS_WIDTH / 2, 310);
          ctx.fillText('TECLADO: [▲ ▼ ◄ ►] ou [W A S D] para guiar', CANVAS_WIDTH / 2, 335);
        } else if (gameState === 'gameover') {
          ctx.font = 'bold 34px "Orbitron", sans-serif';
          ctx.fillStyle = '#FF0055';
          ctx.shadowColor = '#FF0055';
          ctx.shadowBlur = 14;
          ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 240);
          ctx.shadowBlur = 0;

          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = '#FFE600';
          ctx.fillText(`PONTUAÇÃO: ${score}`, CANVAS_WIDTH / 2, 280);

          ctx.font = '12px monospace';
          ctx.fillStyle = '#E2E8F0';
          ctx.fillText('Pressione [START] ou [BOTÃO X] no Joystick para Reiniciar', CANVAS_WIDTH / 2, 320);
        } else if (gameState === 'victory') {
          ctx.font = 'bold 32px "Orbitron", sans-serif';
          ctx.fillStyle = '#00FF66';
          ctx.shadowColor = '#00FF66';
          ctx.shadowBlur = 14;
          ctx.fillText('FASE CONCLUÍDA!', CANVAS_WIDTH / 2, 240);
          ctx.shadowBlur = 0;

          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = '#FFE600';
          ctx.fillText(`PONTUAÇÃO MÁXIMA: ${score}`, CANVAS_WIDTH / 2, 280);

          ctx.font = '12px monospace';
          ctx.fillStyle = '#E2E8F0';
          ctx.fillText('Pressione [START] para Jogar Novamente', CANVAS_WIDTH / 2, 320);
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [gameState, lives, score, highScore, onScoreUpdate]);

  // Touch controls direction changer
  const changeDirection = (dir: Direction) => {
    pacmanRef.current.nextDir = dir;
  };

  return (
    <div className="flex flex-col items-center bg-[#070B14] rounded-2xl border border-amber-500/30 p-4 shadow-2xl relative overflow-hidden">
      {/* Game Header Bar */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-orbitron font-bold text-slate-100 tracking-wider">
            PAC-MAN &bull; CLASSIC 1980 RETRO NEON
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              retroAudio.setMuted(newMuted);
            }}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Ativar Áudio' : 'Mutar Áudio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {gameState === 'playing' ? (
            <button
              onClick={() => setGameState('idle')}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          ) : (
            <button
              onClick={startGame}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-orbitron font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>JOGAR AGORA</span>
            </button>
          )}
        </div>
      </div>

      {/* Retro Arcade Canvas */}
      <div className="relative border-4 border-[#071329] rounded-xl overflow-hidden shadow-[0_0_35px_rgba(255,184,0,0.15)] bg-black">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="max-w-full h-auto block"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Responsive On-Screen D-Pad for Touch/Mobile */}
      <div className="w-full max-w-sm mt-4 flex flex-col items-center gap-1 bg-[#0B101D] p-3 rounded-xl border border-slate-800">
        <button
          onClick={() => changeDirection('UP')}
          className="w-12 h-10 rounded-lg bg-slate-900 active:bg-amber-500 active:text-slate-950 border border-slate-700 text-slate-200 flex items-center justify-center transition-all shadow"
          title="Cima"
        >
          <ArrowUp className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-6">
          <button
            onClick={() => changeDirection('LEFT')}
            className="w-12 h-10 rounded-lg bg-slate-900 active:bg-amber-500 active:text-slate-950 border border-slate-700 text-slate-200 flex items-center justify-center transition-all shadow"
            title="Esquerda"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-[10px] text-amber-400 font-mono">
            🕹️
          </div>
          <button
            onClick={() => changeDirection('RIGHT')}
            className="w-12 h-10 rounded-lg bg-slate-900 active:bg-amber-500 active:text-slate-950 border border-slate-700 text-slate-200 flex items-center justify-center transition-all shadow"
            title="Direita"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={() => changeDirection('DOWN')}
          className="w-12 h-10 rounded-lg bg-slate-900 active:bg-amber-500 active:text-slate-950 border border-slate-700 text-slate-200 flex items-center justify-center transition-all shadow"
          title="Baixo"
        >
          <ArrowDown className="w-5 h-5" />
        </button>

        <span className="text-[10px] font-mono text-cyan-300 mt-1 font-bold">
          🎮 JOYSTICK HABILITADO: Use o Analógico Esquerdo ou D-Pad para controlar o Pac-Man!
        </span>
      </div>
    </div>
  );
};
