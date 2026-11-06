import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Gauge,
  Flame,
  Flag,
  Sparkles,
  Shield,
  Clock,
  Car,
  ChevronRight,
  Maximize2,
  Camera
} from 'lucide-react';
import { retroAudio } from './retroAudio';
import { pollActiveGamepad, triggerGamepadVibration, formatGamepadName } from './gamepadController';

interface F1FerrariGameProps {
  onScoreUpdate?: (score: number) => void;
  onRaceFinish?: (timeSeconds: number, topSpeedKmh: number) => void;
}

// Track segment for pseudo-3D perspective projection
interface Segment {
  index: number;
  p1: { world: { x: number; y: number; z: number }; camera: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  p2: { world: { x: number; y: number; z: number }; camera: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  curve: number;
  elevation: number;
  color: {
    road: string;
    grass: string;
    rumble: string;
    lane: string;
  };
  sprites: Array<{
    type: 'tree' | 'billboard' | 'grandstand' | 'arch' | 'finish_arch' | 'checkpoint_arch';
    offset: number; // -1.5 is left road edge, +1.5 is right road edge
    text?: string;
    subText?: string;
    color?: string;
  }>;
  cars: RivalCar[];
  obstacles: RoadObstacle[];
}

// Rival / Traffic Cars
interface RivalCar {
  id: string;
  offset: number; // -0.8 to +0.8
  z: number;
  speed: number;
  color: string;
  name: string;
  type: 'f1' | 'gt';
  laneChangeTimer: number;
  targetOffset: number;
}

// Road Hazards & Obstacles
interface RoadObstacle {
  id: string;
  type: 'oil' | 'cone' | 'debris' | 'boost' | 'repair';
  offset: number; // -0.7 to 0.7
  z: number;
  hit: boolean;
  bounceVy?: number;
  bounceY?: number;
  rotation?: number;
}

// Confetti particle for finish line
interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
}

// Firework rocket
interface Firework {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  color: string;
  exploded: boolean;
  particles: Array<{ x: number; y: number; vx: number; vy: number; color: string; alpha: number }>;
}

const ROAD_WIDTH = 2000;
const SEGMENT_LENGTH = 200;
const RUMBLE_LENGTH = 3;
const CAMERA_HEIGHT = 1000;
const CAMERA_DEPTH = 0.84; // field of view
const TOTAL_SEGMENTS = 1800; // ~360,000 units of track to the Linha de Chegada
const TRACK_LENGTH = TOTAL_SEGMENTS * SEGMENT_LENGTH;

// Sectors checkpoints (at segment indices)
const CHECKPOINT_SECTORS = [
  { index: 450, name: 'SETOR 1 - VARIANTE ASCARI', bonusTime: 15 },
  { index: 900, name: 'SETOR 2 - CURVA DI LESMO', bonusTime: 15 },
  { index: 1350, name: 'SETOR 3 - PARABOLICA SPEEDWAY', bonusTime: 15 },
  { index: TOTAL_SEGMENTS - 20, name: 'LINHA DE CHEGADA - GRAND PRIX', bonusTime: 0 }
];

export const F1FerrariGame: React.FC<F1FerrariGameProps> = ({ onScoreUpdate, onRaceFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React UI States
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'racing' | 'crashed' | 'finished'>('idle');
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [rpm, setRpm] = useState<number>(1000);
  const [currentGear, setCurrentGear] = useState<number>(1);
  const [raceTimeMs, setRaceTimeMs] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(65); // 65 seconds initially
  const [turboBoost, setTurboBoost] = useState<number>(100); // 0 - 100%
  const [isBoosting, setIsBoosting] = useState<boolean>(false);
  const [integrity, setIntegrity] = useState<number>(100);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [distanceRemainingMeters, setDistanceRemainingMeters] = useState<number>(TRACK_LENGTH / 100);
  const [score, setScore] = useState<number>(0);
  const [bestTime, setBestTime] = useState<string>('01:28.45');
  const [topSpeedAchieved, setTopSpeedAchieved] = useState<number>(0);
  const [cameraMode, setCameraMode] = useState<'chase' | 'cockpit'>('chase');
  const [isMuted, setIsMuted] = useState<boolean>(retroAudio.getMuted());
  const [countdownLights, setCountdownLights] = useState<number>(0); // 0 to 5 lights, 6 = GO!
  const [checkpointNotice, setCheckpointNotice] = useState<{ text: string; bonus: string } | null>(null);
  const [obstaclesDodged, setObstaclesDodged] = useState<number>(0);
  const [isGamepadActive, setIsGamepadActive] = useState<boolean>(false);
  const [gamepadLabel, setGamepadLabel] = useState<string>('Joystick USB / KTS');

  // Mutable Game Loop State References
  const stateRef = useRef({
    gameState: 'idle' as 'idle' | 'countdown' | 'racing' | 'crashed' | 'finished',
    position: 0, // track Z position
    playerX: 0, // -1 to 1 on road
    playerY: 0, // elevation offset
    speed: 0, // current speed in world units/sec
    maxSpeed: 12000, // ~330 km/h
    accel: 5200,
    breaking: -8500,
    decel: -2200,
    offRoadDecel: -6000,
    offRoadLimit: 4000,
    centrifugal: 0.35,
    rpm: 1000,
    gear: 1,
    turbo: 100,
    isBoosting: false,
    integrity: 100,
    timeRemaining: 65,
    startTime: 0,
    elapsedTime: 0,
    score: 0,
    obstaclesDodged: 0,
    topSpeed: 0,
    spinAngle: 0,
    isSpinning: false,
    spinTimer: 0,
    lastShiftPopTime: 0,
    checkpointsPassed: new Set<number>(),
    // Input state
    keyLeft: false,
    keyRight: false,
    keyFaster: false,
    keySlower: false,
    keyTurbo: false,
    analogSteer: 0,
    // Visual effects
    tireSmoke: [] as Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }>,
    sparks: [] as Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>,
    confetti: [] as ConfettiParticle[],
    fireworks: [] as Firework[],
    lastTime: 0,
    countdownStep: 0,
    countdownTimer: 0,
  });

  const trackSegmentsRef = useRef<Segment[]>([]);
  const prevGpStartRef = useRef<boolean>(false);
  const prevGpTurboRef = useRef<boolean>(false);

  // Synchronize audio mute state
  const handleToggleMute = useCallback(() => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    retroAudio.setMuted(nextMute);
  }, [isMuted]);

