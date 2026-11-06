import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Shield,
  Zap,
  Flame,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Maximize2,
  Rocket
} from 'lucide-react';
import { retroAudio } from './retroAudio';
import { pollActiveGamepad, triggerGamepadVibration } from './gamepadController';

interface SpaceInvadersGameProps {
  onScoreUpdate?: (score: number) => void;
}

// Particle explosion
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

// Bullet
interface Bullet {
  x: number;
  y: number;
  vy: number;
  isPlayer: boolean;
  color: string;
  width: number;
  height: number;
}

// Invader entity
interface Invader {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
  type: 'saucer' | 'cyan' | 'yellow' | 'red';
  points: number;
  alive: boolean;
  animFrame: number;
}

// Mystery Flying Saucer (UFO)
interface MysterySaucer {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  alive: boolean;
  points: number;
}

// Defense Shield Bunker
interface ShieldBunker {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number; // 0 to 4
}

// Phase 4 Alien Flagship / Mothership (Nave Inimiga Alienígena)
interface AlienMothership {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  flightTimer: number;
  bombCooldown: number;
  alive: boolean;
  points: number; // 1000 pontos ao ser abatida!
  speed: number;
  hitFlash: number;
}

// Phase 4 Explosive Alien Bomb
interface AlienBomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  rotation: number;
  spinSpeed: number;
}

// Floating Score Popups (ex: +1000)
interface FloatingScore {
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
  color: string;
}

