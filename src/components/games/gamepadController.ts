/**
 * Universal Gamepad / Joystick Controller Manager
 * Supports standard XInput, DirectInput, DualShock, and generic USB controllers (including KTS USB gamepad).
 * Supports D-Pad, Left/Right Analog sticks, Action buttons (X/Circle/Square/Triangle), Start/Select, and Haptic Rumble.
 */

export interface GamepadInputState {
  connected: boolean;
  id: string;
  index: number;
  timestamp: number;
  // Directional inputs (combines D-Pad and Left Analog Stick with deadzone)
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  // Primary actions
  shoot: boolean;      // Any primary action button (X, Circle, Square, R1, R2)
  start: boolean;      // Start / Menu
  select: boolean;     // Select / Share / Back
  // Specific buttons for visualizer & fine-grained control
  buttonSouth: boolean; // Button 0: Cross / X / A
  buttonEast: boolean;  // Button 1: Circle / B
  buttonWest: boolean;  // Button 2: Square / X
  buttonNorth: boolean; // Button 3: Triangle / Y
  l1: boolean;          // Button 4
  r1: boolean;          // Button 5
  l2: boolean;          // Button 6
  r2: boolean;          // Button 7
  dpadUp: boolean;      // Button 12
  dpadDown: boolean;    // Button 13
  dpadLeft: boolean;    // Button 14
  dpadRight: boolean;   // Button 15
  // Raw analog values
  axes: [number, number];       // Left Stick [X, Y] (-1 to +1)
  rightAxes: [number, number];  // Right Stick [X, Y] (-1 to +1)
}

const DEFAULT_GAMEPAD_STATE: GamepadInputState = {
  connected: false,
  id: '',
  index: -1,
  timestamp: 0,
  left: false,
  right: false,
  up: false,
  down: false,
  shoot: false,
  start: false,
  select: false,
  buttonSouth: false,
  buttonEast: false,
  buttonWest: false,
  buttonNorth: false,
  l1: false,
  r1: false,
  l2: false,
  r2: false,
  dpadUp: false,
  dpadDown: false,
  dpadLeft: false,
  dpadRight: false,
  axes: [0, 0],
  rightAxes: [0, 0],
};

const DEADZONE = 0.28;

/**
 * Poll current state of connected gamepad
 * Designed for 60fps game loops with zero garbage collection overhead.
 */