  // Generate the Master Monaco/Monza Track
  const buildTrack = useCallback(() => {
    const segments: Segment[] = [];

    const addSegment = (curve: number, elevation: number) => {
      const n = segments.length;
      const isAlt = Math.floor(n / RUMBLE_LENGTH) % 2 === 0;

      segments.push({
        index: n,
        p1: { world: { x: 0, y: elevation, z: n * SEGMENT_LENGTH }, camera: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
        p2: { world: { x: 0, y: elevation, z: (n + 1) * SEGMENT_LENGTH }, camera: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
        curve,
        elevation,
        color: {
          road: isAlt ? '#21252D' : '#1D2128',
          grass: isAlt ? '#0D331A' : '#0B2914',
          rumble: isAlt ? '#E10600' : '#F8FAFC', // Italian Rosso Corsa & White Curbs
          lane: isAlt ? 'rgba(255,255,255,0.75)' : 'transparent',
        },
        sprites: [],
        cars: [],
        obstacles: []
      });
    };

    const addRoad = (enter: number, hold: number, leave: number, curve: number, elevation: number) => {
      const startY = segments.length > 0 ? segments[segments.length - 1].elevation : 0;
      const total = enter + hold + leave;
      for (let i = 0; i < enter; i++) {
        const t = i / enter;
        addSegment(curve * t, startY + elevation * (t * t));
      }
      for (let i = 0; i < hold; i++) {
        addSegment(curve, startY + elevation);
      }
      for (let i = 0; i < leave; i++) {
        const t = 1 - i / leave;
        addSegment(curve * t, startY + elevation * t);
      }
    };

    // Construct the Monza Grand Prix Circuit sections:
    // 1. Starting straight (0 - 150)
    addRoad(40, 70, 40, 0, 0);

    // 2. Variante del Rettifilo Chicane (Right then Left)
    addRoad(30, 45, 30, 2.8, 60);
    addRoad(30, 45, 30, -3.2, 30);

    // 3. Curva Grande (Long sweeping high speed right)
    addRoad(50, 100, 50, 2.2, -40);

    // 4. Sector 1 Checkpoint Straight
    addRoad(30, 50, 30, 0, 0);

    // 5. Variante della Roggia (Left then Right)
    addRoad(35, 45, 35, -3.0, 80);
    addRoad(35, 45, 35, 3.2, -50);

    // 6. Curva di Lesmo 1 & 2 (Technical double apex right)
    addRoad(40, 60, 40, 2.5, 40);
    addRoad(40, 70, 40, 3.5, 80);

    // 7. Serraglio Straight & Elevation dip
    addRoad(40, 90, 40, 0, -120);

    // 8. Sector 2 Checkpoint
    addRoad(30, 40, 30, 0, 0);

    // 9. Variante Ascari (Fast triple chicane Left-Right-Left)
    addRoad(30, 40, 30, -3.8, 40);
    addRoad(30, 45, 30, 4.0, 60);
    addRoad(30, 40, 30, -3.2, -30);

    // 10. Long Backstraight to Parabolica (Top Speed 330+ km/h zone!)
    addRoad(60, 140, 60, 0, 0);

    // 11. Curva Parabolica (Iconic huge radius right curve opening up to finish)
    addRoad(60, 130, 60, 3.8, 60);

    // 12. Reta dos Boxes & Linha de Chegada (Grand Finish Straightaway)
    addRoad(50, 150, 50, 0, -60);

    // Pad track up to TOTAL_SEGMENTS
    while (segments.length < TOTAL_SEGMENTS) {
      addSegment(0, 0);
    }

    // Populate Roadside Scenery (Trees, Grandstands, Billboards, Arches)
    const sponsors = [
      { text: 'FERRARI', color: '#E10600', sub: 'SCUDERIA' },
      { text: 'SHELL', color: '#FACC15', sub: 'V-POWER RACING' },
      { text: 'PIRELLI', color: '#EF4444', sub: 'P ZERO SLICKS' },
      { text: 'BREMBO', color: '#DC2626', sub: 'CARBON CERAMIC' },
      { text: 'JARVES GP', color: '#06B6D4', sub: 'ORIGIN GRAND PRIX' },
      { text: 'MONZA', color: '#10B981', sub: 'AUTODROMO NAZIONALE' }
    ];

    for (let i = 0; i < segments.length; i += 6) {
      const seg = segments[i];

      // Starting Gantry Arch (Segment 5)
      if (i === 5) {
        seg.sprites.push({
          type: 'arch',
          offset: 0,
          text: 'PARTIDA • MONZA GRAND PRIX',
          subText: 'FORZA FERRARI',
          color: '#E10600'
        });
      }

      // Checkpoint Arches
      if (i === 450) {
        seg.sprites.push({
          type: 'checkpoint_arch',
          offset: 0,
          text: 'CHECKPOINT 1 • ASCARI',
          subText: '+15s BÔNUS DE TEMPO',
          color: '#06B6D4'
        });
      } else if (i === 900) {
        seg.sprites.push({
          type: 'checkpoint_arch',
          offset: 0,
          text: 'CHECKPOINT 2 • LESMO',
          subText: '+15s BÔNUS DE TEMPO',
          color: '#10B981'
        });
      } else if (i === 1350) {
        seg.sprites.push({
          type: 'checkpoint_arch',
          offset: 0,
          text: 'CHECKPOINT 3 • PARABOLICA',
          subText: '+15s BÔNUS DE TEMPO',
          color: '#F59E0B'
        });
      } else if (i === TOTAL_SEGMENTS - 25) {
        // THE GRAND FINISH LINE ARCH!
        seg.sprites.push({
          type: 'finish_arch',
          offset: 0,
          text: '🏁 LINHA DE CHEGADA 🏁',
          subText: 'GRANDE PRÊMIO DE MONZA • FERRARI',
          color: '#E10600'
        });
      }

      // Grandstands in spectator zones (start and finish)
      if ((i < 120 || i > 1650) && i % 18 === 0) {
        seg.sprites.push({ type: 'grandstand', offset: -1.75 });
        seg.sprites.push({ type: 'grandstand', offset: 1.75 });
      }

      // Sponsor Billboards along curves and straights
      if (i % 24 === 0 && i > 30 && i < TOTAL_SEGMENTS - 50) {
        const sp = sponsors[Math.floor((i / 24) % sponsors.length)];
        const side = (i / 24) % 2 === 0 ? 1.6 : -1.6;
        seg.sprites.push({
          type: 'billboard',
          offset: side,
          text: sp.text,
          subText: sp.sub,
          color: sp.color
        });
      }

      // Mediterranean Pine Trees / Palms
      if (i % 12 === 0) {
        seg.sprites.push({ type: 'tree', offset: -1.9 - Math.random() * 0.4 });
        seg.sprites.push({ type: 'tree', offset: 1.9 + Math.random() * 0.4 });
      }
    }

    // Populate Traffic, Rival F1 Racers, and Road Obstacles throughout the course
    // 1. Rival Racers & GT Cars
    const rivalColors = ['#00D2BE', '#FF8700', '#229971', '#0090FF', '#FFFFFF', '#6CD3BF'];
    const rivalNames = ['Mercedes Silver', 'McLaren Papaya', 'Aston Racing', 'Alpine Blue', 'Alfa Corsa', 'Haas VF'];

    for (let i = 120; i < TOTAL_SEGMENTS - 100; i += 35 + Math.floor(Math.random() * 25)) {
      const seg = segments[i];
      const isF1Rival = Math.random() > 0.45;
      const colorIdx = Math.floor(Math.random() * rivalColors.length);

      seg.cars.push({
        id: `car-${i}`,
        offset: (Math.random() * 1.3 - 0.65),
        z: i * SEGMENT_LENGTH,
        speed: isF1Rival ? 6000 + Math.random() * 3800 : 3800 + Math.random() * 2200,
        color: rivalColors[colorIdx],
        name: isF1Rival ? rivalNames[colorIdx] : 'Carro Passeio',
        type: isF1Rival ? 'f1' : 'gt',
        laneChangeTimer: Math.random() * 3,
        targetOffset: (Math.random() * 1.3 - 0.65)
      });
    }

    // 2. Obstacles: Oil Slicks, Construction Cones, Debris, and Nitro Boost pads
    for (let i = 80; i < TOTAL_SEGMENTS - 60; i += 22 + Math.floor(Math.random() * 18)) {
      const seg = segments[i];
      const roll = Math.random();

      if (roll < 0.32) {
        // Oil Slick (Mancha de Óleo)
        seg.obstacles.push({
          id: `oil-${i}`,
          type: 'oil',
          offset: (Math.random() * 1.2 - 0.6),
          z: i * SEGMENT_LENGTH,
          hit: false
        });
      } else if (roll < 0.58) {
        // Construction Cones (Cones de Sinalização)
        const coneOffset = (Math.random() * 1.2 - 0.6);
        seg.obstacles.push({
          id: `cone-${i}-1`,
          type: 'cone',
          offset: coneOffset,
          z: i * SEGMENT_LENGTH,
          hit: false,
          bounceVy: 0,
          bounceY: 0,
          rotation: 0
        });
        if (Math.random() > 0.4) {
          seg.obstacles.push({
            id: `cone-${i}-2`,
            type: 'cone',
            offset: coneOffset + 0.16,
            z: i * SEGMENT_LENGTH + 40,
            hit: false,
            bounceVy: 0,
            bounceY: 0,
            rotation: 0
          });
        }
      } else if (roll < 0.72) {
        // Road Debris / Pedaço de Pneu
        seg.obstacles.push({
          id: `debris-${i}`,
          type: 'debris',
          offset: (Math.random() * 1.2 - 0.6),
          z: i * SEGMENT_LENGTH,
          hit: false
        });
      } else if (roll < 0.88) {
        // Nitro Golden Boost Pad (+Turbo Boost Surge)
        seg.obstacles.push({
          id: `boost-${i}`,
          type: 'boost',
          offset: (Math.random() * 1.0 - 0.5),
          z: i * SEGMENT_LENGTH,
          hit: false
        });
      } else {
        // Pit Repair / Heart Pickup
        seg.obstacles.push({
          id: `repair-${i}`,
          type: 'repair',
          offset: (Math.random() * 1.0 - 0.5),
          z: i * SEGMENT_LENGTH,
          hit: false
        });
      }
    }

    trackSegmentsRef.current = segments;
  }, []);

  // Find track segment at a given Z position
  const findSegment = (z: number): Segment => {
    const segments = trackSegmentsRef.current;
    if (segments.length === 0) return {} as Segment;
    const index = Math.floor(z / SEGMENT_LENGTH) % segments.length;
    return segments[index];
  };

  // Start 5-Red-Lights Sequence & Launch Race
  const startRaceCountdown = useCallback(() => {
    buildTrack();
    const st = stateRef.current;
    st.gameState = 'countdown';
    st.position = 0;
    st.playerX = 0;
    st.speed = 0;
    st.rpm = 2500; // Revving engine on starting grid
    st.gear = 1;
    st.turbo = 100;
    st.isBoosting = false;
    st.integrity = 100;
    st.timeRemaining = 65;
    st.score = 0;
    st.obstaclesDodged = 0;
    st.topSpeed = 0;
    st.isSpinning = false;
    st.spinAngle = 0;
    st.checkpointsPassed.clear();
    st.tireSmoke = [];
    st.sparks = [];
    st.confetti = [];
    st.fireworks = [];
    st.countdownStep = 0;
    st.countdownTimer = 0;

    setGameState('countdown');
    setSpeedKmh(0);
    setRpm(2500);
    setCurrentGear(1);
    setTurboBoost(100);
    setIntegrity(100);
    setProgressPercent(0);
    setDistanceRemainingMeters(TRACK_LENGTH / 100);
    setScore(0);
    setObstaclesDodged(0);
    setCountdownLights(0);
    setCheckpointNotice(null);

    retroAudio.startFerrariEngine();
    retroAudio.updateFerrariEngine(0.3, 0, false, false);
  }, [buildTrack]);

  // Restart Race Handler
  const handleRestart = useCallback(() => {
    startRaceCountdown();
  }, [startRaceCountdown]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid scrolling on game controls
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const st = stateRef.current;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          st.keyLeft = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          st.keyRight = true;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          st.keyFaster = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          st.keySlower = true;
          break;
        case ' ':
        case 'Shift':
          st.keyTurbo = true;
          break;
        case 'c':
        case 'C':
          setCameraMode((prev) => (prev === 'chase' ? 'cockpit' : 'chase'));
          break;
        case 'Enter':
          if (st.gameState === 'idle' || st.gameState === 'crashed' || st.gameState === 'finished') {
            startRaceCountdown();
          }
          break;
        case 'm':
        case 'M':
          handleToggleMute();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const st = stateRef.current;
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          st.keyLeft = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          st.keyRight = false;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          st.keyFaster = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          st.keySlower = false;
          break;
        case ' ':
        case 'Shift':
          st.keyTurbo = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      retroAudio.stopFerrariEngine();
    };
  }, [handleToggleMute, startRaceCountdown]);