export const SpaceInvadersGame: React.FC<SpaceInvadersGameProps> = ({ onScoreUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('JARVES_SPACE_INVADERS_HIGH');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = parseInt(saved, 10);
        return isNaN(parsed) ? 58765 : parsed;
      }
      return 58765;
    } catch {
      return 58765;
    }
  });
  const [lives, setLives] = useState<number>(3);
  const [wave, setWave] = useState<number>(1);
  const [currentPhase, setCurrentPhase] = useState<1 | 2 | 3 | 4>(1);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(retroAudio.getMuted());

  // Mutable Game Refs for smooth 60fps requestAnimationFrame loop
  const phaseRef = useRef<1 | 2 | 3 | 4>(1);
  const phaseBannerTimerRef = useRef<number>(0);
  const phaseBannerTextRef = useRef<string>('');

  const playerRef = useRef({
    x: 300,
    y: 540,
    width: 48,
    height: 40,
    speed: 6.5,
    cooldown: 0,
    isHit: false,
    hitTimer: 0,
  });

  const keysRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean; shoot: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
  });

  const invadersRef = useRef<Invader[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bunkersRef = useRef<ShieldBunker[]>([]);
  const mysterySaucerRef = useRef<MysterySaucer | null>(null);

  // Phase 4 Special Alien Entities
  const alienMothershipRef = useRef<AlienMothership | null>(null);
  const alienMothershipRespawnTimerRef = useRef<number>(0);
  const alienBombsRef = useRef<AlienBomb[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);

  const fleetDirectionRef = useRef<number>(1); // 1 = right, -1 = left
  const fleetStepIntervalRef = useRef<number>(60); // frames between steps
  const fleetStepTimerRef = useRef<number>(0);
  const marchSoundStepRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const prevGpStartRef = useRef<boolean>(false);

  // Canvas logical dimensions
  const CANVAS_WIDTH = 640;
  const CANVAS_HEIGHT = 620;

  // Starfield background stars
  const starsRef = useRef<{ x: number; y: number; s: number; alpha: number; speed: number; color?: string }[]>([]);

  // Init Stars
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        s: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.4 + 0.2,
      });
    }
    starsRef.current = stars;
  }, []);

  // Initialize Fleet & Bunkers for a wave and phase
  const initWave = useCallback((currentWave: number, activePhase: 1 | 2 | 3 | 4 = phaseRef.current) => {
    const invaders: Invader[] = [];
    const rows = 4;
    const cols = 9;
    const startX = 60;
    const startY = 80;
    const spacingX = 56;
    const spacingY = 44;

    const isPhase2 = activePhase === 2;
    const isPhase3Or4 = activePhase === 3 || activePhase === 4;
    const isPhase4 = activePhase === 4;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type: Invader['type'] = 'saucer';
        let points = 30;

        if (r === 0) {
          type = 'saucer'; // Row 1: Motherships / Saucers
          points = isPhase4 ? 100 : isPhase3Or4 ? 80 : isPhase2 ? 60 : 40;
        } else if (r === 1) {
          type = 'cyan'; // Row 2: Cyan Crabs
          points = isPhase4 ? 60 : isPhase3Or4 ? 50 : isPhase2 ? 40 : 25;
        } else if (r === 2) {
          type = 'yellow'; // Row 3: Yellow Invaders
          points = isPhase4 ? 50 : isPhase3Or4 ? 40 : isPhase2 ? 30 : 20;
        } else {
          type = 'red'; // Row 4: Red Arrowhead Invaders
          points = isPhase4 ? 40 : isPhase3Or4 ? 30 : isPhase2 ? 20 : 10;
        }

        invaders.push({
          x: startX + c * spacingX,
          y: startY + r * spacingY,
          width: 36,
          height: 28,
          row: r,
          col: c,
          type,
          points,
          alive: true,
          animFrame: 0,
        });
      }
    }

    invadersRef.current = invaders;
    fleetDirectionRef.current = 1;
    // Step interval: Phase 4 & 3 have highest speeds
    fleetStepIntervalRef.current = isPhase4
      ? Math.max(6, 28 - currentWave * 4)
      : isPhase3Or4
      ? Math.max(8, 32 - currentWave * 4)
      : isPhase2
      ? Math.max(12, 42 - currentWave * 4)
      : Math.max(18, 55 - currentWave * 4);
    fleetStepTimerRef.current = 0;
    bulletsRef.current = [];
    particlesRef.current = [];
    mysterySaucerRef.current = null;
    alienBombsRef.current = [];

    // Defense bunkers (Phase 4: Emerald nano-shields, Phase 3: Quantum deflectors, Phase 2: Cyber barriers, Phase 1: Base shields)
    const bunkers: ShieldBunker[] = [];
    const bunkerY = 460;
    const bunkerSpacing = 140;
    for (let b = 0; b < 4; b++) {
      bunkers.push({
        x: 80 + b * bunkerSpacing,
        y: bunkerY,
        width: 52,
        height: 32,
        health: isPhase4 ? 7 : isPhase3Or4 ? 6 : isPhase2 ? 5 : 4,
      });
    }
    bunkersRef.current = bunkers;

    // Phase 4: Spawn Alien Flagship / Mothership (Nave Inimiga Alienígena)
    if (isPhase4) {
      alienMothershipRef.current = {
        x: 320 - 39,
        y: 70,
        width: 78,
        height: 42,
        health: 12,
        maxHealth: 12,
        flightTimer: 0,
        bombCooldown: 60,
        alive: true,
        points: 1000,
        speed: 3.2,
        hitFlash: 0,
      };
      retroAudio.startAlienMothershipFlight();
    } else {
      alienMothershipRef.current = null;
      retroAudio.stopAlienMothershipFlight();
    }
  }, []);

  // Switch Phase by Button (Mudança de fase por botão 1, 2, 3 ou 4)
  const switchPhase = useCallback((targetPhase: 1 | 2 | 3 | 4) => {
    setCurrentPhase(targetPhase);
    phaseRef.current = targetPhase;
    phaseBannerTextRef.current =
      targetPhase === 1
        ? 'FASE 1: DEFESA ORBITAL ATIVADA!'
        : targetPhase === 2
        ? 'FASE 2: NÊBULA VERMELHA • HIPER-INVASÃO!'
        : targetPhase === 3
        ? 'FASE 3: VANGUARDA ESPACIAL • MOVIMENTO 2D & MAIS TIROS!'
        : 'FASE 4: NAVE-MÃE ALIENÍGENA ATIVA • VOO ALEATÓRIO & BOMBAS (+1000 PTS)!';
    phaseBannerTimerRef.current = 130;
    if (targetPhase < 3) {
      playerRef.current.y = 540;
    }
    if (targetPhase !== 4) {
      retroAudio.stopAlienMothershipFlight();
    }
    initWave(wave, targetPhase);
    retroAudio.playStartJingle();
    triggerGamepadVibration(110, 0.45, 0.35);
  }, [initWave, wave]);

  // Start new game
  const startGame = () => {
    setScore(0);
    setLives(3);
    setWave(1);
    setGameState('playing');
    playerRef.current.x = CANVAS_WIDTH / 2 - playerRef.current.width / 2;
    playerRef.current.y = 540;
    playerRef.current.isHit = false;
    initWave(1, phaseRef.current);
    retroAudio.playStartJingle();
  };

  // Keyboard controls listener (Horizontal & Vertical for Phase 3 and 4 advance)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code || e.key)) {
        keysRef.current.left = true;
      }
      if (['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code || e.key)) {
        keysRef.current.right = true;
      }
      if (['ArrowUp', 'KeyW', 'w', 'W'].includes(e.code || e.key)) {
        keysRef.current.up = true;
        // In Phase 1 and 2, ArrowUp/W also acts as secondary shoot key
        if (phaseRef.current < 3) {
          keysRef.current.shoot = true;
        }
        e.preventDefault();
      }
      if (['ArrowDown', 'KeyS', 's', 'S'].includes(e.code || e.key)) {
        keysRef.current.down = true;
        e.preventDefault();
      }
      if (['Space', 'KeyJ', 'Enter'].includes(e.code || e.key)) {
        keysRef.current.shoot = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code || e.key)) {
        keysRef.current.left = false;
      }
      if (['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code || e.key)) {
        keysRef.current.right = false;
      }
      if (['ArrowUp', 'KeyW', 'w', 'W'].includes(e.code || e.key)) {
        keysRef.current.up = false;
        if (phaseRef.current < 3) {
          keysRef.current.shoot = false;
        }
      }
      if (['ArrowDown', 'KeyS', 's', 'S'].includes(e.code || e.key)) {
        keysRef.current.down = false;
      }
      if (['Space', 'KeyJ', 'Enter'].includes(e.code || e.key)) {
        keysRef.current.shoot = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Spawn starburst particles
  const spawnExplosion = (x: number, y: number, color: string, count = 18) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        life: 0,
        maxLife: Math.random() * 25 + 18,
      });
    }
  };

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const gameLoop = (timestamp: number) => {
      if (!isRunning) return;

      // Delta time check
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Poll connected Gamepad / Joystick (KTS USB Gamepad, etc.)
      const gp = pollActiveGamepad();

      if (gameState !== 'playing') {
        // Start or Restart game via Joystick START or Action button (X / Cross)
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
        const player = playerRef.current;
        const isPhase2 = phaseRef.current === 2;
        const isPhase3 = phaseRef.current === 3;
        const isPhase4 = phaseRef.current === 4;
        const isPhase3Or4 = phaseRef.current === 3 || phaseRef.current === 4;

        // Player Movement (Keyboard OR Gamepad Analógico / D-Pad)
        // In Phase 3 & 4, Left Stick / D-Pad moves both horizontally AND vertically (advance against invaders)
        const moveLeft = keysRef.current.left || gp.left;
        const moveRight = keysRef.current.right || gp.right;
        const moveUp = isPhase3Or4 && (keysRef.current.up || gp.up);
        const moveDown = isPhase3Or4 && (keysRef.current.down || gp.down);
        const isShooting = keysRef.current.shoot || gp.shoot;

        if (moveLeft && player.x > 15) {
          player.x -= player.speed;
        }
        if (moveRight && player.x < CANVAS_WIDTH - player.width - 15) {
          player.x += player.speed;
        }

        if (isPhase3Or4) {
          // Forward vertical advance and retreat (Avançar contra os invasores)
          if (moveUp && player.y > 90) {
            player.y -= player.speed;
          }
          if (moveDown && player.y < CANVAS_HEIGHT - player.height - 15) {
            player.y += player.speed;
          }

          // Phase 3 & 4 Kinetic Ramming: Ship kinetic shield destroys invaders when advancing
          if (!player.isHit) {
            for (const inv of invadersRef.current) {
              if (
                inv.alive &&
                player.x < inv.x + inv.width &&
                player.x + player.width > inv.x &&
                player.y < inv.y + inv.height &&
                player.y + player.height > inv.y
              ) {
                inv.alive = false;
                spawnExplosion(inv.x + inv.width / 2, inv.y + inv.height / 2, isPhase4 ? '#10B981' : '#FACC15', 30);
                setScore((s) => {
                  const newScore = s + inv.points * 2;
                  if (newScore > highScore) setHighScore(newScore);
                  if (onScoreUpdate) onScoreUpdate(newScore);
                  return newScore;
                });
                retroAudio.playExplosion();
                triggerGamepadVibration(90, 0.6, 0.4);
                player.isHit = true;
                player.hitTimer = 20; // Short shield deflection flash
                break;
              }
            }
          }
        } else {
          // In Phase 1 and Phase 2, return player to baseline y = 540
          if (player.y < 540) player.y = Math.min(540, player.y + 4);
          if (player.y > 540) player.y = Math.max(540, player.y - 4);
        }

        // Player Shooting (Phase 3 & 4: Penta-Beam Barrage | Phase 2: Triple Hyper-Plasma | Phase 1: Dual Plasma)
        if (player.cooldown > 0) player.cooldown--;
        if (isShooting && player.cooldown === 0 && !player.isHit) {
          if (isPhase3Or4) {
            // FASE 3 & 4: Penta-Beam Hyper Barrage (5 simultaneous high-power lasers + rapid burst fire!)
            bulletsRef.current.push(
              {
                x: player.x + 4,
                y: player.y - 6,
                vy: -13.5,
                isPlayer: true,
                color: isPhase4 ? '#34D399' : '#C084FC',
                width: 5,
                height: 20,
              },
              {
                x: player.x + 14,
                y: player.y - 9,
                vy: -14,
                isPlayer: true,
                color: '#00F0FF',
                width: 5,
                height: 22,
              },
              {
                x: player.x + player.width / 2,
                y: player.y - 12,
                vy: -15,
                isPlayer: true,
                color: isPhase4 ? '#10B981' : '#FACC15',
                width: 6,
                height: 26,
              },
              {
                x: player.x + player.width - 14,
                y: player.y - 9,
                vy: -14,
                isPlayer: true,
                color: '#00F0FF',
                width: 5,
                height: 22,
              },
              {
                x: player.x + player.width - 4,
                y: player.y - 6,
                vy: -13.5,
                isPlayer: true,
                color: isPhase4 ? '#34D399' : '#C084FC',
                width: 5,
                height: 20,
              }
            );
            player.cooldown = 6; // Ultra-rapid reload!
            retroAudio.playLaser();
            triggerGamepadVibration(55, 0.35, 0.25);
          } else if (isPhase2) {
            // FASE 2: Overcharged Twin Hyper-Plasma Cannons + Center Ion Tracer
            bulletsRef.current.push(
              {
                x: player.x + 9,
                y: player.y - 6,
                vy: -11.5,
                isPlayer: true,
                color: '#FF0055',
                width: 5,
                height: 18,
              },
              {
                x: player.x + player.width - 9,
                y: player.y - 6,
                vy: -11.5,
                isPlayer: true,
                color: '#FF0055',
                width: 5,
                height: 18,
              },
              {
                x: player.x + player.width / 2,
                y: player.y - 9,
                vy: -13,
                isPlayer: true,
                color: '#FBBF24',
                width: 3.5,
                height: 14,
              }
            );
            player.cooldown = 10; // Rapid hyper-drive recharge
            retroAudio.playLaser();
            triggerGamepadVibration(45, 0.3, 0.2);
          } else {
            // FASE 1: Dual Ionized Plasma Cannons
            bulletsRef.current.push(
              {
                x: player.x + 10,
                y: player.y - 6,
                vy: -9.5,
                isPlayer: true,
                color: '#00F0FF',
                width: 4.5,
                height: 16,
              },
              {
                x: player.x + player.width - 10,
                y: player.y - 6,
                vy: -9.5,
                isPlayer: true,
                color: '#00F0FF',
                width: 4.5,
                height: 16,
              }
            );
            player.cooldown = 13;
            retroAudio.playLaser();
            triggerGamepadVibration(45, 0.3, 0.2);
          }
        }

        // Fleet Movement & March Timing
        const aliveInvaders = invadersRef.current.filter((i) => i.alive);
        if (aliveInvaders.length === 0) {
          // Wave completed!
          setWave((prev) => {
            const nextWave = prev + 1;
            initWave(nextWave, phaseRef.current);
            return nextWave;
          });
          retroAudio.playStartJingle();
        } else {
          // Dynamic march speed based on remaining invaders
          const speedFactor = aliveInvaders.length / invadersRef.current.length;
          const currentStepInterval = Math.max(isPhase2 ? 4 : 6, Math.floor(fleetStepIntervalRef.current * speedFactor));

          fleetStepTimerRef.current++;
          if (fleetStepTimerRef.current >= currentStepInterval) {
            fleetStepTimerRef.current = 0;

            // Check if fleet hits horizontal boundary
            let hitEdge = false;
            for (const inv of aliveInvaders) {
              if (
                (fleetDirectionRef.current === 1 && inv.x + inv.width >= CANVAS_WIDTH - 25) ||
                (fleetDirectionRef.current === -1 && inv.x <= 25)
              ) {
                hitEdge = true;
                break;
              }
            }

            if (hitEdge) {
              fleetDirectionRef.current *= -1;
              const stepY = isPhase2 ? 20 : 18;
              for (const inv of aliveInvaders) {
                inv.y += stepY;
                inv.animFrame = (inv.animFrame + 1) % 2;

                // Game over if fleet reaches player base
                if (inv.y + inv.height >= player.y - 10) {
                  setGameState('gameover');
                  retroAudio.playPlayerDeath();
                }
              }
            } else {
              const stepX = fleetDirectionRef.current * (isPhase2 ? 11 : 10);
              for (const inv of aliveInvaders) {
                inv.x += stepX;
                inv.animFrame = (inv.animFrame + 1) % 2;
              }
            }

            // Play 4-tone retro march
            marchSoundStepRef.current++;
            retroAudio.playAlienStep(marchSoundStepRef.current);
          }

          // Alien Shooting (Random bottom invader shoots)
          const alienFireChance = isPhase2 ? 0.046 + wave * 0.01 : 0.035 + wave * 0.008;
          if (Math.random() < alienFireChance) {
            // Pick a random alive invader
            const shooter = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
            bulletsRef.current.push({
              x: shooter.x + shooter.width / 2,
              y: shooter.y + shooter.height + 4,
              vy: (isPhase2 ? 6.2 : 5) + wave * 0.45,
              isPlayer: false,
              color: isPhase2 ? '#FF0055' : '#EF4444',
              width: isPhase2 ? 4 : 3.5,
              height: isPhase2 ? 14 : 12,
            });
          }
        }

        // Mystery UFO Spawning & Movement
        if (!mysterySaucerRef.current && Math.random() < (isPhase2 ? 0.0025 : 0.0018)) {
          mysterySaucerRef.current = {
            x: -60,
            y: 35,
            width: 52,
            height: 22,
            speed: isPhase2 ? 3.8 : 3,
            alive: true,
            points: isPhase2 ? Math.floor(Math.random() * 3 + 2) * 100 : Math.floor(Math.random() * 3 + 1) * 100,
          };
          retroAudio.startUfo();
        }

        if (mysterySaucerRef.current) {
          const saucer = mysterySaucerRef.current;
          saucer.x += saucer.speed;
          if (saucer.x > CANVAS_WIDTH + 60) {
            mysterySaucerRef.current = null;
            retroAudio.stopUfo();
          }
        }

        // Phase 4: Alien Mothership Flight & Random Bio-Bombing (Nave Inimiga Alienígena)
        if (isPhase4) {
          // Respawn countdown if mothership was destroyed earlier
          if (!alienMothershipRef.current && alienMothershipRespawnTimerRef.current > 0) {
            alienMothershipRespawnTimerRef.current--;
            if (alienMothershipRespawnTimerRef.current <= 0) {
              alienMothershipRef.current = {
                x: Math.random() * (CANVAS_WIDTH - 140) + 40,
                y: 65,
                width: 78,
                height: 42,
                health: 12,
                maxHealth: 12,
                flightTimer: 0,
                bombCooldown: 50,
                alive: true,
                points: 1000,
                speed: 3.2,
                hitFlash: 0,
              };
              retroAudio.startAlienMothershipFlight();
            }
          }

          // Active Mothership Update
          const am = alienMothershipRef.current;
          if (am && am.alive) {
            am.flightTimer++;

            // Complex organic / random Lissajous flight path across screen above and through invaders
            const t = am.flightTimer * 0.024;
            const targetX = CANVAS_WIDTH / 2 + Math.sin(t) * 230 + Math.cos(t * 2.2) * 65 - am.width / 2;
            const targetY = 95 + Math.sin(t * 1.6) * 45 + Math.cos(t * 0.85) * 28;

            // Smooth aerodynamic interpolation
            am.x += (targetX - am.x) * 0.055;
            am.y += (targetY - am.y) * 0.045;

            // Clamp within battlefield
            am.x = Math.max(20, Math.min(CANVAS_WIDTH - am.width - 20, am.x));
            am.y = Math.max(48, Math.min(235, am.y));

            if (am.hitFlash > 0) {
              am.hitFlash--;
            }

            // Real-time audio pitch modulation based on flight velocity & position
            const pitchFactor = 1.0 + Math.sin(t * 3.8) * 0.3 + (am.x / CANVAS_WIDTH - 0.5) * 0.25;
            retroAudio.updateAlienMothershipFlight(pitchFactor);

            // Explosive Bio-Plasma Bomb Dropping (Targeting Player Combat Ship)
            am.bombCooldown--;
            if (am.bombCooldown <= 0) {
              am.bombCooldown = Math.floor(Math.random() * 30 + 55); // Drops every ~55-85 frames (~1-1.4s)
              const bombStartX = am.x + am.width / 2;
              const bombStartY = am.y + am.height - 4;
              const angle = Math.atan2(player.y - bombStartY, player.x + player.width / 2 - bombStartX);
              const bombSpeed = 4.2 + wave * 0.2;

              alienBombsRef.current.push({
                x: bombStartX,
                y: bombStartY,
                vx: Math.cos(angle) * bombSpeed,
                vy: Math.max(2.6, Math.sin(angle) * bombSpeed),
                radius: 7,
                rotation: 0,
                color: '#10B981',
              });

              retroAudio.playAlienBombDrop();
              spawnExplosion(bombStartX, bombStartY, '#10B981', 8);
            }
          }
        }

        // Alien Bombs Update & Collisions (Phase 4)
        for (let abIdx = alienBombsRef.current.length - 1; abIdx >= 0; abIdx--) {
          const bomb = alienBombsRef.current[abIdx];
          bomb.x += bomb.vx;
          bomb.y += bomb.vy;
          bomb.rotation += 0.16;

          // Bio-plasma trail particles
          if (Math.random() > 0.45) {
            particlesRef.current.push({
              x: bomb.x + (Math.random() - 0.5) * 8,
              y: bomb.y + (Math.random() - 0.5) * 8,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              color: Math.random() > 0.5 ? '#10B981' : '#FACC15',
              size: Math.random() * 3 + 1.5,
              life: 0,
              maxLife: 16,
            });
          }

          // Off-screen removal
          if (bomb.y > CANVAS_HEIGHT + 20 || bomb.x < -20 || bomb.x > CANVAS_WIDTH + 20) {
            alienBombsRef.current.splice(abIdx, 1);
            continue;
          }

          // Bomb hitting Player Ship
          if (
            !player.isHit &&
            bomb.x >= player.x - 4 &&
            bomb.x <= player.x + player.width + 4 &&
            bomb.y >= player.y - 4 &&
            bomb.y <= player.y + player.height + 4
          ) {
            alienBombsRef.current.splice(abIdx, 1);
            player.isHit = true;
            player.hitTimer = 65;
            spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, '#10B981', 40);
            spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, '#EF4444', 30);
            retroAudio.playAlienBombExplode();
            retroAudio.playPlayerDeath();
            triggerGamepadVibration(320, 0.9, 1.0);

            setLives((prev) => {
              const nextLives = prev - 1;
              if (nextLives <= 0) {
                setGameState('gameover');
                retroAudio.stopAlienMothershipFlight();
                triggerGamepadVibration(500, 1.0, 1.0);
              }
              return nextLives;
            });
            continue;
          }

          // Bomb hitting Defense Bunker (Crater damage)
          let bombDetonated = false;
          for (const bunker of bunkersRef.current) {
            if (
              bunker.health > 0 &&
              bomb.x >= bunker.x - 6 &&
              bomb.x <= bunker.x + bunker.width + 6 &&
              bomb.y >= bunker.y - 6 &&
              bomb.y <= bunker.y + bunker.height + 6
            ) {
              bunker.health = Math.max(0, bunker.health - 2);
              alienBombsRef.current.splice(abIdx, 1);
              bombDetonated = true;
              spawnExplosion(bomb.x, bomb.y, '#10B981', 25);
              spawnExplosion(bomb.x, bomb.y, '#FACC15', 15);
              retroAudio.playAlienBombExplode();
              triggerGamepadVibration(110, 0.5, 0.6);
              break;
            }
          }
          if (bombDetonated) continue;

          // Player Lasers can intercept bombs in flight (+50 pts)
          for (let pBIdx = bulletsRef.current.length - 1; pBIdx >= 0; pBIdx--) {
            const pb = bulletsRef.current[pBIdx];
            if (pb.isPlayer) {
              const dist = Math.hypot(pb.x - bomb.x, pb.y - bomb.y);
              if (dist < bomb.radius + 8) {
                bulletsRef.current.splice(pBIdx, 1);
                alienBombsRef.current.splice(abIdx, 1);
                spawnExplosion(bomb.x, bomb.y, '#10B981', 24);
                spawnExplosion(bomb.x, bomb.y, '#67E8F9', 16);
                retroAudio.playExplosion();
                triggerGamepadVibration(70, 0.4, 0.3);
                setScore((s) => {
                  const newScore = s + 50;
                  if (newScore > highScore) {
                    setHighScore(newScore);
                    try {
                      localStorage.setItem('JARVES_SPACE_INVADERS_HIGH', newScore.toString());
                    } catch {}
                  }
                  if (onScoreUpdate) onScoreUpdate(newScore);
                  return newScore;
                });
                break;
              }
            }
          }
        }

        // Bullets Update & Collisions
        for (let bIdx = bulletsRef.current.length - 1; bIdx >= 0; bIdx--) {
          const b = bulletsRef.current[bIdx];
          b.y += b.vy;

          // Out of screen
          if (b.y < 0 || b.y > CANVAS_HEIGHT) {
            bulletsRef.current.splice(bIdx, 1);
            continue;
          }

          // Player Bullet hitting Invaders & Bosses
          if (b.isPlayer) {
            // Hit Phase 4 Alien Mothership (Nave Inimiga Alienígena)
            if (isPhase4 && alienMothershipRef.current && alienMothershipRef.current.alive) {
              const am = alienMothershipRef.current;
              if (
                b.x >= am.x &&
                b.x <= am.x + am.width &&
                b.y >= am.y &&
                b.y <= am.y + am.height
              ) {
                bulletsRef.current.splice(bIdx, 1);
                am.health--;
                am.hitFlash = 8;
                spawnExplosion(b.x, b.y, '#10B981', 12);
                spawnExplosion(b.x, b.y, '#A855F7', 8);
                retroAudio.playExplosion();
                triggerGamepadVibration(65, 0.4, 0.35);

                if (am.health <= 0) {
                  // Alien Mothership DESTROYED! +1000 POINTS!
                  am.alive = false;
                  retroAudio.stopAlienMothershipFlight();
                  retroAudio.playAlienBossDestroyed();
                  triggerGamepadVibration(450, 0.95, 1.0);

                  // Grand 4-color Boss Explosion
                  spawnExplosion(am.x + am.width / 2, am.y + am.height / 2, '#10B981', 50);
                  spawnExplosion(am.x + am.width / 2, am.y + am.height / 2, '#38BDF8', 40);
                  spawnExplosion(am.x + am.width / 2, am.y + am.height / 2, '#FACC15', 40);
                  spawnExplosion(am.x + am.width / 2, am.y + am.height / 2, '#C084FC', 35);

                  // Add +1000 Points
                  setScore((s) => {
                    const newScore = s + am.points; // 1000 pts
                    if (newScore > highScore) {
                      setHighScore(newScore);
                      try {
                        localStorage.setItem('JARVES_SPACE_INVADERS_HIGH', newScore.toString());
                      } catch {}
                    }
                    if (onScoreUpdate) onScoreUpdate(newScore);
                    return newScore;
                  });

                  // Display Floating Score "+1000"
                  floatingScoresRef.current.push({
                    x: am.x + am.width / 2,
                    y: am.y,
                    text: '+1000',
                    color: '#10B981',
                    life: 0,
                    maxLife: 80,
                  });

                  alienMothershipRef.current = null;
                  alienMothershipRespawnTimerRef.current = 300; // Respawns in ~5 seconds
                }
                continue;
              }
            }

            // Hit Mystery UFO
            if (mysterySaucerRef.current && mysterySaucerRef.current.alive) {
              const ufo = mysterySaucerRef.current;
              if (
                b.x >= ufo.x &&
                b.x <= ufo.x + ufo.width &&
                b.y >= ufo.y &&
                b.y <= ufo.y + ufo.height
              ) {
                ufo.alive = false;
                bulletsRef.current.splice(bIdx, 1);
                spawnExplosion(ufo.x + ufo.width / 2, ufo.y + ufo.height / 2, '#FFE600', 32);
                retroAudio.playExplosion();
                retroAudio.stopUfo();
                triggerGamepadVibration(160, 0.6, 0.85);
                setScore((s) => {
                  const newScore = s + ufo.points;
                  if (newScore > highScore) {
                    setHighScore(newScore);
                    try {
                      localStorage.setItem('JARVES_SPACE_INVADERS_HIGH', newScore.toString());
                    } catch {}
                  }
                  if (onScoreUpdate) onScoreUpdate(newScore);
                  return newScore;
                });
                mysterySaucerRef.current = null;
                continue;
              }
            }

            // Hit Normal Invaders
            let bulletRemoved = false;
            for (const inv of invadersRef.current) {
              if (
                inv.alive &&
                b.x >= inv.x &&
                b.x <= inv.x + inv.width &&
                b.y >= inv.y &&
                b.y <= inv.y + inv.height
              ) {
                inv.alive = false;
                bulletsRef.current.splice(bIdx, 1);
                bulletRemoved = true;

                // Color explosion matching the invader row in image
                const explosionColor =
                  inv.type === 'saucer'
                    ? '#00F0FF'
                    : inv.type === 'cyan'
                    ? '#00E5FF'
                    : inv.type === 'yellow'
                    ? '#FFE600'
                    : '#FF2A55';

                spawnExplosion(inv.x + inv.width / 2, inv.y + inv.height / 2, explosionColor, 22);
                retroAudio.playExplosion();
                triggerGamepadVibration(60, 0.35, 0.3);

                setScore((s) => {
                  const newScore = s + inv.points;
                  if (newScore > highScore) {
                    setHighScore(newScore);
                    try {
                      localStorage.setItem('JARVES_SPACE_INVADERS_HIGH', newScore.toString());
                    } catch {}
                  }
                  if (onScoreUpdate) onScoreUpdate(newScore);
                  return newScore;
                });
                break;
              }
            }
            if (bulletRemoved) continue;

            // Hit Bunker
            for (const bunker of bunkersRef.current) {
              if (
                bunker.health > 0 &&
                b.x >= bunker.x &&
                b.x <= bunker.x + bunker.width &&
                b.y >= bunker.y &&
                b.y <= bunker.y + bunker.height
              ) {
                bunker.health--;
                bulletsRef.current.splice(bIdx, 1);
                spawnExplosion(b.x, b.y, '#00FF66', 6);
                break;
              }
            }
          } else {
            // Alien Bullet hitting Bunker
            let bulletRemoved = false;
            for (const bunker of bunkersRef.current) {
              if (
                bunker.health > 0 &&
                b.x >= bunker.x &&
                b.x <= bunker.x + bunker.width &&
                b.y >= bunker.y &&
                b.y <= bunker.y + bunker.height
              ) {
                bunker.health--;
                bulletsRef.current.splice(bIdx, 1);
                bulletRemoved = true;
                spawnExplosion(b.x, b.y, '#00FF66', 6);
                break;
              }
            }
            if (bulletRemoved) continue;

            // Alien Bullet hitting Player
            if (
              !player.isHit &&
              b.x >= player.x &&
              b.x <= player.x + player.width &&
              b.y >= player.y &&
              b.y <= player.y + player.height
            ) {
              bulletsRef.current.splice(bIdx, 1);
              player.isHit = true;
              player.hitTimer = 50;
              spawnExplosion(player.x + player.width / 2, player.y + player.height / 2, '#FF0055', 36);
              retroAudio.playPlayerDeath();
              triggerGamepadVibration(250, 0.8, 0.95);

              setLives((prev) => {
                const nextLives = prev - 1;
                if (nextLives <= 0) {
                  setGameState('gameover');
                  triggerGamepadVibration(450, 0.9, 1.0);
                }
                return nextLives;
              });
            }
          }
        }

        // Player Hit Recover Timer
        if (player.isHit) {
          player.hitTimer--;
          if (player.hitTimer <= 0) {
            player.isHit = false;
          }
        }

        // Update Particles
        for (let pIdx = particlesRef.current.length - 1; pIdx >= 0; pIdx--) {
          const p = particlesRef.current[pIdx];
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          if (p.life >= p.maxLife) {
            particlesRef.current.splice(pIdx, 1);
          }
        }

        // Update Floating Scores (+1000 points popups)
        for (let fsIdx = floatingScoresRef.current.length - 1; fsIdx >= 0; fsIdx--) {
          const fs = floatingScoresRef.current[fsIdx];
          fs.y -= 0.85;
          fs.life++;
          if (fs.life >= fs.maxLife) {
            floatingScoresRef.current.splice(fsIdx, 1);
          }
        }
      }

      // 2. RENDER GRAPHICS
      const isPhase2 = phaseRef.current === 2;
      const isPhase3 = phaseRef.current === 3;
      const isPhase4 = phaseRef.current === 4;
      const isPhase3Or4 = phaseRef.current === 3 || phaseRef.current === 4;

      // Deep Space / Nebula / Hyperspace Warp / Alien Rift Background
      if (isPhase4) {
        // FASE 4: Alien Bio-Nebula & Hyperspace Emerald Vortex
        ctx.fillStyle = '#020b08';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const nebGrad = ctx.createRadialGradient(CANVAS_WIDTH * 0.5, 175, 25, CANVAS_WIDTH * 0.5, 175, 340);
        nebGrad.addColorStop(0, 'rgba(16, 185, 129, 0.38)');
        nebGrad.addColorStop(0.4, 'rgba(5, 150, 105, 0.22)');
        nebGrad.addColorStop(0.75, 'rgba(88, 28, 135, 0.16)');
        nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 40, CANVAS_WIDTH, CANVAS_HEIGHT - 40);

        // Alien tachyon warp grid filaments
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.16)';
        ctx.lineWidth = 1;
        for (let ray = 0; ray < 9; ray++) {
          const rx = (ray * 75 + (Date.now() / 18) % 75);
          ctx.beginPath();
          ctx.moveTo(rx, 40);
          ctx.lineTo(rx + 35, CANVAS_HEIGHT);
          ctx.stroke();
        }
      } else if (isPhase3) {
        // FASE 3: Quantum Warp & Violet-Gold Hyperspace Rift
        ctx.fillStyle = '#060112';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Radiant Violet & Ultraviolet Stellar Storm
        const nebGrad = ctx.createRadialGradient(CANVAS_WIDTH * 0.5, 220, 30, CANVAS_WIDTH * 0.5, 220, 320);
        nebGrad.addColorStop(0, 'rgba(168, 85, 247, 0.32)');
        nebGrad.addColorStop(0.4, 'rgba(126, 34, 206, 0.18)');
        nebGrad.addColorStop(0.8, 'rgba(234, 179, 8, 0.09)');
        nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 40, CANVAS_WIDTH, CANVAS_HEIGHT - 40);

        // Hyper-drive speed warp rays
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.15)';
        ctx.lineWidth = 1;
        for (let ray = 0; ray < 8; ray++) {
          const rx = (ray * 85 + (Date.now() / 20) % 85);
          ctx.beginPath();
          ctx.moveTo(rx, 40);
          ctx.lineTo(rx + 25, CANVAS_HEIGHT);
          ctx.stroke();
        }
      } else if (isPhase2) {
        // FASE 2: Crimson Nebula Storm & Cyber Deep Space
        ctx.fillStyle = '#090310';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Cosmic Crimson/Purple Nebula Clouds
        const nebGrad = ctx.createRadialGradient(CANVAS_WIDTH * 0.65, 200, 20, CANVAS_WIDTH * 0.65, 200, 260);
        nebGrad.addColorStop(0, 'rgba(225, 29, 72, 0.25)');
        nebGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.14)');
        nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 40, CANVAS_WIDTH, CANVAS_HEIGHT - 40);

        const nebGrad2 = ctx.createRadialGradient(CANVAS_WIDTH * 0.25, 380, 10, CANVAS_WIDTH * 0.25, 380, 200);
        nebGrad2.addColorStop(0, 'rgba(239, 68, 68, 0.18)');
        nebGrad2.addColorStop(0.7, 'rgba(126, 34, 206, 0.08)');
        nebGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad2;
        ctx.fillRect(0, 40, CANVAS_WIDTH, CANVAS_HEIGHT - 40);
      } else {
        // FASE 1: Deep Earth Orbital Space
        ctx.fillStyle = '#040714';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        const earthGrad = ctx.createRadialGradient(CANVAS_WIDTH * 0.5, 620, 40, CANVAS_WIDTH * 0.5, 620, 280);
        earthGrad.addColorStop(0, 'rgba(14, 165, 233, 0.16)');
        earthGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.06)');
        earthGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = earthGrad;
        ctx.fillRect(0, 40, CANVAS_WIDTH, CANVAS_HEIGHT - 40);
      }

      // Starfield twinkle
      const starSpeedMult = isPhase4 ? 2.8 : isPhase3 ? 2.4 : (isPhase2 ? 1.4 : 1.0);
      for (const star of starsRef.current) {
        star.y += star.speed * starSpeedMult;
        if (star.y > CANVAS_HEIGHT) star.y = 0;
        ctx.fillStyle = isPhase4
          ? Math.random() > 0.6 ? `rgba(52, 211, 153, ${star.alpha})` : `rgba(167, 139, 250, ${star.alpha})`
          : isPhase3
          ? Math.random() > 0.6 ? `rgba(192, 132, 252, ${star.alpha})` : `rgba(250, 204, 21, ${star.alpha})`
          : isPhase2
          ? Math.random() > 0.7 ? `rgba(255, 180, 200, ${star.alpha})` : `rgba(255, 220, 160, ${star.alpha})`
          : `rgba(200, 235, 255, ${star.alpha})`;
        ctx.fillRect(star.x, star.y, isPhase3Or4 ? star.s * 1.2 : star.s, isPhase3Or4 ? star.s * 1.5 : star.s);
      }

      // Draw Top HUD (Green Digital LED Display like the user's reference image!)
      ctx.save();
      // Green digital score banner
      ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, 40);
      ctx.strokeStyle = isPhase4
        ? 'rgba(16, 185, 129, 0.55)'
        : isPhase3
        ? 'rgba(192, 132, 252, 0.5)'
        : isPhase2
        ? 'rgba(255, 0, 85, 0.35)'
        : 'rgba(0, 255, 102, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.lineTo(CANVAS_WIDTH, 40);
      ctx.stroke();

      // Coin icon + 10-digit score padded with zeroes (5876543210 style)
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('🪙', 14, 26);

      const paddedScore = score.toString().padStart(10, '0');
      const scoreColor = isPhase4 ? '#10B981' : isPhase3 ? '#C084FC' : (isPhase2 ? '#FF0055' : '#00FF66');
      ctx.fillStyle = scoreColor;
      ctx.shadowColor = scoreColor;
      ctx.shadowBlur = 8;
      ctx.fillText(paddedScore, 38, 26);
      ctx.shadowBlur = 0;

      // High Score in Center
      ctx.fillStyle = '#64748B';
      ctx.font = '10px sans-serif';
      ctx.fillText('RECORD:', 240, 25);
      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillText(highScore.toString().padStart(6, '0'), 290, 26);

      // Current Phase & Wave Badge
      const phaseBadgeText = isPhase4
        ? '👾 FASE 4: NAVE-MÃE ALIEN'
        : isPhase3
        ? '💥 FASE 3: VANGUARDA 2D'
        : isPhase2
        ? '⚡ FASE 2: NÊBULA'
        : '🛡️ FASE 1: ÓRBITA';
      const phaseBadgeColor = isPhase4 ? '#10B981' : isPhase3 ? '#C084FC' : (isPhase2 ? '#F43F5E' : '#38BDF8');
      ctx.fillStyle = phaseBadgeColor;
      ctx.font = 'bold 10px Orbitron, sans-serif';
      ctx.fillText(phaseBadgeText, 370, 26);

      ctx.fillStyle = isPhase4 ? '#10B981' : isPhase3 ? '#FACC15' : '#A855F7';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(`W${wave}`, 520, 26);

      // Lives icons (High-tech attack ship miniatures)
      ctx.fillStyle = isPhase4 ? '#10B981' : isPhase3 ? '#C084FC' : (isPhase2 ? '#FF0055' : '#00FF66');
      for (let l = 0; l < lives; l++) {
        const lx = 555 + l * 25;
        const ly = 16;
        ctx.beginPath();
        ctx.moveTo(lx + 8, ly);
        ctx.lineTo(lx + 16, ly + 14);
        ctx.lineTo(lx + 11, ly + 12);
        ctx.lineTo(lx + 8, ly + 14);
        ctx.lineTo(lx + 5, ly + 12);
        ctx.lineTo(lx, ly + 14);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Draw Mystery Flying Saucer (UFO) if active
      if (mysterySaucerRef.current && mysterySaucerRef.current.alive) {
        const ufo = mysterySaucerRef.current;
        ctx.save();
        // Saucer dome
        ctx.fillStyle = isPhase2 ? '#F59E0B' : '#00E5FF';
        ctx.beginPath();
        ctx.arc(ufo.x + ufo.width / 2, ufo.y + 7, 10, Math.PI, 0);
        ctx.fill();
        // Saucer rim
        ctx.fillStyle = '#FF0055';
        ctx.fillRect(ufo.x, ufo.y + 7, ufo.width, 8);
        // Running lights
        ctx.fillStyle = '#FFE600';
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(ufo.x + 6 + i * 9, ufo.y + 9, 4, 4);
        }
        ctx.restore();
      }

      // Draw Invaders Fleet
      for (const inv of invadersRef.current) {
        if (!inv.alive) continue;

        ctx.save();
        ctx.translate(inv.x, inv.y);

        if (inv.type === 'saucer') {
          // Row 1: UFO / Saucer
          ctx.fillStyle = isPhase2 ? '#F59E0B' : '#38BDF8';
          ctx.beginPath();
          ctx.arc(18, 9, 8, Math.PI, 0);
          ctx.fill();
          ctx.fillStyle = isPhase2 ? '#DC2626' : '#EF4444';
          ctx.fillRect(2, 9, 32, 8);
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(6, 17, 24, 6);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(16, 4, 4, 4);
        } else if (inv.type === 'cyan') {
          // Row 2: Cyan Alien Crab
          ctx.fillStyle = isPhase2 ? '#38BDF8' : '#00F0FF';
          ctx.fillRect(8, 2, 20, 10);
          ctx.fillStyle = '#050811';
          ctx.fillRect(10, 5, 4, 4);
          ctx.fillRect(22, 5, 4, 4);
          ctx.fillStyle = isPhase2 ? '#38BDF8' : '#00F0FF';
          if (inv.animFrame === 0) {
            ctx.fillRect(2, 12, 6, 10);
            ctx.fillRect(12, 12, 12, 8);
            ctx.fillRect(28, 12, 6, 10);
          } else {
            ctx.fillRect(4, 12, 8, 8);
            ctx.fillRect(14, 12, 8, 12);
            ctx.fillRect(24, 12, 8, 8);
          }
        } else if (inv.type === 'yellow') {
          // Row 3: Yellow Invaders
          ctx.fillStyle = isPhase2 ? '#F59E0B' : '#FDE047';
          ctx.fillRect(6, 4, 24, 12);
          ctx.fillRect(4, 0, 4, 6);
          ctx.fillRect(28, 0, 4, 6);
          ctx.fillStyle = '#050811';
          ctx.fillRect(10, 7, 4, 4);
          ctx.fillRect(22, 7, 4, 4);
          ctx.fillStyle = isPhase2 ? '#F59E0B' : '#FDE047';
          if (inv.animFrame === 0) {
            ctx.fillRect(4, 16, 6, 8);
            ctx.fillRect(14, 16, 8, 6);
            ctx.fillRect(26, 16, 6, 8);
          } else {
            ctx.fillRect(8, 16, 6, 8);
            ctx.fillRect(22, 16, 6, 8);
          }
        } else {
          // Row 4: Red Arrowhead Invaders
          ctx.fillStyle = isPhase2 ? '#E11D48' : '#F43F5E';
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(34, 16);
          ctx.lineTo(26, 24);
          ctx.lineTo(18, 18);
          ctx.lineTo(10, 24);
          ctx.lineTo(2, 16);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#FFE4E6';
          ctx.fillRect(15, 8, 6, 6);
        }

        ctx.restore();
      }

      // Draw Defense Shields / Bunkers
      for (const bunker of bunkersRef.current) {
        if (bunker.health <= 0) continue;
        ctx.save();
        const maxH = isPhase3 ? 6 : (isPhase2 ? 5 : 4);
        const alpha = bunker.health / maxH;
        ctx.fillStyle = isPhase3
          ? `rgba(192, 132, 252, ${alpha * 0.85 + 0.15})`
          : isPhase2
          ? `rgba(244, 63, 94, ${alpha * 0.8 + 0.2})`
          : `rgba(0, 255, 102, ${alpha * 0.8 + 0.2})`;
        ctx.strokeStyle = isPhase3 ? '#C084FC' : (isPhase2 ? '#FF0055' : '#00FF66');
        ctx.lineWidth = 2;
        ctx.fillRect(bunker.x, bunker.y, bunker.width, bunker.height);
        ctx.clearRect(bunker.x + 16, bunker.y + 16, 20, 16);
        ctx.restore();
      }

      // UPGRADED TIROS / HIGH-DEFINITION LASER BOLTS
      for (const b of bulletsRef.current) {
        ctx.save();
        if (b.isPlayer) {
          // Attack Ship Plasma Bolt (Dual/Penta Beam with Glowing Neon Corona & Pure White Core)
          ctx.shadowColor = b.color;
          ctx.shadowBlur = isPhase3 ? 18 : (isPhase2 ? 16 : 12);

          // Outer Plasma Energy Body
          const boltGrad = ctx.createLinearGradient(0, b.y, 0, b.y + b.height);
          if (b.color === '#C084FC') {
            boltGrad.addColorStop(0, '#FFFFFF');
            boltGrad.addColorStop(0.3, '#C084FC');
            boltGrad.addColorStop(1, '#6B21A8');
          } else if (b.color === '#FACC15') {
            boltGrad.addColorStop(0, '#FFFFFF');
            boltGrad.addColorStop(0.35, '#FACC15');
            boltGrad.addColorStop(1, '#92400E');
          } else if (b.color === '#FF0055') {
            boltGrad.addColorStop(0, '#FFFFFF');
            boltGrad.addColorStop(0.3, '#FF0055');
            boltGrad.addColorStop(1, '#99002E');
          } else if (b.color === '#FBBF24') {
            boltGrad.addColorStop(0, '#FFFFFF');
            boltGrad.addColorStop(0.4, '#FBBF24');
            boltGrad.addColorStop(1, '#B45309');
          } else {
            boltGrad.addColorStop(0, '#FFFFFF');
            boltGrad.addColorStop(0.35, '#00F0FF');
            boltGrad.addColorStop(1, '#0284C7');
          }

          ctx.fillStyle = boltGrad;
          ctx.beginPath();
          ctx.roundRect(b.x - b.width / 2, b.y, b.width, b.height, 3);
          ctx.fill();

          // Intense Laser Core (Hot white center streak)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(b.x - b.width * 0.25, b.y + 2, b.width * 0.5, b.height - 4);

          // Tip Lens Flare Sparkle
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.width * 0.7, 0, Math.PI * 2);
          ctx.fill();

          // Ionization trail particle
          if (Math.random() > 0.45) {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x - 1 + (Math.random() - 0.5) * 4, b.y + b.height + Math.random() * 5, 2, 2);
          }
        } else {
          // Alien Venom Bolt
          ctx.fillStyle = b.color;
          ctx.shadowColor = b.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.roundRect(b.x - b.width / 2, b.y, b.width, b.height, 2);
          ctx.fill();
          ctx.fillStyle = '#FFE4E6';
          ctx.fillRect(b.x - 1, b.y + 2, 2, b.height - 4);
        }
        ctx.restore();
      }

      // Draw Explosions / Starburst Particles
      for (const p of particlesRef.current) {
        ctx.save();
        const alpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // UPGRADED NAVE DE ATAQUE (HIGH-DEFINITION FUTURISTIC ATTACK STARFIGHTER)
      const player = playerRef.current;
      ctx.save();
      ctx.translate(player.x, player.y);

      if (!player.isHit || Math.floor(Date.now() / 80) % 2 === 0) {
        // Forward Deflector Shield Shimmer (when undamaged)
        if (!player.isHit) {
          ctx.strokeStyle = isPhase3
            ? 'rgba(192, 132, 252, 0.7)'
            : isPhase2
            ? 'rgba(255, 0, 85, 0.45)'
            : 'rgba(0, 240, 255, 0.45)';
          ctx.lineWidth = isPhase3 ? 2 : 1.2;
          ctx.beginPath();
          ctx.arc(24, 18, isPhase3 ? 32 : 28, -Math.PI * 0.75, -Math.PI * 0.25);
          ctx.stroke();

          // Phase 3 extra kinetic shield resonance arc
          if (isPhase3) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(24, 18, 36, -Math.PI * 0.7, -Math.PI * 0.3);
            ctx.stroke();
          }
        }

        // Layer 1: Stealth Delta Wings & Canards (Aerodynamic Titanium & Carbon Armor)
        const wingGrad = ctx.createLinearGradient(0, 0, 48, 38);
        if (isPhase3) {
          wingGrad.addColorStop(0, '#FFFFFF');
          wingGrad.addColorStop(0.3, '#E9D5FF');
          wingGrad.addColorStop(0.7, '#A855F7');
          wingGrad.addColorStop(1, '#3B0764');
        } else {
          wingGrad.addColorStop(0, '#FFFFFF');
          wingGrad.addColorStop(0.3, '#E2E8F0');
          wingGrad.addColorStop(0.7, '#94A3B8');
          wingGrad.addColorStop(1, '#475569');
        }
        ctx.fillStyle = wingGrad;

        ctx.beginPath();
        ctx.moveTo(24, isPhase3 ? -3 : 0); // Nose cone
        ctx.lineTo(48, 28); // Right swept wingtip
        ctx.lineTo(40, 38); // Right thruster fairing
        ctx.lineTo(31, 31); // Engine valley
        ctx.lineTo(17, 31);
        ctx.lineTo(8, 38);  // Left thruster fairing
        ctx.lineTo(0, 28);  // Left swept wingtip
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isPhase3 ? '#C084FC' : (isPhase2 ? '#DC2626' : '#38BDF8');
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Layer 2: Wing Accent Panels & Cyber Livery
        ctx.fillStyle = isPhase3 ? '#FACC15' : (isPhase2 ? '#F59E0B' : '#00F0FF');
        // Left wingtip stabilizer
        ctx.fillRect(2, 22, 4, 8);
        // Right wingtip stabilizer
        ctx.fillRect(42, 22, 4, 8);

        // Armor seam lines
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(24, 4);
        ctx.lineTo(10, 26);
        ctx.moveTo(24, 4);
        ctx.lineTo(38, 26);
        ctx.stroke();

        // Layer 3: Heavy Twin / Penta Plasma Rail Cannons
        // Left Rail Cannon
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(7, 10, 5, 14);
        ctx.fillStyle = isPhase3 ? '#C084FC' : (isPhase2 ? '#FF0055' : '#00F0FF');
        ctx.fillRect(8, 7, 3, 5); // Glowing muzzle
        // Right Rail Cannon
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(36, 10, 5, 14);
        ctx.fillStyle = isPhase3 ? '#C084FC' : (isPhase2 ? '#FF0055' : '#00F0FF');
        ctx.fillRect(37, 7, 3, 5); // Glowing muzzle

        // Phase 3 Penta-cannons (Center and outer wingtip muzzles)
        if (isPhase3) {
          // Center main rail muzzle
          ctx.fillStyle = '#FACC15';
          ctx.fillRect(22, -2, 4, 6);
          // Outer Left Rail muzzle
          ctx.fillStyle = '#00F0FF';
          ctx.fillRect(1, 16, 3, 5);
          // Outer Right Rail muzzle
          ctx.fillRect(44, 16, 3, 5);
        }

        // Layer 4: Central Quantum Singularity Reactor Core
        const corePulse = (Math.sin(Date.now() / 120) + 1) * 0.5;
        const coreR = 6 + corePulse * 2;
        const coreGrad = ctx.createRadialGradient(24, 18, 1, 24, 18, coreR);
        if (isPhase3) {
          coreGrad.addColorStop(0, '#FFFFFF');
          coreGrad.addColorStop(0.3, '#FACC15');
          coreGrad.addColorStop(0.7, '#C084FC');
          coreGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
        } else if (isPhase2) {
          coreGrad.addColorStop(0, '#FFFFFF');
          coreGrad.addColorStop(0.4, '#F59E0B');
          coreGrad.addColorStop(0.8, '#FF0055');
          coreGrad.addColorStop(1, 'rgba(255, 0, 85, 0)');
        } else {
          coreGrad.addColorStop(0, '#FFFFFF');
          coreGrad.addColorStop(0.4, '#38BDF8');
          coreGrad.addColorStop(0.8, '#00F0FF');
          coreGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        }
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = isPhase3 ? '#C084FC' : (isPhase2 ? '#FF0055' : '#00F0FF');
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(24, 18, coreR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Layer 5: Aerodynamic Canopy with HUD Crosshair Glint
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.ellipse(24, 10, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = isPhase3 ? '#FACC15' : (isPhase2 ? '#FDE047' : '#E0F2FE');
        ctx.fillRect(23, 7, 2, 4);

        // Layer 6: High-Thrust Ion Propulsion Plumes (Tri-jets in Phase 3)
        const isAdvancing = isPhase3 && (keysRef.current.up || keysRef.current.shoot);
        const flameLength = (isAdvancing ? 20 : 12) + Math.random() * 8;
        const thrusterGrad = ctx.createLinearGradient(0, 31, 0, 31 + flameLength);
        if (isPhase3) {
          thrusterGrad.addColorStop(0, '#FFFFFF');
          thrusterGrad.addColorStop(0.3, '#FACC15');
          thrusterGrad.addColorStop(0.7, '#C084FC');
          thrusterGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
        } else if (isPhase2) {
          thrusterGrad.addColorStop(0, '#FFFFFF');
          thrusterGrad.addColorStop(0.3, '#F59E0B');
          thrusterGrad.addColorStop(0.8, '#FF0055');
          thrusterGrad.addColorStop(1, 'rgba(255, 0, 85, 0)');
        } else {
          thrusterGrad.addColorStop(0, '#FFFFFF');
          thrusterGrad.addColorStop(0.3, '#38BDF8');
          thrusterGrad.addColorStop(0.8, '#0284C7');
          thrusterGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        }
        ctx.fillStyle = thrusterGrad;

        // Left Thruster Flame
        ctx.beginPath();
        ctx.moveTo(11, 31);
        ctx.lineTo(13, 31 + flameLength);
        ctx.lineTo(15, 31);
        ctx.closePath();
        ctx.fill();

        // Right Thruster Flame
        ctx.beginPath();
        ctx.moveTo(33, 31);
        ctx.lineTo(35, 31 + flameLength);
        ctx.lineTo(37, 31);
        ctx.closePath();
        ctx.fill();

        // Center Thruster Flame (Phase 3 & 4 Tri-Jet Engine)
        if (isPhase3Or4) {
          ctx.beginPath();
          ctx.moveTo(22, 31);
          ctx.lineTo(24, 31 + flameLength * 1.3);
          ctx.lineTo(26, 31);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();

      // DRAW NAVE INIMIGA ALIENÍGENA (PHASE 4 ALIEN MOTHERSHIP) - HIGH QUALITY SCI-FI DESIGN
      if (isPhase4 && alienMothershipRef.current && alienMothershipRef.current.alive) {
        const am = alienMothershipRef.current;
        ctx.save();
        ctx.translate(am.x, am.y);

        const isFlashing = am.hitFlash > 0;

        // 1. Bio-plasma Contrails / Thruster Plumes
        const plumeLength = 14 + Math.sin(am.flightTimer * 0.4) * 6;
        const thrusterGrad = ctx.createLinearGradient(0, am.height - 8, 0, am.height + plumeLength);
        thrusterGrad.addColorStop(0, '#34D399');
        thrusterGrad.addColorStop(0.4, '#10B981');
        thrusterGrad.addColorStop(0.8, '#7C3AED');
        thrusterGrad.addColorStop(1, 'rgba(124, 58, 237, 0)');
        ctx.fillStyle = thrusterGrad;

        // Left Engine Flame
        ctx.beginPath();
        ctx.moveTo(18, am.height - 6);
        ctx.lineTo(22, am.height + plumeLength);
        ctx.lineTo(26, am.height - 6);
        ctx.closePath();
        ctx.fill();

        // Right Engine Flame
        ctx.beginPath();
        ctx.moveTo(am.width - 26, am.height - 6);
        ctx.lineTo(am.width - 22, am.height + plumeLength);
        ctx.lineTo(am.width - 18, am.height - 6);
        ctx.closePath();
        ctx.fill();

        // 2. Chitinous Bio-mechanical Carapace (Obsidian-Emerald Armored Hull)
        const hullGrad = ctx.createLinearGradient(0, 0, am.width, am.height);
        if (isFlashing) {
          hullGrad.addColorStop(0, '#FFFFFF');
          hullGrad.addColorStop(0.5, '#6EE7B7');
          hullGrad.addColorStop(1, '#A7F3D0');
        } else {
          hullGrad.addColorStop(0, '#064E3B');
          hullGrad.addColorStop(0.3, '#047857');
          hullGrad.addColorStop(0.7, '#065F46');
          hullGrad.addColorStop(1, '#022C22');
        }
        ctx.fillStyle = hullGrad;
        ctx.strokeStyle = isFlashing ? '#FFFFFF' : '#34D399';
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = isFlashing ? 18 : 10;

        // Swept Aerodynamic Alien Wings & Scythe Mandibles
        ctx.beginPath();
        ctx.moveTo(am.width / 2, 4); // Top Apex
        ctx.lineTo(am.width - 12, 12);
        ctx.lineTo(am.width, 22); // Outer Right Mandible Wingtip
        ctx.lineTo(am.width - 10, am.height - 8);
        ctx.lineTo(am.width - 22, am.height - 4);
        ctx.lineTo(am.width / 2 + 10, am.height - 10);
        ctx.lineTo(am.width / 2, am.height - 4); // Tail spine
        ctx.lineTo(am.width / 2 - 10, am.height - 10);
        ctx.lineTo(22, am.height - 4);
        ctx.lineTo(10, am.height - 8);
        ctx.lineTo(0, 22); // Outer Left Mandible Wingtip
        ctx.lineTo(12, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 3. Wing Accents & Energy Conduits
        ctx.strokeStyle = '#6EE7B7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(am.width / 2, 8);
        ctx.lineTo(16, 22);
        ctx.moveTo(am.width / 2, 8);
        ctx.lineTo(am.width - 16, 22);
        ctx.stroke();

        // 4. Heavy Plasma Bomb Emitters (Wing Pods)
        ctx.fillStyle = '#022C22';
        ctx.fillRect(4, 20, 8, 12);
        ctx.fillRect(am.width - 12, 20, 8, 12);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(6, 30, 4, 4);
        ctx.fillRect(am.width - 10, 30, 4, 4);

        // 5. Multifaceted Alien Insectoid Sensor Eyes (Glowing Amber-Emerald)
        ctx.fillStyle = '#FACC15';
        ctx.shadowColor = '#FACC15';
        ctx.shadowBlur = 6;
        // Left Eye Slit
        ctx.beginPath();
        ctx.ellipse(26, 14, 5, 2.5, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // Right Eye Slit
        ctx.beginPath();
        ctx.ellipse(am.width - 26, 14, 5, 2.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 6. Central Pulsating Tachyon Singularity Core
        const corePulse = (Math.sin(am.flightTimer * 0.12) + 1) * 0.5;
        const coreRadius = 9 + corePulse * 3;
        const coreGrad = ctx.createRadialGradient(am.width / 2, 22, 1, am.width / 2, 22, coreRadius);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.35, '#34D399');
        coreGrad.addColorStop(0.7, '#10B981');
        coreGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(am.width / 2, 22, coreRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Rotating Core Rings
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(am.width / 2, 22, 11, 6, am.flightTimer * 0.08, 0, Math.PI * 2);
        ctx.stroke();

        // 7. Holographic Shield / Health Gauge + "+1000 PTS" Header
        const barW = 68;
        const barH = 5;
        const barX = (am.width - barW) / 2;
        const barY = -14;

        // Background Bar
        ctx.fillStyle = 'rgba(2, 44, 34, 0.85)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(barX, barY, barW, barH);

        // Current Health Fill
        const hpPct = Math.max(0, am.health / am.maxHealth);
        const healthFillGrad = ctx.createLinearGradient(barX, barY, barX + barW * hpPct, barY);
        healthFillGrad.addColorStop(0, '#10B981');
        healthFillGrad.addColorStop(1, hpPct > 0.35 ? '#34D399' : '#EF4444');
        ctx.fillStyle = healthFillGrad;
        ctx.fillRect(barX + 1, barY + 1, (barW - 2) * hpPct, barH - 2);

        // Header label
        ctx.font = 'bold 8px Orbitron, sans-serif';
        ctx.fillStyle = '#6EE7B7';
        ctx.textAlign = 'center';
        ctx.fillText('NAVE-MÃE ALIEN • 1000 PTS', am.width / 2, barY - 3);

        ctx.restore();
      }

      // DRAW PHASE 4 ALIEN BOMBS (SPICY BIO-PLASMA EXPLOSIVE ORBS)
      for (const bomb of alienBombsRef.current) {
        ctx.save();
        ctx.translate(bomb.x, bomb.y);
        ctx.rotate(bomb.rotation);

        // Outer Bio-Plasma Glowing Corona
        const bGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, bomb.radius + 5);
        bGrad.addColorStop(0, '#FFFFFF');
        bGrad.addColorStop(0.35, '#FACC15');
        bGrad.addColorStop(0.7, '#10B981');
        bGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        ctx.fillStyle = bGrad;
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, bomb.radius + 4, 0, Math.PI * 2);
        ctx.fill();

        // Spiked Plasma Star
        ctx.fillStyle = '#064E3B';
        ctx.beginPath();
        for (let sp = 0; sp < 6; sp++) {
          const a = (sp * Math.PI) / 3;
          const rOuter = bomb.radius + 3;
          const rInner = bomb.radius - 2;
          ctx.lineTo(Math.cos(a) * rOuter, Math.sin(a) * rOuter);
          ctx.lineTo(Math.cos(a + Math.PI / 6) * rInner, Math.sin(a + Math.PI / 6) * rInner);
        }
        ctx.closePath();
        ctx.fill();

        // Hot Core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // DRAW FLOATING SCORES ("+1000" TRIUMPH POPUPS)
      for (const fs of floatingScoresRef.current) {
        ctx.save();
        const fAlpha = Math.max(0, 1 - fs.life / fs.maxLife);
        ctx.globalAlpha = fAlpha;
        ctx.font = 'bold 16px "Orbitron", sans-serif';
        ctx.fillStyle = fs.color;
        ctx.shadowColor = fs.color;
        ctx.shadowBlur = 14;
        ctx.textAlign = 'center';
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.restore();
      }

      // On-Screen Holographic Phase Announcement Banner (when switched by button)
      if (phaseBannerTimerRef.current > 0) {
        phaseBannerTimerRef.current--;
        const bAlpha = Math.min(1, phaseBannerTimerRef.current / 25);
        ctx.save();
        ctx.globalAlpha = bAlpha;
        ctx.fillStyle = isPhase4
          ? 'rgba(6, 78, 59, 0.94)'
          : isPhase3
          ? 'rgba(126, 34, 206, 0.92)'
          : isPhase2
          ? 'rgba(225, 29, 72, 0.88)'
          : 'rgba(8, 145, 178, 0.88)';
        ctx.strokeStyle = isPhase4 ? '#6EE7B7' : isPhase3 ? '#E9D5FF' : (isPhase2 ? '#FDA4AF' : '#67E8F9');
        ctx.lineWidth = 2;
        ctx.shadowColor = isPhase4 ? '#10B981' : isPhase3 ? '#C084FC' : (isPhase2 ? '#FF0055' : '#00F0FF');
        ctx.shadowBlur = 20;

        const bannerW = 440;
        const bannerH = 46;
        const bannerX = (CANVAS_WIDTH - bannerW) / 2;
        const bannerY = 180;

        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 12);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 15px Orbitron, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(phaseBannerTextRef.current, CANVAS_WIDTH / 2, bannerY + 28);
        ctx.restore();
      }


      // Overlay Screen for Game Over or Victory or Start
      if (gameState !== 'playing') {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 8, 17, 0.82)';
        ctx.fillRect(0, 40, CANVAS_WIDTH, CANVAS_HEIGHT - 40);

        ctx.textAlign = 'center';
        if (gameState === 'idle') {
          ctx.font = 'bold 28px "Orbitron", sans-serif';
          ctx.fillStyle = '#00FF66';
          ctx.shadowColor = '#00FF66';
          ctx.shadowBlur = 12;
          ctx.fillText('SPACE INVADERS ARCADE', CANVAS_WIDTH / 2, 230);
          ctx.shadowBlur = 0;

          ctx.font = '14px sans-serif';
          ctx.fillStyle = '#E2E8F0';
          ctx.fillText('Destrua as naves invasoras e proteja a Terra!', CANVAS_WIDTH / 2, 270);

          ctx.font = '12px monospace';
          ctx.fillStyle = '#94A3B8';
          ctx.fillText('🎮 JOYSTICK: [Analógico/D-Pad] Mover | [Botão X / R1] Disparar | [START] Iniciar', CANVAS_WIDTH / 2, 310);
          ctx.fillText('TECLADO: [◄ ►] ou [A D] para mover | [ESPAÇO] para disparar', CANVAS_WIDTH / 2, 335);
        } else if (gameState === 'gameover') {
          ctx.font = 'bold 36px "Orbitron", sans-serif';
          ctx.fillStyle = '#FF0055';
          ctx.shadowColor = '#FF0055';
          ctx.shadowBlur = 16;
          ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 240);
          ctx.shadowBlur = 0;

          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = '#00FF66';
          ctx.fillText(`PONTUAÇÃO FINAL: ${score}`, CANVAS_WIDTH / 2, 280);

          ctx.font = '12px monospace';
          ctx.fillStyle = '#E2E8F0';
          ctx.fillText('Pressione [START] ou [BOTÃO X] no Joystick para Reiniciar', CANVAS_WIDTH / 2, 320);
        }
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      retroAudio.stopUfo();
      retroAudio.stopAlienMothershipFlight();
    };
  }, [gameState, wave, lives, score, highScore, onScoreUpdate, initWave, currentPhase]);

  // Touch controls helpers
  const handleTouchLeft = (pressed: boolean) => {
    keysRef.current.left = pressed;
  };
  const handleTouchRight = (pressed: boolean) => {
    keysRef.current.right = pressed;
  };
  const handleTouchUp = (pressed: boolean) => {
    keysRef.current.up = pressed;
  };
  const handleTouchDown = (pressed: boolean) => {
    keysRef.current.down = pressed;
  };
  const handleTouchShoot = () => {
    keysRef.current.shoot = true;
    setTimeout(() => {
      keysRef.current.shoot = false;
    }, 120);
  };

  return (
    <div className="flex flex-col items-center bg-[#070B14] rounded-2xl border border-teal-500/30 p-4 shadow-2xl relative overflow-hidden">
      {/* Game Header Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-orbitron font-bold text-slate-100 tracking-wider">
            SPACE INVADERS &bull; CLASSIC 1978 DELUXE
          </span>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
              currentPhase === 1
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : currentPhase === 2
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : currentPhase === 3
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {currentPhase === 1
              ? 'FASE 1: DEFESA ORBITAL'
              : currentPhase === 2
              ? 'FASE 2: NÊBULA CIBERNÉTICA'
              : currentPhase === 3
              ? 'FASE 3: VANGUARDA 2D (MOVIMENTO TOTAL)'
              : 'FASE 4: NAVE-MÃE ALIENÍGENA (+1000 PTS)'}
          </span>
        </div>

        {/* Action Controls & Phase Switch Buttons (Mudança de fase por botão 1, 2, 3 e 4) */}
        <div className="flex items-center gap-2.5">
          {/* Phase Switch Button Group (Fases 1, 2, 3 e 4) */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 shadow-inner gap-1">
            <button
              onClick={() => switchPhase(1)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all cursor-pointer ${
                currentPhase === 1
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_14px_rgba(6,182,212,0.6)]'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
              }`}
              title="Ativar Fase 1: Defesa Orbital da Terra"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>FASE 1</span>
            </button>
            <button
              onClick={() => switchPhase(2)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all cursor-pointer ${
                currentPhase === 2
                  ? 'bg-rose-500 text-slate-950 shadow-[0_0_14px_rgba(244,63,94,0.6)]'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
              }`}
              title="Ativar Fase 2: Tempestade da Nêbula Vermelha"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>FASE 2</span>
            </button>
            <button
              onClick={() => switchPhase(3)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all cursor-pointer ${
                currentPhase === 3
                  ? 'bg-purple-500 text-slate-950 shadow-[0_0_14px_rgba(168,85,247,0.6)]'
                  : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800'
              }`}
              title="Ativar Fase 3: Vanguarda 2D - Movimento Horizontal e Vertical com Joystick Esquerdo + Super Disparo Penta"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>FASE 3</span>
            </button>
            <button
              onClick={() => switchPhase(4)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all cursor-pointer ${
                currentPhase === 4
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.7)]'
                  : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
              }`}
              title="Ativar Fase 4: Nave-Mãe Alienígena Ativa (Voo Aleatório, Bombas Explosivas e +1000 Pontos)"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>FASE 4</span>
            </button>
          </div>

          <button
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              retroAudio.setMuted(newMuted);
            }}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Ativar Áudio Arcade' : 'Mutar Áudio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
          </button>

          {gameState === 'playing' ? (
            <button
              onClick={() => {
                retroAudio.stopAlienMothershipFlight();
                setGameState('idle');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          ) : (
            <button
              onClick={startGame}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-orbitron font-bold text-xs shadow-[0_0_15px_rgba(20,184,166,0.4)] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>JOGAR AGORA</span>
            </button>
          )}
        </div>
      </div>

      {/* Retro Arcade Canvas */}
      <div className="relative border-4 border-[#0B1528] rounded-xl overflow-hidden shadow-[0_0_35px_rgba(0,240,255,0.15)] bg-black">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="max-w-full h-auto block"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Arcade Controls & Touch Buttons for Mobile & Desktop */}
      <div className="w-full max-w-2xl mt-4 flex flex-wrap items-center justify-between gap-3 bg-[#0B101D] p-3 rounded-xl border border-slate-800">
        {/* Navigation Buttons: 2D controls in Phase 3 & 4, Horizontal in Phases 1 & 2 */}
        <div className="flex items-center gap-1.5">
          <button
            onMouseDown={() => handleTouchLeft(true)}
            onMouseUp={() => handleTouchLeft(false)}
            onTouchStart={() => handleTouchLeft(true)}
            onTouchEnd={() => handleTouchLeft(false)}
            className="w-12 h-12 rounded-xl bg-slate-900 active:bg-teal-500 active:text-slate-950 border border-slate-700 text-slate-200 font-bold flex items-center justify-center transition-all shadow cursor-pointer"
            title="Mover para esquerda"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onMouseDown={() => handleTouchRight(true)}
            onMouseUp={() => handleTouchRight(false)}
            onTouchStart={() => handleTouchRight(true)}
            onTouchEnd={() => handleTouchRight(false)}
            className="w-12 h-12 rounded-xl bg-slate-900 active:bg-teal-500 active:text-slate-950 border border-slate-700 text-slate-200 font-bold flex items-center justify-center transition-all shadow cursor-pointer"
            title="Mover para direita"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Phase 3 & 4 Vertical Movement Touch Buttons */}
          {(currentPhase === 3 || currentPhase === 4) && (
            <div className={`flex items-center gap-1.5 ml-1 border-l pl-2 ${currentPhase === 4 ? 'border-emerald-500/30' : 'border-purple-500/30'}`}>
              <button
                onMouseDown={() => handleTouchUp(true)}
                onMouseUp={() => handleTouchUp(false)}
                onTouchStart={() => handleTouchUp(true)}
                onTouchEnd={() => handleTouchUp(false)}
                className={`px-3 h-12 rounded-xl active:text-slate-950 font-orbitron font-bold text-xs flex items-center gap-1 transition-all shadow cursor-pointer ${
                  currentPhase === 4
                    ? 'bg-emerald-950/70 active:bg-emerald-500 border border-emerald-500/50 text-emerald-200'
                    : 'bg-purple-950/70 active:bg-purple-500 border border-purple-500/50 text-purple-200'
                }`}
                title="Avançar contra os invasores"
              >
                <ArrowUp className="w-4 h-4" />
                <span className="hidden sm:inline">AVANÇAR</span>
              </button>
              <button
                onMouseDown={() => handleTouchDown(true)}
                onMouseUp={() => handleTouchDown(false)}
                onTouchStart={() => handleTouchDown(true)}
                onTouchEnd={() => handleTouchDown(false)}
                className={`px-3 h-12 rounded-xl active:text-slate-950 font-orbitron font-bold text-xs flex items-center gap-1 transition-all shadow cursor-pointer ${
                  currentPhase === 4
                    ? 'bg-emerald-950/70 active:bg-emerald-500 border border-emerald-500/50 text-emerald-200'
                    : 'bg-purple-950/70 active:bg-purple-500 border border-purple-500/50 text-purple-200'
                }`}
                title="Recuar"
              >
                <ArrowDown className="w-4 h-4" />
                <span className="hidden sm:inline">RECUAR</span>
              </button>
            </div>
          )}
        </div>

        {/* Dedicated Quick Phase Switch Button (Cycle 1 -> 2 -> 3 -> 4 -> 1) */}
        <button
          onClick={() => switchPhase(currentPhase === 1 ? 2 : currentPhase === 2 ? 3 : currentPhase === 3 ? 4 : 1)}
          className={`px-3.5 h-12 rounded-xl border font-orbitron font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer ${
            currentPhase === 1
              ? 'bg-rose-950/70 hover:bg-rose-900/90 border-rose-500/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              : currentPhase === 2
              ? 'bg-purple-950/70 hover:bg-purple-900/90 border-purple-500/60 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
              : currentPhase === 3
              ? 'bg-emerald-950/70 hover:bg-emerald-900/90 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-cyan-950/70 hover:bg-cyan-900/90 border-cyan-500/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
          }`}
          title="Alternar sequencialmente entre as fases 1, 2, 3 e 4"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span className="hidden sm:inline">MUDAR P/</span>
          <span>FASE {currentPhase === 1 ? '2' : currentPhase === 2 ? '3' : currentPhase === 3 ? '4' : '1'}</span>
        </button>

        <div className="text-center font-mono text-[11px] text-slate-300 hidden md:block">
          <div className="text-cyan-300 font-bold">
            {currentPhase === 4
              ? '👾 FASE 4: Nave-Mãe Alienígena em voo livre! Esquive das bombas e abata-a para +1000 PTS!'
              : currentPhase === 3
              ? '🕹️ JOYSTICK: [Analógico/D-Pad] Movimento 2D (Avançar/Recuar/Esquerda/Direita) | [Botão X] Penta-Laser'
              : '🎮 JOYSTICK: [Analógico/D-Pad] Navegar | [Botão X] Fogo'}
          </div>
          <div className="text-slate-400 text-[10px]">
            {currentPhase >= 3
              ? 'Teclado: [W S A D] ou [▲ ▼ ◄ ►] Movimento 2D Total | [Espaço] Disparo Penta-Laser'
              : 'Teclado: [A] [D] / [◄] [►] | [Espaço] Disparo'}
          </div>
        </div>

        <button
          onClick={handleTouchShoot}
          className={`px-5 h-12 rounded-xl text-white font-orbitron font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
            currentPhase === 4
              ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)]'
              : currentPhase === 3
              ? 'bg-purple-600 hover:bg-purple-500 active:bg-purple-400 shadow-[0_0_18px_rgba(168,85,247,0.5)]'
              : 'bg-rose-600 hover:bg-rose-500 active:bg-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
          }`}
          title={currentPhase >= 3 ? 'Disparo Penta Laser' : 'Disparar Laser'}
        >
          <Flame className="w-5 h-5 fill-current" />
          <span>{currentPhase >= 3 ? 'PENTA!' : 'FOGO!'}</span>
        </button>
      </div>
    </div>
  );
};