export function pollActiveGamepad(): GamepadInputState {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) {
    return DEFAULT_GAMEPAD_STATE;
  }

  const gamepads = navigator.getGamepads();
  let activeGp: Gamepad | null = null;

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (gp && gp.connected) {
      activeGp = gp;
      break;
    }
  }

  if (!activeGp) {
    return DEFAULT_GAMEPAD_STATE;
  }

  const buttons = activeGp.buttons || [];
  const axes = activeGp.axes || [];

  const isBtnPressed = (index: number): boolean => {
    const btn = buttons[index];
    if (!btn) return false;
    return typeof btn === 'object' ? (btn.pressed || btn.value > 0.5) : btn > 0.5;
  };

  // Face Buttons
  const buttonSouth = isBtnPressed(0); // Cross / X / A
  const buttonEast = isBtnPressed(1);  // Circle / B
  const buttonWest = isBtnPressed(2);  // Square / X
  const buttonNorth = isBtnPressed(3); // Triangle / Y

  // Shoulders & Triggers
  const l1 = isBtnPressed(4);
  const r1 = isBtnPressed(5);
  const l2 = isBtnPressed(6);
  const r2 = isBtnPressed(7);

  // System
  const select = isBtnPressed(8);
  const start = isBtnPressed(9);

  // Standard D-Pad buttons
  let dpadUp = isBtnPressed(12);
  let dpadDown = isBtnPressed(13);
  let dpadLeft = isBtnPressed(14);
  let dpadRight = isBtnPressed(15);

  // Analog Sticks
  let axisX = axes[0] ?? 0;
  let axisY = axes[1] ?? 0;
  let rightAxisX = axes[2] ?? 0;
  let rightAxisY = axes[3] ?? 0;

  // Apply deadzones
  if (Math.abs(axisX) < DEADZONE) axisX = 0;
  if (Math.abs(axisY) < DEADZONE) axisY = 0;
  if (Math.abs(rightAxisX) < DEADZONE) rightAxisX = 0;
  if (Math.abs(rightAxisY) < DEADZONE) rightAxisY = 0;

  // Fallback for Generic / DirectInput gamepads where D-Pad might be on extra axes (e.g. Axis 4/5 or POV Hat)
  if (axes.length >= 5) {
    const axis4 = axes[4];
    const axis5 = axes[5];
    if (typeof axis4 === 'number') {
      if (axis4 < -0.5) dpadLeft = true;
      if (axis4 > 0.5) dpadRight = true;
    }
    if (typeof axis5 === 'number') {
      if (axis5 < -0.5) dpadUp = true;
      if (axis5 > 0.5) dpadDown = true;
    }
  }

  // Unified directional inputs (combines D-Pad and Left Analog)
  const left = dpadLeft || axisX < -DEADZONE;
  const right = dpadRight || axisX > DEADZONE;
  const up = dpadUp || axisY < -DEADZONE;
  const down = dpadDown || axisY > DEADZONE;

  // Action / Fire trigger: button 0 (X), 1 (Circle), 2 (Square), 3 (Triangle), 5 (R1), 7 (R2)
  const shoot = buttonSouth || buttonEast || buttonWest || buttonNorth || r1 || r2;

  return {
    connected: true,
    id: activeGp.id || 'Joystick USB KTS',
    index: activeGp.index,
    timestamp: activeGp.timestamp,
    left,
    right,
    up,
    down,
    shoot,
    start,
    select,
    buttonSouth,
    buttonEast,
    buttonWest,
    buttonNorth,
    l1,
    r1,
    l2,
    r2,
    dpadUp,
    dpadDown,
    dpadLeft,
    dpadRight,
    axes: [axisX, axisY],
    rightAxes: [rightAxisX, rightAxisY],
  };
}

/**
 * Triggers Dual-Rumble Haptic Feedback on the gamepad (if supported by hardware & browser)
 */
export function triggerGamepadVibration(duration = 80, weakMagnitude = 0.3, strongMagnitude = 0.5) {
  try {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      const gp = gamepads[i];
      if (gp && gp.connected && (gp as any).vibrationActuator && typeof (gp as any).vibrationActuator.playEffect === 'function') {
        (gp as any).vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration,
          weakMagnitude: Math.min(1, Math.max(0, weakMagnitude)),
          strongMagnitude: Math.min(1, Math.max(0, strongMagnitude)),
        }).catch(() => {});
      }
    }
  } catch {}
}

/**
 * Clean up user-facing gamepad name (e.g. "KTS USB Gamepad", "DualShock Controller", etc.)
 */
export function formatGamepadName(rawId: string): string {
  if (!rawId) return 'Joystick USB / Bluetooth';
  // Common controllers cleanup
  if (rawId.toLowerCase().includes('kts')) return 'Joystick KTS USB Gamepad';
  if (rawId.toLowerCase().includes('playstation') || rawId.toLowerCase().includes('dualshock')) return 'PlayStation DualShock Controller';
  if (rawId.toLowerCase().includes('xbox')) return 'Xbox Controller';
  if (rawId.toLowerCase().includes('generic') || rawId.toLowerCase().includes('usb gamepad')) return 'Joystick USB Gamepad';
  // Strip vendor/product hex codes if present
  const cleaned = rawId.replace(/\(Vendor: [0-9a-f]+ Product: [0-9a-f]+\)/i, '').trim();
  return cleaned || 'Joystick USB Conectado';
}