  // Initial track build
  useEffect(() => {
    buildTrack();
  }, [buildTrack]);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = (timestamp: number) => {
      const st = stateRef.current;
      if (!st.lastTime) st.lastTime = timestamp;
      const dt = Math.min(0.1, (timestamp - st.lastTime) / 1000);
      st.lastTime = timestamp;

      // ----------------------------------------------------
      // 1. GAMEPAD / JOYSTICK POLLING (KTS, USB, DualShock)
      // ----------------------------------------------------
      const gp = pollActiveGamepad();
      setIsGamepadActive(gp.connected);
      if (gp.connected) {
        setGamepadLabel(formatGamepadName(gp.id));

        // Start / Restart via Gamepad START button or South button (X)
        if (gp.start && !prevGpStartRef.current) {
          if (st.gameState === 'idle' || st.gameState === 'crashed' || st.gameState === 'finished') {
            startRaceCountdown();
          }
        }
        prevGpStartRef.current = gp.start;

        // Proportional Analog Steering (-1 to +1) or D-Pad
        let stickSteer = gp.axes[0];
        if (Math.abs(stickSteer) < 0.15) stickSteer = 0;
        if (gp.dpadLeft) stickSteer = -1;
        if (gp.dpadRight) stickSteer = 1;
        st.analogSteer = stickSteer;

        // Throttle (Accelerate): R2 trigger, Button 0 (X / Cross), Button 1 (Circle)
        const gpThrottle = gp.r2 || gp.buttonSouth || gp.buttonEast || gp.dpadUp;
        // Brake: L2 trigger, Button 2 (Square), D-Pad Down
        const gpBrake = gp.l2 || gp.buttonWest || gp.dpadDown;
        // Turbo / DRS Boost: R1, L1, Button 3 (Triangle)
        const gpTurbo = gp.r1 || gp.l1 || gp.buttonNorth;

        // Merge Gamepad with Keyboard
        if (gp.connected) {
          if (gpThrottle) st.keyFaster = true;
          if (gpBrake) st.keySlower = true;
          if (gpTurbo) st.keyTurbo = true;
        }
      }

      // ----------------------------------------------------
      // 2. COUNTDOWN LIGHTS SEQUENCE (5 Red Lights ... GO!)
      // ----------------------------------------------------
      if (st.gameState === 'countdown') {
        st.countdownTimer += dt;
        if (st.countdownTimer >= 0.75) {
          st.countdownTimer = 0;
          st.countdownStep++;

          if (st.countdownStep <= 5) {
            setCountdownLights(st.countdownStep);
            retroAudio.playCountdownBeep(false);
            triggerGamepadVibration(60, 0.2, 0.3);
          } else if (st.countdownStep === 6) {
            // LIGHTS OUT AND AWAY WE GO!
            setCountdownLights(6);
            retroAudio.playCountdownBeep(true);
            triggerGamepadVibration(150, 0.5, 0.8);
            st.gameState = 'racing';
            st.startTime = timestamp;
            setGameState('racing');
          }
        }
      }

      // ----------------------------------------------------
      // 3. RACING SIMULATION PHYSICS
      // ----------------------------------------------------
      if (st.gameState === 'racing') {
        // Track elapsed time & time countdown
        st.elapsedTime += dt;
        st.timeRemaining -= dt;
        setTimeRemaining(Math.max(0, Math.ceil(st.timeRemaining)));
        setRaceTimeMs(Math.floor(st.elapsedTime * 1000));

        // Time Out Check
        if (st.timeRemaining <= 0 && st.position < TRACK_LENGTH - 2000) {
          st.gameState = 'crashed';
          setGameState('crashed');
          retroAudio.playFerrariCrash();
          triggerGamepadVibration(350, 0.7, 0.9);
          retroAudio.stopFerrariEngine();
        }

        // Current Segment & Centrifugal force on curves
        const currentSegment = findSegment(st.position);
        const playerSegment = findSegment(st.position + 150);
        const speedPercent = st.speed / st.maxSpeed;

        // Steering input with smooth inertia
        let steerAmount = 0;
        if (st.analogSteer !== 0) {
          steerAmount = st.analogSteer * 1.85;
        } else {
          if (st.keyLeft) steerAmount -= 1.85;
          if (st.keyRight) steerAmount += 1.85;
        }

        // Apply steering scaled by speed (can't turn when stopped)
        if (st.speed > 0) {
          st.playerX += steerAmount * dt * (0.65 + speedPercent * 0.95);
        }

        // Centrifugal curve pull
        st.playerX -= (currentSegment.curve * dt * speedPercent * speedPercent * st.centrifugal);

        // Turbo / DRS Boost logic
        let effectiveMaxSpeed = st.maxSpeed;
        let isTurboActive = false;

        if (st.keyTurbo && st.turbo > 0 && st.speed > 3000) {
          isTurboActive = true;
          effectiveMaxSpeed = st.maxSpeed * 1.25; // Boost up to ~345 km/h!
          st.turbo = Math.max(0, st.turbo - dt * 25);
          st.speed += st.accel * dt * 1.5;

          if (!prevGpTurboRef.current) {
            retroAudio.playTurboWhoosh();
            triggerGamepadVibration(180, 0.4, 0.7);
          }
          prevGpTurboRef.current = true;
        } else {
          prevGpTurboRef.current = false;
          // Slowly regenerate turbo boost
          st.turbo = Math.min(100, st.turbo + dt * 4.5);
        }
        st.isBoosting = isTurboActive;
        setIsBoosting(isTurboActive);
        setTurboBoost(Math.round(st.turbo));

        // Acceleration & Braking Dynamics
        if (st.keyFaster) {
          st.speed += st.accel * dt;
        } else if (st.keySlower) {
          st.speed += st.breaking * dt;
          if (st.speed > 5000 && Math.random() < 0.25) {
            retroAudio.playFerrariSkid();
            triggerGamepadVibration(50, 0.3, 0.2);
          }
        } else {
          st.speed += st.decel * dt;
        }

        // Off-Road (Grass / Shoulder) resistance
        const isOffRoad = Math.abs(st.playerX) > 1.0;
        if (isOffRoad) {
          if (st.speed > st.offRoadLimit) {
            st.speed += st.offRoadDecel * dt;
          }
          // Slight rumbling vibration on grass/shoulder
          if (Math.random() < 0.2) {
            triggerGamepadVibration(40, 0.2, 0.15);
          }
        }

        // Rumble Strip / Zebra vibration feedback
        const isOnCurb = Math.abs(st.playerX) >= 0.88 && Math.abs(st.playerX) <= 1.02;
        if (isOnCurb && st.speed > 2000) {
          if (Math.random() < 0.3) {
            triggerGamepadVibration(35, 0.25, 0.35);
          }
        }

        // Clamp speed
        st.speed = Math.max(0, Math.min(effectiveMaxSpeed, st.speed));

        // Advance position
        st.position += st.speed * dt;
        if (st.position >= TRACK_LENGTH) {
          st.position = TRACK_LENGTH;
        }

        // Calculate Realistic Gear, RPM and Top Speed
        const kmh = Math.round((st.speed / st.maxSpeed) * 332);
        setSpeedKmh(kmh);
        if (kmh > st.topSpeed) {
          st.topSpeed = kmh;
          setTopSpeedAchieved(kmh);
        }

        // 7-Speed Transmission Simulation
        let gear = 1;
        let gearRpm = 1000;
        if (kmh < 55) {
          gear = 1;
          gearRpm = 1200 + (kmh / 55) * 6500;
        } else if (kmh < 105) {
          gear = 2;
          gearRpm = 3200 + ((kmh - 55) / 50) * 5200;
        } else if (kmh < 155) {
          gear = 3;
          gearRpm = 4000 + ((kmh - 105) / 50) * 4600;
        } else if (kmh < 210) {
          gear = 4;
          gearRpm = 4400 + ((kmh - 155) / 55) * 4300;
        } else if (kmh < 265) {
          gear = 5;
          gearRpm = 5000 + ((kmh - 210) / 55) * 3800;
        } else if (kmh < 310) {
          gear = 6;
          gearRpm = 5500 + ((kmh - 265) / 45) * 3300;
        } else {
          gear = 7;
          gearRpm = 6200 + ((kmh - 310) / 40) * 2600;
        }

        // Gear shift pop sound effect
        if (gear !== st.gear && gear > st.gear) {
          retroAudio.playFerrariShift(gear);
          triggerGamepadVibration(60, 0.35, 0.45);
        }
        st.gear = gear;
        st.rpm = Math.min(9200, Math.round(gearRpm));
        setCurrentGear(gear);
        setRpm(st.rpm);

        // Update Ferrari Engine Roar Sound
        retroAudio.updateFerrariEngine(
          st.rpm / 9000,
          st.speed / st.maxSpeed,
          st.isBoosting,
          st.keySlower
        );

        // Track Progress & Distance
        const progress = Math.min(100, Math.round((st.position / TRACK_LENGTH) * 100));
        setProgressPercent(progress);
        const distRemaining = Math.max(0, Math.round((TRACK_LENGTH - st.position) / 50));
        setDistanceRemainingMeters(distRemaining);

        // Checkpoint Sector crossing detection
        CHECKPOINT_SECTORS.forEach((cp) => {
          const cpZ = cp.index * SEGMENT_LENGTH;
          if (st.position >= cpZ && !st.checkpointsPassed.has(cp.index)) {
            st.checkpointsPassed.add(cp.index);
            if (cp.bonusTime > 0) {
              st.timeRemaining += cp.bonusTime;
              st.score += 1500;
              setScore(st.score);
              if (onScoreUpdate) onScoreUpdate(st.score);
              retroAudio.playCheckpointChime();
              triggerGamepadVibration(180, 0.5, 0.7);
              setCheckpointNotice({ text: cp.name, bonus: `+${cp.bonusTime}s BÔNUS` });
              setTimeout(() => setCheckpointNotice(null), 3000);
            }
          }
        });

        // ----------------------------------------------------
        // 4. TRAFFIC & RIVAL CARS SIMULATION & COLLISIONS
        // ----------------------------------------------------
        const scanStart = Math.floor(st.position / SEGMENT_LENGTH);
        const scanEnd = scanStart + 35;

        for (let segIdx = scanStart; segIdx < scanEnd; segIdx++) {
          const seg = trackSegmentsRef.current[segIdx % TOTAL_SEGMENTS];
          if (!seg) continue;

          // Update AI rival cars
          for (const car of seg.cars) {
            car.z += car.speed * dt;

            // AI Lane changes
            car.laneChangeTimer -= dt;
            if (car.laneChangeTimer <= 0) {
              car.laneChangeTimer = 2 + Math.random() * 3;
              car.targetOffset = (Math.random() * 1.3 - 0.65);
            }
            car.offset += (car.targetOffset - car.offset) * dt * 0.8;

            // Collision check with Player Ferrari
            const zDiff = Math.abs(car.z - (st.position + 150));
            const xDiff = Math.abs(car.offset - st.playerX);

            if (zDiff < 180 && xDiff < 0.28) {
              // BUMP / COLLISION!
              retroAudio.playFerrariCrash();
              triggerGamepadVibration(250, 0.7, 0.85);

              // Push player and reduce speed
              st.speed = Math.max(1500, st.speed * 0.65);
              st.playerX += (st.playerX > car.offset ? 0.35 : -0.35);
              st.integrity = Math.max(15, st.integrity - 12);
              setIntegrity(Math.round(st.integrity));

              // Spawn sparks
              for (let s = 0; s < 12; s++) {
                st.sparks.push({
                  x: 0,
                  y: 0,
                  vx: (Math.random() * 2 - 1) * 300,
                  vy: -Math.random() * 250,
                  color: '#FACC15',
                  life: 0.4
                });
              }
            } else if (car.z < st.position && zDiff < 400 && !((car as any).overtaken)) {
              (car as any).overtaken = true;
              st.obstaclesDodged++;
              st.score += 250;
              setObstaclesDodged(st.obstaclesDodged);
              setScore(st.score);
              if (onScoreUpdate) onScoreUpdate(st.score);
            }
          }

          // Obstacles Interaction (Oil slicks, Cones, Debris, Boost, Repair)
          for (const obs of seg.obstacles) {
            if (obs.hit) continue;

            const zDiff = Math.abs(obs.z - (st.position + 150));
            const xDiff = Math.abs(obs.offset - st.playerX);

            if (zDiff < 140 && xDiff < 0.24) {
              obs.hit = true;

              if (obs.type === 'oil') {
                // OIL SLICK: SPIN & DRIFT
                retroAudio.playOilSpin();
                retroAudio.playFerrariSkid();
                triggerGamepadVibration(300, 0.6, 0.8);
                st.speed *= 0.75;
                st.spinTimer = 0.65;
                st.isSpinning = true;
              } else if (obs.type === 'cone') {
                // TRAFFIC CONE: BOUNCE & FLY AWAY
                retroAudio.playConeHit();
                triggerGamepadVibration(80, 0.3, 0.4);
                obs.bounceVy = -450;
                st.speed = Math.max(0, st.speed - 300);
              } else if (obs.type === 'debris') {
                // ROAD DEBRIS: MINOR DAMAGE
                retroAudio.playFerrariCrash();
                triggerGamepadVibration(180, 0.5, 0.65);
                st.speed *= 0.8;
                st.integrity = Math.max(20, st.integrity - 8);
                setIntegrity(Math.round(st.integrity));
              } else if (obs.type === 'boost') {
                // GOLDEN BOOST PAD: INSTANT NITRO SURGE
                retroAudio.playTurboWhoosh();
                triggerGamepadVibration(150, 0.4, 0.75);
                st.speed = Math.min(st.maxSpeed * 1.3, st.speed + 4000);
                st.turbo = 100;
                st.score += 500;
                setTurboBoost(100);
                setScore(st.score);
              } else if (obs.type === 'repair') {
                // PIT REPAIR: RESTORE HEALTH
                retroAudio.playCheckpointChime();
                triggerGamepadVibration(120, 0.3, 0.5);
                st.integrity = Math.min(100, st.integrity + 25);
                setIntegrity(Math.round(st.integrity));
                st.score += 300;
                setScore(st.score);
              }
            } else if (obs.z < st.position && zDiff < 300 && !obs.hit && !((obs as any).dodged)) {
              (obs as any).dodged = true;
              st.obstaclesDodged++;
              st.score += 150;
              setObstaclesDodged(st.obstaclesDodged);
              setScore(st.score);
              if (onScoreUpdate) onScoreUpdate(st.score);
            }
          }
        }

        // Spin animation when hitting oil slick
        if (st.isSpinning) {
          st.spinTimer -= dt;
          st.spinAngle += dt * 14;
          if (st.spinTimer <= 0) {
            st.isSpinning = false;
            st.spinAngle = 0;
          }
        }

        // ----------------------------------------------------
        // 5. FINISH LINE CROSSING (LINHA DE CHEGADA!)
        // ----------------------------------------------------
        if (st.position >= TRACK_LENGTH - 300) {
          st.gameState = 'finished';
          setGameState('finished');
          retroAudio.stopFerrariEngine();
          retroAudio.playFinishFanfare();
          triggerGamepadVibration(600, 0.8, 1.0);

          // Add bonus finish score based on remaining time
          const finalBonus = Math.round(st.timeRemaining * 100) + 10000;
          st.score += finalBonus;
          setScore(st.score);
          if (onScoreUpdate) onScoreUpdate(st.score);

          // Call external finish callback
          if (onRaceFinish) {
            onRaceFinish(st.elapsedTime, st.topSpeed);
          }

          // Spawn victory confetti & fireworks
          for (let c = 0; c < 120; c++) {
            st.confetti.push({
              x: Math.random() * 800,
              y: -Math.random() * 400,
              vx: (Math.random() * 2 - 1) * 120,
              vy: 120 + Math.random() * 180,
              size: 4 + Math.random() * 6,
              color: ['#E10600', '#FACC15', '#FFFFFF', '#10B981', '#06B6D4'][Math.floor(Math.random() * 5)],
              rotation: Math.random() * Math.PI * 2,
              vRot: (Math.random() * 2 - 1) * 5
            });
          }
        }
      }

      // ----------------------------------------------------
      // 6. RENDER MASTER 3D PERSPECTIVE CANVAS
      // ----------------------------------------------------
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderScene(ctx, canvas.width, canvas.height, dt);
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [findSegment, onRaceFinish, onScoreUpdate, startRaceCountdown]);

