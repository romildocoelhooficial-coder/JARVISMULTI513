import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Shield,
  Zap,
  Sparkles,
  Flame,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Magnet,
  Sliders,
  Award,
  Radio,
  Gamepad2,
  Eye,
  Layers,
  Box,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { retroAudio } from './retroAudio';
import { pollActiveGamepad, triggerGamepadVibration } from './gamepadController';

interface CavaleiroNegroPinballGameProps {
  onScoreUpdate?: (score: number) => void;
  onGameOver?: (finalScore: number) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

// Target in bank
interface DropTarget {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
  points: number;
  color: string;
}

// Bumper
interface Bumper {
  x: number;
  y: number;
  radius: number;
  color: string;
  points: number;
  flashTimer: number;
}

// Slingshot kicker
interface Slingshot {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  kickVx: number;
  kickVy: number;
  flashTimer: number;
}

// Particle effect
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

// Floating score popup
interface FloatingScore {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export const CavaleiroNegroPinballGame: React.FC<CavaleiroNegroPinballGameProps> = ({
  onScoreUpdate,
  onGameOver,
  onToggleFullscreen,
  isFullscreen = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React UI States
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('JARVES_CAVALEIRO_NEGRO_HIGH');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const val = parseInt(saved, 10);
        return isNaN(val) ? 148500 : val;
      }
      return 148500;
    } catch {
      return 148500;
    }
  });

  const scoreRef = useRef<number>(0);
  const highScoreRef = useRef<number>(highScore);

  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const [currentBall, setCurrentBall] = useState<number>(1);
  const [totalBalls] = useState<number>(3);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [magnaSaveAvailable, setMagnaSaveAvailable] = useState<boolean>(true);
  const [magnaSaveActive, setMagnaSaveActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(retroAudio.getMuted());
  const [plungerCharge, setPlungerCharge] = useState<number>(0); // 0 to 1
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [tiltCount, setTiltCount] = useState<number>(0);
  const [isTiltWarning, setIsTiltWarning] = useState<boolean>(false);

  // 3D Cabinet Viewpoint and Glass Reflection States
  type ViewpointMode = 'cabinet' | 'immersive' | 'topdown';
  const [viewpoint, setViewpoint] = useState<ViewpointMode>('cabinet');
  const [showGlassReflect, setShowGlassReflect] = useState<boolean>(true);
  const [leftFlipperActiveUI, setLeftFlipperActiveUI] = useState<boolean>(false);
  const [rightFlipperActiveUI, setRightFlipperActiveUI] = useState<boolean>(false);

  // Playfield logical dimensions
  const CANVAS_WIDTH = 480;
  const CANVAS_HEIGHT = 680;

  // Ball Physics State Ref
  const ballRef = useRef({
    x: 450,
    y: 580,
    vx: 0,
    vy: 0,
    radius: 9,
    inPlungerLane: true,
    active: true,
  });

  // Flipper Angles & States
  const flippersRef = useRef({
    leftPressed: false,
    rightPressed: false,
    leftAngle: 0.45,   // ~26 deg down
    rightAngle: Math.PI - 0.45,
    upperAngle: Math.PI - 0.45,
    leftRest: 0.45,
    leftActive: -0.55,  // ~-31 deg up
    rightRest: Math.PI - 0.45,
    rightActive: Math.PI + 0.55,
    upperRest: Math.PI - 0.45,
    upperActive: Math.PI + 0.55,
    length: 64,
    upperLength: 48,
    leftPivot: { x: 160, y: 595 },
    rightPivot: { x: 310, y: 595 },
    upperPivot: { x: 350, y: 240 },
  });

  // Plunger Pull Ref
  const plungerRef = useRef({
    pulling: false,
    charge: 0,
  });

  // Targets & Bumpers Refs
  const bumpersRef = useRef<Bumper[]>([
    { x: 235, y: 155, radius: 24, color: '#EF4444', points: 500, flashTimer: 0 },
    { x: 175, y: 215, radius: 22, color: '#F59E0B', points: 300, flashTimer: 0 },
    { x: 295, y: 215, radius: 22, color: '#F59E0B', points: 300, flashTimer: 0 },
    { x: 235, y: 275, radius: 24, color: '#10B981', points: 1000, flashTimer: 0 },
  ]);

  const leftTargetsRef = useRef<DropTarget[]>([
    { id: 'lt-1', x: 80, y: 270, width: 14, height: 20, active: true, points: 1000, color: '#FACC15' },
    { id: 'lt-2', x: 80, y: 300, width: 14, height: 20, active: true, points: 1000, color: '#FACC15' },
    { id: 'lt-3', x: 80, y: 330, width: 14, height: 20, active: true, points: 1000, color: '#FACC15' },
  ]);

  const rightTargetsRef = useRef<DropTarget[]>([
    { id: 'rt-1', x: 385, y: 270, width: 14, height: 20, active: true, points: 1000, color: '#FACC15' },
    { id: 'rt-2', x: 385, y: 300, width: 14, height: 20, active: true, points: 1000, color: '#FACC15' },
    { id: 'rt-3', x: 385, y: 330, width: 14, height: 20, active: true, points: 1000, color: '#FACC15' },
  ]);

  const slingshotsRef = useRef<Slingshot[]>([
    // Left Slingshot
    {
      x1: 110, y1: 495,
      x2: 145, y2: 565,
      x3: 110, y3: 565,
      kickVx: 7.5,
      kickVy: -7.5,
      flashTimer: 0,
    },
    // Right Slingshot
    {
      x1: 360, y1: 495,
      x2: 325, y2: 565,
      x3: 360, y3: 565,
      kickVx: -7.5,
      kickVy: -7.5,
      flashTimer: 0,
    },
  ]);

  const particlesRef = useRef<Particle[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const prevGpStartRef = useRef<boolean>(false);
  const prevGpSouthRef = useRef<boolean>(false);
  const prevMagnaRef = useRef<boolean>(false);

  // Playfield Background Image Preload
  const playfieldImgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  useEffect(() => {
    const img = new Image();
    img.src = '/assets/aistudio/Gemini_Generated_Image_h3zxf7h3zxf7h3zx_1f7cc657.jfif';
    img.onload = () => {
      playfieldImgRef.current = img;
      setImgLoaded(true);
    };

    // Preload both authentic Cavaleiro Negro MP3 audios (Intro speech & in-game active sounds)
    retroAudio.preloadCavaleiroAudios();
  }, []);

  // Announce voice with banner
  const triggerVoiceIntro = useCallback(() => {
    retroAudio.speakCavaleiroNegroIntro();
    setVoiceNotice('"Eu sou o cavaleiro negro a procura de um desafio!"');
    setTimeout(() => {
      setVoiceNotice(null);
    }, 4500);
  }, []);

  // Spawn explosion particles
  const spawnHitParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        color,
        life: 0,
        maxLife: Math.random() * 18 + 12,
      });
    }
  };

  // Add score
  const addScore = useCallback((pts: number, text?: string, x?: number, y?: number) => {
    const finalPts = pts * multiplier;
    const nextScore = scoreRef.current + finalPts;
    scoreRef.current = nextScore;
    setScore(nextScore);

    if (nextScore > highScoreRef.current) {
      highScoreRef.current = nextScore;
      setHighScore(nextScore);
      try {
        localStorage.setItem('JARVES_CAVALEIRO_NEGRO_HIGH', nextScore.toString());
      } catch {}
    }

    if (onScoreUpdate) {
      onScoreUpdate(nextScore);
    }

    if (text && x !== undefined && y !== undefined) {
      floatingScoresRef.current.push({
        x,
        y,
        text: `+${finalPts.toLocaleString('pt-BR')}`,
        color: multiplier > 1 ? '#FACC15' : '#38BDF8',
        life: 0,
        maxLife: 50,
      });
    }
  }, [multiplier, onScoreUpdate]);

  // Activate Magna-Save (Defesa Magnética)
  const triggerMagnaSave = useCallback(() => {
    if (!magnaSaveAvailable || gameState !== 'playing') return;

    setMagnaSaveActive(true);
    setMagnaSaveAvailable(false);
    retroAudio.playPinballMagnaSave();
    retroAudio.speakCavaleiroPhrase('Defesa Magnética!');
    triggerGamepadVibration(180, 0.6, 0.7);

    // Apply upward magnetic impulse if ball is near bottom outlanes
    const ball = ballRef.current;
    if (ball.y > 450 && (ball.x < 130 || ball.x > 340)) {
      ball.vy = -12;
      ball.vx = ball.x < 130 ? 6 : -6;
      spawnHitParticles(ball.x, ball.y, '#00F0FF', 25);
    }

    setTimeout(() => {
      setMagnaSaveActive(false);
    }, 1200);
  }, [magnaSaveAvailable, gameState]);

  // Start new game
  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setCurrentBall(1);
    setMultiplier(1);
    setMagnaSaveAvailable(true);
    setMagnaSaveActive(false);
    setGameState('playing');
    setTiltCount(0);
    setIsTiltWarning(false);

    if (onScoreUpdate) {
      onScoreUpdate(0);
    }

    // Reset ball in plunger lane
    ballRef.current.x = 450;
    ballRef.current.y = 580;
    ballRef.current.vx = 0;
    ballRef.current.vy = 0;
    ballRef.current.inPlungerLane = true;
    ballRef.current.active = true;

    // Reset targets
    leftTargetsRef.current.forEach((t) => (t.active = true));
    rightTargetsRef.current.forEach((t) => (t.active = true));

    // Start active match continuous in-game sounds (/assets/aistudio/sonsdojogoativos_520a8f9a.mp3)
    retroAudio.stopCavaleiroMatchAudio();
    retroAudio.startCavaleiroMatchAudio();

    // Iconic 80s Voice Banner Notice
    setVoiceNotice('"Eu sou o cavaleiro negro a procura de um desafio!"');
    setTimeout(() => {
      setVoiceNotice(null);
    }, 4500);

    triggerGamepadVibration(250, 0.7, 0.8);
  }, [onScoreUpdate]);

  // Reset ball after drain
  const resetBall = useCallback(() => {
    if (currentBall >= totalBalls) {
      // Game Over
      setGameState('gameover');
      retroAudio.stopCavaleiroMatchAudio();
      retroAudio.playPinballDrain();
      retroAudio.speakCavaleiroPhrase('O Cavaleiro Negro reina supremo!');
      triggerGamepadVibration(400, 0.8, 1.0);
      const finalScore = scoreRef.current;
      if (onGameOver) {
        onGameOver(finalScore);
      }
    } else {
      // Next Ball
      setCurrentBall((b) => b + 1);
      setMagnaSaveAvailable(true);
      ballRef.current.x = 450;
      ballRef.current.y = 580;
      ballRef.current.vx = 0;
      ballRef.current.vy = 0;
      ballRef.current.inPlungerLane = true;
      ballRef.current.active = true;
      retroAudio.playPinballDrain();
      retroAudio.speakCavaleiroPhrase('Próxima bola em jogo!');
    }
  }, [currentBall, totalBalls, onGameOver]);

  // Launch plunger ball
  const releasePlunger = useCallback((power: number) => {
    const ball = ballRef.current;
    if (!ball.inPlungerLane) return;

    const force = Math.max(0.35, Math.min(1.0, power));
    ball.vy = -19 * force;
    ball.vx = -1.2 * force;
    ball.inPlungerLane = false;

    retroAudio.playPinballPlunger();
    triggerGamepadVibration(120, 0.5, 0.6);
    spawnHitParticles(ball.x, ball.y + 10, '#EF4444', 15);
  }, []);

  // Unified Flipper & Plunger Handlers with UI Animation State
  const handleLeftDown = useCallback(() => {
    if (!flippersRef.current.leftPressed) {
      flippersRef.current.leftPressed = true;
      setLeftFlipperActiveUI(true);
      retroAudio.playPinballFlipper(true);
      triggerGamepadVibration(45, 0.4, 0.2);
    }
  }, []);

  const handleLeftUp = useCallback(() => {
    if (flippersRef.current.leftPressed) {
      flippersRef.current.leftPressed = false;
      setLeftFlipperActiveUI(false);
      retroAudio.playPinballFlipper(false);
    }
  }, []);

  const handleRightDown = useCallback(() => {
    if (!flippersRef.current.rightPressed) {
      flippersRef.current.rightPressed = true;
      setRightFlipperActiveUI(true);
      retroAudio.playPinballFlipper(true);
      triggerGamepadVibration(45, 0.4, 0.2);
    }
  }, []);

  const handleRightUp = useCallback(() => {
    if (flippersRef.current.rightPressed) {
      flippersRef.current.rightPressed = false;
      setRightFlipperActiveUI(false);
      retroAudio.playPinballFlipper(false);
    }
  }, []);

  const handlePlungerDown = useCallback(() => {
    if (ballRef.current.inPlungerLane) {
      plungerRef.current.pulling = true;
    }
  }, []);

  const handlePlungerUp = useCallback(() => {
    if (plungerRef.current.pulling) {
      plungerRef.current.pulling = false;
      releasePlunger(plungerRef.current.charge);
      plungerRef.current.charge = 0;
      setPlungerCharge(0);
    }
  }, [releasePlunger]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      // Left Flipper
      if (['ArrowLeft', 'KeyA', 'KeyZ', 'ShiftLeft', 'a', 'A', 'z', 'Z'].includes(e.code || e.key)) {
        handleLeftDown();
        e.preventDefault();
      }

      // Right Flipper
      if (['ArrowRight', 'KeyD', 'Slash', 'ShiftRight', 'd', 'D'].includes(e.code || e.key)) {
        handleRightDown();
        e.preventDefault();
      }

      // Plunger Hold
      if (['Space', 'ArrowDown', 'KeyS', 'Enter', 's', 'S'].includes(e.code || e.key)) {
        handlePlungerDown();
        e.preventDefault();
      }

      // Magna-Save
      if (['ControlLeft', 'ControlRight', 'ArrowUp', 'KeyW', 'w', 'W'].includes(e.code || e.key)) {
        triggerMagnaSave();
        e.preventDefault();
      }

      // Start Game (1 or C or Space when idle)
      if (['Digit1', 'KeyC', 'c', 'C'].includes(e.code || e.key) && gameState !== 'playing') {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Left Flipper release
      if (['ArrowLeft', 'KeyA', 'KeyZ', 'ShiftLeft', 'a', 'A', 'z', 'Z'].includes(e.code || e.key)) {
        handleLeftUp();
      }

      // Right Flipper release
      if (['ArrowRight', 'KeyD', 'Slash', 'ShiftRight', 'd', 'D'].includes(e.code || e.key)) {
        handleRightUp();
      }

      // Plunger Release
      if (['Space', 'ArrowDown', 'KeyS', 'Enter', 's', 'S'].includes(e.code || e.key)) {
        handlePlungerUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, handleLeftDown, handleLeftUp, handleRightDown, handleRightUp, handlePlungerDown, handlePlungerUp, startGame, triggerMagnaSave]);

  // Main 60 FPS Physics & Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const gameLoop = () => {
      if (!isRunning) return;

      // 1. GAMEPAD POLLING
      const gp = pollActiveGamepad();
      if (gp.connected) {
        // Start or Restart game
        if (gp.start && !prevGpStartRef.current && gameState !== 'playing') {
          prevGpStartRef.current = true;
          startGame();
        }
        if (!gp.start) prevGpStartRef.current = false;

        // Left flipper via L1 / L2 / DPad Left
        const leftDown = !!(gp.l1 || gp.l2 || gp.dpadLeft || gp.left);
        if (leftDown && !flippersRef.current.leftPressed) {
          handleLeftDown();
        } else if (!leftDown && flippersRef.current.leftPressed) {
          handleLeftUp();
        }

        // Right flipper via R1 / R2 / DPad Right
        const rightDown = !!(gp.r1 || gp.r2 || gp.dpadRight || gp.right);
        if (rightDown && !flippersRef.current.rightPressed) {
          handleRightDown();
        } else if (!rightDown && flippersRef.current.rightPressed) {
          handleRightUp();
        }

        // Plunger pull & release via South (X/A) or Dpad Down
        const plungerAction = !!(gp.buttonSouth || gp.dpadDown || gp.down);
        if (plungerAction && ballRef.current.inPlungerLane && !plungerRef.current.pulling) {
          handlePlungerDown();
          prevGpSouthRef.current = true;
        } else if (!plungerAction && prevGpSouthRef.current && plungerRef.current.pulling) {
          prevGpSouthRef.current = false;
          handlePlungerUp();
        }

        // Magna Save via North (Y/Triangle) or East (Circle/B)
        const magnaBtn = gp.buttonNorth || gp.buttonEast;
        if (magnaBtn && !prevMagnaRef.current) {
          prevMagnaRef.current = true;
          triggerMagnaSave();
        } else if (!magnaBtn) {
          prevMagnaRef.current = false;
        }
      }

      // 2. PLUNGER CHARGE INCREMENT
      if (plungerRef.current.pulling) {
        plungerRef.current.charge = Math.min(1.0, plungerRef.current.charge + 0.028);
        setPlungerCharge(plungerRef.current.charge);
      }

      // 3. FLIPPER ROTATION DYNAMICS
      const flippers = flippersRef.current;
      const flipSpeed = 0.32;
      // Left flipper
      if (flippers.leftPressed) {
        flippers.leftAngle = Math.max(flippers.leftActive, flippers.leftAngle - flipSpeed);
      } else {
        flippers.leftAngle = Math.min(flippers.leftRest, flippers.leftAngle + flipSpeed * 0.7);
      }
      // Right flipper
      if (flippers.rightPressed) {
        flippers.rightAngle = Math.min(flippers.rightActive, flippers.rightAngle + flipSpeed);
        flippers.upperAngle = Math.min(flippers.upperActive, flippers.upperAngle + flipSpeed);
      } else {
        flippers.rightAngle = Math.max(flippers.rightRest, flippers.rightAngle - flipSpeed * 0.7);
        flippers.upperAngle = Math.max(flippers.upperRest, flippers.upperAngle - flipSpeed * 0.7);
      }

      // 4. BALL PHYSICS UPDATE
      if (gameState === 'playing') {
        const ball = ballRef.current;

        if (!ball.inPlungerLane) {
          // Gravity pull down
          ball.vy += 0.22;
          // Air Drag
          ball.vx *= 0.995;
          ball.vy *= 0.995;

          // Max Terminal Velocity
          const maxSpeed = 22;
          const currentSpeed = Math.hypot(ball.vx, ball.vy);
          if (currentSpeed > maxSpeed) {
            ball.vx = (ball.vx / currentSpeed) * maxSpeed;
            ball.vy = (ball.vy / currentSpeed) * maxSpeed;
          }

          ball.x += ball.vx;
          ball.y += ball.vy;

          // Collision: Outer Playfield Boundaries
          // Left Wall
          if (ball.x - ball.radius < 45) {
            ball.x = 45 + ball.radius;
            ball.vx = Math.abs(ball.vx) * 0.75;
            retroAudio.playPinballChime(1);
          }
          // Right Playfield Wall (separates table from plunger lane at x = 430)
          if (ball.x + ball.radius > 430 && ball.y > 140) {
            ball.x = 430 - ball.radius;
            ball.vx = -Math.abs(ball.vx) * 0.75;
            retroAudio.playPinballChime(1);
          }
          // Top Curved Arch Boundary
          if (ball.y - ball.radius < 45) {
            ball.y = 45 + ball.radius;
            ball.vy = Math.abs(ball.vy) * 0.7;
            // Guide towards upper center
            if (ball.x > 300) ball.vx -= 2;
          }

          // Top Arch Curve (Top-Left corner curve)
          const distTopLeft = Math.hypot(ball.x - 120, ball.y - 120);
          if (ball.x < 120 && ball.y < 120 && distTopLeft > 95) {
            const angle = Math.atan2(ball.y - 120, ball.x - 120);
            ball.vx = Math.cos(angle + Math.PI / 2) * Math.abs(ball.vx);
            ball.vy = Math.abs(ball.vy) * 0.8;
          }

          // BUMPER COLLISIONS
          for (const b of bumpersRef.current) {
            const dist = Math.hypot(ball.x - b.x, ball.y - b.y);
            const minDist = ball.radius + b.radius;
            if (dist < minDist) {
              const angle = Math.atan2(ball.y - b.y, ball.x - b.x);
              const pushPower = 9.5;
              ball.vx = Math.cos(angle) * pushPower;
              ball.vy = Math.sin(angle) * pushPower;

              b.flashTimer = 14;
              spawnHitParticles(b.x, b.y, b.color, 16);
              retroAudio.playPinballBumper();
              triggerGamepadVibration(75, 0.45, 0.5);
              addScore(b.points, `+${b.points}`, b.x, b.y - 15);
            }
            if (b.flashTimer > 0) b.flashTimer--;
          }

          // SLINGSHOT COLLISIONS
          for (const s of slingshotsRef.current) {
            // Check collision with front diagonal face (x1, y1) to (x2, y2)
            const dx = s.x2 - s.x1;
            const dy = s.y2 - s.y1;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len;
            const ny = dx / len;

            // Distance to line
            const proj = ((ball.x - s.x1) * dx + (ball.y - s.y1) * dy) / (len * len);
            if (proj >= 0 && proj <= 1) {
              const closestX = s.x1 + proj * dx;
              const closestY = s.y1 + proj * dy;
              const distToLine = Math.hypot(ball.x - closestX, ball.y - closestY);

              if (distToLine < ball.radius + 6) {
                ball.vx = s.kickVx;
                ball.vy = s.kickVy;
                s.flashTimer = 12;
                spawnHitParticles(closestX, closestY, '#FACC15', 18);
                retroAudio.playPinballSlingshot();
                triggerGamepadVibration(90, 0.55, 0.65);
                addScore(250, '+250', closestX, closestY);
              }
            }
            if (s.flashTimer > 0) s.flashTimer--;
          }

          // DROP TARGETS COLLISIONS
          const checkTargetBank = (targets: DropTarget[]) => {
            let allDown = true;
            for (const t of targets) {
              if (t.active) {
                allDown = false;
                if (
                  ball.x + ball.radius >= t.x &&
                  ball.x - ball.radius <= t.x + t.width &&
                  ball.y + ball.radius >= t.y &&
                  ball.y - ball.radius <= t.y + t.height
                ) {
                  t.active = false;
                  ball.vx = -ball.vx * 0.8;
                  spawnHitParticles(t.x + t.width / 2, t.y + t.height / 2, t.color, 14);
                  retroAudio.playPinballChime(3);
                  triggerGamepadVibration(80, 0.4, 0.45);
                  addScore(t.points, '+1.000', t.x, t.y);
                }
              }
            }
            // Bank cleared! Reset and advance multiplier
            if (allDown) {
              targets.forEach((t) => (t.active = true));
              setMultiplier((m) => Math.min(5, m + 1));
              retroAudio.playCavaleiroFanfare();
              retroAudio.speakCavaleiroPhrase('Multiplicador aumentado!');
              addScore(5000, 'BÔNUS MULTIPLICADOR!', 240, 300);
            }
          };

          checkTargetBank(leftTargetsRef.current);
          checkTargetBank(rightTargetsRef.current);

          // UPPER SPLIT-LEVEL RAMP ENTRANCE (Cavaleiro Ramp)
          const rampX = 350;
          const rampY = 320;
          if (
            ball.x >= rampX - 25 &&
            ball.x <= rampX + 25 &&
            ball.y >= rampY - 15 &&
            ball.y <= rampY + 15 &&
            ball.vy < -2
          ) {
            // Ball rides the ramp up!
            ball.vy = -14;
            ball.vx = -2.5;
            spawnHitParticles(rampX, rampY, '#00F0FF', 22);
            retroAudio.playCavaleiroFanfare();
            addScore(2500, 'RAMPA DO CAVALEIRO!', rampX, rampY - 20);
          }

          // FLIPPER COLLISIONS
          // 1. Left Flipper Collision
          const leftP = flippers.leftPivot;
          const leftTipX = leftP.x + Math.cos(flippers.leftAngle) * flippers.length;
          const leftTipY = leftP.y + Math.sin(flippers.leftAngle) * flippers.length;

          const ldx = leftTipX - leftP.x;
          const ldy = leftTipY - leftP.y;
          const lLen = Math.hypot(ldx, ldy);
          const lProj = ((ball.x - leftP.x) * ldx + (ball.y - leftP.y) * ldy) / (lLen * lLen);

          if (lProj >= 0 && lProj <= 1) {
            const closeX = leftP.x + lProj * ldx;
            const closeY = leftP.y + lProj * ldy;
            const dist = Math.hypot(ball.x - closeX, ball.y - closeY);

            if (dist < ball.radius + 8) {
              // Ball hits flipper surface
              const normalX = -ldy / lLen;
              const normalY = ldx / lLen;

              // If flipper is moving up, give massive upward velocity based on leverage
              const flipKick = flippers.leftPressed ? -15 - lProj * 5 : -4;
              ball.vy = flipKick;
              ball.vx = 4 + lProj * 6;

              spawnHitParticles(closeX, closeY, '#EF4444', 10);
              retroAudio.playPinballFlipper(true);
              triggerGamepadVibration(65, 0.45, 0.4);
              addScore(100);
            }
          }

          // 2. Right Flipper Collision
          const rightP = flippers.rightPivot;
          const rightTipX = rightP.x + Math.cos(flippers.rightAngle) * flippers.length;
          const rightTipY = rightP.y + Math.sin(flippers.rightAngle) * flippers.length;

          const rdx = rightTipX - rightP.x;
          const rdy = rightTipY - rightP.y;
          const rLen = Math.hypot(rdx, rdy);
          const rProj = ((ball.x - rightP.x) * rdx + (ball.y - rightP.y) * rdy) / (rLen * rLen);

          if (rProj >= 0 && rProj <= 1) {
            const closeX = rightP.x + rProj * rdx;
            const closeY = rightP.y + rProj * rdy;
            const dist = Math.hypot(ball.x - closeX, ball.y - closeY);

            if (dist < ball.radius + 8) {
              const flipKick = flippers.rightPressed ? -15 - rProj * 5 : -4;
              ball.vy = flipKick;
              ball.vx = -4 - rProj * 6;

              spawnHitParticles(closeX, closeY, '#EF4444', 10);
              retroAudio.playPinballFlipper(true);
              triggerGamepadVibration(65, 0.45, 0.4);
              addScore(100);
            }
          }

          // 3. Upper Right Flipper Collision
          const upP = flippers.upperPivot;
          const upTipX = upP.x + Math.cos(flippers.upperAngle) * flippers.upperLength;
          const upTipY = upP.y + Math.sin(flippers.upperAngle) * flippers.upperLength;

          const udx = upTipX - upP.x;
          const udy = upTipY - upP.y;
          const uLen = Math.hypot(udx, udy);
          const uProj = ((ball.x - upP.x) * udx + (ball.y - upP.y) * udy) / (uLen * uLen);

          if (uProj >= 0 && uProj <= 1) {
            const closeX = upP.x + uProj * udx;
            const closeY = upP.y + uProj * udy;
            const dist = Math.hypot(ball.x - closeX, ball.y - closeY);

            if (dist < ball.radius + 8) {
              const flipKick = flippers.rightPressed ? -14 : -3;
              ball.vy = flipKick;
              ball.vx = -5;
              spawnHitParticles(closeX, closeY, '#F59E0B', 10);
              retroAudio.playPinballFlipper(true);
              triggerGamepadVibration(60, 0.4, 0.35);
              addScore(200);
            }
          }

          // BALL DRAIN CHECK
          if (ball.y > CANVAS_HEIGHT + 20) {
            // Ball drained!
            resetBall();
          }
        }
      }

      // 5. UPDATE PARTICLES & FLOATING SCORES
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life >= p.maxLife) particlesRef.current.splice(i, 1);
      }

      for (let i = floatingScoresRef.current.length - 1; i >= 0; i--) {
        const f = floatingScoresRef.current[i];
        f.y -= 0.8;
        f.life++;
        if (f.life >= f.maxLife) floatingScoresRef.current.splice(i, 1);
      }

      // ==========================================
      // 6. RENDER PINBALL TABLE GRAPHICS
      // ==========================================
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background: If image loaded, draw table background with aspect-fill crop, else procedural styling
      if (playfieldImgRef.current && imgLoaded) {
        const img = playfieldImgRef.current;
        const targetAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
        const imgAspect = img.naturalWidth / img.naturalHeight;

        if (imgAspect > targetAspect) {
          // Wider than canvas: crop center horizontally
          const sHeight = img.naturalHeight;
          const sWidth = sHeight * targetAspect;
          const sx = (img.naturalWidth - sWidth) / 2;
          ctx.drawImage(img, sx, 0, sWidth, sHeight, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
          // Taller than canvas: crop center vertically
          const sWidth = img.naturalWidth;
          const sHeight = sWidth / targetAspect;
          const sy = (img.naturalHeight - sHeight) / 2;
          ctx.drawImage(img, 0, sy, sWidth, sHeight, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
      } else {
        // Deep medieval royal crimson & obsidian gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        bgGrad.addColorStop(0, '#0F0408');
        bgGrad.addColorStop(0.3, '#3B0712');
        bgGrad.addColorStop(0.7, '#1C0409');
        bgGrad.addColorStop(1, '#080103');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // 3D Inner Side Blades & Depth Shadows
      // Left side wooden wall depth shadow
      const leftShadow = ctx.createLinearGradient(0, 0, 48, 0);
      leftShadow.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
      leftShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = leftShadow;
      ctx.fillRect(0, 0, 48, CANVAS_HEIGHT);

      // Right side wooden wall depth shadow
      const rightShadow = ctx.createLinearGradient(CANVAS_WIDTH, 0, CANVAS_WIDTH - 48, 0);
      rightShadow.addColorStop(0, 'rgba(0, 0, 0, 0.78)');
      rightShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = rightShadow;
      ctx.fillRect(CANVAS_WIDTH - 48, 0, 48, CANVAS_HEIGHT);

      // Top Backbox Downward Drop Shadow
      const topShadow = ctx.createLinearGradient(0, 0, 0, 65);
      topShadow.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
      topShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topShadow;
      ctx.fillRect(0, 0, CANVAS_WIDTH, 65);

      // Multi-Level Upper Playfield Platform 3D Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(110, 240, 160, 12);

      // Subtle table gloss & metallic bevel outline
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 20, CANVAS_WIDTH - 60, CANVAS_HEIGHT - 25);

      // Plunger Lane Divider
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(430, 160);
      ctx.lineTo(430, CANVAS_HEIGHT - 20);
      ctx.stroke();

      // Curved Arch at Top Right into Upper Playfield
      ctx.beginPath();
      ctx.arc(380, 160, 50, -Math.PI / 2, 0, false);
      ctx.stroke();

      // Magna-Save Indicator Coils (Defesa Magnética)
      ctx.save();
      const leftMagnaPulse = magnaSaveActive ? Math.sin(Date.now() / 40) * 0.4 + 0.6 : (magnaSaveAvailable ? 0.35 : 0.1);
      ctx.fillStyle = `rgba(0, 240, 255, ${leftMagnaPulse})`;
      ctx.strokeStyle = '#00F0FF';
      ctx.lineWidth = 1.5;
      // Left coil
      ctx.beginPath();
      ctx.arc(80, 520, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Right coil
      ctx.beginPath();
      ctx.arc(395, 520, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 8px Orbitron, sans-serif';
      ctx.fillStyle = '#E0F2FE';
      ctx.textAlign = 'center';
      ctx.fillText('MAGNA', 80, 522);
      ctx.fillText('SAVE', 80, 532);
      ctx.fillText('MAGNA', 395, 522);
      ctx.fillText('SAVE', 395, 532);
      ctx.restore();

      // Draw Central Sword Ladder & Multipliers
      ctx.save();
      const multipliers = [2, 3, 4, 5];
      multipliers.forEach((m, idx) => {
        const my = 420 - idx * 35;
        const isLit = multiplier >= m;
        ctx.fillStyle = isLit ? '#FACC15' : 'rgba(250, 204, 21, 0.2)';
        ctx.strokeStyle = isLit ? '#FFFFFF' : '#78350F';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = isLit ? '#FACC15' : 'transparent';
        ctx.shadowBlur = isLit ? 15 : 0;
        ctx.beginPath();
        ctx.arc(235, my, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11px Orbitron, sans-serif';
        ctx.fillStyle = isLit ? '#000000' : '#A16207';
        ctx.textAlign = 'center';
        ctx.fillText(`${m}X`, 235, my + 4);
      });
      ctx.restore();

      // Draw Bumpers
      for (const b of bumpersRef.current) {
        ctx.save();
        ctx.translate(b.x, b.y);

        const isFlashing = b.flashTimer > 0;
        // Outer Glow
        ctx.shadowColor = b.color;
        ctx.shadowBlur = isFlashing ? 28 : 12;

        // Bumper Cap Ring
        ctx.fillStyle = isFlashing ? '#FFFFFF' : b.color;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner Metallic Ring
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Center Crest
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(0, 0, b.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Slingshots
      for (const s of slingshotsRef.current) {
        ctx.save();
        const isKicking = s.flashTimer > 0;
        ctx.fillStyle = isKicking ? 'rgba(250, 204, 21, 0.9)' : 'rgba(220, 38, 38, 0.85)';
        ctx.strokeStyle = isKicking ? '#FFFFFF' : '#F59E0B';
        ctx.lineWidth = 2;
        ctx.shadowColor = isKicking ? '#FACC15' : 'transparent';
        ctx.shadowBlur = isKicking ? 18 : 0;

        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.lineTo(s.x3, s.y3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Golden Lion emblem inside slingshot
        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 9px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🦁 2000', (s.x1 + s.x2 + s.x3) / 3, (s.y1 + s.y2 + s.y3) / 3 + 3);
        ctx.restore();
      }

      // Draw Drop Target Banks
      const drawTargets = (targets: DropTarget[]) => {
        for (const t of targets) {
          ctx.save();
          if (t.active) {
            ctx.fillStyle = '#FACC15';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#FACC15';
            ctx.shadowBlur = 8;
            ctx.fillRect(t.x, t.y, t.width, t.height);
            ctx.strokeRect(t.x, t.y, t.width, t.height);
          } else {
            // Target is down
            ctx.fillStyle = '#451A03';
            ctx.fillRect(t.x, t.y, t.width, t.height);
          }
          ctx.restore();
        }
      };

      drawTargets(leftTargetsRef.current);
      drawTargets(rightTargetsRef.current);

      // Draw Flippers (using flippers from flippersRef)
      const drawFlipper = (
        pivot: { x: number; y: number },
        angle: number,
        length: number,
        isLeft: boolean
      ) => {
        ctx.save();
        ctx.translate(pivot.x, pivot.y);
        ctx.rotate(angle);

        // Flipper Body (White & Red Classic 80s Pinball Bat)
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#EF4444';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.arc(0, 0, 11, Math.PI / 2, -Math.PI / 2, true);
        ctx.lineTo(length, -5);
        ctx.arc(length, 0, 5, -Math.PI / 2, Math.PI / 2, false);
        ctx.lineTo(0, 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Rubber Band Center
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(length * 0.25, -2.5, length * 0.5, 5);

        // Solenoid Pivot Cap
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      // Left Flipper
      drawFlipper(flippers.leftPivot, flippers.leftAngle, flippers.length, true);
      // Right Flipper
      drawFlipper(flippers.rightPivot, flippers.rightAngle, flippers.length, false);
      // Upper Right Flipper
      drawFlipper(flippers.upperPivot, flippers.upperAngle, flippers.upperLength, false);

      // Draw Plunger Mechanism & Spring
      ctx.save();
      const plungerY = 620 + plungerRef.current.charge * 24;
      ctx.fillStyle = '#64748B';
      ctx.fillRect(445, plungerY, 10, 40);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      for (let s = 0; s < 6; s++) {
        const sy = plungerY + s * 5;
        ctx.beginPath();
        ctx.moveTo(443, sy);
        ctx.lineTo(457, sy + 3);
        ctx.stroke();
      }
      ctx.restore();

      // Draw Pinball Steel Ball (Chrome Specular Sphere)
      const ball = ballRef.current;
      if (ball.active) {
        ctx.save();
        ctx.translate(ball.x, ball.y);

        // Ball Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(2, 4, ball.radius, ball.radius * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3D Chrome Sphere Gradient
        const ballGrad = ctx.createRadialGradient(
          -ball.radius * 0.3,
          -ball.radius * 0.3,
          1,
          0,
          0,
          ball.radius
        );
        ballGrad.addColorStop(0, '#FFFFFF');
        ballGrad.addColorStop(0.3, '#E2E8F0');
        ballGrad.addColorStop(0.7, '#64748B');
        ballGrad.addColorStop(1, '#1E293B');

        ctx.fillStyle = ballGrad;
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.fill();

        // Specular White Highlight Gleam
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-ball.radius * 0.35, -ball.radius * 0.35, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // Draw Particles
      for (const p of particlesRef.current) {
        ctx.save();
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Draw Floating Scores
      for (const f of floatingScoresRef.current) {
        ctx.save();
        const alpha = Math.max(0, 1 - f.life / f.maxLife);
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 15px Orbitron, sans-serif';
        ctx.fillStyle = f.color;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = 12;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }

      // Overlay if not playing
      if (gameState !== 'playing') {
        ctx.save();
        ctx.fillStyle = 'rgba(10, 4, 8, 0.85)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.textAlign = 'center';
        if (gameState === 'idle') {
          ctx.font = 'bold 26px Orbitron, sans-serif';
          ctx.fillStyle = '#FACC15';
          ctx.shadowColor = '#FACC15';
          ctx.shadowBlur = 18;
          ctx.fillText('CAVALEIRO NEGRO', CANVAS_WIDTH / 2, 280);
          ctx.shadowBlur = 0;

          ctx.font = 'bold 14px monospace';
          ctx.fillStyle = '#EF4444';
          ctx.fillText('PINBALL CLÁSSICO DOS ANOS 80', CANVAS_WIDTH / 2, 315);

          ctx.font = '13px sans-serif';
          ctx.fillStyle = '#F1F5F9';
          ctx.fillText('"Eu sou o cavaleiro negro a procura de um desafio!"', CANVAS_WIDTH / 2, 350);

          ctx.font = '11px monospace';
          ctx.fillStyle = '#94A3B8';
          ctx.fillText('MANETES: [A / Z / ◄] Esquerda | [D / / / ►] Direita', CANVAS_WIDTH / 2, 400);
          ctx.fillText('LANÇAR BOLA: Pressione e solte [ESPAÇO] ou [▼]', CANVAS_WIDTH / 2, 422);
          ctx.fillText('JOYSTICK USB: [L1/L2] Esquerda | [R1/R2] Direita | [Botão X] Lançar', CANVAS_WIDTH / 2, 444);
        } else if (gameState === 'gameover') {
          ctx.font = 'bold 32px Orbitron, sans-serif';
          ctx.fillStyle = '#EF4444';
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 20;
          ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 280);
          ctx.shadowBlur = 0;

          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = '#FACC15';
          ctx.fillText(`PONTUAÇÃO FINAL: ${score.toLocaleString('pt-BR')} PTS`, CANVAS_WIDTH / 2, 325);

          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#E2E8F0';
          ctx.fillText('Pressione [JOGAR AGORA] ou [START] no joystick para um novo desafio!', CANVAS_WIDTH / 2, 370);
        }
        ctx.restore();
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      retroAudio.stopCavaleiroMatchAudio();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, imgLoaded, resetBall, addScore, releasePlunger, startGame, triggerMagnaSave]);

  return (
    <div className="flex flex-col items-center bg-[#07040A] rounded-2xl border-2 border-amber-500/40 p-3 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Background Medieval Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-amber-600/15 via-red-600/10 to-transparent blur-3xl pointer-events-none" />

      {/* VIEWPOINT & CABINET PERSPECTIVE SELECTOR BAR */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2.5 p-2 sm:p-2.5 bg-slate-950/90 rounded-xl border border-amber-500/30 shadow-lg relative z-20">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-orbitron font-bold text-amber-300">
            <Eye className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">PONTO DE VISTA:</span>
          </div>

          <div className="flex items-center gap-1 bg-black/70 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewpoint('cabinet')}
              className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-orbitron font-bold transition-all cursor-pointer ${
                viewpoint === 'cabinet'
                  ? 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Ponto de vista 3D clássico: de frente para a máquina analógica"
            >
              🎮 3D MÁQUINA CLÁSSICA
            </button>
            <button
              onClick={() => setViewpoint('immersive')}
              className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-orbitron font-bold transition-all cursor-pointer ${
                viewpoint === 'immersive'
                  ? 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Perspectiva 3D inclinada com ângulo mais agressivo"
            >
              🎯 3D AÇÃO
            </button>
            <button
              onClick={() => setViewpoint('topdown')}
              className={`px-2.5 py-1 rounded text-[10px] sm:text-[11px] font-orbitron font-bold transition-all cursor-pointer ${
                viewpoint === 'topdown'
                  ? 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title="Visão técnica direta 2D (top-down)"
            >
              📐 2D DIRETA
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Glass Specular Glare Toggle */}
          <button
            onClick={() => setShowGlassReflect(!showGlassReflect)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1 ${
              showGlassReflect
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
            title="Ativar/desativar efeito do reflexo do vidro temperado sobre a mesa"
          >
            <Sparkles className="w-3 h-3" />
            <span>{showGlassReflect ? 'VIDRO: ON' : 'VIDRO: OFF'}</span>
          </button>

          {/* Authentic Voice Trigger Button */}
          <button
            onClick={triggerVoiceIntro}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-orbitron font-bold text-[11px] shadow-[0_0_15px_rgba(239,68,68,0.6)] border border-amber-400 transition-all cursor-pointer active:scale-95"
            title="Ouvir a voz oficial original da máquina Taito"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-amber-300" />
            <span className="hidden sm:inline">VOZ DO CAVALEIRO</span>
            <span className="sm:hidden">VOZ</span>
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              retroAudio.setMuted(newMuted);
            }}
            className="p-1.5 rounded-lg bg-black/80 border border-amber-500/40 text-amber-300 hover:text-white transition cursor-pointer"
            title={isMuted ? 'Ativar Áudio' : 'Mutar Áudio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle Button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className={`p-1.5 px-2.5 rounded-lg border font-orbitron font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1 ${
                isFullscreen
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                  : 'bg-black/80 border-amber-500/40 text-amber-300 hover:text-white hover:bg-slate-800/60'
              }`}
              title={isFullscreen ? 'Sair da Tela Cheia (ESC)' : 'Ativar Tela Cheia Full Screen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{isFullscreen ? 'SAIR TELA CHEIA' : 'TELA CHEIA'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3D PINBALL MACHINE CABINET STAGE */}
      <div
        className="w-full max-w-[530px] mx-auto flex flex-col items-center relative select-none"
        style={{
          perspective: viewpoint === 'topdown' ? 'none' : viewpoint === 'immersive' ? '920px' : '1150px',
          perspectiveOrigin: '50% 65%',
        }}
      >
        {/* ========================================================
            1. BACKBOX (CABECEIRA VERTICAL DO FLIPERAMA TAITO)
            ======================================================== */}
        <div
          className="w-full relative rounded-2xl overflow-hidden border-4 border-[#2A1208] shadow-[0_20px_45px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.25)] bg-[#120609] z-10 transition-transform duration-500"
          style={{
            transform: viewpoint === 'cabinet'
              ? 'translateZ(20px) rotateX(-4deg)'
              : viewpoint === 'immersive'
              ? 'translateZ(30px) rotateX(-6deg)'
              : 'none',
            transformOrigin: '50% 100%',
          }}
        >
          {/* Backglass Real Artwork Asset */}
          <div className="relative w-full h-40 sm:h-48 md:h-56 overflow-hidden bg-black flex items-center justify-center">
            <img
              src="/assets/aistudio/image_2ed561ed.png"
              alt="Cavaleiro Negro Pinball Backglass"
              className="w-full h-full object-cover object-center brightness-95"
            />
            {/* Ambient Shadow & Neon Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

            {/* Backbox Speaker Grilles (Left & Right Cutouts) */}
            <div className="absolute top-2 left-2 flex gap-1 pointer-events-none opacity-40">
              <div className="w-1 h-6 bg-amber-400/80 rounded-full" />
              <div className="w-1 h-6 bg-amber-400/80 rounded-full" />
              <div className="w-1 h-6 bg-amber-400/80 rounded-full" />
            </div>
            <div className="absolute top-2 right-2 flex gap-1 pointer-events-none opacity-40">
              <div className="w-1 h-6 bg-amber-400/80 rounded-full" />
              <div className="w-1 h-6 bg-amber-400/80 rounded-full" />
              <div className="w-1 h-6 bg-amber-400/80 rounded-full" />
            </div>

            {/* Authentic 7-Segment Digital LED Displays Overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap items-center justify-between gap-2 z-20 bg-black/90 p-2.5 rounded-xl border border-amber-500/40 backdrop-blur-md">
              {/* Player 1 Score LED Display */}
              <div>
                <div className="text-[10px] font-mono text-amber-400/90 font-bold flex items-center gap-1">
                  <span>JOGADOR 1</span>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                </div>
                <div className="font-mono font-black text-xl sm:text-2xl text-amber-400 tracking-widest drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                  {score.toString().padStart(6, '0')}
                </div>
              </div>

              {/* High Score / Recorde LED */}
              <div className="hidden sm:block">
                <div className="text-[10px] font-mono text-cyan-400 font-bold">RECORDE GERAL</div>
                <div className="font-mono font-black text-lg text-cyan-300 tracking-widest">
                  {highScore.toString().padStart(6, '0')}
                </div>
              </div>

              {/* Balls in Play, Multiplier & Magna-Save Status */}
              <div className="flex items-center gap-3 sm:gap-4 text-center">
                <div>
                  <div className="text-[9px] font-mono text-red-400 font-bold">BOLA</div>
                  <div className="font-mono font-black text-lg text-red-500">
                    {currentBall} <span className="text-xs text-slate-400">/ {totalBalls}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-mono text-yellow-400 font-bold">BÔNUS</div>
                  <div className="font-mono font-black text-lg text-yellow-400">
                    {multiplier}X
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-mono text-emerald-400 font-bold">DEFESA MAG.</div>
                  <div className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${magnaSaveAvailable ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' : 'bg-red-500/20 text-red-400 border border-red-500/40'}`}>
                    {magnaSaveAvailable ? 'PRONTA' : 'USADA'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Speech Banner Alert */}
          {voiceNotice && (
            <div className="bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border-t border-amber-500/40 p-2 text-center text-xs font-orbitron font-bold text-amber-300 animate-in fade-in flex items-center justify-center gap-2">
              <Radio className="w-4 h-4 text-amber-400 animate-spin" />
              <span>{voiceNotice}</span>
            </div>
          )}
        </div>

        {/* Ambient Downward Light Spill from Backbox onto Playfield */}
        <div className="w-full h-4 bg-gradient-to-b from-amber-500/25 via-red-500/10 to-transparent pointer-events-none -mt-1 relative z-10" />

        {/* ========================================================
            2. SLANTED 3D PLAYFIELD CHAMBER (A MESA DE JOGO REALISTA)
            ======================================================== */}
        <div
          className="w-full relative transition-transform duration-500"
          style={{
            transform: viewpoint === 'cabinet'
              ? 'rotateX(23deg) translateY(-8px)'
              : viewpoint === 'immersive'
              ? 'rotateX(31deg) translateY(-22px) scale(1.03)'
              : 'none',
            transformOrigin: '50% 90%',
            transformStyle: 'preserve-3d',
            filter: 'drop-shadow(0 35px 50px rgba(0,0,0,0.95))',
          }}
        >
          {/* Wooden Outer Cabinet Trim */}
          <div className="relative rounded-2xl p-2.5 sm:p-3 bg-gradient-to-b from-[#250912] via-[#150409] to-[#0A0205] border-x-4 border-t-2 border-b-6 border-[#3D141E] shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)]">
            
            {/* LEFT STAINLESS STEEL SIDE RAIL WITH INTEGRATED FLIPPER BUTTON */}
            <div className="absolute top-2 bottom-8 -left-3 sm:-left-4 w-4 sm:w-5 bg-gradient-to-r from-slate-600 via-slate-200 to-slate-500 rounded-l-md border-r border-slate-700 shadow-[0_10px_20px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between py-6 pointer-events-auto z-30">
              {/* Chrome Rivets */}
              <div className="w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-sm" />
              <div className="w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-sm" />

              {/* Physical Red Arcade Flipper Button (Left Flank) */}
              <button
                onMouseDown={handleLeftDown}
                onMouseUp={handleLeftUp}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleLeftDown();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleLeftUp();
                }}
                className={`w-7 sm:w-8 h-12 -left-2 sm:-left-3 relative rounded-l-xl bg-gradient-to-r from-red-600 via-rose-500 to-red-700 border-2 border-red-300 transition-all cursor-pointer flex items-center justify-center ${
                  leftFlipperActiveUI
                    ? 'translate-x-1 shadow-inner brightness-125'
                    : 'shadow-[0_0_14px_rgba(239,68,68,0.8)]'
                }`}
                title="Botão Flipper Esquerdo da Máquina"
              >
                <div className="w-1.5 h-6 bg-white/40 rounded-full" />
              </button>

              <div className="w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-sm" />
            </div>

            {/* RIGHT STAINLESS STEEL SIDE RAIL WITH INTEGRATED FLIPPER BUTTON */}
            <div className="absolute top-2 bottom-8 -right-3 sm:-right-4 w-4 sm:w-5 bg-gradient-to-l from-slate-600 via-slate-200 to-slate-500 rounded-r-md border-l border-slate-700 shadow-[0_10px_20px_rgba(0,0,0,0.8)] flex flex-col items-center justify-between py-6 pointer-events-auto z-30">
              {/* Chrome Rivets */}
              <div className="w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-sm" />
              <div className="w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-sm" />

              {/* Physical Red Arcade Flipper Button (Right Flank) */}
              <button
                onMouseDown={handleRightDown}
                onMouseUp={handleRightUp}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleRightDown();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleRightUp();
                }}
                className={`w-7 sm:w-8 h-12 -right-2 sm:-right-3 relative rounded-r-xl bg-gradient-to-l from-red-600 via-rose-500 to-red-700 border-2 border-red-300 transition-all cursor-pointer flex items-center justify-center ${
                  rightFlipperActiveUI
                    ? '-translate-x-1 shadow-inner brightness-125'
                    : 'shadow-[0_0_14px_rgba(239,68,68,0.8)]'
                }`}
                title="Botão Flipper Direito da Máquina"
              >
                <div className="w-1.5 h-6 bg-white/40 rounded-full" />
              </button>

              <div className="w-2 h-2 rounded-full bg-slate-300 border border-slate-600 shadow-sm" />
            </div>

            {/* INNER PLAYFIELD CHAMBER (CANVAS & GLASS) */}
            <div className="relative rounded-xl overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.95)] border-2 border-amber-600/50 bg-black">
              {/* Main HTML5 Physics Canvas */}
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="w-full max-w-[480px] h-auto block mx-auto"
                style={{ imageRendering: 'pixelated' }}
              />

              {/* REALISTIC TEMPERED PLAYFIELD GLASS (VIDRO COM REFLEXO AMBIENTE) */}
              {showGlassReflect && (
                <div
                  className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
                  style={{
                    background:
                      'linear-gradient(115deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.03) 22%, transparent 45%, rgba(255,255,255,0.05) 70%, transparent 100%)',
                    boxShadow: 'inset 0 0 25px rgba(255,255,255,0.05), inset 0 0 60px rgba(0,0,0,0.4)',
                  }}
                >
                  {/* Subtle Glass Bevel Reflection Strip */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
              )}

              {/* INTERACTIVE DIRECT TOUCH ZONES ON PLAYFIELD GLASS */}
              <div className="absolute inset-0 flex z-20">
                {/* Left Half: Tap to fire Left Flipper */}
                <div
                  onMouseDown={handleLeftDown}
                  onMouseUp={handleLeftUp}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleLeftDown();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleLeftUp();
                  }}
                  className="w-1/2 h-full cursor-pointer active:bg-red-500/5 transition-colors"
                  title="Toque no lado esquerdo para acionar o Flipper Esquerdo"
                />

                {/* Right Half: Tap to fire Right Flipper */}
                <div
                  onMouseDown={handleRightDown}
                  onMouseUp={handleRightUp}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleRightDown();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleRightUp();
                  }}
                  className="w-1/2 h-full cursor-pointer active:bg-red-500/5 transition-colors"
                  title="Toque no lado direito para acionar o Flipper Direito"
                />
              </div>
            </div>

            {/* ========================================================
                3. FRONT STAINLESS STEEL LOCKBAR (BARRA FRONTAL CROMADA)
                ======================================================== */}
            <div className="relative mt-2 h-11 sm:h-12 w-full rounded-b-xl bg-gradient-to-b from-slate-400 via-slate-100 to-slate-500 border-t-2 border-slate-100 border-b-3 border-slate-800 shadow-[0_12px_25px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.8)] flex items-center justify-between px-3 sm:px-4 z-20">
              {/* Left Chrome Mount Screw */}
              <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-600 border border-slate-700 shadow-sm flex items-center justify-center">
                <div className="w-2 h-0.5 bg-slate-800 rotate-45" />
              </div>

              {/* Engraved Vintage Taito Emblem Plate */}
              <div className="flex items-center gap-2 px-3 py-0.5 rounded bg-black/70 border border-amber-500/40 shadow-inner">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-orbitron font-black text-[10px] sm:text-xs text-amber-300 tracking-wider">
                  TAITO DO BRASIL • 1980 • CAVALEIRO NEGRO
                </span>
              </div>

              {/* Right Side Plunger Mechanism (Knob & Spring extending out) */}
              <div className="flex items-center gap-1.5">
                {/* Mechanical Spring Plunger Interactive Handle */}
                <div
                  onMouseDown={handlePlungerDown}
                  onMouseUp={handlePlungerUp}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handlePlungerDown();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handlePlungerUp();
                  }}
                  className={`flex items-center cursor-pointer transition-transform ${
                    plungerCharge > 0 ? 'translate-y-1 sm:translate-y-1.5' : ''
                  }`}
                  title="Puxador da mola (Plunger) - Puxe e solte para disparar a bola"
                >
                  {/* Chrome Spring Coil Visual */}
                  <div className="flex flex-col gap-0.5">
                    <div className="w-4 h-1 bg-slate-700 rounded-full border border-slate-400" />
                    <div className="w-4 h-1 bg-slate-700 rounded-full border border-slate-400" />
                    <div className="w-4 h-1 bg-slate-700 rounded-full border border-slate-400" />
                  </div>
                  {/* Heavy Rubber Plunger Knob */}
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-br from-red-600 via-rose-500 to-red-800 border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.7)] flex items-center justify-center active:scale-95 transition-all ${
                      plungerCharge > 0 ? 'scale-110 ring-2 ring-amber-400' : ''
                    }`}
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>

                {/* Right Chrome Mount Screw */}
                <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-slate-200 to-slate-600 border border-slate-700 shadow-sm flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-slate-800 -rotate-45" />
                </div>
              </div>
            </div>

            {/* CHROME CABINET LEGS (PÉS DE FERRO DO FLIPERAMA) */}
            <div className="flex items-center justify-between px-4 -mt-1 pointer-events-none">
              {/* Left Front Leg */}
              <div className="w-6 h-8 bg-gradient-to-r from-slate-500 via-slate-200 to-slate-600 border-x border-b border-slate-800 shadow-2xl rounded-b flex flex-col items-center justify-end pb-1">
                <div className="w-4 h-1.5 bg-slate-900 rounded-full" />
              </div>
              {/* Right Front Leg */}
              <div className="w-6 h-8 bg-gradient-to-r from-slate-500 via-slate-200 to-slate-600 border-x border-b border-slate-800 shadow-2xl rounded-b flex flex-col items-center justify-end pb-1">
                <div className="w-4 h-1.5 bg-slate-900 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ERGONOMIC PINBALL CONTROLS (TOUCH & MOBILE BUTTONS + KEYBOARD HINTS) */}
      <div className="w-full max-w-xl flex flex-col gap-3 bg-[#11050A] p-3 rounded-xl border border-amber-500/30 relative z-20">
        {/* Flipper Buttons Bar (Left & Right Manetes) */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Flipper Button */}
          <button
            onMouseDown={handleLeftDown}
            onMouseUp={handleLeftUp}
            onTouchStart={(e) => {
              e.preventDefault();
              handleLeftDown();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleLeftUp();
            }}
            className={`flex-1 h-14 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 active:from-red-500 active:to-amber-500 text-white font-orbitron font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(239,68,68,0.5)] border-2 border-red-400 active:scale-95 transition-all cursor-pointer select-none ${
              leftFlipperActiveUI ? 'brightness-125 ring-2 ring-white scale-98' : ''
            }`}
            title="Manete Esquerdo [A, Z, Seta Esquerda]"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>FLIPPER ESQ</span>
          </button>

          {/* Magna-Save Button */}
          <button
            onClick={triggerMagnaSave}
            disabled={!magnaSaveAvailable || gameState !== 'playing'}
            className={`px-3 sm:px-4 h-14 rounded-2xl font-orbitron font-bold text-xs flex flex-col items-center justify-center gap-0.5 border-2 transition-all cursor-pointer select-none ${
              magnaSaveAvailable && gameState === 'playing'
                ? 'bg-cyan-600/90 hover:bg-cyan-500 active:bg-cyan-400 border-cyan-300 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                : 'bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
            }`}
            title="Defesa Magnética (Magna-Save)"
          >
            <Magnet className="w-5 h-5 text-cyan-300" />
            <span className="text-[10px]">MAGNA-SAVE</span>
          </button>

          {/* Right Flipper Button */}
          <button
            onMouseDown={handleRightDown}
            onMouseUp={handleRightUp}
            onTouchStart={(e) => {
              e.preventDefault();
              handleRightDown();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleRightUp();
            }}
            className={`flex-1 h-14 rounded-2xl bg-gradient-to-r from-rose-700 to-red-600 active:from-amber-500 active:to-red-500 text-white font-orbitron font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(239,68,68,0.5)] border-2 border-red-400 active:scale-95 transition-all cursor-pointer select-none ${
              rightFlipperActiveUI ? 'brightness-125 ring-2 ring-white scale-98' : ''
            }`}
            title="Manete Direito [D, /, Seta Direita]"
          >
            <span>FLIPPER DIR</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Plunger Launch & Start Controls */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
          {/* Start / Restart Game */}
          {gameState === 'playing' ? (
            <button
              onClick={() => {
                setGameState('idle');
                retroAudio.stopCavaleiroMatchAudio();
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reiniciar</span>
            </button>
          ) : (
            <button
              onClick={startGame}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-orbitron font-black text-xs shadow-[0_0_18px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>JOGAR CAVALEIRO NEGRO</span>
            </button>
          )}

          {/* Spring Plunger Launch Button */}
          {gameState === 'playing' && ballRef.current.inPlungerLane && (
            <button
              onMouseDown={handlePlungerDown}
              onMouseUp={handlePlungerUp}
              onTouchStart={(e) => {
                e.preventDefault();
                handlePlungerDown();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                handlePlungerUp();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-orbitron font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer select-none"
            >
              <ArrowDown className="w-4 h-4" />
              <span>{plungerCharge > 0 ? `LANÇAR (${Math.round(plungerCharge * 100)}%)` : 'PUXAR MOLA (PLUNGER)'}</span>
            </button>
          )}
        </div>

        {/* Input Instructions */}
        <div className="text-center font-mono text-[10px] text-slate-400 hidden sm:block">
          🎮 JOYSTICK: [L1/L2] Manete Esq | [R1/R2] Manete Dir | [Botão X] Lançar Bola | [START] Iniciar
        </div>
      </div>
    </div>
  );
};
