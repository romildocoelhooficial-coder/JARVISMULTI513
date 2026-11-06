import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Plane,
  Gauge,
  Compass,
  Wind,
  Shield,
  Clock,
  Sparkles,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { retroAudio } from './retroAudio';
import { pollActiveGamepad, triggerGamepadVibration, formatGamepadName } from './gamepadController';

interface DinoFlightGameProps {
  onScoreUpdate?: (score: number) => void;
  onMissionFinish?: (stats: { timeSeconds: number; ringsCollected: number; finalScore: number }) => void;
}

// Navigational Aerial Ring (Elo de Marcação)
interface FlightRing {
  id: number;
  worldX: number; // horizontal canyon position (-800 to 800)
  worldY: number; // altitude (200 to 900 ft)
  worldZ: number; // distance along flight path
  radius: number;
  passed: boolean;
  color: string;
}

// Prehistoric Flying Pterodactyls
interface Pterodactyl {
  id: number;
  x: number;
  y: number;
  z: number;
  wingAngle: number;
  wingSpeed: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
}

// Ground Dinosaurs (Brachiosaurus, T-Rex, Triceratops)
interface GroundDino {
  id: number;
  type: 'brachio' | 'trex' | 'tricera';
  x: number;
  y: number; // terrain elevation
  z: number;
  scale: number;
  animTimer: number;
  roared?: boolean;
}

// Cloud in the sky
interface SkyCloud {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  opacity: number;
}

// Ring impact sparkle particles
interface RingSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

const TOTAL_FLIGHT_DISTANCE = 42000; // Total track length to Las Vegas Airport
const TAKEOFF_RUNWAY_END = 2800; // Runway takeoff distance
const CANYON_START = 3000;
const VEGAS_APPROACH_START = 33000; // Transition to Las Vegas Valley
const VEGAS_RUNWAY_START = 38500; // Final Approach & Touchdown Zone
const TOTAL_RINGS = 20;