  // Scene Rendering Function
  const renderScene = (ctx: CanvasRenderingContext2D, width: number, height: number, dt: number) => {
    const st = stateRef.current;
    const segments = trackSegmentsRef.current;
    if (segments.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    // 1. SKY & HORIZON BACKGROUND WITH PARALLAX
    const baseSegment = findSegment(st.position);
    const curveOffset = baseSegment ? baseSegment.curve * 15 : 0;

    // Sky Gradient (Sunset / Grand Prix Sky)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
    skyGrad.addColorStop(0, '#0F172A'); // Deep space blue
    skyGrad.addColorStop(0.5, '#1E293B'); // Slate
    skyGrad.addColorStop(0.85, '#334155'); // Dusk
    skyGrad.addColorStop(1, '#B91C1C'); // Ferrari Rosso Corsa horizon glow
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height * 0.55);

    // Distant Alpine Mountains (Monza backdrop)
    ctx.fillStyle = '#1A2234';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.52);
    for (let mx = 0; mx <= width; mx += 80) {
      const peakY = height * 0.38 + Math.sin(mx * 0.01 + curveOffset * 0.02) * 35;
      ctx.lineTo(mx, peakY);
    }
    ctx.lineTo(width, height * 0.52);
    ctx.closePath();
    ctx.fill();

