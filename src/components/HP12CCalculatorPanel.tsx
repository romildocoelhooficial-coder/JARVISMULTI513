import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calculator,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Layers,
  Sparkles,
  HelpCircle,
  Play,
  CheckCircle2,
  Info,
  ChevronRight,
  Sliders,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  X
} from 'lucide-react';

interface HP12CCalculatorPanelProps {
  currentUser?: any;
  onAddLog: (action: string, category: string, details?: string) => void;
}

// Sound effect for mechanical button click
function playKeyClickSound(audioEnabled: boolean) {
  if (!audioEnabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // Short mechanical micro-switch impulse
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.035);
  } catch {
    // Non-blocking fallback
  }
}

export const HP12CCalculatorPanel: React.FC<HP12CCalculatorPanelProps> = ({
  currentUser,
  onAddLog,
}) => {
  // Fullscreen state & ref
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // RPN 4-Level Stack
  const [x, setX] = useState<number>(0);
  const [y, setY] = useState<number>(0);
  const [z, setZ] = useState<number>(0);
  const [t, setT] = useState<number>(0);
  const [lastX, setLastX] = useState<number>(0);

  // TVM Registers (Financial)
  const [n, setN] = useState<number>(0);
  const [i, setI] = useState<number>(0); // in percent, e.g. 2 for 2%
  const [pv, setPv] = useState<number>(0);
  const [pmt, setPmt] = useState<number>(0);
  const [fv, setFv] = useState<number>(0);

  // Storage Registers (R0 to R9)
  const [registers, setRegisters] = useState<number[]>(new Array(10).fill(0));

  // Settings & Modes
  const [decimals, setDecimals] = useState<number>(2);
  const [isBeginMode, setIsBeginMode] = useState<boolean>(false); // false = END, true = BEG
  const [prefix, setPrefix] = useState<'none' | 'f' | 'g' | 'sto' | 'rcl'>('none');

  // Input Buffer / Typing State
  const [inputBuffer, setInputBuffer] = useState<string>('0');
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const [hasEntered, setHasEntered] = useState<boolean>(false); // right after ENTER key
  const [isError, setIsError] = useState<string | null>(null);

  // Visual active button highlight for keyboard shortcuts
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Manual & Tabs State
  const [activeManualTab, setActiveManualTab] = useState<'tvm' | 'rpn' | 'percent' | 'stack'>('tvm');
  const [exampleStepMessage, setExampleStepMessage] = useState<string | null>(null);

  // Toggle Full Screen
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      onAddLog('HP 12C em Tela Cheia Ativada', 'Calculadora Financeira');
      try {
        if (containerRef.current?.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(() => {});
        }
      } catch {}
    } else {
      setIsFullscreen(false);
      onAddLog('HP 12C Tela Cheia Desativada', 'Calculadora Financeira');
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {}
    }
  }, [isFullscreen, onAddLog]);

  // Escape key listener for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    const handleFsChange = () => {
      const isNativeFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [isFullscreen]);

  // Helper to format LCD display string
  const getDisplayString = (): string => {
    if (isError) return isError;
    if (isEntering) return inputBuffer;
    
    // Format X value with comma thousands separators and period decimal (HP-12C US format)
    const val = x;
    if (!isFinite(val) || isNaN(val)) return 'Error 0';
    
    return val.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
  };

  // Stack Push Helper (when a new number entry is started after an operation)
  const pushStack = (newX: number) => {
    setT(z);
    setZ(y);
    setY(x);
    setX(newX);
  };

  // Stack Drop Helper (after binary operations like +, -, *, /)
  const dropStack = (result: number) => {
    setLastX(x);
    setX(result);
    setY(z);
    setZ(t);
    // T remains T in HP-12C stack drop
  };

  // Key Press Handler
  const handleButton = (keyId: string) => {
    playKeyClickSound(soundEnabled);
    setActiveKey(keyId);
    setTimeout(() => setActiveKey(null), 150);

    if (isError && keyId !== 'CLX' && keyId !== 'ON') {
      setIsError(null);
      setX(0);
      setInputBuffer('0');
      setIsEntering(false);
      return;
    }

    // Handle PREFIX 'f' (Orange gold functions)
    if (prefix === 'f') {
      setPrefix('none');
      handleFFunction(keyId);
      return;
    }

    // Handle PREFIX 'g' (Blue cyan functions)
    if (prefix === 'g') {
      setPrefix('none');
      handleGFunction(keyId);
      return;
    }

    // Handle 'STO' (Store into register)
    if (prefix === 'sto') {
      setPrefix('none');
      const regIndex = parseInt(keyId, 10);
      if (!isNaN(regIndex) && regIndex >= 0 && regIndex <= 9) {
        setRegisters((prev) => {
          const next = [...prev];
          next[regIndex] = x;
          return next;
        });
        onAddLog(`HP12C: Armazenado em R${regIndex}`, 'HP 12C', `${x}`);
      }
      return;
    }

    // Handle 'RCL' (Recall from register)
    if (prefix === 'rcl') {
      setPrefix('none');
      const regIndex = parseInt(keyId, 10);
      if (!isNaN(regIndex) && regIndex >= 0 && regIndex <= 9) {
        const val = registers[regIndex] || 0;
        pushStack(val);
        setInputBuffer(String(val));
        setIsEntering(false);
        onAddLog(`HP12C: Recuperado de R${regIndex}`, 'HP 12C', `${val}`);
      }
      return;
    }

    // Standard Unprefixed Functions
    switch (keyId) {
      // Digit buttons 0 - 9
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9': {
        if (!isEntering) {
          if (!hasEntered) {
            // Stack lifts
            setT(z);
            setZ(y);
            setY(x);
          }
          setInputBuffer(keyId);
          setX(parseFloat(keyId));
          setIsEntering(true);
          setHasEntered(false);
        } else {
          // Append digit up to 10 digits
          if (inputBuffer.replace(/[-.]/g, '').length < 10) {
            const newBuf = inputBuffer === '0' ? keyId : inputBuffer + keyId;
            setInputBuffer(newBuf);
            setX(parseFloat(newBuf));
          }
        }
        break;
      }

      // Decimal Point '.'
      case '.': {
        if (!isEntering) {
          if (!hasEntered) {
            setT(z);
            setZ(y);
            setY(x);
          }
          setInputBuffer('0.');
          setX(0);
          setIsEntering(true);
          setHasEntered(false);
        } else if (!inputBuffer.includes('.')) {
          const newBuf = inputBuffer + '.';
          setInputBuffer(newBuf);
        }
        break;
      }

      // ENTER (Push Stack)
      case 'ENTER': {
        const currentVal = isEntering ? parseFloat(inputBuffer) : x;
        setT(z);
        setZ(y);
        setY(currentVal);
        setX(currentVal);
        setInputBuffer(String(currentVal));
        setIsEntering(false);
        setHasEntered(true);
        break;
      }

      // CHS (Change Sign)
      case 'CHS': {
        if (isEntering) {
          if (inputBuffer.startsWith('-')) {
            const next = inputBuffer.substring(1);
            setInputBuffer(next);
            setX(parseFloat(next || '0'));
          } else {
            const next = '-' + inputBuffer;
            setInputBuffer(next);
            setX(parseFloat(next));
          }
        } else {
          const next = -x;
          setX(next);
        }
        break;
      }

      // CLX (Clear X)
      case 'CLX': {
        setX(0);
        setInputBuffer('0');
        setIsEntering(false);
        setIsError(null);
        break;
      }

      // SWAP x≷y
      case 'SWAP': {
        const oldX = x;
        const oldY = y;
        setX(oldY);
        setY(oldX);
        setIsEntering(false);
        break;
      }

      // ROLL DOWN R↓
      case 'ROLL': {
        const oldX = x;
        const oldY = y;
        const oldZ = z;
        const oldT = t;
        setX(oldY);
        setY(oldZ);
        setZ(oldT);
        setT(oldX);
        setIsEntering(false);
        break;
      }

      // Basic Arithmetic Operators
      case '+': {
        setIsEntering(false);
        setHasEntered(false);
        dropStack(y + x);
        break;
      }
      case '-': {
        setIsEntering(false);
        setHasEntered(false);
        dropStack(y - x);
        break;
      }
      case '*': {
        setIsEntering(false);
        setHasEntered(false);
        dropStack(y * x);
        break;
      }
      case '/': {
        setIsEntering(false);
        setHasEntered(false);
        if (x === 0) {
          setIsError('Error 0');
        } else {
          dropStack(y / x);
        }
        break;
      }

      // y^x
      case 'Y_POW_X': {
        setIsEntering(false);
        setHasEntered(false);
        dropStack(Math.pow(y, x));
        break;
      }

      // 1/x
      case 'RECIPROCAL': {
        setIsEntering(false);
        setHasEntered(false);
        if (x === 0) {
          setIsError('Error 0');
        } else {
          setLastX(x);
          setX(1 / x);
        }
        break;
      }

      // % (Percentage of Y)
      case 'PERCENT': {
        setIsEntering(false);
        setHasEntered(false);
        const result = (y * x) / 100;
        setLastX(x);
        setX(result); // Y stays in Y!
        break;
      }

      // Δ% (Percentage change from Y to X)
      case 'DELTA_PERCENT': {
        setIsEntering(false);
        setHasEntered(false);
        if (y === 0) {
          setIsError('Error 0');
        } else {
          const result = ((x - y) / y) * 100;
          setLastX(x);
          setX(result); // Y stays in Y
        }
        break;
      }

      // %T (Percent of Total: X / Y * 100)
      case 'PERCENT_TOTAL': {
        setIsEntering(false);
        setHasEntered(false);
        if (y === 0) {
          setIsError('Error 0');
        } else {
          const result = (x / y) * 100;
          setLastX(x);
          setX(result);
        }
        break;
      }

      // TVM Keys
      case 'n': {
        if (isEntering) {
          setN(x);
          setIsEntering(false);
          setHasEntered(false);
        } else {
          // Solve for n
          solveN();
        }
        break;
      }
      case 'i': {
        if (isEntering) {
          setI(x);
          setIsEntering(false);
          setHasEntered(false);
        } else {
          // Solve for i
          solveI();
        }
        break;
      }
      case 'PV': {
        if (isEntering) {
          setPv(x);
          setIsEntering(false);
          setHasEntered(false);
        } else {
          // Solve for PV
          solvePV();
        }
        break;
      }
      case 'PMT': {
        if (isEntering) {
          setPmt(x);
          setIsEntering(false);
          setHasEntered(false);
        } else {
          // Solve for PMT
          solvePMT();
        }
        break;
      }
      case 'FV': {
        if (isEntering) {
          setFv(x);
          setIsEntering(false);
          setHasEntered(false);
        } else {
          // Solve for FV
          solveFV();
        }
        break;
      }

      // Prefix Arms
      case 'f': {
        setPrefix('f');
        break;
      }
      case 'g': {
        setPrefix('g');
        break;
      }
      case 'STO': {
        setPrefix('sto');
        break;
      }
      case 'RCL': {
        setPrefix('rcl');
        break;
      }

      // ON / Reset
      case 'ON': {
        setX(0);
        setY(0);
        setZ(0);
        setT(0);
        setLastX(0);
        setInputBuffer('0');
        setIsEntering(false);
        setIsError(null);
        setPrefix('none');
        break;
      }

      default:
        break;
    }
  };

  // Handle 'f' Orange prefix functions
  const handleFFunction = (keyId: string) => {
    // f 0 - 9: Set Decimals
    const dec = parseInt(keyId, 10);
    if (!isNaN(dec) && dec >= 0 && dec <= 9) {
      setDecimals(dec);
      onAddLog(`HP12C: ${dec} Casas Decimais`, 'HP 12C');
      return;
    }

    switch (keyId) {
      case 'PV': // CLEAR FIN
      case 'SWAP': { // CLEAR FIN printed above
        setN(0);
        setI(0);
        setPv(0);
        setPmt(0);
        setFv(0);
        onAddLog('HP12C: Registradores Financeiros Limpos (f FIN)', 'HP 12C');
        break;
      }
      case 'CLX': { // CLEAR REG
        setRegisters(new Array(10).fill(0));
        onAddLog('HP12C: Registradores R0-R9 Limpos (f REG)', 'HP 12C');
        break;
      }
      case 'Y_POW_X': { // √x
        if (x < 0) {
          setIsError('Error 0');
        } else {
          setLastX(x);
          setX(Math.sqrt(x));
          setIsEntering(false);
        }
        break;
      }
      case 'RECIPROCAL': { // e^x
        setLastX(x);
        setX(Math.exp(x));
        setIsEntering(false);
        break;
      }
      case 'PERCENT_TOTAL': { // LN
        if (x <= 0) {
          setIsError('Error 0');
        } else {
          setLastX(x);
          setX(Math.log(x));
          setIsEntering(false);
        }
        break;
      }
      default:
        break;
    }
  };

  // Handle 'g' Blue prefix functions
  const handleGFunction = (keyId: string) => {
    switch (keyId) {
      case 'n': { // 12×
        const val = x * 12;
        setN(val);
        setX(val);
        setIsEntering(false);
        onAddLog(`HP12C: n = ${val} (g 12×)`, 'HP 12C');
        break;
      }
      case 'i': { // 12÷
        const val = x / 12;
        setI(val);
        setX(val);
        setIsEntering(false);
        onAddLog(`HP12C: i = ${val.toFixed(4)}% (g 12÷)`, 'HP 12C');
        break;
      }
      case '7': { // BEG (Begin payment mode)
        setIsBeginMode(true);
        onAddLog('HP12C: Modo Antecipado Ativado (g BEG)', 'HP 12C');
        break;
      }
      case '8': { // END (End payment mode)
        setIsBeginMode(false);
        onAddLog('HP12C: Modo Postecipado Ativado (g END)', 'HP 12C');
        break;
      }
      case 'ENTER': { // LST x (Last X)
        pushStack(lastX);
        setIsEntering(false);
        break;
      }
      case '3': { // n! (Factorial)
        const intX = Math.floor(x);
        if (intX < 0 || intX > 69) {
          setIsError('Error 0');
        } else {
          let fact = 1;
          for (let k = 2; k <= intX; k++) fact *= k;
          setLastX(x);
          setX(fact);
          setIsEntering(false);
        }
        break;
      }
      case 'PERCENT': { // INTG (Integer part)
        setLastX(x);
        setX(Math.trunc(x));
        setIsEntering(false);
        break;
      }
      case 'DELTA_PERCENT': { // FRAC (Fractional part)
        setLastX(x);
        setX(x - Math.trunc(x));
        setIsEntering(false);
        break;
      }
      default:
        break;
    }
  };

  // ==========================================
  // TVM SOLVERS (Time Value of Money Formulas)
  // ==========================================
  const solvePMT = () => {
    const r = i / 100;
    const S = isBeginMode ? 1 + r : 1;
    let res = 0;
    if (r === 0) {
      if (n === 0) {
        setIsError('Error 5');
        return;
      }
      res = -(pv + fv) / n;
    } else {
      const denom = (1 - Math.pow(1 + r, -n)) / r;
      if (denom === 0) {
        setIsError('Error 5');
        return;
      }
      res = -(pv + fv * Math.pow(1 + r, -n)) / (S * denom);
    }
    setPmt(res);
    setLastX(x);
    setX(res);
    setIsEntering(false);
    onAddLog(`HP12C: PMT Calculado`, 'HP 12C', `PMT = ${res.toFixed(2)}`);
  };

  const solvePV = () => {
    const r = i / 100;
    const S = isBeginMode ? 1 + r : 1;
    let res = 0;
    if (r === 0) {
      res = -(fv + pmt * n);
    } else {
      const factor = (1 - Math.pow(1 + r, -n)) / r;
      res = -(fv * Math.pow(1 + r, -n) + pmt * S * factor);
    }
    setPv(res);
    setLastX(x);
    setX(res);
    setIsEntering(false);
    onAddLog(`HP12C: PV Calculado`, 'HP 12C', `PV = ${res.toFixed(2)}`);
  };

  const solveFV = () => {
    const r = i / 100;
    const S = isBeginMode ? 1 + r : 1;
    let res = 0;
    if (r === 0) {
      res = -(pv + pmt * n);
    } else {
      const factor = (Math.pow(1 + r, n) - 1) / r;
      res = -(pv * Math.pow(1 + r, n) + pmt * S * factor);
    }
    setFv(res);
    setLastX(x);
    setX(res);
    setIsEntering(false);
    onAddLog(`HP12C: FV Calculado`, 'HP 12C', `FV = ${res.toFixed(2)}`);
  };

  const solveN = () => {
    const r = i / 100;
    const S = isBeginMode ? 1 + r : 1;
    if (r === 0) {
      if (pmt === 0) {
        setIsError('Error 5');
        return;
      }
      const res = -(pv + fv) / pmt;
      setN(res);
      setLastX(x);
      setX(res);
      setIsEntering(false);
      return;
    }

    const pmtTerm = (pmt * S) / r;
    const top = pmtTerm - fv;
    const bottom = pv + pmtTerm;

    if (top <= 0 || bottom <= 0 || top / bottom <= 0) {
      setIsError('Error 5');
      return;
    }

    const res = Math.log(top / bottom) / Math.log(1 + r);
    setN(res);
    setLastX(x);
    setX(res);
    setIsEntering(false);
    onAddLog(`HP12C: n Calculado`, 'HP 12C', `n = ${res.toFixed(2)}`);
  };

  const solveI = () => {
    // Newton-Raphson to solve for rate r
    let r = 0.05; // initial guess 5%
    const S = isBeginMode ? 1 + r : 1;
    let iterations = 0;
    const maxIter = 100;
    const tolerance = 1e-8;

    while (iterations < maxIter) {
      const f =
        pv +
        (pmt * S * (1 - Math.pow(1 + r, -n))) / r +
        fv * Math.pow(1 + r, -n);

      if (Math.abs(f) < tolerance) break;

      // Numerical derivative
      const dr = 1e-6;
      const f_plus =
        pv +
        (pmt * S * (1 - Math.pow(1 + (r + dr), -n))) / (r + dr) +
        fv * Math.pow(1 + (r + dr), -n);
      const df = (f_plus - f) / dr;

      if (df === 0) break;
      const r_new = r - f / df;
      if (Math.abs(r_new - r) < tolerance) {
        r = r_new;
        break;
      }
      r = r_new;
      iterations++;
    }

    const resPercent = r * 100;
    setI(resPercent);
    setLastX(x);
    setX(resPercent);
    setIsEntering(false);
    onAddLog(`HP12C: Taxa i Calculada`, 'HP 12C', `i = ${resPercent.toFixed(4)}%`);
  };

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input / textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleButton(e.key);
      } else if (e.key === '.') {
        handleButton('.');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleButton('ENTER');
      } else if (e.key === '+') {
        handleButton('+');
      } else if (e.key === '-') {
        handleButton('-');
      } else if (e.key === '*') {
        handleButton('*');
      } else if (e.key === '/') {
        handleButton('/');
      } else if (e.key.toLowerCase() === 'c' || e.key === 'Backspace') {
        handleButton('CLX');
      } else if (e.key.toLowerCase() === 'f') {
        handleButton('f');
      } else if (e.key.toLowerCase() === 'g') {
        handleButton('g');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleButton]);

  // Load Practical Examples
  const runExampleFinancing = () => {
    // Empréstimo R$ 20.000 a 1.5% a.m. em 24 meses -> calcular parcela PMT
    setN(24);
    setI(1.5);
    setPv(20000);
    setFv(0);
    setIsBeginMode(false);
    setDecimals(2);

    // Calculate PMT: -(20000 * 0.015 / (1 - (1.015)^-24)) = -998.48
    const r = 0.015;
    const pmtVal = -(20000 * r) / (1 - Math.pow(1 + r, -24));
    setPmt(pmtVal);
    setX(pmtVal);
    setInputBuffer(pmtVal.toFixed(2));
    setIsEntering(false);

    setExampleStepMessage(
      '✅ Exemplo Carregado: Financiamento de R$ 20.000 em 24x a 1,5% a.m. Parcela PMT = R$ ' +
        Math.abs(pmtVal).toFixed(2)
    );
    onAddLog('Exemplo Financiamento Carregado', 'HP 12C', `PMT = R$ ${pmtVal.toFixed(2)}`);
  };

  const runExampleInvestment = () => {
    // Investir R$ 5.000 inicial + R$ 500 por mês a 0.8% a.m. durante 36 meses -> FV
    setN(36);
    setI(0.8);
    setPv(-5000); // Saída inicial
    setPmt(-500); // Aporte mensal
    setIsBeginMode(false);
    setDecimals(2);

    const r = 0.008;
    const fvVal = 5000 * Math.pow(1 + r, 36) + 500 * ((Math.pow(1 + r, 36) - 1) / r);
    setFv(fvVal);
    setX(fvVal);
    setInputBuffer(fvVal.toFixed(2));
    setIsEntering(false);

    setExampleStepMessage(
      '✅ Exemplo Carregado: R$ 5.000 inicial + R$ 500/mês a 0,8% em 36 meses. Montante FV = R$ ' +
        fvVal.toFixed(2)
    );
    onAddLog('Exemplo Investimento Carregado', 'HP 12C', `FV = R$ ${fvVal.toFixed(2)}`);
  };

  const runExamplePercentChange = () => {
    // De R$ 80 para R$ 100 -> calcular variação Δ% (25%)
    setY(80);
    setX(100);
    const delta = ((100 - 80) / 80) * 100;
    setX(delta);
    setLastX(100);
    setInputBuffer(delta.toFixed(2));
    setIsEntering(false);

    setExampleStepMessage('✅ Exemplo Carregado: Preço anterior 80 [ENTER], Novo preço 100 [Δ%] = +25,00%');
    onAddLog('Exemplo Δ% Carregado', 'HP 12C', `Δ% = +25%`);
  };

  return (
    <div
      ref={containerRef}
      id="hp12c-panel-container"
      className={`space-y-6 animate-in fade-in duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#07090F] p-3 sm:p-6 overflow-y-auto flex flex-col justify-start items-center'
          : ''
      }`}
    >
      {/* Panel Master Header */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#121622] via-[#1A1E2C] to-[#0E121B] border border-amber-500/30 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-orbitron font-black text-slate-100 tracking-wider">
                HP 12C FINANCIAL CALCULATOR
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                RPN 1981 CLASSIC
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calculadora financeira clássica Hewlett Packard, lógica RPN de 4 níveis, cálculo de juros compostos TVM e manual integrado.
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Cliques de Teclado Ativados' : 'Cliques Silenciados'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'SOM ON' : 'MUDO'}</span>
          </button>

          <button
            onClick={() => handleButton('ON')}
            className="p-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reiniciar Calculadora e Limpar Pilha (Reset ON)"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">RESET</span>
          </button>

          {/* Full Screen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 px-3 rounded-xl border text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isFullscreen
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
            }`}
            title={isFullscreen ? 'Sair da Tela Cheia (Tecla ESC)' : 'Ativar Modo Tela Cheia (Full Screen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullscreen ? 'SAIR TELA CHEIA' : 'TELA CHEIA'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Calculator (Left) + Interactive Manual / Inspector (Right) */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================
            CALCULATOR PHYSICAL BODY (7 cols or full width)
            ======================================================== */}
        <div className="lg:col-span-7 flex flex-col items-center">
          
          {/* THE AUTHENTIC HP 12C HARDWARE CHASSIS */}
          <div className="w-full max-w-[620px] rounded-2xl bg-gradient-to-b from-[#1C1F26] via-[#12141B] to-[#0A0C11] border-2 border-[#D4AF37]/50 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(212,175,55,0.15)] p-3 sm:p-5 relative select-none">
            
            {/* Top Brushed Gold / Aluminum Faceplate */}
            <div className="w-full rounded-t-xl bg-gradient-to-b from-[#E2D8B9] via-[#D5C9A1] to-[#BAAB7E] border-b-3 border-[#2A2416] p-3 sm:p-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_4px_10px_rgba(0,0,0,0.4)] flex items-center justify-between gap-3 relative">
              
              {/* LCD Display Recessed Module */}
              <div className="flex-1 rounded-lg bg-[#0F140A] p-2 border-2 border-[#8A7942] shadow-[inset_0_3px_8px_rgba(0,0,0,0.9)] flex flex-col justify-between min-h-[68px] sm:min-h-[76px] relative overflow-hidden">
                
                {/* LCD Ambient Light & Glare */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#C6D49C]/10 to-[#FFFFFF]/20 pointer-events-none" />

                {/* Status Annunciator Flags Bar */}
                <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-widest text-[#2E3622] px-1 relative z-10">
                  <div className="flex items-center gap-3">
                    <span className={isBeginMode ? 'text-[#10140A] font-black' : 'opacity-15'}>BEGIN</span>
                    <span className="opacity-15">RAD</span>
                    <span className="opacity-15">D.MY</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={prefix === 'f' ? 'text-[#C95B0C] font-black scale-110 transition' : 'opacity-15'}>f</span>
                    <span className={prefix === 'g' ? 'text-[#0E7A9C] font-black scale-110 transition' : 'opacity-15'}>g</span>
                    <span className="opacity-15">PRGM</span>
                  </div>
                </div>

                {/* Primary 7-Segment Value Readout */}
                <div className="flex items-baseline justify-end px-2 pt-1 relative z-10">
                  <span
                    className="font-mono text-2xl sm:text-3xl font-black tracking-tight text-[#141A0E] select-all"
                    style={{
                      fontFamily: '"Courier New", Courier, monospace',
                      textShadow: '0 1px 1px rgba(0,0,0,0.25)',
                    }}
                  >
                    {getDisplayString()}
                  </span>
                </div>
              </div>

              {/* HP 12C Authentic Metal Logo Badge */}
              <div className="flex flex-col items-center justify-center px-2 py-1 bg-[#101217] rounded border border-[#8C7A4A] shadow-md">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-amber-300/40 bg-black/60 text-amber-200 font-serif font-black text-xs italic tracking-tighter shadow-inner">
                  hp
                </div>
                <span className="font-orbitron font-black text-[10px] sm:text-xs text-amber-300 tracking-widest mt-0.5">
                  12C
                </span>
              </div>
            </div>

            {/* Middle Golden Trim Accent Line */}
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent my-2 opacity-60" />

            {/* KEYBOARD MATRIX AREA */}
            <div className="mt-2 space-y-1.5 sm:space-y-2">
              
              {/* ROW 1: n, i, PV, PMT, FV, CHS, 7, 8, 9, ÷ */}
              <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                {renderHPKey('n', 'n', 'AMORT', '12×', handleButton, activeKey)}
                {renderHPKey('i', 'i', 'INT', '12÷', handleButton, activeKey)}
                {renderHPKey('PV', 'PV', 'NPV', 'CFo', handleButton, activeKey)}
                {renderHPKey('PMT', 'PMT', 'RND', 'CFj', handleButton, activeKey)}
                {renderHPKey('FV', 'FV', 'IRR', 'Nj', handleButton, activeKey)}
                {renderHPKey('CHS', 'CHS', '', 'DATE', handleButton, activeKey)}
                {renderHPKey('7', '7', '', 'BEG', handleButton, activeKey)}
                {renderHPKey('8', '8', '', 'END', handleButton, activeKey)}
                {renderHPKey('9', '9', '', 'MEM', handleButton, activeKey)}
                {renderHPKey('/', '÷', '', '', handleButton, activeKey)}
              </div>

              {/* ROW 2: y^x, 1/x, %T, Δ%, %, EEX, 4, 5, 6, × */}
              <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                {renderHPKey('Y_POW_X', 'yˣ', 'PRICE', '√x', handleButton, activeKey)}
                {renderHPKey('RECIPROCAL', '1/x', 'YTM', 'eˣ', handleButton, activeKey)}
                {renderHPKey('PERCENT_TOTAL', '%T', 'SL', 'LN', handleButton, activeKey)}
                {renderHPKey('DELTA_PERCENT', 'Δ%', 'SOYD', 'FRAC', handleButton, activeKey)}
                {renderHPKey('PERCENT', '%', 'DB', 'INTG', handleButton, activeKey)}
                {renderHPKey('EEX', 'EEX', '', 'ΔDYS', handleButton, activeKey)}
                {renderHPKey('4', '4', '', 'D.MY', handleButton, activeKey)}
                {renderHPKey('5', '5', '', 'M.DY', handleButton, activeKey)}
                {renderHPKey('6', '6', '', 'x̄w', handleButton, activeKey)}
                {renderHPKey('*', '×', '', '', handleButton, activeKey)}
              </div>

              {/* ROW 3 & 4 (With Double-Height ENTER Key) */}
              <div className="grid grid-cols-10 gap-1 sm:gap-1.5 items-stretch">
                {/* Left 5 keys of Row 3 */}
                <div className="col-span-5 grid grid-cols-5 gap-1 sm:gap-1.5">
                  {renderHPKey('RS', 'R/S', 'P/R', 'PSE', handleButton, activeKey)}
                  {renderHPKey('SST', 'SST', 'Σ', 'BST', handleButton, activeKey)}
                  {renderHPKey('ROLL', 'R↓', 'PRGM', 'GTO', handleButton, activeKey)}
                  {renderHPKey('SWAP', 'x≷y', 'FIN', 'x≤y', handleButton, activeKey)}
                  {renderHPKey('CLX', 'CLx', 'REG', 'x=0', handleButton, activeKey)}
                </div>

                {/* TALL DOUBLE-HEIGHT VERTICAL 'ENTER' KEY (Spans rows 3 and 4) */}
                <div className="col-span-1 row-span-2 flex flex-col">
                  <div className="text-[7px] sm:text-[8px] font-bold text-[#E5A93C] text-center uppercase tracking-tighter mb-0.5 truncate">
                    PREFIX
                  </div>
                  <button
                    onClick={() => handleButton('ENTER')}
                    className={`flex-1 w-full rounded-md bg-gradient-to-b from-[#2B303A] via-[#1E222A] to-[#14171E] border-t border-slate-500 border-b-2 border-slate-900 shadow-[0_4px_6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] flex flex-col items-center justify-center p-1 cursor-pointer transition active:scale-95 ${
                      activeKey === 'ENTER' ? 'brightness-150 ring-2 ring-amber-400' : 'hover:brightness-110'
                    }`}
                    title="ENTER: Empilha o valor na pilha operacional RPN"
                  >
                    <span className="font-orbitron font-black text-[10px] sm:text-xs text-white tracking-widest writing-vertical">
                      ENTER
                    </span>
                  </button>
                  <div className="text-[7px] sm:text-[8px] font-bold text-[#44B4D8] text-center uppercase tracking-tighter mt-0.5 truncate">
                    LST x
                  </div>
                </div>

                {/* Right 4 keys of Row 3: 1, 2, 3, − */}
                <div className="col-span-4 grid grid-cols-4 gap-1 sm:gap-1.5">
                  {renderHPKey('1', '1', '', 'x̄,r', handleButton, activeKey)}
                  {renderHPKey('2', '2', '', 'ŷ,r', handleButton, activeKey)}
                  {renderHPKey('3', '3', '', 'n!', handleButton, activeKey)}
                  {renderHPKey('-', '−', '', '', handleButton, activeKey)}
                </div>

                {/* Left 5 keys of Row 4 */}
                <div className="col-span-5 grid grid-cols-5 gap-1 sm:gap-1.5">
                  {renderHPKey('ON', 'ON', '', '', handleButton, activeKey)}
                  {renderHPKey('f', 'f', '', '', handleButton, activeKey, 'gold')}
                  {renderHPKey('g', 'g', '', '', handleButton, activeKey, 'blue')}
                  {renderHPKey('STO', 'STO', '', '', handleButton, activeKey)}
                  {renderHPKey('RCL', 'RCL', '', '', handleButton, activeKey)}
                </div>

                {/* Right 4 keys of Row 4: 0, ., Σ+, + */}
                <div className="col-span-4 grid grid-cols-4 gap-1 sm:gap-1.5">
                  {renderHPKey('0', '0', '', 'x̄', handleButton, activeKey)}
                  {renderHPKey('.', '•', '', 's', handleButton, activeKey)}
                  {renderHPKey('SIGMA_PLUS', 'Σ+', '', 'Σ−', handleButton, activeKey)}
                  {renderHPKey('+', '+', '', '', handleButton, activeKey)}
                </div>
              </div>
            </div>

            {/* Bottom Plate Inscription */}
            <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="tracking-widest font-black text-amber-500/80">
                HEWLETT • PACKARD
              </span>
              <span className="text-[9px] text-slate-400">
                Lógica RPN • Pilha X/Y/Z/T
              </span>
            </div>
          </div>

          {/* Quick Example Step Feedback Banner */}
          {exampleStepMessage && (
            <div className="w-full max-w-[620px] mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-lg animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{exampleStepMessage}</span>
              </div>
              <button
                onClick={() => setExampleStepMessage(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* ========================================================
            INTERACTIVE SIDE MANUAL & LIVE STACK VIEWER (5 cols)
            ======================================================== */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Side Tabs Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 flex-wrap">
            <button
              onClick={() => setActiveManualTab('tvm')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-orbitron font-bold transition flex items-center justify-center gap-1.5 ${
                activeManualTab === 'tvm'
                  ? 'bg-amber-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>TVM & JUROS</span>
            </button>

            <button
              onClick={() => setActiveManualTab('rpn')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-orbitron font-bold transition flex items-center justify-center gap-1.5 ${
                activeManualTab === 'rpn'
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>COMO USAR RPN</span>
            </button>

            <button
              onClick={() => setActiveManualTab('stack')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-orbitron font-bold transition flex items-center justify-center gap-1.5 ${
                activeManualTab === 'stack'
                  ? 'bg-purple-500 text-slate-950 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>PILHA X/Y/Z/T</span>
            </button>
          </div>

          {/* TAB 1: TVM (Time Value of Money & Juros Compostos) */}
          {activeManualTab === 'tvm' && (
            <div className="p-4 rounded-2xl bg-[#0F1424] border border-amber-500/30 space-y-4 shadow-xl text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 font-orbitron font-bold">
                  <DollarSign className="w-4 h-4" />
                  <span>MANUAL DE JUROS COMPOSTOS (TVM)</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">5 Registradores</span>
              </div>

              <p className="text-slate-300 leading-relaxed">
                A HP 12C resolve qualquer uma das 5 variáveis financeiras bastando informar as outras 4.
                Convenção: <strong>Saídas de caixa são negativas</strong> (use CHS) e <strong>entradas são positivas</strong>.
              </p>

              {/* Variable legend */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-amber-400 font-bold">n</span>: Nº de períodos (meses/anos)
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-amber-400 font-bold">i</span>: Taxa de juros por período (%)
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-cyan-400 font-bold">PV</span>: Valor Presente (Empréstimo)
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-cyan-400 font-bold">PMT</span>: Parcela periódica
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 col-span-2">
                  <span className="text-emerald-400 font-bold">FV</span>: Valor Futuro (Montante acumulado)
                </div>
              </div>

              {/* Ready-to-Run Interactive Demos */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-orbitron font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>EXEMPLOS COM 1 CLIQUE</span>
                </span>

                <button
                  onClick={runExampleFinancing}
                  className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-amber-500/15 border border-slate-800 hover:border-amber-500/40 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-slate-200 group-hover:text-amber-300">
                      🚗 Financiamento de Carro
                    </div>
                    <div className="text-[10px] text-slate-400">
                      PV: R$ 20.000 em 24x a 1,5% a.m. ➔ Calcula PMT
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition" />
                </button>

                <button
                  onClick={runExampleInvestment}
                  className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-emerald-500/15 border border-slate-800 hover:border-emerald-500/40 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-slate-200 group-hover:text-emerald-300">
                      📈 Investimento com Aportes Mensais
                    </div>
                    <div className="text-[10px] text-slate-400">
                      R$ 5.000 inicial + R$ 500/mês a 0,8% em 36 meses ➔ Calcula FV
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition" />
                </button>
              </div>

              {/* Step by step tip */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
                💡 <strong>Dica Clássica:</strong> Para converter anos em meses, digite os anos e aperte <span className="font-mono bg-blue-900/60 px-1 py-0.5 rounded text-cyan-300">g 12×</span>. Para converter taxa anual em mensal, digite a taxa e aperte <span className="font-mono bg-blue-900/60 px-1 py-0.5 rounded text-cyan-300">g 12÷</span>!
              </div>
            </div>
          )}

          {/* TAB 2: RPN FUNDAMENTALS */}
          {activeManualTab === 'rpn' && (
            <div className="p-4 rounded-2xl bg-[#0F1424] border border-cyan-500/30 space-y-4 shadow-xl text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-cyan-400 font-orbitron font-bold">
                  <HelpCircle className="w-4 h-4" />
                  <span>O QUE É RPN (REVERSE POLISH NOTATION)</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-300">Sem sinal de "="</span>
              </div>

              <div className="space-y-2 text-slate-300 leading-relaxed">
                <p>
                  Diferente de calculadoras comuns, na HP 12C você <strong>digita primeiro os números e depois a operação</strong>.
                </p>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 font-mono text-[11px]">
                  <div className="text-slate-400">Para calcular 5 + 3:</div>
                  <div className="text-cyan-300 font-bold">5 [ENTER] 3 [+] ➔ Resultado: 8</div>
                  <div className="text-slate-400 mt-2">Para calcular (12 + 8) × 4:</div>
                  <div className="text-cyan-300 font-bold">12 [ENTER] 8 [+] 4 [×] ➔ Resultado: 80</div>
                </div>
                <p>
                  Isso elimina parênteses e permite encadear cálculos gigantescos sem perder precisão.
                </p>
              </div>

              {/* Ready demo */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={runExamplePercentChange}
                  className="w-full p-2.5 rounded-xl bg-slate-900/90 hover:bg-cyan-500/15 border border-slate-800 hover:border-cyan-500/40 text-left transition flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <div className="font-bold text-slate-200 group-hover:text-cyan-300">
                      📊 Exemplo de Variação Percentual (Δ%)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Preço subiu de 80 para 100 ➔ 80 [ENTER] 100 [Δ%]
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition" />
                </button>
              </div>

              {/* Key Shortcuts */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1 font-mono">
                <div className="text-slate-400 font-bold font-sans">Teclas de Prefixo:</div>
                <div><span className="text-amber-400 font-bold">f</span> (Dourada): Funções superiores (f 2 fixa 2 casas, f FIN limpa).</div>
                <div><span className="text-cyan-400 font-bold">g</span> (Azul): Funções inferiores (g BEG antecipado, g END postecipado).</div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE STACK & REGISTERS INSPECTOR */}
          {activeManualTab === 'stack' && (
            <div className="p-4 rounded-2xl bg-[#0F1424] border border-purple-500/30 space-y-4 shadow-xl text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-purple-400 font-orbitron font-bold">
                  <Layers className="w-4 h-4" />
                  <span>INSPETOR DA PILHA OPERACIONAL (STACK)</span>
                </div>
                <span className="text-[10px] font-mono text-purple-300">Ao Vivo</span>
              </div>

              {/* Stack Registers 4 Levels */}
              <div className="space-y-1.5 font-mono">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">T (Nível 4):</span>
                  <span className="text-slate-200 font-bold">{t.toFixed(decimals)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Z (Nível 3):</span>
                  <span className="text-slate-200 font-bold">{z.toFixed(decimals)}</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Y (Nível 2):</span>
                  <span className="text-slate-200 font-bold">{y.toFixed(decimals)}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-500/15 border border-purple-500/40 flex items-center justify-between shadow-inner">
                  <span className="text-purple-300 font-bold">X (Visor LCD):</span>
                  <span className="text-purple-200 font-black text-sm">{x.toFixed(decimals)}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Last X (Anterior):</span>
                  <span className="text-slate-400">{lastX.toFixed(decimals)}</span>
                </div>
              </div>

              {/* Financial TVM Registers Status */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] font-orbitron font-bold text-slate-300 mb-2">
                  REGISTRADORES TVM ATUAIS:
                </div>
                <div className="grid grid-cols-5 gap-1.5 font-mono text-center text-[10px]">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-amber-400 font-bold">n</div>
                    <div className="text-slate-200">{n}</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-amber-400 font-bold">i (%)</div>
                    <div className="text-slate-200">{i.toFixed(2)}</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-cyan-400 font-bold">PV</div>
                    <div className="text-slate-200">{pv.toFixed(2)}</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-cyan-400 font-bold">PMT</div>
                    <div className="text-slate-200">{pmt.toFixed(2)}</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <div className="text-emerald-400 font-bold">FV</div>
                    <div className="text-slate-200">{fv.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleButton('SWAP')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition cursor-pointer"
                  title="Trocar X e Y (x≷y)"
                >
                  Trocar X ≷ Y
                </button>
                <button
                  onClick={() => handleButton('ROLL')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs transition cursor-pointer"
                  title="Rolar pilha para baixo (R↓)"
                >
                  Rolar Pilha R↓
                </button>
              </div>
            </div>
          )}

          {/* Authentic HP12C Reference Image Card */}
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs flex items-center gap-3">
            <div className="w-16 h-12 rounded-lg overflow-hidden border border-slate-700 shrink-0 bg-black">
              <img
                src="/assets/aistudio/12c_db093d4b.png"
                alt="HP 12C Original"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-orbitron font-bold text-slate-200 text-[11px]">
                Fidelidade Digital Baseada no Hardware Original
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Layout e pesos das legendas superiores douradas e inferiores ciano reproduzidos conforme a imagem original.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ==========================================
// HP-12C INDIVIDUAL KEY COMPONENT HELPER
// ==========================================
function renderHPKey(
  id: string,
  primaryText: string,
  topGoldText: string,
  bottomBlueText: string,
  onClick: (id: string) => void,
  activeKey: string | null,
  variant: 'normal' | 'gold' | 'blue' = 'normal'
) {
  const isActive = activeKey === id;

  let btnBg = 'bg-gradient-to-b from-[#2C3038] via-[#1E2228] to-[#14161A] text-slate-100 border-slate-500';
  if (variant === 'gold') {
    btnBg = 'bg-gradient-to-b from-[#E59838] via-[#D07B1E] to-[#A85808] text-slate-950 border-amber-300 font-black';
  } else if (variant === 'blue') {
    btnBg = 'bg-gradient-to-b from-[#4BA9CA] via-[#2F85A4] to-[#1B5E78] text-slate-950 border-cyan-300 font-black';
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-[48px] sm:min-h-[52px]">
      {/* Top Gold Sub-label */}
      <span className="text-[7px] sm:text-[8px] font-bold text-[#E5A93C] text-center uppercase tracking-tighter truncate w-full h-3">
        {topGoldText}
      </span>

      {/* Physical Sloped Button Cap */}
      <button
        onClick={() => onClick(id)}
        className={`w-full h-7 sm:h-8 rounded-md border-t border-b-2 shadow-[0_3px_5px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.25)] flex items-center justify-center cursor-pointer transition active:scale-95 ${btnBg} ${
          isActive ? 'brightness-150 ring-2 ring-amber-400' : 'hover:brightness-110'
        }`}
        title={`${primaryText}${topGoldText ? ' | f: ' + topGoldText : ''}${bottomBlueText ? ' | g: ' + bottomBlueText : ''}`}
      >
        <span className="font-orbitron font-bold text-[10px] sm:text-xs">
          {primaryText}
        </span>
      </button>

      {/* Bottom Blue Sub-label */}
      <span className="text-[7px] sm:text-[8px] font-bold text-[#44B4D8] text-center uppercase tracking-tighter truncate w-full h-3 mt-0.5">
        {bottomBlueText}
      </span>
    </div>
  );
}