export const DinoFlightGame: React.FC<DinoFlightGameProps> = ({ onScoreUpdate, onMissionFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React UI States
  const [gameState, setGameState] = useState<'idle' | 'takeoff' | 'flying' | 'landing' | 'arrived' | 'crashed'>('idle');
  const [airspeedKnots, setAirspeedKnots] = useState<number>(0);
  const [altitudeFeet, setAltitudeFeet] = useState<number>(0);
  const [throttlePercent, setThrottlePercent] = useState<number>(0);
  const [fuelTimeRemaining, setFuelTimeRemaining] = useState<number>(95);
  const [score, setScore] = useState<number>(0);
  const [ringsPassedCount, setRingsPassedCount] = useState<number>(0);
  const [comboMultiplier, setComboMultiplier] = useState<number>(1);
  const [distanceToVegasKm, setDistanceToVegasKm] = useState<number>(42);
  const [cameraView, setCameraView] = useState<'chase' | 'cockpit'>('chase');
  const [isMuted, setIsMuted] = useState<boolean>(retroAudio.getMuted());
  const [isGamepadConnected, setIsGamepadConnected] = useState<boolean>(false);
  const [gamepadName, setGamepadName] = useState<string>('Joystick USB / KTS');
  const [isStallWarning, setIsStallWarning] = useState<boolean>(false);
  const [missionAnnouncement, setMissionAnnouncement] = useState<{ title: string; subtitle: string } | null>(null);

  // Mutable Game Loop State
  const stateRef = useRef({
    gameState: 'idle' as 'idle' | 'takeoff' | 'flying' | 'landing' | 'arrived' | 'crashed',
    // Aircraft 3D State
    planeX: 0, // lateral offset (-900 to 900)
    planeY: 0, // altitude (0 = ground runway, 200 to 1400 cruising altitude)
    planeZ: 0, // forward distance traveled
    pitch: 0, // nose up/down angle (-0.45 to 0.45 rad)
    roll: 0, // wing bank angle (-0.75 to 0.75 rad)
    yaw: 0, // heading sway
    airspeed: 0, // current speed units (0 to 450)
    targetAirspeed: 0,
    throttle: 0, // 0 to 1
    flaps: false,
    gearDown: true,
    isBoosting: false,
    propRotation: 0,
    fuelTime: 95,
    elapsedTime: 0,
    score: 0,
    ringsPassed: 0,
    combo: 1,
    lastRingZ: 0,
    // Inputs
    keyPitchUp: false,
    keyPitchDown: false,
    keyBankLeft: false,
    keyBankRight: false,
    keyThrottleUp: false,
    keyThrottleDown: false,
    keyBoost: false,
    analogPitch: 0,
    analogRoll: 0,
    // Objects
    rings: [] as FlightRing[],
    pterodactyls: [] as Pterodactyl[],
    groundDinos: [] as GroundDino[],
    clouds: [] as SkyCloud[],
    sparkles: [] as RingSparkle[],
    wingTrails: [] as Array<{ x1: number; y1: number; x2: number; y2: number; alpha: number }>,
    lastTime: 0,
  });

  const prevGpStartRef = useRef<boolean>(false);
  const prevGpBoostRef = useRef<boolean>(false);

  // Audio Toggle
  const handleToggleMute = useCallback(() => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    retroAudio.setMuted(nextMute);
  }, [isMuted]);

  // Build World Entities (Rings, Dinos, Clouds)
  const buildFlightWorld = useCallback(() => {
    // 1. Navigational Aerial Rings along the flight corridor
    const rings: FlightRing[] = [];
    const ringSpacing = (VEGAS_APPROACH_START - CANYON_START) / TOTAL_RINGS;

    for (let i = 0; i < TOTAL_RINGS; i++) {
      const z = CANYON_START + i * ringSpacing + 600;
      // Winding canyon path with smooth wave
      const x = Math.sin(i * 0.7) * 420;
      const y = 350 + Math.cos(i * 0.5) * 160;

      rings.push({
        id: i + 1,
        worldX: x,
        worldY: y,
        worldZ: z,
        radius: 140,
        passed: false,
        color: i % 2 === 0 ? '#FACC15' : '#06B6D4' // Alternate Gold & Cyan Neon Rings
      });
    }

    // 2. Flying Pterodactyls in the Canyon Sky
    const pteros: Pterodactyl[] = [];
    for (let i = 0; i < 14; i++) {
      pteros.push({
        id: i,
        x: (Math.random() * 2 - 1) * 650,
        y: 300 + Math.random() * 450,
        z: CANYON_START + 1200 + i * 2200 + Math.random() * 800,
        wingAngle: Math.random() * Math.PI,
        wingSpeed: 4 + Math.random() * 3,
        vx: (Math.random() * 2 - 1) * 35,
        vy: (Math.random() * 2 - 1) * 15,
        vz: -40 - Math.random() * 30,
        scale: 0.85 + Math.random() * 0.5
      });
    }

    // 3. Ground Dinosaurs (Brachiosaurus grazing in valleys, T-Rex on ridges)
    const dinos: GroundDino[] = [];
    for (let i = 0; i < 16; i++) {
      const z = CANYON_START + 800 + i * 1900 + Math.random() * 500;
      const type = i % 3 === 0 ? 'trex' : (i % 2 === 0 ? 'brachio' : 'tricera');
      const side = (i % 2 === 0 ? 1 : -1) * (350 + Math.random() * 350);

      dinos.push({
        id: i,
        type,
        x: side,
        y: 0,
        z,
        scale: type === 'brachio' ? 1.6 : (type === 'trex' ? 1.2 : 1.0),
        animTimer: Math.random() * 5,
        roared: false
      });
    }

    // 4. Fluffy Sunny Clouds in the Sky
    const clouds: SkyCloud[] = [];
    for (let i = 0; i < 28; i++) {
      clouds.push({
        x: (Math.random() * 2 - 1) * 2500,
        y: 750 + Math.random() * 550,
        z: i * 1600 + Math.random() * 800,
        width: 350 + Math.random() * 350,
        height: 120 + Math.random() * 100,
        opacity: 0.45 + Math.random() * 0.35
      });
    }

    const st = stateRef.current;
    st.rings = rings;
    st.pterodactyls = pteros;
    st.groundDinos = dinos;
    st.clouds = clouds;
  }, []);

  // Launch Flight Mission (Starts on Takeoff Runway)
  const startMission = useCallback(() => {
    buildFlightWorld();
    const st = stateRef.current;
    st.gameState = 'takeoff';
    st.planeX = 0;
    st.planeY = 0; // on ground tarmac
    st.planeZ = 0;
    st.pitch = 0;
    st.roll = 0;
    st.yaw = 0;
    st.airspeed = 0;
    st.targetAirspeed = 0;
    st.throttle = 0.35; // Engine idle at start
    st.gearDown = true;
    st.flaps = false;
    st.isBoosting = false;
    st.fuelTime = 95;
    st.elapsedTime = 0;
    st.score = 0;
    st.ringsPassed = 0;
    st.combo = 1;
    st.sparkles = [];
    st.wingTrails = [];

    setGameState('takeoff');
    setAirspeedKnots(0);
    setAltitudeFeet(0);
    setThrottlePercent(35);
    setFuelTimeRemaining(95);
    setScore(0);
    setRingsPassedCount(0);
    setComboMultiplier(1);
    setDistanceToVegasKm(42);
    setIsStallWarning(false);

    setMissionAnnouncement({
      title: '🛫 PISTA 09L • AUTORIZADO PARA DECOLAGEM',
      subtitle: 'Acelere o motor com R2 ou W. Puxe o manche ao atingir 65 nós!'
    });
    setTimeout(() => setMissionAnnouncement(null), 4000);

    retroAudio.startAirplaneEngine();
    retroAudio.updateAirplaneEngine(0.35, 0.3, false);
  }, [buildFlightWorld]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const st = stateRef.current;

      switch (e.key) {
        // Flight Stick Pitch (Aviation standard: S / Down pulls stick back to climb, W / Up pushes down to dive)
        case 'ArrowDown':
        case 's':
        case 'S':
          st.keyPitchUp = true;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          st.keyPitchDown = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          st.keyBankLeft = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          st.keyBankRight = true;
          break;
        // Throttle control
        case 'Shift':
        case ' ':
          st.keyBoost = true;
          st.keyThrottleUp = true;
          break;
        case 'Control':
        case 'x':
        case 'X':
          st.keyThrottleDown = true;
          break;
        case 'c':
        case 'C':
          setCameraView((prev) => (prev === 'chase' ? 'cockpit' : 'chase'));
          break;
        case 'Enter':
          if (st.gameState === 'idle' || st.gameState === 'crashed' || st.gameState === 'arrived') {
            startMission();
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
        case 'ArrowDown':
        case 's':
        case 'S':
          st.keyPitchUp = false;
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          st.keyPitchDown = false;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          st.keyBankLeft = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          st.keyBankRight = false;
          break;
        case 'Shift':
        case ' ':
          st.keyBoost = false;
          st.keyThrottleUp = false;
          break;
        case 'Control':
        case 'x':
        case 'X':
          st.keyThrottleDown = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      retroAudio.stopAirplaneEngine();
    };
  }, [handleToggleMute, startMission]);

  // Initial build
  useEffect(() => {
    buildFlightWorld();
  }, [buildFlightWorld]);

  // Main 60 FPS Flight Simulation Loop
  useEffect(() => {
    let animId: number;

    const gameLoop = (timestamp: number) => {
      const st = stateRef.current;
      if (!st.lastTime) st.lastTime = timestamp;
      const dt = Math.min(0.08, (timestamp - st.lastTime) / 1000);
      st.lastTime = timestamp;

      // ----------------------------------------------------
      // 1. GAMEPAD / JOYSTICK POLLING (KTS, USB Gamepad, etc.)
      // ----------------------------------------------------
      const gp = pollActiveGamepad();
      setIsGamepadConnected(gp.connected);

      if (gp.connected) {
        setGamepadName(formatGamepadName(gp.id));

        // Start / Restart on START button
        if (gp.start && !prevGpStartRef.current) {
          if (st.gameState === 'idle' || st.gameState === 'crashed' || st.gameState === 'arrived') {
            startMission();
          }
        }
        prevGpStartRef.current = gp.start;

        // Proportional Flight Stick Control (Analog Stick Y = Pitch, Analog Stick X = Bank/Roll)
        let stickPitch = -gp.axes[1]; // Pull back (-Y) to pitch UP
        let stickRoll = gp.axes[0]; // Left/Right bank

        // D-Pad alternatives
        if (gp.dpadDown) stickPitch = 1.0;
        if (gp.dpadUp) stickPitch = -1.0;
        if (gp.dpadLeft) stickRoll = -1.0;
        if (gp.dpadRight) stickRoll = 1.0;

        st.analogPitch = Math.abs(stickPitch) > 0.15 ? stickPitch : 0;
        st.analogRoll = Math.abs(stickRoll) > 0.15 ? stickRoll : 0;

        // Throttle Up (R2 Trigger, Button 0 / X, D-Pad Up)
        const gpThrottleUp = gp.r2 || gp.buttonSouth;
        // Throttle Down / Airbrake / Flaps (L2 Trigger, Button 2 / Square)
        const gpThrottleDown = gp.l2 || gp.buttonWest;
        // Turbo WEP Boost (R1, L1, Button 3 / Triangle)
        const gpBoost = gp.r1 || gp.l1 || gp.buttonNorth;

        if (gpThrottleUp) st.keyThrottleUp = true;
        if (gpThrottleDown) st.keyThrottleDown = true;
        if (gpBoost) st.keyBoost = true;
      }

      // ----------------------------------------------------
      // 2. AIRCRAFT PHYSICS & FLIGHT DYNAMICS
      // ----------------------------------------------------
      if (st.gameState === 'takeoff' || st.gameState === 'flying' || st.gameState === 'landing') {
        st.elapsedTime += dt;
        st.fuelTime -= dt;
        setFuelTimeRemaining(Math.max(0, Math.ceil(st.fuelTime)));

        // Fuel out check
        if (st.fuelTime <= 0 && st.planeZ < VEGAS_RUNWAY_START) {
          st.gameState = 'crashed';
          setGameState('crashed');
          retroAudio.playFerrariCrash();
          triggerGamepadVibration(400, 0.8, 1.0);
          retroAudio.stopAirplaneEngine();
        }

        // Throttle adjustment
        if (st.keyThrottleUp) {
          st.throttle = Math.min(1.0, st.throttle + dt * 0.7);
        } else if (st.keyThrottleDown) {
          st.throttle = Math.max(0.15, st.throttle - dt * 0.7);
        }

        const isBoosting = st.keyBoost && st.throttle > 0.8;
        st.isBoosting = isBoosting;

        // Target Airspeed (Knots) based on throttle & dive/climb
        let maxAirspeed = 135;
        if (isBoosting) maxAirspeed = 175;
        // Diving increases speed, climbing reduces speed
        const pitchSpeedDelta = -st.pitch * 50;
        st.targetAirspeed = (st.throttle * maxAirspeed) + pitchSpeedDelta;

        // Smooth airspeed transition
        st.airspeed += (st.targetAirspeed - st.airspeed) * dt * 1.5;
        st.airspeed = Math.max(0, st.airspeed);
        setAirspeedKnots(Math.round(st.airspeed));
        setThrottlePercent(Math.round(st.throttle * 100));

        // Spinning Propeller rotation
        st.propRotation += dt * (18 + st.throttle * 60);

        // Update Airplane Engine Audio
        retroAudio.updateAirplaneEngine(st.throttle, st.airspeed / 140, isBoosting);

        // Flight Stick Steering (Pitch & Roll/Bank)
        let pitchInput = 0;
        let rollInput = 0;

        if (st.analogPitch !== 0) {
          pitchInput = st.analogPitch;
        } else {
          if (st.keyPitchUp) pitchInput += 1.0; // Pull back -> climb
          if (st.keyPitchDown) pitchInput -= 1.0; // Push forward -> dive
        }

        if (st.analogRoll !== 0) {
          rollInput = st.analogRoll;
        } else {
          if (st.keyBankLeft) rollInput -= 1.0;
          if (st.keyBankRight) rollInput += 1.0;
        }

        // Apply Pitch & Roll with smooth aerodynamic response
        st.pitch += (pitchInput * 0.42 - st.pitch) * dt * 2.8;
        st.roll += (rollInput * 0.65 - st.roll) * dt * 3.5;

        // Aerodynamic Lift calculation: Plane only generates lift when airspeed > 55 knots
        const liftFactor = Math.min(1.0, Math.max(0, (st.airspeed - 40) / 45));

        // Altitude changes based on pitch and lift
        let climbRate = (st.pitch * st.airspeed * 2.8) * liftFactor;

        // Gravity pull if airspeed is below stall speed (< 50 knots)
        if (st.planeY > 0 && st.airspeed < 52) {
          climbRate -= (55 - st.airspeed) * 4.5;
          setIsStallWarning(true);
          retroAudio.playStallWarning();
          triggerGamepadVibration(60, 0.4, 0.5);
        } else {
          setIsStallWarning(false);
        }

        st.planeY += climbRate * dt;

        // Ground collision & Takeoff logic
        if (st.planeY <= 0) {
          st.planeY = 0;
          st.roll = 0; // Wings level on runway
          if (st.pitch < 0) st.pitch = 0;
        }

        // Phase Transitions: Takeoff -> Flying Canyon
        if (st.gameState === 'takeoff' && st.planeY > 50 && st.airspeed > 65) {
          st.gameState = 'flying';
          setGameState('flying');
          st.gearDown = false; // Retract landing gear
          triggerGamepadVibration(120, 0.3, 0.5);
          setMissionAnnouncement({
            title: '🦖 VALE DOS DINOSSAUROS • SOBREVOO INICIADO',
            subtitle: 'Atravesse os Elos de Marcação para manter o rumo a Las Vegas!'
          });
          setTimeout(() => setMissionAnnouncement(null), 4500);
        }

        // Advance Forward Distance (Z)
        const forwardSpeed = st.airspeed * 2.4;
        st.planeZ += forwardSpeed * dt;

        // Lateral flight heading displacement based on banking roll
        st.planeX += (st.roll * st.airspeed * 1.8) * dt;
        st.planeX = Math.max(-950, Math.min(950, st.planeX));

        setAltitudeFeet(Math.round(st.planeY * 2.8));
        const distKm = Math.max(0, Math.round((TOTAL_FLIGHT_DISTANCE - st.planeZ) / 1000));
        setDistanceToVegasKm(distKm);

        // ----------------------------------------------------
        // 3. NAVIGATIONAL RINGS (ELOS DE MARCAÇÃO) DETECTION
        // ----------------------------------------------------
        for (const ring of st.rings) {
          if (ring.passed) continue;

          const zDiff = Math.abs(ring.worldZ - st.planeZ);
          // When plane crosses the ring Z plane
          if (zDiff < 140 && st.planeZ >= ring.worldZ - 60) {
            const dx = st.planeX - ring.worldX;
            const dy = st.planeY - ring.worldY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= ring.radius * 1.15) {
              // RING PASSED CLEANLY!
              ring.passed = true;
              st.ringsPassed++;
              st.fuelTime += 10; // +10s bonus fuel
              st.combo++;
              const ringScore = 300 * st.combo;
              st.score += ringScore;

              setRingsPassedCount(st.ringsPassed);
              setComboMultiplier(st.combo);
              setScore(st.score);
              if (onScoreUpdate) onScoreUpdate(st.score);

              retroAudio.playRingChime(st.combo);
              triggerGamepadVibration(180, 0.45, 0.65);

              // Spawn celestial sparkle particles
              for (let s = 0; s < 24; s++) {
                st.sparkles.push({
                  x: 0,
                  y: 0,
                  vx: (Math.random() * 2 - 1) * 220,
                  vy: (Math.random() * 2 - 1) * 220,
                  color: ring.color,
                  size: 4 + Math.random() * 5,
                  life: 0.65
                });
              }
            }
          } else if (st.planeZ > ring.worldZ + 200 && !ring.passed) {
            // Ring missed
            ring.passed = true;
            st.combo = 1; // Reset combo
            setComboMultiplier(1);
          }
        }

        // ----------------------------------------------------
        // 4. PREHISTORIC DINOSAURS INTERACTION
        // ----------------------------------------------------
        // Pterodactyls in flight
        for (const ptero of st.pterodactyls) {
          ptero.z += ptero.vz * dt;
          ptero.x += ptero.vx * dt;
          ptero.wingAngle += dt * ptero.wingSpeed;

          // Check proximity to plane for exploration score
          const pteroDistZ = Math.abs(ptero.z - st.planeZ);
          const pteroDistX = Math.abs(ptero.x - st.planeX);
          const pteroDistY = Math.abs(ptero.y - st.planeY);

          if (pteroDistZ < 180 && pteroDistX < 140 && pteroDistY < 120 && !((ptero as any).sighted)) {
            (ptero as any).sighted = true;
            st.score += 250;
            setScore(st.score);
            if (onScoreUpdate) onScoreUpdate(st.score);
            triggerGamepadVibration(80, 0.3, 0.35);
          }
        }

        // Ground Dinosaurs (Roar when flying nearby)
        for (const dino of st.groundDinos) {
          dino.animTimer += dt;
          const zDiff = Math.abs(dino.z - st.planeZ);
          if (zDiff < 600 && !dino.roared) {
            dino.roared = true;
            retroAudio.playDinoRoar();
            triggerGamepadVibration(150, 0.4, 0.5);
          }
        }

        // ----------------------------------------------------
        // 5. LAS VEGAS AIRPORT APPROACH & LANDING PHASE
        // ----------------------------------------------------
        if (st.planeZ >= VEGAS_APPROACH_START && st.gameState === 'flying') {
          st.gameState = 'landing';
          setGameState('landing');
          st.gearDown = true; // Deploy landing gear
          setMissionAnnouncement({
            title: '🎰 APROXIMAÇÃO FINAL • LAS VEGAS AIRPORT',
            subtitle: 'Alinhe com a pista iluminada, reduza a potência e realize o pouso!'
          });
          setTimeout(() => setMissionAnnouncement(null), 5000);
        }

        // Final Touchdown on Las Vegas Runway
        if (st.planeZ >= VEGAS_RUNWAY_START && st.planeY <= 8 && st.airspeed > 20) {
          if (st.gameState === 'landing') {
            st.gameState = 'arrived';
            setGameState('arrived');
            retroAudio.playTireTouchdown();
            retroAudio.playVegasArrival();
            triggerGamepadVibration(600, 0.8, 1.0);

            // Final Arrival Bonus Score
            const landingBonus = Math.round(st.fuelTime * 150) + (st.ringsPassed * 500) + 12000;
            st.score += landingBonus;
            setScore(st.score);
            if (onScoreUpdate) onScoreUpdate(st.score);

            if (onMissionFinish) {
              onMissionFinish({
                timeSeconds: st.elapsedTime,
                ringsCollected: st.ringsPassed,
                finalScore: st.score
              });
            }
          }
        }
      }

      // ----------------------------------------------------
      // 6. RENDER MASTER 3D FLIGHT CANVAS
      // ----------------------------------------------------
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderFlightScene(ctx, canvas.width, canvas.height, dt);
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [buildFlightWorld, onMissionFinish, onScoreUpdate, startMission]);

  // Master Scene Rendering
  const renderFlightScene = (ctx: CanvasRenderingContext2D, width: number, height: number, dt: number) => {
    const st = stateRef.current;
    ctx.clearRect(0, 0, width, height);

    // Dynamic Horizon Elevation based on Plane Pitch & Altitude
    const horizonY = height * 0.52 + (st.pitch * height * 0.8) - (st.planeY * 0.08);

    // 1. SKY GRADIENT (Bright Radiant Sunny Day transitioning to Nevada Sunset glow at Vegas)
    const isVegasZone = st.planeZ >= VEGAS_APPROACH_START;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(0, horizonY));

    if (isVegasZone) {
      skyGrad.addColorStop(0, '#0F172A'); // Deep twilight purple
      skyGrad.addColorStop(0.5, '#431407'); // Desert crimson
      skyGrad.addColorStop(1, '#D97706'); // Golden glow over Vegas Strip
    } else {
      skyGrad.addColorStop(0, '#0284C7'); // Radiant azure blue sky
      skyGrad.addColorStop(0.65, '#38BDF8'); // Cyan morning light
      skyGrad.addColorStop(1, '#BAE6FD'); // Warm horizon
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, Math.max(0, horizonY));

    // Sun with luminous corona flare
    const sunX = width * 0.72 - (st.roll * 80);
    const sunY = horizonY * 0.35;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 120);
    sunGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
    sunGrad.addColorStop(0.3, 'rgba(254,240,138,0.7)');
    sunGrad.addColorStop(1, 'rgba(254,240,138,0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 120, 0, Math.PI * 2);
    ctx.fill();

    // 2. PARALLAX DISTANT CANYON MESAS & MOUNTAINS
    ctx.save();
    ctx.fillStyle = isVegasZone ? '#1E1B4B' : '#78350F'; // Red rock canyon cliffs
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let mx = 0; mx <= width; mx += 60) {
      const peakHeight = Math.sin((mx + st.planeX * 0.2) * 0.012) * 45 + Math.cos(mx * 0.02) * 25;
      ctx.lineTo(mx, horizonY - 30 - peakHeight);
    }
    ctx.lineTo(width, horizonY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. TERRAIN / VALLEY FLOOR (Canyon Rivers & Prehistoric Greens or Vegas Desert Tarmac)
    const groundGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    if (isVegasZone) {
      groundGrad.addColorStop(0, '#33271E'); // Desert sand
      groundGrad.addColorStop(0.7, '#1C1917'); // Las Vegas airport perimeter
      groundGrad.addColorStop(1, '#0C0A09');
    } else {
      groundGrad.addColorStop(0, '#78350F'); // Canyon red earth
      groundGrad.addColorStop(0.3, '#14532D'); // Lush Jurassic prehistoric ferns
      groundGrad.addColorStop(1, '#064E3B'); // Deep valley green
    }
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Prehistoric River winding through the valley
    if (!isVegasZone && horizonY < height) {
      ctx.save();
      ctx.fillStyle = 'rgba(6,182,212,0.45)';
      ctx.beginPath();
      ctx.moveTo(width * 0.45 - (st.planeX * 0.3), horizonY);
      ctx.bezierCurveTo(
        width * 0.6, horizonY + 80,
        width * 0.3, horizonY + 180,
        width * 0.55 - (st.planeX * 0.5), height
      );
      ctx.lineTo(width * 0.65 - (st.planeX * 0.5), height);
      ctx.bezierCurveTo(
        width * 0.38, horizonY + 180,
        width * 0.68, horizonY + 80,
        width * 0.5 - (st.planeX * 0.3), horizonY
      );
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 4. RUNWAY RENDERING (Takeoff Strip at start OR Las Vegas Destination Runway at end)
    if (st.planeZ < TAKEOFF_RUNWAY_END + 1500) {
      // Starting Runway (Pista de Decolagem)
      drawRunwayStrip(ctx, width, height, horizonY, st.planeX, st.planeZ, 0, 'RUNWAY 09L • DECOLAGEM');
    } else if (st.planeZ >= VEGAS_APPROACH_START - 2000) {
      // Las Vegas Destination Runway & Skyline
      drawVegasAirportRunway(ctx, width, height, horizonY, st.planeX, st.planeZ);
    }

    // 5. 3D PROJECTED SKY CLOUDS
    for (const cloud of st.clouds) {
      const relZ = cloud.z - st.planeZ;
      if (relZ > 50 && relZ < 9000) {
        const scale = 500 / relZ;
        const cx = (width / 2) + ((cloud.x - st.planeX) * scale);
        const cy = horizonY - ((cloud.y - st.planeY) * scale);
        const cw = cloud.width * scale * 2.2;
        const ch = cloud.height * scale * 2.2;

        if (cw > 2) {
          ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity * Math.min(1, relZ / 400)})`;
          ctx.beginPath();
          ctx.ellipse(cx, cy, cw / 2, ch / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 6. 3D PROJECTED GROUND DINOSAURS (Brachiosaurus, T-Rex, Triceratops)
    for (const dino of st.groundDinos) {
      const relZ = dino.z - st.planeZ;
      if (relZ > 80 && relZ < 7500) {
        const scale = 500 / relZ;
        const dx = (width / 2) + ((dino.x - st.planeX) * scale);
        const dy = horizonY + (200 * scale);
        drawGroundDino(ctx, dx, dy, scale * dino.scale, dino);
      }
    }

    // 7. 3D PROJECTED FLYING PTERODACTYLS
    for (const ptero of st.pterodactyls) {
      const relZ = ptero.z - st.planeZ;
      if (relZ > 60 && relZ < 6500) {
        const scale = 500 / relZ;
        const px = (width / 2) + ((ptero.x - st.planeX) * scale);
        const py = horizonY - ((ptero.y - st.planeY) * scale);
        drawPterodactyl(ctx, px, py, scale * ptero.scale, ptero);
      }
    }

    // 8. 3D PROJECTED AERIAL NAVIGATIONAL RINGS (ELOS DE MARCAÇÃO)
    for (const ring of st.rings) {
      const relZ = ring.worldZ - st.planeZ;
      if (relZ > 40 && relZ < 8000) {
        const scale = 550 / relZ;
        const rx = (width / 2) + ((ring.worldX - st.planeX) * scale);
        const ry = horizonY - ((ring.worldY - st.planeY) * scale);
        const radius = ring.radius * scale;

        drawNavigationalRing(ctx, rx, ry, radius, ring, relZ);
      }
    }

    // 9. DRAW THE WHITE & RED SINGLE-ENGINE MONOPLANE (AVIÃO MONO MOTOR BRANCO E VERMELHO)
    const planeScreenX = width / 2;
    const planeScreenY = cameraView === 'chase' ? height * 0.68 : height * 0.88;

    if (cameraView === 'chase') {
      drawMonomotorAirplane(
        ctx,
        planeScreenX,
        planeScreenY,
        st.pitch,
        st.roll,
        st.propRotation,
        st.isBoosting,
        st.gearDown,
        st.airspeed
      );
    } else {
      // Functional Cockpit Overlay
      drawCockpitInstruments(ctx, width, height, st.pitch, st.roll, st.airspeed, st.planeY, st.throttle);
    }

    // 10. SPARKLE PARTICLES & WINGTRAILS
    drawFlightParticles(ctx, planeScreenX, planeScreenY, dt);
  };

  // Draw Ground Runway (Takeoff or Landing)
  const drawRunwayStrip = (
    ctx: CanvasRenderingContext2D,
    width: number, height: number, horizonY: number,
    planeX: number, planeZ: number, runwayStartZ: number,
    label: string
  ) => {
    const relZ = runwayStartZ - planeZ;
    const scale = 500 / Math.max(20, relZ + 800);
    const rx = (width / 2) - (planeX * scale);

    ctx.save();
    // Tarmac
    ctx.fillStyle = '#262626';
    ctx.beginPath();
    ctx.moveTo(rx - 80, height);
    ctx.lineTo(rx + 80, height);
    ctx.lineTo(rx + 15, horizonY);
    ctx.lineTo(rx - 15, horizonY);
    ctx.closePath();
    ctx.fill();

    // White Centerline
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(rx, height);
    ctx.lineTo(rx, horizonY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Green threshold lights
    ctx.fillStyle = '#10B981';
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath();
      ctx.arc(rx + i * 12, height - 10, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Draw Las Vegas Airport & Iconic Strip Skyline on Horizon
  const drawVegasAirportRunway = (
    ctx: CanvasRenderingContext2D,
    width: number, height: number, horizonY: number,
    planeX: number, planeZ: number
  ) => {
    ctx.save();

    // Las Vegas Strip Iconic Neon Skyline (The Sphere, Luxor, Stratosphere, Towers)
    const vegasBaseX = (width / 2) - (planeX * 0.08);

    // The Sphere (LED dome glowing with dynamic colors)
    const sphereX = vegasBaseX + 160;
    const sphereY = horizonY - 32;
    const sphereGrad = ctx.createRadialGradient(sphereX, sphereY, 2, sphereX, sphereY, 26);
    sphereGrad.addColorStop(0, '#38BDF8');
    sphereGrad.addColorStop(0.6, '#A855F7');
    sphereGrad.addColorStop(1, '#EC4899');
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(sphereX, sphereY, 24, Math.PI, 0);
    ctx.fill();

    // Luxor Pyramid with Sky Beam
    const luxorX = vegasBaseX - 140;
    const luxorY = horizonY;
    ctx.fillStyle = '#18181B';
    ctx.beginPath();
    ctx.moveTo(luxorX - 35, luxorY);
    ctx.lineTo(luxorX, luxorY - 45);
    ctx.lineTo(luxorX + 35, luxorY);
    ctx.closePath();
    ctx.fill();

    // Luxor Golden Sky Beam shooting into space
    const beamGrad = ctx.createLinearGradient(luxorX, luxorY - 45, luxorX, 0);
    beamGrad.addColorStop(0, 'rgba(254,240,138,0.9)');
    beamGrad.addColorStop(1, 'rgba(254,240,138,0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(luxorX - 4, luxorY - 45);
    ctx.lineTo(luxorX - 12, 0);
    ctx.lineTo(luxorX + 12, 0);
    ctx.lineTo(luxorX + 4, luxorY - 45);
    ctx.closePath();
    ctx.fill();

    // Stratosphere Tower
    const stratX = vegasBaseX + 60;
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(stratX - 2, horizonY - 75, 4, 75);
    ctx.beginPath();
    ctx.arc(stratX, horizonY - 75, 8, 0, Math.PI * 2);
    ctx.fill();

    // Resort Skyline Towers (Bellagio, Caesars, Wynn)
    const towerColors = ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'];
    for (let t = -4; t <= 4; t++) {
      const tx = vegasBaseX + t * 35;
      const th = 25 + Math.abs(t % 3) * 20;
      ctx.fillStyle = towerColors[(t + 10) % towerColors.length];
      ctx.fillRect(tx - 10, horizonY - th, 20, th);
    }

    // Long Illuminated Landing Runway at McCarran Airport
    const runwayX = (width / 2) - (planeX * 0.4);
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(runwayX - 110, height);
    ctx.lineTo(runwayX + 110, height);
    ctx.lineTo(runwayX + 25, horizonY);
    ctx.lineTo(runwayX - 25, horizonY);
    ctx.closePath();
    ctx.fill();

    // Runway Centerline Strobes
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(runwayX, height);
    ctx.lineTo(runwayX, horizonY);
    ctx.stroke();
    ctx.setLineDash([]);

    // PAPI Glide Slope Lights (Red & White)
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(runwayX - 125, height - 30, 8, 8);
    ctx.fillRect(runwayX - 115, height - 30, 8, 8);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(runwayX - 105, height - 30, 8, 8);
    ctx.fillRect(runwayX - 95, height - 30, 8, 8);

    ctx.restore();
  };

  // Draw Ground Dinosaurs (Brachiosaurus / T-Rex)
  const drawGroundDino = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, dino: GroundDino) => {
    if (scale <= 0.02) return;
    ctx.save();
    ctx.translate(x, y);

    const s = scale * 45;

    if (dino.type === 'brachio') {
      // Giant Sauropod Brachiosaurus (Long neck, massive body)
      ctx.fillStyle = '#3F4A3C'; // Prehistoric green-grey
      // Body
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.6, s * 1.1, s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillRect(-s * 0.7, -s * 0.5, s * 0.3, s * 0.6);
      ctx.fillRect(s * 0.4, -s * 0.5, s * 0.3, s * 0.6);
      // Long Neck curving upwards
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.7);
      ctx.bezierCurveTo(-s * 0.8, -s * 2.2, -s * 0.4, -s * 3.0, -s * 0.5, -s * 3.4);
      ctx.lineTo(-s * 0.25, -s * 3.4);
      ctx.bezierCurveTo(-s * 0.15, -s * 2.2, -s * 0.3, -s * 0.7, 0, -s * 0.6);
      ctx.closePath();
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.ellipse(-s * 0.45, -s * 3.45, s * 0.25, s * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (dino.type === 'trex') {
      // Roaring Tyrannosaurus Rex
      ctx.fillStyle = '#5A3E2B'; // Earthy brown
      // Body & muscular tail
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.8, s * 0.9, s * 0.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      // Heavy bipedal legs
      ctx.fillRect(-s * 0.3, -s * 0.5, s * 0.35, s * 0.6);
      // Fierce Head with open jaws
      ctx.beginPath();
      ctx.moveTo(s * 0.5, -s * 1.1);
      ctx.lineTo(s * 1.1, -s * 1.3);
      ctx.lineTo(s * 1.2, -s * 1.0);
      ctx.lineTo(s * 0.6, -s * 0.8);
      ctx.closePath();
      ctx.fill();
    } else {
      // Triceratops with 3 horns and frill
      ctx.fillStyle = '#4B5563';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.5, s * 0.8, s * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Bony Frill
      ctx.beginPath();
      ctx.arc(s * 0.5, -s * 0.7, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Draw Flying Pterodactyl in 3D
  const drawPterodactyl = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, ptero: Pterodactyl) => {
    if (scale <= 0.02) return;
    ctx.save();
    ctx.translate(x, y);

    const wingSpan = 70 * scale * 2.5;
    const flap = Math.sin(ptero.wingAngle) * 0.45;

    ctx.fillStyle = '#7C2D12'; // Pteranodon leathery terracotta
    // Body & Head with long crest
    ctx.beginPath();
    ctx.ellipse(0, 0, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    // Beak and head crest
    ctx.beginPath();
    ctx.moveTo(8 * scale, 0);
    ctx.lineTo(24 * scale, -2 * scale);
    ctx.lineTo(8 * scale, 3 * scale);
    ctx.lineTo(-14 * scale, -8 * scale); // Crest
    ctx.closePath();
    ctx.fill();

    // Left Wing
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-wingSpan * 0.5, flap * wingSpan, -wingSpan, flap * wingSpan * 0.8);
    ctx.lineTo(-wingSpan * 0.6, 10 * scale);
    ctx.closePath();
    ctx.fill();

    // Right Wing
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(wingSpan * 0.5, flap * wingSpan, wingSpan, flap * wingSpan * 0.8);
    ctx.lineTo(wingSpan * 0.6, 10 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Draw Floating Navigational Ring (Elo de Marcação)
  const drawNavigationalRing = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, radius: number,
    ring: FlightRing, relZ: number
  ) => {
    if (radius <= 3) return;
    ctx.save();

    const ringThickness = Math.max(2, radius * 0.12);

    // Glowing Ring Aura
    ctx.shadowColor = ring.color;
    ctx.shadowBlur = Math.min(25, radius * 0.35);

    ctx.strokeStyle = ring.passed ? '#10B981' : ring.color;
    ctx.lineWidth = ringThickness;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner crosshair / guidance markers
    if (radius > 25 && !ring.passed) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      // Top, Bottom, Left, Right chevrons
      const m = radius * 0.25;
      ctx.beginPath();
      ctx.moveTo(x - m, y);
      ctx.lineTo(x + m, y);
      ctx.moveTo(x, y - m);
      ctx.lineTo(x, y + m);
      ctx.stroke();
    }

    ctx.restore();
  };

  // HIGH-DEFINITION WHITE & RED SINGLE-ENGINE MONOPLANE (AVIÃO MONO MOTOR BRANCO E VERMELHO HD)
  const drawMonomotorAirplane = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    pitch: number, roll: number,
    propRot: number, isBoosting: boolean, gearDown: boolean, airspeed: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Roll banking and pitch dynamics
    ctx.rotate(roll);

    const planeW = 190;
    const isStrobeOn = Math.floor(Date.now() / 450) % 2 === 0;
    const isBeaconOn = Math.floor(Date.now() / 650) % 2 === 0;

    // 1. Soft Aircraft Shadow with atmospheric depth
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 48, planeW * 0.44, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. High-Definition Main Wings (Aerodynamic Airfoil with Panel Seams & Flaps)
    const wingSpan = 224;
    const wingDepth = 32;

    // Wing Drop Shadow / Underside shading
    ctx.fillStyle = 'rgba(100, 116, 139, 0.25)';
    ctx.beginPath();
    ctx.roundRect(-wingSpan / 2, -wingDepth * 0.58 + 2, wingSpan, wingDepth, 8);
    ctx.fill();

    // Wing Upper Shell (Multi-tone Aviation Pearl White with light reflection gradient)
    const wingGrad = ctx.createLinearGradient(0, -wingDepth * 0.6, 0, wingDepth * 0.4);
    wingGrad.addColorStop(0, '#FFFFFF');
    wingGrad.addColorStop(0.3, '#F8FAFC');
    wingGrad.addColorStop(0.7, '#E2E8F0');
    wingGrad.addColorStop(1, '#CBD5E1');
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.roundRect(-wingSpan / 2, -wingDepth * 0.6, wingSpan, wingDepth, 7);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Wing Spar & Panel Lines (Structural Seams)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    // Spar line across full wingspan
    ctx.moveTo(-wingSpan * 0.48, -wingDepth * 0.2);
    ctx.lineTo(wingSpan * 0.48, -wingDepth * 0.2);
    // Left Wing Aileron & Flap cutouts
    ctx.moveTo(-wingSpan * 0.48, wingDepth * 0.25);
    ctx.lineTo(-wingSpan * 0.26, wingDepth * 0.25);
    ctx.moveTo(-wingSpan * 0.26, -wingDepth * 0.2);
    ctx.lineTo(-wingSpan * 0.26, wingDepth * 0.38);
    // Right Wing Aileron & Flap cutouts
    ctx.moveTo(wingSpan * 0.26, wingDepth * 0.25);
    ctx.lineTo(wingSpan * 0.48, wingDepth * 0.25);
    ctx.moveTo(wingSpan * 0.26, -wingDepth * 0.2);
    ctx.lineTo(wingSpan * 0.26, wingDepth * 0.38);
    ctx.stroke();

    // Bold Aviation Red Racing Chevrons & Sport Stripes (#DC2626 & #B91C1C)
    // Left Wing Stripes
    const redStripeGrad = ctx.createLinearGradient(0, -wingDepth * 0.6, 0, wingDepth * 0.4);
    redStripeGrad.addColorStop(0, '#EF4444');
    redStripeGrad.addColorStop(0.5, '#DC2626');
    redStripeGrad.addColorStop(1, '#991B1B');
    ctx.fillStyle = redStripeGrad;

    // Outboard primary stripe
    ctx.fillRect(-wingSpan * 0.46, -wingDepth * 0.6, 32, wingDepth);
    // Inboard secondary racing stripe
    ctx.fillRect(-wingSpan * 0.28, -wingDepth * 0.6, 14, wingDepth);
    // Right Outboard primary stripe
    ctx.fillRect(wingSpan * 0.46 - 32, -wingDepth * 0.6, 32, wingDepth);
    // Right Inboard secondary racing stripe
    ctx.fillRect(wingSpan * 0.28 - 14, -wingDepth * 0.6, 14, wingDepth);

    // Silver / Charcoal Accent Pinstripes
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-wingSpan * 0.46 + 32, -wingDepth * 0.6);
    ctx.lineTo(-wingSpan * 0.46 + 32, wingDepth * 0.38);
    ctx.moveTo(-wingSpan * 0.28 + 14, -wingDepth * 0.6);
    ctx.lineTo(-wingSpan * 0.28 + 14, wingDepth * 0.38);
    ctx.moveTo(wingSpan * 0.46 - 32, -wingDepth * 0.6);
    ctx.lineTo(wingSpan * 0.46 - 32, wingDepth * 0.38);
    ctx.moveTo(wingSpan * 0.28 - 14, -wingDepth * 0.6);
    ctx.lineTo(wingSpan * 0.28 - 14, wingDepth * 0.38);
    ctx.stroke();

    // Metallic Pitot Tube on Left Wing
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(-wingSpan * 0.36, -wingDepth * 0.85, 2.5, 9);
    ctx.fillRect(-wingSpan * 0.36 - 1, -wingDepth * 0.85, 4.5, 2);

    // Wingtip High-Intensity Navigation Lights & Strobes
    // Port (Left - Red)
    ctx.fillStyle = '#DC2626';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-wingSpan / 2 + 1, -wingDepth * 0.1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Starboard (Right - Emerald Green)
    ctx.fillStyle = '#059669';
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(wingSpan / 2 - 1, -wingDepth * 0.1, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Wingtip Pulsing Strobe Blinkers (Aviation Anti-Collision White Strobe)
    if (isStrobeOn) {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(-wingSpan / 2 + 1, -wingDepth * 0.3, 3.5, 0, Math.PI * 2);
      ctx.arc(wingSpan / 2 - 1, -wingDepth * 0.3, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 3. Central Fuselage (Sculpted Cylindrical Fuselage with Specular Gleam)
    // Aerodynamic Fuselage Contour
    const fuseGrad = ctx.createLinearGradient(-15, 0, 15, 0);
    fuseGrad.addColorStop(0, '#E2E8F0');
    fuseGrad.addColorStop(0.3, '#FFFFFF');
    fuseGrad.addColorStop(0.5, '#F8FAFC');
    fuseGrad.addColorStop(0.85, '#CBD5E1');
    fuseGrad.addColorStop(1, '#94A3B8');
    ctx.fillStyle = fuseGrad;

    ctx.beginPath();
    // Smooth teardrop / streamlined fuselage
    ctx.moveTo(0, -50); // Nose apex
    ctx.bezierCurveTo(18, -48, 17, 10, 10, 52); // Right flank
    ctx.bezierCurveTo(7, 65, -7, 65, -10, 52); // Tail cone
    ctx.bezierCurveTo(-17, 10, -18, -48, 0, -50); // Left flank
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Central Bold Red Racing Stripe along fuselage spine
    const fuseStripeGrad = ctx.createLinearGradient(-6, 0, 6, 0);
    fuseStripeGrad.addColorStop(0, '#B91C1C');
    fuseStripeGrad.addColorStop(0.4, '#EF4444');
    fuseStripeGrad.addColorStop(1, '#991B1B');
    ctx.fillStyle = fuseStripeGrad;
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(6, -42);
    ctx.lineTo(5, 48);
    ctx.lineTo(-5, 48);
    ctx.lineTo(-6, -42);
    ctx.closePath();
    ctx.fill();

    // Thin dual black pinstripes bordering fuselage red stripe
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(6.5, -42);
    ctx.lineTo(5.5, 48);
    ctx.moveTo(-6.5, -42);
    ctx.lineTo(-5.5, 48);
    ctx.stroke();

    // Aircraft Registration Markings on aft fuselage ("PT-LVG")
    ctx.font = 'bold 6px Orbitron, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.fillText('PT-LVG', 0, 38);

    // Engine Cowl Air Induction Gills
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-10, -44, 3, 5);
    ctx.fillRect(7, -44, 3, 5);

    // 4. Tinted Multi-Layer Cockpit Canopy & Pilot Silhouette
    // Windshield frame & Glass tint
    const canopyGrad = ctx.createLinearGradient(0, -28, 0, 8);
    canopyGrad.addColorStop(0, '#0369A1');
    canopyGrad.addColorStop(0.4, '#0284C7');
    canopyGrad.addColorStop(0.7, '#38BDF8');
    canopyGrad.addColorStop(1, '#0C4A6E');
    ctx.fillStyle = canopyGrad;

    ctx.beginPath();
    ctx.ellipse(0, -10, 11, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pilot Silhouette with Aviator Headset & Helmet Visor
    ctx.fillStyle = '#0F172A';
    // Pilot torso & shoulders
    ctx.beginPath();
    ctx.ellipse(0, -2, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pilot flight helmet
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, -11, 5, 0, Math.PI * 2);
    ctx.fill();
    // Aviator Headset Earcups
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(-5.5, -13, 2, 4);
    ctx.fillRect(3.5, -13, 2, 4);
    // Visor reflective strip
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-3, -13, 6, 2);

    // Cockpit Canopy Curved Specular Glare Reflections
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(-3.5, -15, 6.5, -0.6, 1.1);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(4, -8, 5, 1.8, 3.2);
    ctx.stroke();

    // 5. Empennage & Tail Structure (Vertical Fin, Rudder & Elevators)
    // Horizontal Stabilizers (Rear Wings)
    const stabGrad = ctx.createLinearGradient(0, 52, 0, 64);
    stabGrad.addColorStop(0, '#FFFFFF');
    stabGrad.addColorStop(1, '#CBD5E1');
    ctx.fillStyle = stabGrad;
    ctx.beginPath();
    ctx.roundRect(-46, 52, 92, 12, 4);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Red Trim markings on elevators
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-44, 52, 16, 12);
    ctx.fillRect(28, 52, 16, 12);
    // Elevator control hinge seam
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-44, 57);
    ctx.lineTo(44, 57);
    ctx.stroke();

    // Vertical Stabilizer / Rudder Fin
    const finGrad = ctx.createLinearGradient(-4, 0, 4, 0);
    finGrad.addColorStop(0, '#B91C1C');
    finGrad.addColorStop(0.5, '#EF4444');
    finGrad.addColorStop(1, '#991B1B');
    ctx.fillStyle = finGrad;
    ctx.beginPath();
    ctx.moveTo(0, 20); // Dorsal fairing start
    ctx.lineTo(4.5, 28);
    ctx.lineTo(6.5, 68); // Rudder base
    ctx.lineTo(-6.5, 68);
    ctx.lineTo(-4.5, 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Flashing Red Anti-Collision Beacon Light on top of vertical fin
    if (isBeaconOn) {
      ctx.fillStyle = '#FF0055';
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 68, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = '#831843';
      ctx.beginPath();
      ctx.arc(0, 68, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Tricycle Landing Gear (When Deployed on Ground or Approach)
    if (gearDown) {
      // Main Left Strut & Wheel
      ctx.fillStyle = '#64748B';
      ctx.fillRect(-36, -4, 4, 18); // Oleo strut
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-40, 12, 12, 20); // Rubber tire
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(-34, 22, 3.5, 0, Math.PI * 2); // Alloy hubcap
      ctx.fill();

      // Main Right Strut & Wheel
      ctx.fillStyle = '#64748B';
      ctx.fillRect(32, -4, 4, 18); // Oleo strut
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(28, 12, 12, 20); // Rubber tire
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(34, 22, 3.5, 0, Math.PI * 2); // Alloy hubcap
      ctx.fill();
    }

    // 7. Engine Cowl Nose (Aviation Crimson) & Polished Chrome Spinner Hub
    const cowlGrad = ctx.createLinearGradient(-12, -54, 12, -46);
    cowlGrad.addColorStop(0, '#B91C1C');
    cowlGrad.addColorStop(0.4, '#EF4444');
    cowlGrad.addColorStop(1, '#991B1B');
    ctx.fillStyle = cowlGrad;
    ctx.beginPath();
    ctx.ellipse(0, -51, 15, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7F1D1D';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Twin Stainless Steel Exhaust Pipes on Lower Cowling
    ctx.fillStyle = '#334155';
    ctx.fillRect(-12, -48, 3, 5);
    ctx.fillRect(9, -48, 3, 5);

    // Propeller Disc Motion Blur with radial air strobing
    const propBlurGrad = ctx.createRadialGradient(0, -56, 4, 0, -56, 44);
    propBlurGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    propBlurGrad.addColorStop(0.7, 'rgba(248, 250, 252, 0.25)');
    propBlurGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = propBlurGrad;
    ctx.beginPath();
    ctx.ellipse(0, -56, 46, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spinning 2-Blade Propeller with High-Definition Aero Camber & Warning Tips
    ctx.save();
    ctx.translate(0, -56);
    ctx.rotate(propRot);

    // Carbon composite aerodynamic blades with tapered profile
    const bladeGrad = ctx.createLinearGradient(-4, 0, 4, 0);
    bladeGrad.addColorStop(0, '#0F172A');
    bladeGrad.addColorStop(0.5, '#334155');
    bladeGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = bladeGrad;

    // Upper blade
    ctx.beginPath();
    ctx.moveTo(-3.5, 0);
    ctx.lineTo(-4.5, -34);
    ctx.lineTo(0, -42);
    ctx.lineTo(4.5, -34);
    ctx.lineTo(3.5, 0);
    ctx.closePath();
    ctx.fill();

    // Lower blade
    ctx.beginPath();
    ctx.moveTo(-3.5, 0);
    ctx.lineTo(-4.5, 34);
    ctx.lineTo(0, 42);
    ctx.lineTo(4.5, 34);
    ctx.lineTo(3.5, 0);
    ctx.closePath();
    ctx.fill();

    // High-Visibility Safety Tip Bands (Yellow & White stripes on blade tips)
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-4.5, -42, 9, 4);
    ctx.fillRect(-4.5, 38, 9, 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-4.5, -37, 9, 3);
    ctx.fillRect(-4.5, 34, 9, 3);

    // Chrome Spinner Nose Cone with Dynamic Sun Specular Glare
    const spinGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, 7.5);
    spinGrad.addColorStop(0, '#FFFFFF');
    spinGrad.addColorStop(0.4, '#E2E8F0');
    spinGrad.addColorStop(0.8, '#94A3B8');
    spinGrad.addColorStop(1, '#475569');
    ctx.fillStyle = spinGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();

    // 8. WEP Turbo Boost Flame & Mach Shockwave Exhaust
    if (isBoosting) {
      const flameH = 34 + Math.random() * 16;
      const bGrad = ctx.createLinearGradient(0, 52, 0, 52 + flameH);
      bGrad.addColorStop(0, '#FFFFFF');
      bGrad.addColorStop(0.2, '#38BDF8');
      bGrad.addColorStop(0.5, '#0284C7');
      bGrad.addColorStop(0.8, '#F97316');
      bGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.ellipse(0, 52 + flameH / 2, 7.5, flameH / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mach Diamond Shockwave in exhaust
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 60, 5, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(0, 68, 3.5, 1.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Functional Cockpit Flight Instruments Overlay (1st person view)
  const drawCockpitInstruments = (
    ctx: CanvasRenderingContext2D,
    width: number, height: number,
    pitch: number, roll: number, airspeed: number, altitude: number, throttle: number
  ) => {
    ctx.save();

    // Cockpit Dash Frame
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.72);
    ctx.bezierCurveTo(width * 0.25, height * 0.65, width * 0.75, height * 0.65, width, height * 0.72);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 1. Artificial Horizon (Center Attitude Indicator)
    const ahX = width / 2;
    const ahY = height * 0.84;
    const ahR = 48;

    ctx.save();
    ctx.beginPath();
    ctx.arc(ahX, ahY, ahR, 0, Math.PI * 2);
    ctx.clip();

    // Sky & Ground split rotating with roll and shifting with pitch
    ctx.translate(ahX, ahY);
    ctx.rotate(roll);
    ctx.translate(0, pitch * 120);

    ctx.fillStyle = '#0284C7'; // Horizon Sky
    ctx.fillRect(-ahR * 1.5, -ahR * 1.5, ahR * 3, ahR * 1.5);
    ctx.fillStyle = '#78350F'; // Horizon Ground
    ctx.fillRect(-ahR * 1.5, 0, ahR * 3, ahR * 1.5);

    // Horizon line
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-ahR * 1.2, 0);
    ctx.lineTo(ahR * 1.2, 0);
    ctx.stroke();

    ctx.restore();

    // Bezel
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ahX, ahY, ahR, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Airspeed Indicator (Left Dial)
    const asX = width * 0.32;
    const asY = height * 0.84;
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(asX, asY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(airspeed)}`, asX, asY - 2);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#38BDF8';
    ctx.fillText('KNOTS', asX, asY + 12);

    // 3. Altimeter (Right Dial)
    const altX = width * 0.68;
    const altY = height * 0.84;
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(altX, altY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(altitude * 2.8)}`, altX, altY - 2);
    ctx.font = '8px monospace';
    ctx.fillStyle = '#10B981';
    ctx.fillText('FEET', altX, altY + 12);

    ctx.restore();
  };

  // Particles (Sparkles from passing rings)
  const drawFlightParticles = (ctx: CanvasRenderingContext2D, planeX: number, planeY: number, dt: number) => {
    const st = stateRef.current;

    for (let i = st.sparkles.length - 1; i >= 0; i--) {
      const sp = st.sparkles[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt * 1.5;

      if (sp.life <= 0) {
        st.sparkles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(planeX + sp.x, planeY + sp.y, sp.size * sp.life, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  return (
    <div id="dino-flight-station" className="relative select-none rounded-2xl overflow-hidden bg-[#0A0E18] border border-sky-500/40 shadow-2xl">
      {/* Top Telemetry Header Bar */}
      <div className="bg-gradient-to-r from-[#0C1B33] via-[#0E2445] to-[#0A162B] border-b border-sky-500/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-slate-100 z-20 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-white to-red-600 border border-red-400 flex items-center justify-center text-slate-900 shadow-[0_0_18px_rgba(56,189,248,0.4)]">
            <Plane className="w-6 h-6 text-red-600 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-bold text-sm tracking-wider text-sky-100">
                MONOMOTOR • VALE DOS DINOSSAUROS ✈️ LAS VEGAS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                BRANCO & VERMELHO
              </span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-2 font-mono">
              <span>Decolagem diurna</span>
              <span>•</span>
              <span className="text-amber-300">Passe pelos elos de marcação</span>
              <span>•</span>
              <span className="text-emerald-400">Pouso em Las Vegas</span>
            </div>
          </div>
        </div>

        {/* Quick Stats in Header */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">COMBUSTÍVEL:</span>
            <span className={`font-bold font-orbitron ${fuelTimeRemaining <= 15 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
              {fuelTimeRemaining}s
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
              onClick={() => setCameraView((prev) => (prev === 'chase' ? 'cockpit' : 'chase'))}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono flex items-center gap-1 transition-all cursor-pointer"
              title="Alternar Câmera (C)"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">{cameraView === 'chase' ? 'EXTERNA' : 'COCKPIT'}</span>
            </button>

            <button
              onClick={handleToggleMute}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-all cursor-pointer"
              title={isMuted ? 'Ativar Áudio Monomotor' : 'Mutar Áudio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Flight 3D Canvas Stage */}
      <div className="relative w-full aspect-[16/10] max-h-[580px] bg-black overflow-hidden">
        <canvas
          ref={canvasRef}
          width={880}
          height={540}
          className="w-full h-full object-cover block"
        />

        {/* Mission Alert Banner (Takeoff, Canyon Entrance, Vegas Approach) */}
        {missionAnnouncement && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-sky-950/90 border border-sky-400 rounded-2xl px-6 py-3 shadow-[0_0_35px_rgba(56,189,248,0.5)] backdrop-blur-md animate-in fade-in slide-in-from-top-4 text-center max-w-lg w-[90%]">
            <div className="text-xs font-orbitron font-extrabold text-sky-200 tracking-wider">
              {missionAnnouncement.title}
            </div>
            <div className="text-[11px] font-mono text-amber-300 mt-1">
              {missionAnnouncement.subtitle}
            </div>
          </div>
        )}

        {/* Stall Warning Horn Indicator */}
        {isStallWarning && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 bg-red-600/90 border-2 border-red-300 rounded-xl px-4 py-1.5 shadow-[0_0_25px_rgba(239,68,68,0.8)] animate-pulse flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span className="font-orbitron font-black text-xs text-white tracking-widest">
              STALL! BAIXA VELOCIDADE • EMPURRE O MANCHE
            </span>
          </div>
        )}

        {/* Top-Left Flight HUD: Anemometer & Altimeter */}
        <div className="absolute top-3 left-4 z-20 bg-slate-950/85 border border-slate-800 rounded-2xl p-3 backdrop-blur-md shadow-xl flex items-center gap-4">
          {/* Airspeed (Knots) */}
          <div>
            <div className="text-[10px] font-mono text-slate-400 font-bold">VELOCIDADE</div>
            <div className="flex items-baseline gap-1">
              <span className="font-orbitron font-extrabold text-2xl text-slate-100">
                {airspeedKnots}
              </span>
              <span className="text-[10px] font-orbitron font-bold text-sky-400">NÓS (KT)</span>
            </div>
          </div>

          <div className="w-[1px] h-8 bg-slate-800" />

          {/* Altitude (Feet) */}
          <div>
            <div className="text-[10px] font-mono text-slate-400 font-bold">ALTITUDE</div>
            <div className="flex items-baseline gap-1">
              <span className="font-orbitron font-extrabold text-2xl text-emerald-400">
                {altitudeFeet}
              </span>
              <span className="text-[10px] font-orbitron font-bold text-slate-400">PÉS (FT)</span>
            </div>
          </div>

          <div className="w-[1px] h-8 bg-slate-800" />

          {/* Throttle % */}
          <div className="w-20">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold mb-1">
              <span>MANETE</span>
              <span className="text-amber-400">{throttlePercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full"
                style={{ width: `${throttlePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top-Right Flight HUD: Navigational Rings & Distance to Vegas */}
        <div className="absolute top-3 right-4 z-20 bg-slate-950/85 border border-slate-800 rounded-2xl p-3 backdrop-blur-md shadow-xl flex items-center gap-4">
          {/* Rings Collected */}
          <div>
            <div className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>ELOS DE MARCAÇÃO</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-orbitron font-black text-2xl text-amber-300">
                {ringsPassedCount}
              </span>
              <span className="text-xs font-mono text-slate-400">/ {TOTAL_RINGS}</span>
            </div>
          </div>

          <div className="w-[1px] h-8 bg-slate-800" />

          {/* Combo Multiplier */}
          <div className="text-center">
            <div className="text-[10px] font-mono text-slate-400 font-bold">COMBO</div>
            <div className={`font-orbitron font-black text-xl ${comboMultiplier > 1 ? 'text-cyan-300 animate-pulse' : 'text-slate-400'}`}>
              x{comboMultiplier}
            </div>
          </div>

          <div className="w-[1px] h-8 bg-slate-800" />

          {/* Distance to Las Vegas */}
          <div className="text-right">
            <div className="text-[10px] font-mono text-slate-400 font-bold flex items-center justify-end gap-1">
              <MapPin className="w-3 h-3 text-red-400" />
              <span>DESTINO VEGAS</span>
            </div>
            <div className="font-orbitron font-bold text-lg text-slate-200">
              {distanceToVegasKm} <span className="text-[10px] text-red-400">KM</span>
            </div>
          </div>
        </div>

        {/* Start / Idle Screen Modal */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-40">
            <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-[#0C1B33] via-[#0E2445] to-[#0A162B] border border-sky-500/50 p-6 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 via-white to-red-600 border border-red-400 flex items-center justify-center text-slate-900 mx-auto shadow-[0_0_30px_rgba(56,189,248,0.5)]">
                <Plane className="w-8 h-8 text-red-600 fill-white" />
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-orbitron font-extrabold text-slate-100 tracking-wide">
                  VALE DOS DINOSSAUROS ✈️ LAS VEGAS
                </h2>
                <p className="text-xs text-sky-300 font-mono mt-1">
                  Missão de Voo com Avião Monomotor Branco e Vermelho
                </p>
              </div>

              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-left text-xs font-mono space-y-2 text-slate-300">
                <div className="text-amber-400 font-bold flex items-center gap-1.5 pb-1 border-b border-slate-800">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>PLANO DE VOO:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Decole da pista durante o dia, sobrevoe o majestoso Vale dos Dinossauros com pterodáctilos e braquiossauros, atravesse os <strong>Elos de Marcação</strong> flutuantes para não perder combustível e realize o pouso no Aeroporto Internacional de Las Vegas!
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
                  <div>⌨️ <strong>Manche:</strong> Setas / WASD</div>
                  <div>⚡ <strong>Potência / Boost:</strong> Shift / Espaço</div>
                  <div>🎮 <strong>Joystick:</strong> Analógico / R2 / L2</div>
                  <div>🎰 <strong>Pouso:</strong> Pista de Las Vegas</div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={startMission}
                  className="w-full py-3 px-6 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-red-600 via-sky-500 to-amber-400 text-slate-950 shadow-[0_0_25px_rgba(56,189,248,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>INICIAR DECOLAGEM</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Las Vegas Arrival Victory Modal */}
        {gameState === 'arrived' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-40 animate-in fade-in zoom-in-95">
            <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-[#180A2E] via-[#0E1B42] to-[#0A162B] border border-amber-400/60 p-6 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 border border-amber-300 flex items-center justify-center text-slate-950 mx-auto shadow-[0_0_35px_rgba(245,158,11,0.6)] animate-bounce">
                <Trophy className="w-9 h-9 fill-current" />
              </div>

              <div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  MISSÃO CUMPRIDA • BEM-VINDO A LAS VEGAS!
                </span>
                <h2 className="text-xl md:text-2xl font-orbitron font-extrabold text-slate-100 tracking-wide mt-1">
                  POUSO PERFEITO NO AEROPORTO
                </h2>
                <p className="text-xs text-slate-300 font-mono mt-0.5">
                  O monomotor branco e vermelho sobrevoou o vale dos dinos e pousou com glória na pista de Vegas!
                </p>
              </div>

              {/* Mission Flight Debrief Results */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Elos de Marcação Coletados:</span>
                  <span className="font-orbitron font-bold text-amber-400">{ringsPassedCount} / {TOTAL_RINGS}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Combustível Restante:</span>
                  <span className="font-bold text-emerald-400">{fuelTimeRemaining}s</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="text-slate-200 font-bold">Pontuação de Piloto:</span>
                  <span className="font-orbitron font-extrabold text-amber-300">{score} pts</span>
                </div>
              </div>

              <button
                onClick={startMission}
                className="w-full py-3 px-6 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>VOAR NOVAMENTE (START)</span>
              </button>
            </div>
          </div>
        )}

        {/* Crash / Fuel Out Modal */}
        {gameState === 'crashed' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-40 animate-in fade-in zoom-in-95">
            <div className="max-w-md w-full rounded-2xl bg-gradient-to-b from-[#1C0F13] to-[#0A0E18] border border-red-500/50 p-6 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-orbitron font-extrabold text-slate-100 tracking-wide">
                  COMBUSTÍVEL ESGOTADO
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  O monomotor perdeu sustentação antes de alcançar Las Vegas.
                </p>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
                <div>Pontos conquistados: <strong className="text-amber-400 font-orbitron">{score} pts</strong></div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Dica: Passe por dentro de cada Elo de Marcação flutuante para abastecer +10s de combustível extra!
                </div>
              </div>

              <button
                onClick={startMission}
                className="w-full py-3 px-6 rounded-xl font-orbitron font-bold text-sm bg-gradient-to-r from-red-600 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(225,6,0,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>TENTAR NOVO VOO</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Flight Controls Guide Bar */}
      <div className="bg-[#0A0E18] border-t border-slate-800/80 p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400">STATUS JOYSTICK:</span>
            <strong className={isGamepadConnected ? 'text-emerald-400' : 'text-slate-400'}>
              {isGamepadConnected ? `${gamepadName} (ATIVO)` : 'AGUARDANDO JOYSTICK USB'}
            </strong>
          </div>
        </div>

        {/* On-Screen Mobile Touch Controls for Tablet / Mobile Users */}
        <div className="flex items-center gap-2 sm:hidden w-full justify-between pt-2 border-t border-slate-800">
          <div className="flex gap-2">
            <button
              onTouchStart={() => (stateRef.current.keyPitchUp = true)}
              onTouchEnd={() => (stateRef.current.keyPitchUp = false)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-bold active:bg-sky-500/30 text-sky-300"
            >
              ▲ SUBIR
            </button>
            <button
              onTouchStart={() => (stateRef.current.keyPitchDown = true)}
              onTouchEnd={() => (stateRef.current.keyPitchDown = false)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-bold active:bg-sky-500/30 text-sky-300"
            >
              ▼ DESCER
            </button>
            <button
              onTouchStart={() => (stateRef.current.keyBankLeft = true)}
              onTouchEnd={() => (stateRef.current.keyBankLeft = false)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-bold active:bg-sky-500/30"
            >
              ◄ ESQ
            </button>
            <button
              onTouchStart={() => (stateRef.current.keyBankRight = true)}
              onTouchEnd={() => (stateRef.current.keyBankRight = false)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 font-bold active:bg-sky-500/30"
            >
              DIR ►
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onTouchStart={() => (stateRef.current.keyThrottleUp = true)}
              onTouchEnd={() => (stateRef.current.keyThrottleUp = false)}
              className="px-4 py-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold active:bg-emerald-500/30"
            >
              POTÊNCIA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