    // Distant Grandstand silhouettes and spotlights
    ctx.fillStyle = '#0F1522';
    ctx.fillRect(0, height * 0.48, width, height * 0.05);

    // 2. PROJECT 3D ROAD SEGMENTS
    const startPos = st.position;
    const baseIndex = Math.floor(startPos / SEGMENT_LENGTH);
    const DRAW_DISTANCE = 160;

    let maxY = height;
    let cameraZ = startPos;
    let cameraX = st.playerX * ROAD_WIDTH;
    let cameraY = CAMERA_HEIGHT + st.playerY;

    // Project segments from baseIndex forward
    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const segmentIndex = (baseIndex + n) % segments.length;
      const segment = segments[segmentIndex];
      const looped = (baseIndex + n) >= segments.length;

      const p1WorldZ = segment.p1.world.z + (looped ? TRACK_LENGTH : 0);
      const p2WorldZ = segment.p2.world.z + (looped ? TRACK_LENGTH : 0);

      // Project point 1
      projectPoint(segment.p1, cameraX, cameraY, cameraZ, width, height, ROAD_WIDTH);
      // Project point 2
      projectPoint(segment.p2, cameraX, cameraY, cameraZ, width, height, ROAD_WIDTH);

      // Occlusion check
      if (segment.p1.camera.z <= CAMERA_DEPTH || segment.p2.screen.y >= maxY || segment.p2.screen.y >= segment.p1.screen.y) {
        continue;
      }

      // Draw Grass
      ctx.fillStyle = segment.color.grass;
      ctx.fillRect(0, segment.p2.screen.y, width, segment.p1.screen.y - segment.p2.screen.y);

      // Draw Rumble Strips (Zebras)
      const r1 = segment.p1.screen.w * 1.18;
      const r2 = segment.p2.screen.w * 1.18;
      drawPoly(ctx, segment.p1.screen.x - r1, segment.p1.screen.y, segment.p1.screen.x + r1, segment.p1.screen.y,
        segment.p2.screen.x + r2, segment.p2.screen.y, segment.p2.screen.x - r2, segment.p2.screen.y, segment.color.rumble);

      // Draw Asphalt Road Surface
      drawPoly(ctx, segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y,
        segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y,
        segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y,
        segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y, segment.color.road);

      // Draw Center Dashed Lane Lines
      if (segment.color.lane !== 'transparent') {
        const laneW1 = segment.p1.screen.w * 0.04;
        const laneW2 = segment.p2.screen.w * 0.04;
        drawPoly(ctx, segment.p1.screen.x - laneW1, segment.p1.screen.y, segment.p1.screen.x + laneW1, segment.p1.screen.y,
          segment.p2.screen.x + laneW2, segment.p2.screen.y, segment.p2.screen.x - laneW2, segment.p2.screen.y, segment.color.lane);
      }

      maxY = segment.p1.screen.y;
    }

    // 3. RENDER ROAD SPRITES & ROADSIDE OBJECTS (BACK TO FRONT)
    for (let n = DRAW_DISTANCE - 1; n > 0; n--) {
      const segmentIndex = (baseIndex + n) % segments.length;
      const segment = segments[segmentIndex];
      const scale = segment.p1.screen.scale;
      if (scale <= 0) continue;

      // Draw Roadside Sprites (Trees, Grandstands, Billboards, Overhead Arches)
      for (const spr of segment.sprites) {
        const spriteX = segment.p1.screen.x + (segment.p1.screen.w * spr.offset);
        const spriteY = segment.p1.screen.y;

        if (spr.type === 'finish_arch' || spr.type === 'checkpoint_arch' || spr.type === 'arch') {
          // Overhead Gantry Bridge Arch across both sides of track
          drawGantryArch(ctx, segment.p1.screen.x, spriteY, segment.p1.screen.w, scale, spr);
        } else if (spr.type === 'billboard') {
          drawBillboard(ctx, spriteX, spriteY, scale, spr);
        } else if (spr.type === 'tree') {
          drawTree(ctx, spriteX, spriteY, scale);
        } else if (spr.type === 'grandstand') {
          drawGrandstand(ctx, spriteX, spriteY, scale);
        }
      }

      // Draw Obstacles (Oil Slicks, Cones, Debris, Boost, Repair)
      for (const obs of segment.obstacles) {
        const obsX = segment.p1.screen.x + (segment.p1.screen.w * obs.offset);
        const obsY = segment.p1.screen.y;
        drawRoadObstacle(ctx, obsX, obsY, scale, obs);
      }

      // Draw Rival / Traffic Cars
      for (const car of segment.cars) {
        const carX = segment.p1.screen.x + (segment.p1.screen.w * car.offset);
        const carY = segment.p1.screen.y;
        drawRivalCar(ctx, carX, carY, scale, car);
      }
    }

    // 4. RENDER THE RED FERRARI (FERRARI PASSEIO VERMELHA / ROSSO CORSA)
    const carScreenX = width / 2;
    const carScreenY = height - 70;
    const carTilt = (st.analogSteer !== 0 ? st.analogSteer : (st.keyLeft ? -1 : st.keyRight ? 1 : 0));
    const isBraking = st.keySlower;

    drawFerrariPasseio(ctx, carScreenX, carScreenY, carTilt, isBraking, st.isBoosting, st.isSpinning, st.spinAngle, st.speed);

    // 5. TIRE SMOKE & SPARK PARTICLES
    drawParticles(ctx, carScreenX, carScreenY, dt);

    // 6. SPEED LINES AT HIGH VELOCITY (> 280 km/h)
    if (st.speed > 8000) {
      drawSpeedLines(ctx, width, height, (st.speed - 8000) / 4000);
    }

    // 7. CONFETTI & FIREWORKS ON VICTORY FINISH
    if (st.gameState === 'finished') {
      drawVictoryEffects(ctx, width, height, dt);
    }
  };

  // 3D Point Projection Helper
  const projectPoint = (
    p: { world: { x: number; y: number; z: number }; camera: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } },
    cameraX: number, cameraY: number, cameraZ: number,
    width: number, height: number, roadWidth: number
  ) => {
    p.camera.x = p.world.x - cameraX;
    p.camera.y = p.world.y - cameraY;
    p.camera.z = p.world.z - cameraZ;

    p.screen.scale = CAMERA_DEPTH / Math.max(1, p.camera.z);
    p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
    p.screen.w = Math.round(p.screen.scale * roadWidth * width / 2);
  };

  // Polygon Drawing Utility
  const drawPoly = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  };

  // Draw Gantry Arch (Finish Line, Checkpoint, Start)
  const drawGantryArch = (
    ctx: CanvasRenderingContext2D,
    roadCenterX: number, roadY: number, roadHalfWidth: number, scale: number,
    spr: { text?: string; subText?: string; color?: string; type: string }
  ) => {
    const archW = roadHalfWidth * 2.3;
    const archH = 220 * scale * 2.4;
    const leftX = roadCenterX - archW / 2;
    const rightX = roadCenterX + archW / 2;
    const topY = roadY - archH;

    ctx.save();

    // Pillar left and right (truss steel structures)
    const pillarW = 28 * scale * 2.5;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(leftX, topY, pillarW, archH);
    ctx.fillRect(rightX - pillarW, topY, pillarW, archH);

    // Cross beam bridge
    const beamH = 55 * scale * 2.5;
    ctx.fillStyle = spr.color || '#E10600';
    ctx.fillRect(leftX, topY, archW, beamH);

    // Chequered banner pattern if Finish Arch!
    if (spr.type === 'finish_arch') {
      const squareSize = 14 * scale * 2.5;
      for (let bx = leftX; bx < rightX; bx += squareSize * 2) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(bx, topY, squareSize, squareSize);
        ctx.fillRect(bx + squareSize, topY + squareSize, squareSize, squareSize);
        ctx.fillStyle = '#000000';
        ctx.fillRect(bx + squareSize, topY, squareSize, squareSize);
        ctx.fillRect(bx, topY + squareSize, squareSize, squareSize);
      }
    }

    // Bridge Text Banner
    if (scale > 0.0018 && spr.text) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${Math.round(18 * scale * 2.2)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(spr.text, roadCenterX, topY + beamH * 0.45);

      if (spr.subText) {
        ctx.font = `bold ${Math.round(10 * scale * 2.2)}px monospace`;
        ctx.fillStyle = '#FACC15';
        ctx.fillText(spr.subText, roadCenterX, topY + beamH * 0.8);
      }
    }

    ctx.restore();
  };

  // Draw Sponsor Billboards
  const drawBillboard = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, scale: number,
    spr: { text?: string; subText?: string; color?: string }
  ) => {
    const w = 180 * scale * 2.2;
    const h = 90 * scale * 2.2;
    ctx.save();

    // Pillar
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 4 * scale, y - h, 8 * scale, h);

    // Board
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(x - w / 2, y - h - h * 0.9, w, h);
    ctx.strokeStyle = spr.color || '#E10600';
    ctx.lineWidth = Math.max(1, 4 * scale);
    ctx.strokeRect(x - w / 2, y - h - h * 0.9, w, h);

    // Text
    if (scale > 0.002 && spr.text) {
      ctx.fillStyle = spr.color || '#FFFFFF';
      ctx.font = `bold ${Math.round(20 * scale * 2)}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(spr.text, x, y - h - h * 0.45);

      if (spr.subText) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = `bold ${Math.round(10 * scale * 2)}px monospace`;
        ctx.fillText(spr.subText, x, y - h - h * 0.2);
      }
    }

    ctx.restore();
  };

  // Draw Mediterranean Pine Tree
  const drawTree = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => {
    const treeH = 260 * scale * 2.2;
    const trunkW = 18 * scale * 2.2;
    ctx.save();

    // Trunk
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(x - trunkW / 2, y - treeH * 0.5, trunkW, treeH * 0.5);

    // Foliage canopy
    ctx.fillStyle = '#1B5E20';
    ctx.beginPath();
    ctx.arc(x, y - treeH * 0.65, treeH * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(x - treeH * 0.1, y - treeH * 0.72, treeH * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw Grandstands with cheering crowd
  const drawGrandstand = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => {
    const standW = 280 * scale * 2.4;
    const standH = 140 * scale * 2.4;
    ctx.save();

    ctx.fillStyle = '#1E293B';
    ctx.fillRect(x - standW / 2, y - standH, standW, standH);

    // Red roof
    ctx.fillStyle = '#E10600';
    ctx.fillRect(x - standW * 0.55, y - standH - 10 * scale, standW * 1.1, 15 * scale);

    // Spectator rows (dots)
    if (scale > 0.002) {
      const colors = ['#EF4444', '#FFFFFF', '#FACC15', '#3B82F6'];
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 12; col++) {
          ctx.fillStyle = colors[(row + col) % colors.length];
          const px = x - standW * 0.4 + col * (standW * 0.07);
          const py = y - standH + 20 * scale + row * (standH * 0.2);
          ctx.fillRect(px, py, 4 * scale * 2, 4 * scale * 2);
        }
      }
    }

    ctx.restore();
  };

  // Draw Road Obstacles (Oil, Cones, Debris, Boost, Repair)
  const drawRoadObstacle = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, obs: RoadObstacle) => {
    ctx.save();

    if (obs.type === 'oil') {
      // Black reflective oil puddle with rainbow sheen
      const radX = 35 * scale * 2.8;
      const radY = 14 * scale * 2.8;
      const grad = ctx.createRadialGradient(x, y, 2, x, y, radX);
      grad.addColorStop(0, '#09090B');
      grad.addColorStop(0.6, '#18181B');
      grad.addColorStop(0.85, 'rgba(168,85,247,0.4)'); // Purple sheen
      grad.addColorStop(1, 'rgba(6,182,212,0)'); // Cyan sheen

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(x, y, radX, radY, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.type === 'cone') {
      // Traffic Cone (Orange with white reflective stripe)
      const coneW = 18 * scale * 2.6;
      const coneH = 34 * scale * 2.6;
      const coneY = y + (obs.bounceY || 0);

      ctx.fillStyle = '#EA580C'; // Vibrant orange
      ctx.beginPath();
      ctx.moveTo(x - coneW / 2, coneY);
      ctx.lineTo(x, coneY - coneH);
      ctx.lineTo(x + coneW / 2, coneY);
      ctx.closePath();
      ctx.fill();

      // White reflective tape
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - coneW * 0.28, coneY - coneH * 0.65, coneW * 0.56, coneH * 0.22);
    } else if (obs.type === 'debris') {
      // Tire Debris / Rubble
      const w = 24 * scale * 2.4;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(x - w / 2, y - 8 * scale, w, 10 * scale);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - w * 0.3, y - 10 * scale, w * 0.6, 4 * scale);
    } else if (obs.type === 'boost') {
      // Golden Chevron Nitro Boost Pad
      const padW = 40 * scale * 2.8;
      const padH = 22 * scale * 2.8;

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(x - padW / 2, y);
      ctx.lineTo(x, y - padH);
      ctx.lineTo(x + padW / 2, y);
      ctx.lineTo(x, y - padH * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FEF08A';
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.stroke();
    } else if (obs.type === 'repair') {
      // Pit Heart / Health repair kit
      const size = 18 * scale * 2.6;
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(x, y - size, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - size * 0.6, y - size - size * 0.2, size * 1.2, size * 0.4);
      ctx.fillRect(x - size * 0.2, y - size - size * 0.6, size * 0.4, size * 1.2);
    }

    ctx.restore();
  };

  // Draw Rival AI Cars (F1 and GT sports cars)
  const drawRivalCar = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, car: RivalCar) => {
    ctx.save();
    const carW = 60 * scale * 2.6;
    const carH = 34 * scale * 2.6;

    // Body
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(x - carW / 2, y - carH, carW, carH * 0.75, 4);
    ctx.fill();

    // Rear wing / Spoiler
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(x - carW * 0.55, y - carH * 1.25, carW * 1.1, carH * 0.25);

    // Wide Slick Tires
    const tireW = carW * 0.22;
    const tireH = carH * 0.6;
    ctx.fillStyle = '#111827';
    ctx.fillRect(x - carW * 0.6, y - tireH, tireW, tireH);
    ctx.fillRect(x + carW * 0.6 - tireW, y - tireH, tireW, tireH);

    // Glowing Taillights
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(x - carW * 0.35, y - carH * 0.45, 3 * scale * 2.5, 0, Math.PI * 2);
    ctx.arc(x + carW * 0.35, y - carH * 0.45, 3 * scale * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // DRAW THE RED FERRARI (FERRARI PASSEIO VERMELHA / ROSSO CORSA)
  const drawFerrariPasseio = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    tilt: number, isBraking: boolean, isBoosting: boolean,
    isSpinning: boolean, spinAngle: number, speed: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    if (isSpinning) {
      ctx.rotate(spinAngle);
    } else {
      // Dynamic chassis banking/roll when steering left/right
      ctx.rotate(tilt * 0.06);
    }

    const w = 150;
    const h = 75;

    // 1. Shadow beneath the Ferrari
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 8, w * 0.65, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Wide Racing Rear Slick Tires (Pirelli P-Zero Red Line)
    const tireW = 28;
    const tireH = 46;

    // Left Rear Tire
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.roundRect(-w * 0.58, -tireH + 10, tireW, tireH, 6);
    ctx.fill();
    // Red tire rim strip
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w * 0.58 + 2, -tireH + 14, tireW - 4, tireH - 8);

    // Right Rear Tire
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.roundRect(w * 0.58 - tireW, -tireH + 10, tireW, tireH, 6);
    ctx.fill();
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.58 - tireW + 2, -tireH + 14, tireW - 4, tireH - 8);

    // 3. Carbon Fiber Aerodynamic Rear Diffuser
    ctx.fillStyle = '#090D16';
    ctx.beginPath();
    ctx.roundRect(-w * 0.42, -18, w * 0.84, 24, 4);
    ctx.fill();

    // Central FIA Rain-Light / Formula 1 Strobe (Flashes when braking or in wet)
    ctx.fillStyle = isBraking ? '#EF4444' : (Math.floor(Date.now() / 150) % 2 === 0 ? '#EF4444' : '#7F1D1D');
    ctx.fillRect(-6, -4, 12, 8);

    // 4. Dual Twin Exhaust Tips with Nitro Flame Burst
    ctx.fillStyle = '#64748B';
    ctx.beginPath();
    ctx.arc(-w * 0.28, -2, 6, 0, Math.PI * 2);
    ctx.arc(-w * 0.20, -2, 6, 0, Math.PI * 2);
    ctx.arc(w * 0.20, -2, 6, 0, Math.PI * 2);
    ctx.arc(w * 0.28, -2, 6, 0, Math.PI * 2);
    ctx.fill();

    // Nitro Flame Burst when Boosting or Upshifting
    if (isBoosting || (speed > 4000 && Math.random() < 0.25)) {
      const flameLen = isBoosting ? 45 + Math.random() * 20 : 18;
      const flameGrad = ctx.createLinearGradient(0, 0, 0, flameLen);
      flameGrad.addColorStop(0, '#FFFFFF');
      flameGrad.addColorStop(0.3, '#38BDF8'); // Blue nitro core
      flameGrad.addColorStop(0.7, '#F97316'); // Orange flame
      flameGrad.addColorStop(1, 'rgba(239,68,68,0)');

      ctx.fillStyle = flameGrad;
      // Left exhausts
      ctx.beginPath();
      ctx.ellipse(-w * 0.24, flameLen * 0.5, 10, flameLen * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Right exhausts
      ctx.beginPath();
      ctx.ellipse(w * 0.24, flameLen * 0.5, 10, flameLen * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Main Ferrari Body Chassis (Rosso Corsa #D40000 / Glossy Red Curves)
    const bodyGrad = ctx.createLinearGradient(0, -h, 0, 0);
    bodyGrad.addColorStop(0, '#FF1E1E'); // Top gloss highlight
    bodyGrad.addColorStop(0.4, '#D40000'); // Authentic Ferrari Rosso Corsa
    bodyGrad.addColorStop(0.85, '#990000'); // Shadow tone
    bodyGrad.addColorStop(1, '#5B0000');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-w * 0.48, -12);
    ctx.bezierCurveTo(-w * 0.52, -h * 0.5, -w * 0.46, -h * 0.9, -w * 0.28, -h * 0.95);
    ctx.lineTo(w * 0.28, -h * 0.95);
    ctx.bezierCurveTo(w * 0.46, -h * 0.9, w * 0.52, -h * 0.5, w * 0.48, -12);
    ctx.closePath();
    ctx.fill();

    // Metallic gloss reflection streak across Ferrari rear deck
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, -h * 0.85);
    ctx.lineTo(w * 0.35, -h * 0.85);
    ctx.stroke();

    // 6. Cockpit Rear Window & Pilot (Pilot with Ferrari Red Helmet)
    ctx.fillStyle = '#0B0F19';
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.72, w * 0.24, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ferrari Pilot Helmet (Red with Yellow Visor)
    ctx.fillStyle = '#E10600';
    ctx.beginPath();
    ctx.arc(0, -h * 0.72, 10, 0, Math.PI * 2);
    ctx.fill();
    // Yellow Visor
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-6, -h * 0.74, 12, 4);

    // 7. Iconic Ferrari Dual Twin Round Taillights (Glowing Red & Ultra-Bright on Brake)
    const lightGlow = isBraking ? 18 : 8;
    const lightColor = isBraking ? '#FF2222' : '#E11D48';

    // Outer & Inner Left Taillights
    [-w * 0.34, -w * 0.22, w * 0.22, w * 0.34].forEach((lx) => {
      // Glow circle
      ctx.shadowColor = lightColor;
      ctx.shadowBlur = lightGlow;
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.arc(lx, -h * 0.38, isBraking ? 7 : 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Bright white center when braking
      if (isBraking) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(lx, -h * 0.38, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.shadowBlur = 0; // Reset shadow

    // 8. Ferrari Rear Aerofoil Spoiler with Cavallino & "FERRARI" Logo
    ctx.fillStyle = '#0B0F19';
    ctx.fillRect(-w * 0.52, -h * 0.58, w * 1.04, 8);
    // Endplates
    ctx.fillStyle = '#E10600';
    ctx.fillRect(-w * 0.54, -h * 0.65, 8, 18);
    ctx.fillRect(w * 0.54 - 8, -h * 0.65, 8, 18);

    // "FERRARI" yellow lettering on spoiler
    ctx.fillStyle = '#FACC15';
    ctx.font = 'bold 9px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FERRARI', 0, -h * 0.54);

    ctx.restore();
  };

  // Particles: Tire Smoke and Sparks
  const drawParticles = (ctx: CanvasRenderingContext2D, carX: number, carY: number, dt: number) => {
    const st = stateRef.current;

    // Spawn tire smoke on hard turn or brake
    const isDrifting = Math.abs(st.analogSteer) > 0.6 || st.keySlower || st.isSpinning;
    if (isDrifting && st.speed > 2500) {
      st.tireSmoke.push({
        x: carX + (Math.random() > 0.5 ? -60 : 60),
        y: carY + 8,
        vx: (Math.random() * 2 - 1) * 40,
        vy: -20 - Math.random() * 30,
        size: 8 + Math.random() * 8,
        alpha: 0.6
      });
    }

    // Update and draw smoke
    for (let i = st.tireSmoke.length - 1; i >= 0; i--) {
      const p = st.tireSmoke[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += dt * 35;
      p.alpha -= dt * 1.2;

      if (p.alpha <= 0) {
        st.tireSmoke.splice(i, 1);
        continue;
      }

      ctx.fillStyle = `rgba(226, 232, 240, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Update and draw sparks
    for (let i = st.sparks.length - 1; i >= 0; i--) {
      const sp = st.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 800 * dt; // gravity
      sp.life -= dt;

      if (sp.life <= 0) {
        st.sparks.splice(i, 1);
        continue;
      }

      ctx.fillStyle = sp.color;
      ctx.fillRect(carX + sp.x, carY + sp.y, 3, 3);
    }
  };

  // Speed Lines Effect
  const drawSpeedLines = (ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number) => {
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.4, intensity * 0.45)})`;
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 24; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      const len = 30 + intensity * 60;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (sx > width / 2 ? len : -len) * 0.4, sy + len);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Victory Confetti and Fireworks
  const drawVictoryEffects = (ctx: CanvasRenderingContext2D, width: number, height: number, dt: number) => {
    const st = stateRef.current;

    // Confetti
    for (let i = st.confetti.length - 1; i >= 0; i--) {
      const c = st.confetti[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rotation += c.vRot * dt;

      if (c.y > height + 20) {
        c.y = -20;
        c.x = Math.random() * width;
      }

      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 1.6);
      ctx.restore();
    }
  };

  return (
    <div id="f1-ferrari-racing-station" className="relative select-none rounded-2xl overflow-hidden bg-[#0A0D16] border border-red-500/40 shadow-2xl">
      {/* Top Telemetry Header Bar */}
      <div className="bg-gradient-to-r from-[#160608] via-[#1F0A0E] to-[#120507] border-b border-red-500/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-100 z-20 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-900 border border-red-400 flex items-center justify-center text-white shadow-[0_0_15px_rgba(225,6,0,0.4)]">
            <Flame className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-bold text-sm tracking-wider text-red-100">
                CORRIDA F1 • FERRARI MONZA GP
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                ROSSO CORSA V12
              </span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2 font-mono">
              <span>Circuito Internacional de Monza</span>
              <span>•</span>
              <span className="text-amber-400">Meta: Atingir a Linha de Chegada</span>
            </div>
          </div>
        </div>

        {/* Quick Stats in Header */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">TEMPO RESTANTE:</span>
            <span className={`font-bold font-orbitron ${timeRemaining <= 15 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {timeRemaining}s
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">PONTOS:</span>
            <span className="font-bold text-amber-300 font-orbitron">{score}</span>
          </div>

          {/* Audio & Camera Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCameraMode((prev) => (prev === 'chase' ? 'cockpit' : 'chase'))}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
              title="Alternar Câmera (C)"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">{cameraMode === 'chase' ? 'CHASE' : 'COCKPIT'}</span>
            </button>

            <button
              onClick={handleToggleMute}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-all cursor-pointer"
              title={isMuted ? 'Ativar Som Web Audio' : 'Mutar Som'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div className="relative w-full aspect-[16/10] max-h-[580px] bg-black overflow-hidden">
        <canvas
          ref={canvasRef}
          width={880}
          height={540}
          className="w-full h-full object-cover block"
        />

        {/* 5-Red-Lights Countdown Starting Gantry Overlay */}
        {gameState === 'countdown' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#0B0F19]/90 border border-red-500/50 rounded-2xl p-4 shadow-[0_0_40px_rgba(225,6,0,0.5)] backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="text-center font-orbitron font-bold text-xs tracking-widest text-slate-300 mb-2">
              LARGADA FORMULA 1 MONZA
            </div>
            <div className="flex items-center gap-3 p-3 bg-black/80 rounded-xl border border-slate-800">
              {[1, 2, 3, 4, 5].map((lightIdx) => (
                <div
                  key={lightIdx}
                  className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${
                    countdownLights === 6
                      ? 'bg-slate-900 border-slate-700 opacity-30' // All lights out!
                      : countdownLights >= lightIdx
                      ? 'bg-red-600 border-red-400 shadow-[0_0_20px_rgba(239,68,68,1)] animate-pulse'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full ${countdownLights >= lightIdx && countdownLights !== 6 ? 'bg-red-300' : 'bg-transparent'}`} />
                </div>
              ))}
            </div>
            <div className="text-center font-orbitron font-bold text-sm text-amber-400 mt-2">
              {countdownLights === 6 ? '🟢 LUZES APAGADAS! ACELERE A FERRARI!' : 'PREPARAR PARA A LARGADA...'}
            </div>
          </div>
        )}

        {/* Checkpoint Bonus Notification */}
        {checkpointNotice && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-cyan-950/90 border border-cyan-400 rounded-2xl px-6 py-3 shadow-[0_0_30px_rgba(6,182,212,0.6)] backdrop-blur-md animate-in fade-in slide-in-from-top-4 text-center">
            <div className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest">
              {checkpointNotice.text}
            </div>
            <div className="font-orbitron font-extrabold text-xl text-amber-300 mt-0.5">
              {checkpointNotice.bonus}
            </div>
          </div>
        )}

        {/* Live HUD: Top Speedometer & LED Tachometer (Inspired by F1 Telemetry) */}
        <div className="absolute top-3 left-4 z-20 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-md shadow-xl flex items-center gap-4">
          {/* Digital Speedometer */}
          <div>
            <div className="text-[10px] font-mono text-slate-400 font-bold">VELOCIDADE</div>
            <div className="flex items-baseline gap-1">
              <span className="font-orbitron font-extrabold text-3xl text-slate-100 tracking-wider">
                {speedKmh}
              </span>
              <span className="text-[11px] font-orbitron font-bold text-red-400">KM/H</span>
            </div>
          </div>

          <div className="w-[1px] h-10 bg-slate-800" />

          {/* Gear Indicator */}
          <div className="text-center">
            <div className="text-[10px] font-mono text-slate-400 font-bold">MARCHA</div>
            <div className="font-orbitron font-black text-2xl text-amber-400">
              {currentGear}
            </div>
          </div>

          <div className="w-[1px] h-10 bg-slate-800" />

          {/* RPM LED Shift Bar */}
          <div className="w-28 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>RPM: {rpm}</span>
              <span className="text-red-400 font-bold">{rpm >= 8400 ? 'SHIFT!' : ''}</span>
            </div>
            <div className="flex gap-1 h-3 bg-slate-900 rounded p-0.5 border border-slate-800">
              {Array.from({ length: 10 }).map((_, idx) => {
                const step = idx * 900;
                const active = rpm >= step;
                let color = 'bg-emerald-500';
                if (idx >= 5) color = 'bg-amber-500';
                if (idx >= 8) color = 'bg-red-500 animate-pulse';
                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-sm transition-all ${active ? color : 'bg-slate-800'}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Live HUD: Turbo / DRS Boost & Integrity Bar */}
        <div className="absolute top-3 right-4 z-20 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-md shadow-xl flex items-center gap-4">
          {/* Turbo Gauge */}
          <div className="w-28">
            <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                <span>TURBO DRS</span>
              </span>
              <span>{turboBoost}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/30">
              <div
                className={`h-full transition-all rounded-full ${
                  isBoosting
                    ? 'bg-gradient-to-r from-amber-400 to-cyan-400 animate-pulse'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                }`}
                style={{ width: `${turboBoost}%` }}
              />
            </div>
          </div>

          <div className="w-[1px] h-8 bg-slate-800" />

          {/* Car Integrity Health */}
          <div className="w-24">
            <div className="flex items-center justify-between text-[10px] font-mono text-red-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-red-400" />
                <span>CHASSIS</span>
              </span>
              <span>{integrity}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-red-500/30">
              <div
                className={`h-full transition-all rounded-full ${
                  integrity > 50
                    ? 'bg-emerald-500'
                    : integrity > 25
                    ? 'bg-amber-500'
                    : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${integrity}%` }}
              />
            </div>
          </div>
        </div>

        {/* Track Progress Bar (Bottom Center) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-xl bg-slate-950/85 border border-slate-800 rounded-2xl p-2.5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mb-1.5">
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <Flag className="w-3.5 h-3.5" />
              <span>LARGADA</span>
            </span>
            <span className="text-slate-400">
              DISTÂNCIA RESTANTE: <strong className="text-amber-400 font-orbitron">{distanceRemainingMeters}m</strong>
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span>CHEGADA</span>
              <Trophy className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="relative w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
            {/* Checkpoint Indicators on Track Bar */}
            <div className="absolute top-0 bottom-0 left-[25%] w-[2px] bg-cyan-400/80 z-10" title="Setor 1" />
            <div className="absolute top-0 bottom-0 left-[50%] w-[2px] bg-emerald-400/80 z-10" title="Setor 2" />
            <div className="absolute top-0 bottom-0 left-[75%] w-[2px] bg-amber-400/80 z-10" title="Setor 3" />

            <div
              className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Start / Idle Screen Modal */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-40">
            <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-[#180A0E] to-[#0A0D16] border border-red-500/50 p-6 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 border border-red-400 flex items-center justify-center text-white mx-auto shadow-[0_0_30px_rgba(225,6,0,0.5)]">
                <Car className="w-8 h-8 text-amber-300" />
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-orbitron font-extrabold text-slate-100 tracking-wide">
                  CORRIDA F1 • FERRARI
                </h2>
                <p className="text-xs text-red-300 font-mono mt-1">
                  Grande Prêmio de Monza • Pilote a Ferrari Passeio Vermelha
                </p>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-2 text-slate-300">
                <div className="text-amber-400 font-bold flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>MISSÃO DO PILOTO:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Acelere a icônica Ferrari Rosso Corsa, desvie de carros rivais, manchas de óleo escorregadias, cones e detritos da pista, ultrapasse os 3 checkpoints e cruze a <strong>Linha de Chegada</strong> antes do cronômetro zerar!
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                  <div>⌨️ <strong>Teclado:</strong> Setas / WASD</div>
                  <div>⚡ <strong>Turbo DRS:</strong> Espaço / Shift</div>
                  <div>🎮 <strong>Joystick:</strong> Analógico / R2 / L2</div>
                  <div>🏆 <strong>Meta:</strong> Linha de Chegada</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={startRaceCountdown}
                  className="flex-1 py-3 px-6 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-red-600 via-red-500 to-amber-500 text-slate-950 shadow-[0_0_25px_rgba(225,6,0,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>LARGAR AGORA</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Victory Screen Modal (Linha de Chegada Atingida!) */}
        {gameState === 'finished' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-40 animate-in fade-in zoom-in-95">
            <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-[#180A0E] via-[#0E1529] to-[#0A0D16] border border-amber-500/50 p-6 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 border border-amber-300 flex items-center justify-center text-slate-950 mx-auto shadow-[0_0_35px_rgba(245,158,11,0.6)] animate-bounce">
                <Trophy className="w-9 h-9 fill-current" />
              </div>

              <div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  VITÓRIA EM MONZA • PODIUM DE OURO
                </span>
                <h2 className="text-xl md:text-2xl font-orbitron font-extrabold text-slate-100 tracking-wide mt-1">
                  LINHA DE CHEGADA CRUSADA!
                </h2>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  Parabéns Piloto! A Ferrari Passeio completou a corrida com perfeição!
                </p>
              </div>

              {/* Race Results Table */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Tempo de Volta:</span>
                  <span className="font-orbitron font-bold text-amber-400">
                    {Math.floor(raceTimeMs / 60000).toString().padStart(2, '0')}:
                    {Math.floor((raceTimeMs % 60000) / 1000).toString().padStart(2, '0')}.
                    {Math.floor((raceTimeMs % 1000) / 10).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Velocidade Máxima:</span>
                  <span className="font-orbitron font-bold text-red-400">{topSpeedAchieved} KM/H</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Obstáculos Desviados:</span>
                  <span className="font-bold text-emerald-400">{obstaclesDodged}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="text-slate-200 font-bold">Pontuação Total:</span>
                  <span className="font-orbitron font-extrabold text-amber-300">{score} pts</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRestart}
                  className="w-full py-3 px-6 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>CORRER NOVAMENTE (START)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Time Over / Crash Modal */}
        {gameState === 'crashed' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-40 animate-in fade-in zoom-in-95">
            <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-[#180A0E] to-[#0A0D16] border border-red-500/50 p-6 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-orbitron font-extrabold text-slate-100 tracking-wide">
                  TEMPO ESGOTADO!
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  O tempo limite de corrida terminou antes da Linha de Chegada.
                </p>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
                <div>Pontuação obtida: <strong className="text-amber-400 font-orbitron">{score} pts</strong></div>
                <div className="text-[11px] text-slate-400 mt-1">Dica: Use o Turbo DRS (Espaço ou R1 no joystick) nas retas para ganhar velocidade!</div>
              </div>

              <button
                onClick={handleRestart}
                className="w-full py-3 px-6 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(225,6,0,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TENTAR NOVAMENTE</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Guide & Mobile / Touch Controls Bar */}
      <div className="bg-[#0A0E18] border-t border-slate-800/80 p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400">STATUS JOYSTICK:</span>
            <strong className={isGamepadActive ? 'text-emerald-400' : 'text-slate-400'}>
              {isGamepadActive ? `${gamepadLabel} (ATIVO)` : 'AGUARDANDO JOYSTICK USB'}
            </strong>
          </div>
        </div>

        {/* On-Screen Mobile Touch Controls for Tablet / Mobile Users */}
        <div className="flex items-center gap-2 sm:hidden w-full justify-between pt-2 border-t border-slate-800">
          <div className="flex gap-2">
            <button
              onTouchStart={() => (stateRef.current.keyLeft = true)}
              onTouchEnd={() => (stateRef.current.keyLeft = false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-bold active:bg-cyan-500/30"
            >
              ◄ ESQ
            </button>
            <button
              onTouchStart={() => (stateRef.current.keyRight = true)}
              onTouchEnd={() => (stateRef.current.keyRight = false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-bold active:bg-cyan-500/30"
            >
              DIR ►
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onTouchStart={() => (stateRef.current.keySlower = true)}
              onTouchEnd={() => (stateRef.current.keySlower = false)}
              className="px-3 py-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 font-bold active:bg-red-500/30"
            >
              FREIO
            </button>
            <button
              onTouchStart={() => (stateRef.current.keyTurbo = true)}
              onTouchEnd={() => (stateRef.current.keyTurbo = false)}
              className="px-3 py-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold active:bg-cyan-500/30"
            >
              TURBO
            </button>
            <button
              onTouchStart={() => (stateRef.current.keyFaster = true)}
              onTouchEnd={() => (stateRef.current.keyFaster = false)}
              className="px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold active:bg-emerald-500/30"
            >
              ACELERA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
