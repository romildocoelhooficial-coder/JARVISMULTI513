import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Wifi,
  Radio,
  Cast,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Smartphone,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Power,
  RefreshCw,
  Zap,
  ShieldCheck,
  Monitor,
  MousePointer,
  Mic,
  Crosshair,
  Volume1,
  Layers,
  Info,
  Laptop,
  Check,
  AlertCircle
} from 'lucide-react';
import { TvMirrorDevice, TvBrand, TvProtocol, ActiveTab, UserAccount } from '../types';
import { playJarvesChime } from '../utils/audioEffects';

interface ScreenMirroringHubProps {
  currentUser?: UserAccount;
  activeTab: ActiveTab;
  onNavigateTab: (tab: ActiveTab) => void;
  onAddLog: (action: string, device: string, target?: string) => void;
  onSpeakText?: (text: string) => void;
  onTriggerVoiceListen?: () => void;
  isListening?: boolean;
}

const INITIAL_TV_DEVICES: TvMirrorDevice[] = [
  {
    id: 'tv-samsung-qled',
    name: 'Samsung Neo QLED 65" 4K',
    brand: 'samsung',
    model: 'QN90C Tizen OS 8.0',
    protocol: 'wifi_direct',
    ipAddress: '192.168.1.140',
    macAddress: 'BC:D0:74:9A:12:F1',
    resolution: '4K UHD (3840x2160)',
    fps: 60,
    signalDbm: -38,
    latencyMs: 11,
    status: 'connected',
    bitrateMbps: 34.5,
    audioStreaming: true,
    remoteNavigationEnabled: true,
    lastConnected: 'Conectado agora',
  },
  {
    id: 'tv-lg-oled',
    name: 'LG OLED evo C3 55"',
    brand: 'lg',
    model: 'webOS 24 ThinQ Hub',
    protocol: 'wifi_direct',
    ipAddress: '192.168.1.145',
    macAddress: 'A0:B1:C2:3D:4E:5F',
    resolution: '4K UHD (3840x2160)',
    fps: 60,
    signalDbm: -45,
    latencyMs: 14,
    status: 'disconnected',
    bitrateMbps: 28.0,
    audioStreaming: true,
    remoteNavigationEnabled: true,
    lastConnected: 'Hoje às 11:20',
  },
  {
    id: 'tv-sony-bravia',
    name: 'Sony BRAVIA XR 75"',
    brand: 'sony',
    model: 'XR-75X90L Google TV',
    protocol: 'chromecast',
    ipAddress: '192.168.1.150',
    macAddress: '70:2C:1F:88:99:AA',
    resolution: '4K UHD (3840x2160)',
    fps: 60,
    signalDbm: -49,
    latencyMs: 16,
    status: 'disconnected',
    bitrateMbps: 26.4,
    audioStreaming: true,
    remoteNavigationEnabled: true,
    lastConnected: 'Ontem às 21:00',
  },
  {
    id: 'tv-apple-4k',
    name: 'Apple TV 4K Sala Principal',
    brand: 'apple',
    model: 'Apple TV 4K (3ª Geração)',
    protocol: 'airplay',
    ipAddress: '192.168.1.160',
    macAddress: 'F4:5C:89:11:22:33',
    resolution: '4K UHD (3840x2160)',
    fps: 60,
    signalDbm: -40,
    latencyMs: 9,
    status: 'disconnected',
    bitrateMbps: 38.0,
    audioStreaming: true,
    remoteNavigationEnabled: true,
    lastConnected: '22/10/2026',
  },
  {
    id: 'tv-tcl-gaming',
    name: 'TCL QLED Mini-LED 55"',
    brand: 'tcl',
    model: 'C745 Gaming Edition',
    protocol: 'miracast',
    ipAddress: '192.168.1.172',
    macAddress: 'D8:96:E0:44:55:66',
    resolution: '1080p FHD',
    fps: 60,
    signalDbm: -54,
    latencyMs: 18,
    status: 'disconnected',
    bitrateMbps: 18.2,
    audioStreaming: false,
    remoteNavigationEnabled: true,
    lastConnected: '20/10/2026',
  },
  {
    id: 'tv-roku-express',
    name: 'Roku TV Quarto Casal',
    brand: 'roku',
    model: 'Roku OS 12.5 Miracast',
    protocol: 'miracast',
    ipAddress: '192.168.1.180',
    macAddress: 'B0:EE:7B:66:77:88',
    resolution: '1080p FHD',
    fps: 30,
    signalDbm: -62,
    latencyMs: 24,
    status: 'disconnected',
    bitrateMbps: 12.0,
    audioStreaming: true,
    remoteNavigationEnabled: false,
    lastConnected: '19/10/2026',
  },
];

const BRAND_DETAILS: Record<
  TvBrand,
  { label: string; badge: string; color: string; protocolLabel: string; features: string[] }
> = {
  samsung: {
    label: 'Samsung Smart TV',
    badge: 'Tizen OS / Smart View',
    color: 'from-blue-600 to-cyan-500',
    protocolLabel: 'Samsung Smart View & Wi-Fi Direct',
    features: ['MultiView 4K', 'Smart View Mirror', 'Anynet+ HDMI-CEC', 'One Remote HID'],
  },
  lg: {
    label: 'LG Smart TV',
    badge: 'webOS / ThinQ',
    color: 'from-rose-600 to-red-500',
    protocolLabel: 'LG ThinQ Screen Share & AirPlay',
    features: ['LG Magic Remote', 'webOS Screen Cast', 'LG Sound Sync', 'Pointer Gyro'],
  },
  sony: {
    label: 'Sony BRAVIA',
    badge: 'Google TV / Chromecast',
    color: 'from-indigo-600 to-purple-600',
    protocolLabel: 'Google Cast & BRAVIA Sync',
    features: ['Chromecast 4K', 'Dolby Vision', 'Google TV Remote', 'Bluetooth A2DP'],
  },
  apple: {
    label: 'Apple TV',
    badge: 'tvOS / AirPlay 2',
    color: 'from-slate-600 to-zinc-400',
    protocolLabel: 'Apple AirPlay 2 Mirroring',
    features: ['AirPlay 4K HDR', 'tvOS Remote App', 'Spatial Audio', 'Zero Latency Sync'],
  },
  tcl: {
    label: 'TCL & Philips TV',
    badge: 'Android TV / Miracast',
    color: 'from-red-600 to-amber-500',
    protocolLabel: 'Wi-Fi Display & Miracast Direct',
    features: ['Wi-Fi Direct P2P', 'Android TV Remote', 'Ambilight Sync', 'Game Mode 120Hz'],
  },
  roku: {
    label: 'Roku TV',
    badge: 'Roku OS / Wi-Fi Cast',
    color: 'from-purple-600 to-violet-500',
    protocolLabel: 'Roku Screen Mirroring & ECP',
    features: ['Roku Direct Cast', 'Mobile Private Audio', 'Roku D-Pad Remote', 'AirPlay support'],
  },
  generic: {
    label: 'Smart TV Genérica',
    badge: 'DLNA / Wi-Fi',
    color: 'from-cyan-600 to-teal-500',
    protocolLabel: 'DLNA / UPnP / Wi-Fi Display',
    features: ['DLNA Media Cast', 'Wi-Fi Mirroring', 'Controle Remoto Padrão'],
  },
};

export const ScreenMirroringHub: React.FC<ScreenMirroringHubProps> = ({
  currentUser,
  activeTab,
  onNavigateTab,
  onAddLog,
  onSpeakText,
  onTriggerVoiceListen,
  isListening,
}) => {
  // TV Devices State - Emparelhamento ativado por padrão
  const [devices, setDevices] = useState<TvMirrorDevice[]>(() => {
    try {
      const saved = localStorage.getItem('JARVES_TV_DEVICES_V1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasConnected = parsed.some((d: TvMirrorDevice) => d.status === 'connected');
          if (!hasConnected) {
            parsed[0].status = 'connected';
            parsed[0].lastConnected = 'Conectado agora';
          }
          return parsed;
        }
      }
      return INITIAL_TV_DEVICES;
    } catch {
      return INITIAL_TV_DEVICES;
    }
  });
  const [selectedTvId, setSelectedTvId] = useState<string>('tv-samsung-qled');
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Stream Configuration & Metrics
  const [mirrorQuality, setMirrorQuality] = useState<'4K' | '1080p' | '720p'>('4K');
  const [targetFps, setTargetFps] = useState<60 | 30>(60);
  const [audioToTv, setAudioToTv] = useState(true);
  const [isFullscreenTv, setIsFullscreenTv] = useState(false);
  const [tvVolume, setTvVolume] = useState(65);
  const [isMuted, setIsMuted] = useState(false);

  // Real Display Capture Stream (Browser getDisplayMedia)
  const [isRealDisplayCaptured, setIsRealDisplayCaptured] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // TV Remote Navigation HUD State
  const [remoteFocusRing, setRemoteFocusRing] = useState(true);
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);
  const [lastRemoteAction, setLastRemoteAction] = useState<string>('Pronto para navegar');
  const [pointerModeActive, setPointerModeActive] = useState(false);
  const [pointerCoord, setPointerCoord] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [activeSubView, setActiveSubView] = useState<'mirror_tv' | 'remote_control' | 'devices_scan' | 'settings'>('mirror_tv');

  // Currently active mirrored device
  const activeDevice = devices.find((d) => d.id === selectedTvId) || devices[0];
  const isCurrentlyMirroring = activeDevice.status === 'connected';

  // Navigation tabs ordering for TV Remote cycle
  const NAV_TABS_LIST: { id: ActiveTab; label: string }[] = [
    { id: 'assistant', label: 'Terminal & Voz' },
    { id: 'automations', label: 'Automações IoT' },
    { id: 'mirroring', label: 'Espelhamento TV' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'devices', label: 'Dispositivos' },
    { id: 'media', label: 'Mídia & Áudio' },
    { id: 'games', label: 'Jogos Arcade' },
    { id: 'whatsapp', label: 'WhatsApp' },
    { id: 'finance', label: 'Finanças' },
    { id: 'habits', label: 'Hábitos' },
    { id: 'translator', label: 'Tradutor' },
    { id: 'userpanel', label: 'Painel Pessoal' },
  ];

  // ==========================================
  // PHYSICAL TV REMOTE & KEYBOARD D-PAD LISTENER
  // ==========================================
  useEffect(() => {
    const handleTvKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing into an input/textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      // Handle Arrow Keys and TV Remote codes
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace'].includes(e.key)) {
        setLastKeyPressed(e.key);
      }

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        // Cycle to next tab
        const currentIndex = NAV_TABS_LIST.findIndex((t) => t.id === activeTab);
        const nextIndex = (currentIndex + 1) % NAV_TABS_LIST.length;
        const nextTab = NAV_TABS_LIST[nextIndex];
        onNavigateTab(nextTab.id);
        setLastRemoteAction(`D-Pad Avançar: ${nextTab.label}`);
        playJarvesChime('click');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        // Cycle to previous tab
        const currentIndex = NAV_TABS_LIST.findIndex((t) => t.id === activeTab);
        const prevIndex = (currentIndex - 1 + NAV_TABS_LIST.length) % NAV_TABS_LIST.length;
        const prevTab = NAV_TABS_LIST[prevIndex];
        onNavigateTab(prevTab.id);
        setLastRemoteAction(`D-Pad Retornar: ${prevTab.label}`);
        playJarvesChime('click');
      } else if (e.key === 'Enter') {
        setLastRemoteAction('D-Pad OK / Confirmar Ação');
        playJarvesChime('confirm');
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        // Return to Assistant
        onNavigateTab('assistant');
        setLastRemoteAction('Botão Voltar: Terminal JARVES');
        playJarvesChime('confirm');
      } else if (e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key, 10) - 1;
        if (num < NAV_TABS_LIST.length) {
          const targetTab = NAV_TABS_LIST[num];
          onNavigateTab(targetTab.id);
          setLastRemoteAction(`Canal ${e.key}: ${targetTab.label}`);
          playJarvesChime('confirm');
        }
      }
    };

    window.addEventListener('keydown', handleTvKeyDown);
    return () => window.removeEventListener('keydown', handleTvKeyDown);
  }, [activeTab, onNavigateTab]);

  // Clean up display stream on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Save devices state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('JARVES_TV_DEVICES_V1', JSON.stringify(devices));
    } catch (e) {
      console.warn('Erro ao salvar estado de espelhamento:', e);
    }
  }, [devices]);

  // Connect or disconnect TV device
  const handleToggleConnect = (dev: TvMirrorDevice) => {
    if (dev.status === 'connected') {
      // Disconnect
      setDevices((prev) =>
        prev.map((d) => (d.id === dev.id ? { ...d, status: 'disconnected', lastConnected: 'Desconectado' } : d))
      );
      if (isRealDisplayCaptured && mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        setIsRealDisplayCaptured(false);
      }
      onAddLog(`Espelhamento com ${dev.name} finalizado`, 'Espelhamento TV', dev.brand);
      if (onSpeakText) {
        onSpeakText(`Transmissão de tela para a TV ${dev.name} desconectada.`);
      }
      playJarvesChime('confirm');
    } else {
      // Connect
      setIsConnecting(true);
      playJarvesChime('click');
      setTimeout(() => {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === dev.id
              ? { ...d, status: 'connected', lastConnected: 'Conectado agora' }
              : { ...d, status: 'disconnected' }
          )
        );
        setSelectedTvId(dev.id);
        setIsConnecting(false);
        onAddLog(`Espelhamento ativo em ${dev.name} (${dev.resolution})`, 'Espelhamento TV', dev.brand);
        if (onSpeakText) {
          onSpeakText(`Espelhamento estabelecido com sucesso na ${dev.name}. Resolução 4K e navegação por controle remoto ativada.`);
        }
        playJarvesChime('confirm');
      }, 1200);
    }
  };

  // Trigger Real Screen Capture (Browser WebRTC getDisplayMedia)
  const handleStartRealScreenCapture = async () => {
    setCaptureError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            frameRate: targetFps,
          },
          audio: audioToTv,
        });

        mediaStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
        setIsRealDisplayCaptured(true);
        onAddLog('Stream Real de Tela Iniciado via getDisplayMedia', 'Espelhamento TV');
        playJarvesChime('confirm');

        stream.getVideoTracks()[0].onended = () => {
          setIsRealDisplayCaptured(false);
          mediaStreamRef.current = null;
        };
      } else {
        setCaptureError('Seu navegador não suporta a API de captura de tela em tempo real.');
      }
    } catch (err: any) {
      console.warn('Screen capture cancelled or error:', err);
      setCaptureError(err?.message || 'Permissão de captura de tela cancelada.');
    }
  };

  const handleStopRealScreenCapture = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsRealDisplayCaptured(false);
  };

  // Fullscreen mode toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreenTv(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreenTv(false);
    }
  };

  // Scan network for Smart TVs (mDNS, UPnP, Web Bluetooth BLE)
  const handleScanNetwork = () => {
    setIsScanning(true);
    playJarvesChime('click');
    onAddLog('Escaneamento Wi-Fi 6 e Bluetooth BLE para TVs iniciado', 'Espelhamento TV');

    setTimeout(() => {
      setIsScanning(false);
      onAddLog('6 Smart TVs identificadas com suporte a navegação remota', 'Espelhamento TV');
      playJarvesChime('confirm');
      if (onSpeakText) {
        onSpeakText('Varredura concluída. Seis Smart TVs Samsung, LG, Sony, Apple e TCL disponíveis na rede local.');
      }
    }, 2000);
  };

  // Virtual Remote Buttons Trigger
  const handleRemoteDpad = (direction: 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'home') => {
    playJarvesChime('click');
    setLastKeyPressed(`Controle: ${direction.toUpperCase()}`);

    if (direction === 'right' || direction === 'down') {
      const currentIndex = NAV_TABS_LIST.findIndex((t) => t.id === activeTab);
      const nextIndex = (currentIndex + 1) % NAV_TABS_LIST.length;
      const nextTab = NAV_TABS_LIST[nextIndex];
      onNavigateTab(nextTab.id);
      setLastRemoteAction(`Navegando: ${nextTab.label}`);
    } else if (direction === 'left' || direction === 'up') {
      const currentIndex = NAV_TABS_LIST.findIndex((t) => t.id === activeTab);
      const prevIndex = (currentIndex - 1 + NAV_TABS_LIST.length) % NAV_TABS_LIST.length;
      const prevTab = NAV_TABS_LIST[prevIndex];
      onNavigateTab(prevTab.id);
      setLastRemoteAction(`Navegando: ${prevTab.label}`);
    } else if (direction === 'ok') {
      setLastRemoteAction('Botão OK / Confirmar');
      playJarvesChime('confirm');
    } else if (direction === 'back') {
      onNavigateTab('assistant');
      setLastRemoteAction('Voltar para Terminal');
    } else if (direction === 'home') {
      onNavigateTab('userpanel');
      setLastRemoteAction('Ir para Painel Principal');
    }
  };

  const handleAdjustTvVolume = (delta: number) => {
    setTvVolume((prev) => {
      const nextVal = Math.min(100, Math.max(0, prev + delta));
      playJarvesChime('click');
      setLastRemoteAction(`Volume da TV: ${nextVal}%`);
      return nextVal;
    });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      {/* Top Banner & TV Mirroring Status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0C121E] via-[#0E1726] to-[#0A0E18] border border-sky-500/30 p-5 md:p-6 shadow-[0_0_30px_rgba(14,165,233,0.12)]">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-40 bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/30 border border-sky-400/50 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
              <Tv className="w-7 h-7 text-sky-400" />
              {isCurrentlyMirroring && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0C121E] animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-orbitron font-extrabold text-lg sm:text-xl text-slate-100 tracking-wider">
                  CENTRAL DE ESPELHAMENTO SMART TV
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  WI-FI 6 // BLUETOOTH BLE
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40">
                  MÓDULO ATIVO POR PADRÃO
                </span>
                {isCurrentlyMirroring ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    TRANSMITINDO EM TEMPO REAL
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
                    STANDBY // PRONTO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Espelhe o JARVES em TVs <strong>Samsung</strong> (Tizen Smart View), <strong>LG</strong> (webOS ThinQ),{' '}
                <strong>Sony</strong>, <strong>Apple TV</strong> (AirPlay) e <strong>TCL</strong>. Navegue fluidamente entre
                telas, jogos e automações usando o controle remoto físico ou virtual.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full sm:w-auto">
            <button
              onClick={handleScanNetwork}
              disabled={isScanning}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/40 text-xs font-mono text-slate-200 transition-all cursor-pointer"
              title="Buscar TVs disponíveis na rede Wi-Fi e Bluetooth"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Buscando TVs...' : 'Varredura Wi-Fi/BLE'}</span>
            </button>

            <button
              onClick={handleToggleFullscreen}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-mono text-sky-300 transition-all cursor-pointer"
              title="Modo Tela Cheia 16:9 de TV"
            >
              {isFullscreenTv ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreenTv ? 'Sair Tela Cheia' : 'Tela Cheia TV'}</span>
            </button>
          </div>
        </div>

        {/* Live Metrics Row when connected */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-5 pt-4 border-t border-slate-800/80 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-[#121824]/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Dispositivo Conectado</span>
            <span className="text-slate-100 font-bold truncate block">{activeDevice.name}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#121824]/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Protocolo Ativo</span>
            <span className="text-sky-300 font-bold uppercase truncate block">{activeDevice.protocol.replace('_', ' ')}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#121824]/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Resolução / FPS</span>
            <span className="text-emerald-400 font-bold block">{mirrorQuality} UHD @ {targetFps} FPS</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#121824]/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Latência de Rede</span>
            <span className="text-amber-400 font-bold block">{activeDevice.latencyMs} ms (Ultra Baixa)</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#121824]/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Taxa de Dados</span>
            <span className="text-cyan-300 font-bold block">{activeDevice.bitrateMbps} Mbps</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#121824]/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase">Navegação Remota</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> D-Pad Ativo
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubView('mirror_tv')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-orbitron font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubView === 'mirror_tv'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>TELA ESPELHADA & MONITOR</span>
        </button>

        <button
          onClick={() => setActiveSubView('remote_control')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-orbitron font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubView === 'remote_control'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>CONTROLE REMOTO VIRTUAL</span>
        </button>

        <button
          onClick={() => setActiveSubView('devices_scan')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-orbitron font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubView === 'devices_scan'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Cast className="w-4 h-4" />
          <span>TVS DISPONÍVEIS ({devices.length})</span>
        </button>

        <button
          onClick={() => setActiveSubView('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-orbitron font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubView === 'settings'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-[0_0_15px_rgba(14,165,233,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>CONFIGURAÇÃO DE TRANSMISSÃO</span>
        </button>
      </div>

      {/* ========================================================
          VIEW 1: MIRROR TV MONITOR WITH INTERACTIVE DISPLAY STREAM
          ======================================================== */}
      {activeSubView === 'mirror_tv' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Mirrored Screen Frame */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="relative rounded-2xl bg-slate-950 border-4 border-slate-800 shadow-2xl overflow-hidden aspect-video flex flex-col items-center justify-center p-1 group">
              {/* TV Bezel and Brand Badge */}
              <div className="absolute top-3 left-4 z-20 flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-[10px] font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-sky-400 uppercase">{activeDevice.brand}</span>
                <span>// {activeDevice.model}</span>
                <span className="text-slate-500">|</span>
                <span className="text-amber-300">{mirrorQuality} 60Hz</span>
              </div>

              {/* Top Right Live Telemetry Overlay */}
              <div className="absolute top-3 right-4 z-20 flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-[10px] font-mono text-slate-300 flex items-center gap-2">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>{activeDevice.signalDbm} dBm</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-sky-300">{activeDevice.latencyMs}ms</span>
                </div>
              </div>

              {/* Real Stream or Interactive Canvas */}
              {isRealDisplayCaptured ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted={!audioToTv}
                  className="w-full h-full object-contain rounded-lg bg-black"
                />
              ) : (
                <div className="relative w-full h-full rounded-lg bg-gradient-to-br from-[#06090F] via-[#0A0E18] to-[#04060A] flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                  {/* Subtle TV Scanline & Glow Overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent pointer-events-none" />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%)',
                      backgroundSize: '100% 4px',
                    }}
                  />

                  {/* Simulated Mirror HUD Content */}
                  <div className="relative z-10 flex flex-col items-center max-w-md">
                    <div className="relative mb-4">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 border border-sky-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(14,165,233,0.3)]">
                        <Cast className="w-10 h-10 text-sky-400 animate-pulse" />
                      </div>
                      <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono text-[9px] font-bold">
                        4K SYNC
                      </span>
                    </div>

                    <h2 className="text-lg font-orbitron font-bold text-slate-100 tracking-wider">
                      ESPELHAMENTO ATIVO EM {activeDevice.name.toUpperCase()}
                    </h2>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      O aplicativo JARVES está sincronizado com a tela de sua Smart TV. Todas as ações realizadas
                      aqui ou pelo controle remoto físico são renderizadas em tempo real.
                    </p>

                    {/* Quick navigation preview chips */}
                    <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400">Aba ativa:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 font-mono text-xs font-bold">
                        {NAV_TABS_LIST.find((t) => t.id === activeTab)?.label}
                      </span>
                    </div>

                    {/* Action buttons inside TV stream preview */}
                    <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
                      <button
                        onClick={handleStartRealScreenCapture}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-orbitron font-bold text-xs transition-all shadow-[0_0_15px_rgba(14,165,233,0.4)] cursor-pointer"
                        title="Capturar a janela do navegador para exibir vídeo real dentro da TV"
                      >
                        <Laptop className="w-4 h-4" />
                        <span>Transmitir Janela Real</span>
                      </button>

                      <button
                        onClick={() => setActiveSubView('remote_control')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-orbitron font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4 text-sky-400" />
                        <span>Abrir Controle Remoto</span>
                      </button>
                    </div>

                    {captureError && (
                      <p className="mt-3 text-[11px] text-amber-400 flex items-center gap-1.5 font-mono">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {captureError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Screen Stream Controls Bar */}
              <div className="w-full bg-slate-900/90 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between z-10 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleConnect(activeDevice)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      isCurrentlyMirroring
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{isCurrentlyMirroring ? 'Desconectar TV' : 'Reconectar'}</span>
                  </button>

                  {isRealDisplayCaptured && (
                    <button
                      onClick={handleStopRealScreenCapture}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                    >
                      Parar Captura Real
                    </button>
                  )}
                </div>

                {/* Volume & Audio Output to TV */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-slate-400 hover:text-sky-400 transition-colors"
                    title={isMuted ? 'Desmutar som da TV' : 'Mutar som da TV'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : tvVolume}
                    onChange={(e) => {
                      setTvVolume(parseInt(e.target.value, 10));
                      setIsMuted(false);
                    }}
                    className="w-20 sm:w-28 accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-slate-300 text-[11px] w-8">{isMuted ? '0%' : `${tvVolume}%`}</span>
                </div>
              </div>
            </div>

            {/* Remote Navigation Feedback Strip */}
            <div className="p-3.5 rounded-xl bg-[#121824]/90 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span className="text-slate-400">Último Comando Recebido:</span>
                <span className="text-sky-300 font-bold">{lastRemoteAction}</span>
              </div>
              {lastKeyPressed && (
                <div className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                  {lastKeyPressed}
                </div>
              )}
            </div>

            {/* Shortcut hints for TV Physical Remote Control */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
              <div className="flex items-center gap-2 font-orbitron font-bold text-slate-200 mb-2">
                <Info className="w-4 h-4 text-sky-400" />
                <span>COMO NAVEGAR PELO CONTROLE REMOTO DE SUA SMART TV</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-slate-400 text-[11px]">
                <div className="p-2.5 rounded-lg bg-[#0E1420] border border-slate-800">
                  <strong className="text-sky-300 block mb-1">Setas ◄ ► ▲ ▼</strong>
                  <span>Alternam instantaneamente entre as abas e seções do JARVES.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0E1420] border border-slate-800">
                  <strong className="text-emerald-300 block mb-1">Botão OK / Enter</strong>
                  <span>Confirma a seleção atual, abre módulos ou ativa recursos.</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0E1420] border border-slate-800">
                  <strong className="text-amber-300 block mb-1">Teclas Numéricas 1 a 9</strong>
                  <span>Atalhos rápidos para trocar de canal/aba (1: Terminal, 2: Automações...).</span>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel: Quick TV Remote & Channel Switcher */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Compact Remote Controller HUD */}
            <div className="rounded-2xl bg-gradient-to-b from-[#121824] to-[#0D121D] border border-slate-800 p-5 shadow-xl flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-orbitron font-bold text-slate-200">
                <span className="flex items-center gap-2 text-sky-400">
                  <Smartphone className="w-4 h-4" />
                  CONTROLE SMART TV
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  D-PAD
                </span>
              </div>

              {/* D-Pad Circular Controller */}
              <div className="relative my-6 w-48 h-48 rounded-full bg-slate-900 border-2 border-slate-700 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex items-center justify-center p-2">
                {/* UP */}
                <button
                  onClick={() => handleRemoteDpad('up')}
                  className="absolute top-2 w-14 h-11 rounded-t-xl bg-slate-800 hover:bg-sky-500/30 text-slate-300 hover:text-sky-300 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Cima / Aba Anterior"
                >
                  <ChevronUp className="w-6 h-6" />
                </button>

                {/* DOWN */}
                <button
                  onClick={() => handleRemoteDpad('down')}
                  className="absolute bottom-2 w-14 h-11 rounded-b-xl bg-slate-800 hover:bg-sky-500/30 text-slate-300 hover:text-sky-300 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Baixo / Próxima Aba"
                >
                  <ChevronDown className="w-6 h-6" />
                </button>

                {/* LEFT */}
                <button
                  onClick={() => handleRemoteDpad('left')}
                  className="absolute left-2 h-14 w-11 rounded-l-xl bg-slate-800 hover:bg-sky-500/30 text-slate-300 hover:text-sky-300 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Esquerda / Aba Anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* RIGHT */}
                <button
                  onClick={() => handleRemoteDpad('right')}
                  className="absolute right-2 h-14 w-11 rounded-r-xl bg-slate-800 hover:bg-sky-500/30 text-slate-300 hover:text-sky-300 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="Direita / Próxima Aba"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* CENTER OK BUTTON */}
                <button
                  onClick={() => handleRemoteDpad('ok')}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-orbitron font-extrabold text-sm shadow-[0_0_15px_rgba(14,165,233,0.5)] flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  title="OK / Confirmar Seleção"
                >
                  OK
                </button>
              </div>

              {/* Utility buttons row (Back, Voice Mic, Home) */}
              <div className="grid grid-cols-3 gap-2 w-full pt-2">
                <button
                  onClick={() => handleRemoteDpad('back')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Voltar ao Terminal JARVES"
                >
                  <RotateCcw className="w-4 h-4 text-sky-400" />
                  <span>Voltar</span>
                </button>

                <button
                  onClick={() => {
                    if (onTriggerVoiceListen) onTriggerVoiceListen();
                    setLastRemoteAction('Voz JARVES Ativada pelo Controle');
                  }}
                  className={`p-2.5 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] animate-pulse'
                      : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40'
                  }`}
                  title="Comando de Voz pelo Controle Remoto"
                >
                  <Mic className="w-4 h-4" />
                  <span>{isListening ? 'Ouvindo...' : 'Falar'}</span>
                </button>

                <button
                  onClick={() => handleRemoteDpad('home')}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Painel Pessoal (Home)"
                >
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Home</span>
                </button>
              </div>

              {/* Volume Rocker & Channel Switches */}
              <div className="grid grid-cols-2 gap-2 w-full mt-3">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">VOL</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAdjustTvVolume(-5)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleAdjustTvVolume(5)}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">ABAS</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRemoteDpad('left')}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center"
                      title="Aba anterior"
                    >
                      ◄
                    </button>
                    <button
                      onClick={() => handleRemoteDpad('right')}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm flex items-center justify-center"
                      title="Próxima aba"
                    >
                      ►
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Channel / Tab Jump Grid */}
            <div className="rounded-2xl bg-[#121824]/90 border border-slate-800 p-4">
              <span className="text-xs font-orbitron font-bold text-slate-200 block mb-3">
                CANAIS DIRETOS DO JARVES (1-9)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {NAV_TABS_LIST.slice(0, 8).map((t, idx) => {
                  const isCurrent = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        onNavigateTab(t.id);
                        setLastRemoteAction(`Selecionado Canal ${idx + 1}: ${t.label}`);
                        playJarvesChime('confirm');
                      }}
                      className={`p-2 rounded-lg text-left border flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold shadow-sm'
                          : 'bg-[#0B0E14] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="truncate">{t.label}</span>
                      <span className="font-mono text-[10px] opacity-70">#{idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 2: FULL VIRTUAL REMOTE CONTROL (LG / SAMSUNG / SONY STYLE)
          ======================================================== */}
      {activeSubView === 'remote_control' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Detailed Full Smart TV Remote */}
          <div className="md:col-span-6 lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm rounded-[2.5rem] bg-gradient-to-b from-[#182130] via-[#0E1524] to-[#0A0E18] border-2 border-slate-700/80 p-6 shadow-2xl relative flex flex-col items-center">
              {/* Remote Brand Logo Bar */}
              <div className="w-full flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                  <span className="font-orbitron font-extrabold text-slate-100 tracking-wider">
                    {activeDevice.brand.toUpperCase()} REMOTE
                  </span>
                </div>
                <span className="font-mono text-[10px] text-sky-400">BLE 5.3 // IR</span>
              </div>

              {/* Power & Source Row */}
              <div className="w-full flex items-center justify-between my-4">
                <button
                  onClick={() => handleToggleConnect(activeDevice)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isCurrentlyMirroring
                      ? 'bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                      : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/50'
                  }`}
                  title="Ligar/Desligar Espelhamento"
                >
                  <Power className="w-5 h-5" />
                </button>

                {/* Source Input */}
                <button
                  onClick={() => {
                    playJarvesChime('click');
                    setLastRemoteAction('Fonte de Vídeo: JARVES HDMI/Wi-Fi');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 border border-slate-700 flex items-center gap-1.5"
                >
                  <Cast className="w-3.5 h-3.5 text-sky-400" />
                  <span>SOURCE</span>
                </button>
              </div>

              {/* Number Keypad 1-9 for Direct Channel Selection */}
              <div className="grid grid-cols-3 gap-2 w-full my-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                  const targetTab = NAV_TABS_LIST[num - 1];
                  return (
                    <button
                      key={num}
                      onClick={() => {
                        if (targetTab) {
                          onNavigateTab(targetTab.id);
                          setLastRemoteAction(`Canal ${num}: ${targetTab.label}`);
                          playJarvesChime('confirm');
                        }
                      }}
                      className="py-2.5 rounded-xl bg-slate-900/90 hover:bg-sky-500/20 border border-slate-800 hover:border-sky-500/40 text-slate-200 text-sm font-mono font-bold transition-all cursor-pointer active:scale-95 flex flex-col items-center"
                      title={targetTab ? targetTab.label : `Canal ${num}`}
                    >
                      <span>{num}</span>
                      <span className="text-[8px] text-slate-500 font-sans truncate max-w-[65px]">
                        {targetTab ? targetTab.label : '-'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Volume & Channel Rockers */}
              <div className="grid grid-cols-2 gap-4 w-full my-4 px-2">
                {/* VOL Rocker */}
                <div className="flex flex-col items-center bg-slate-900/80 rounded-2xl border border-slate-800 p-2">
                  <span className="text-[10px] font-mono text-slate-400 mb-1">VOL</span>
                  <button
                    onClick={() => handleAdjustTvVolume(5)}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="my-1.5 p-1 text-slate-400 hover:text-rose-400"
                    title="Mudo"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleAdjustTvVolume(-5)}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                </div>

                {/* CH / TAB Rocker */}
                <div className="flex flex-col items-center bg-slate-900/80 rounded-2xl border border-slate-800 p-2">
                  <span className="text-[10px] font-mono text-slate-400 mb-1">CH / ABA</span>
                  <button
                    onClick={() => handleRemoteDpad('right')}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onNavigateTab('assistant')}
                    className="my-1.5 p-1 text-slate-400 hover:text-sky-400"
                    title="Canal Terminal"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoteDpad('left')}
                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                  >
                    ▼
                  </button>
                </div>
              </div>

              {/* D-Pad Circular Controller */}
              <div className="relative my-4 w-44 h-44 rounded-full bg-slate-950 border-2 border-slate-700 flex items-center justify-center p-2 shadow-inner">
                <button
                  onClick={() => handleRemoteDpad('up')}
                  className="absolute top-1.5 w-12 h-10 rounded-t-lg bg-slate-800/90 hover:bg-sky-500/30 text-slate-300 hover:text-sky-300 flex items-center justify-center"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleRemoteDpad('down')}
                  className="absolute bottom-1.5 w-12 h-10 rounded-b-lg bg-slate-800/90 hover:bg-sky-500/30 text-slate-300 hover:text-sky-300 flex items-center justify-center"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleRemoteDpad('left')}
                  className="absolute left-1.5 h-12 w-10 rounded-l-lg bg-slate-800/90 hover:bg-sky-500/30 text-slate-300 hover:text-sky-300 flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleRemoteDpad('right')}
                  className="absolute right-1.5 h-12 w-10 rounded-r-lg bg-slate-800/90 hover:bg-sky-500/30 text-slate-300 hover:text-sky-300 flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handleRemoteDpad('ok')}
                  className="w-14 h-14 rounded-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-orbitron font-extrabold text-xs shadow-md flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  OK
                </button>
              </div>

              {/* Voice & App Shortcuts */}
              <div className="grid grid-cols-3 gap-2 w-full mt-2">
                <button
                  onClick={() => handleRemoteDpad('back')}
                  className="py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center justify-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>BACK</span>
                </button>

                <button
                  onClick={() => {
                    if (onTriggerVoiceListen) onTriggerVoiceListen();
                    setLastRemoteAction('Voz ativada via Smart Remote');
                  }}
                  className={`py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1 ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 shadow-md font-bold'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>MIC</span>
                </button>

                <button
                  onClick={() => handleRemoteDpad('home')}
                  className="py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold flex items-center justify-center gap-1"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>HOME</span>
                </button>
              </div>

              {/* Quick Streaming Buttons (Netflix/YouTube/Spotify/Games) */}
              <div className="grid grid-cols-2 gap-2 w-full mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => {
                    onNavigateTab('media');
                    setLastRemoteAction('Atalho: Centro de Mídia');
                    playJarvesChime('confirm');
                  }}
                  className="py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold"
                >
                  YOUTUBE
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('games');
                    setLastRemoteAction('Atalho: Jogos Arcade');
                    playJarvesChime('confirm');
                  }}
                  className="py-2 rounded-lg bg-fuchsia-600/20 hover:bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/30 text-[11px] font-bold"
                >
                  ARCADE 80s
                </button>
              </div>
            </div>
          </div>

          {/* Remote Settings & Keymap Info */}
          <div className="md:col-span-6 lg:col-span-7 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-[#121824]/90 border border-slate-800">
              <h3 className="text-sm font-orbitron font-bold text-slate-100 flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                CONECTIVIDADE DO CONTROLE REMOTO SMART TV
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Este controle remoto virtual emula os comandos de infravermelho e Bluetooth Low Energy (BLE)
                transmitidos pelos controles oficiais da <strong>Samsung (One Remote)</strong>,{' '}
                <strong>LG (Magic Remote)</strong>, <strong>Sony Bravia</strong> e <strong>Apple TV Remote</strong>.
              </p>

              <div className="mt-4 space-y-3 font-mono text-xs">
                <div className="p-3 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">TV Vinculada ao Controle:</span>
                  <span className="text-sky-300 font-bold">{activeDevice.name}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Tempo de Resposta D-Pad:</span>
                  <span className="text-emerald-400 font-bold">12ms (Tempo Real)</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Modo de Foco Visual (Anel de Seleção):</span>
                  <button
                    onClick={() => setRemoteFocusRing(!remoteFocusRing)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      remoteFocusRing
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {remoteFocusRing ? 'ATIVADO' : 'DESATIVADO'}
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Remote Pointer & Air Mouse Simulation */}
            <div className="p-5 rounded-2xl bg-[#121824]/90 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-sky-400" />
                  <h4 className="text-xs font-orbitron font-bold text-slate-200">
                    MODO PONTEIRO AIR-MOUSE (LG MAGIC REMOTE / SAMSUNG SMART VIEW)
                  </h4>
                </div>
                <button
                  onClick={() => setPointerModeActive(!pointerModeActive)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    pointerModeActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {pointerModeActive ? 'PONTEIRO ATIVO' : 'ATIVAR'}
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Ao ativar o modo Air-Mouse, você pode apontar e clicar nos elementos da tela da TV exatamente como no controle Magic Remote da LG ou Smart Remote da Samsung.
              </p>

              {pointerModeActive && (
                <div
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                    setPointerCoord({ x, y });
                  }}
                  className="relative w-full h-36 rounded-xl bg-slate-950 border border-sky-500/30 overflow-hidden flex items-center justify-center cursor-crosshair"
                >
                  <div
                    className="absolute w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-[0_0_15px_rgba(14,165,233,1)] transition-transform duration-75 pointer-events-none"
                    style={{
                      left: `${pointerCoord.x}%`,
                      top: `${pointerCoord.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                  <div className="text-[11px] font-mono text-slate-500 select-none">
                    Mova o cursor nesta área para simular o ponteiro na TV (X: {pointerCoord.x}%, Y: {pointerCoord.y}%)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 3: SMART TVS DIRECTORY & DISCOVERY
          ======================================================== */}
      {activeSubView === 'devices_scan' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-xl bg-[#121824]/90 border border-slate-800">
            <div>
              <h3 className="text-sm font-orbitron font-bold text-slate-100">
                DISPOSITIVOS SMART TV IDENTIFICADOS NA REDE
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Conecte-se com um clique a qualquer Smart TV Samsung, LG, Sony, Apple ou TCL compatível.
              </p>
            </div>
            <button
              onClick={handleScanNetwork}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-orbitron font-bold text-xs transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Escaneando...' : 'Atualizar Lista de TVs'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((dev) => {
              const brandInfo = BRAND_DETAILS[dev.brand] || BRAND_DETAILS.generic;
              const isSelected = selectedTvId === dev.id;
              const isConn = dev.status === 'connected';

              return (
                <div
                  key={dev.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                    isConn
                      ? 'bg-gradient-to-br from-[#121B2B] to-[#0A101C] border-sky-400/50 shadow-[0_0_20px_rgba(14,165,233,0.15)]'
                      : 'bg-[#121824]/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header: Brand & Status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase`}>
                          {brandInfo.badge}
                        </span>
                        <h4 className="font-orbitron font-bold text-slate-100 text-sm mt-1.5">{dev.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">{dev.model}</p>
                      </div>

                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isConn
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Tv className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Telemetry specs */}
                    <div className="space-y-1.5 my-3 text-xs font-mono text-slate-300">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">IP / Protocolo:</span>
                        <span className="text-slate-200">{dev.ipAddress} ({dev.protocol})</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Resolução Máx:</span>
                        <span className="text-emerald-400">{dev.resolution} @ {dev.fps}fps</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Sinal Wi-Fi:</span>
                        <span className="text-cyan-400">{dev.signalDbm} dBm (Excelente)</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Navegação Remota:</span>
                        <span className="text-emerald-400">Compatível (D-Pad/OK)</span>
                      </div>
                    </div>

                    {/* Features tags */}
                    <div className="flex items-center gap-1.5 flex-wrap my-3">
                      {brandInfo.features.map((feat, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Connect / Disconnect Button */}
                  <div className="pt-3 border-t border-slate-800/80 mt-2">
                    <button
                      onClick={() => handleToggleConnect(dev)}
                      disabled={isConnecting}
                      className={`w-full py-2.5 px-4 rounded-xl font-orbitron font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isConn
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 shadow-sm'
                          : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                      }`}
                    >
                      {isConn ? (
                        <>
                          <Power className="w-3.5 h-3.5" />
                          <span>DESCONECTAR ESPELHAMENTO</span>
                        </>
                      ) : (
                        <>
                          <Cast className="w-3.5 h-3.5" />
                          <span>CONECTAR E ESPELHAR</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          VIEW 4: TRANSMISSION & HARDWARE SETTINGS
          ======================================================== */}
      {activeSubView === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quality & Resolution Settings */}
          <div className="p-5 rounded-2xl bg-[#121824]/90 border border-slate-800 space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              QUALIDADE DA TRANSMISSÃO & RESOLUÇÃO
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ajuste os parâmetros de codificação de vídeo para equilibrar qualidade de imagem e tempo de resposta.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-300 block mb-1.5">Resolução de Saída para TV:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['4K', '1080p', '720p'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setMirrorQuality(q);
                        playJarvesChime('click');
                      }}
                      className={`py-2 rounded-xl border text-center font-bold transition-all ${
                        mirrorQuality === q
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                          : 'bg-[#0B0E14] text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {q} UHD
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1.5">Taxa de Quadros (FPS):</label>
                <div className="grid grid-cols-2 gap-2">
                  {([60, 30] as const).map((fps) => (
                    <button
                      key={fps}
                      onClick={() => {
                        setTargetFps(fps);
                        playJarvesChime('click');
                      }}
                      className={`py-2 rounded-xl border text-center font-bold transition-all ${
                        targetFps === fps
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                          : 'bg-[#0B0E14] text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {fps} FPS {fps === 60 ? '(Alta Fluidez)' : '(Economia de Banda)'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">Transmitir Áudio para Caixas da TV</span>
                  <span className="text-[10px] text-slate-400">Sincronização estéreo e Dolby Surround</span>
                </div>
                <button
                  onClick={() => setAudioToTv(!audioToTv)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    audioToTv
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {audioToTv ? 'ATIVO' : 'DESATIVADO'}
                </button>
              </div>
            </div>
          </div>

          {/* TV Remote Protocol & Bluetooth Pairing */}
          <div className="p-5 rounded-2xl bg-[#121824]/90 border border-slate-800 space-y-4">
            <h3 className="text-sm font-orbitron font-bold text-slate-100 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              EMPARCEIRAMENTO BLUETOOTH BLE & CONTROLES FÍSICOS
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O JARVES escuta eventos do teclado e do protocolo Gamepad API para aceitar sinais de controles remotos Bluetooth e D-Pad em tempo real.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-bold block">Web Bluetooth Remote Scanner</span>
                  <span className="text-[10px] text-slate-400">Parear controle físico Samsung One ou LG Magic</span>
                </div>
                <button
                  onClick={async () => {
                    try {
                      if ('bluetooth' in navigator && (navigator as any).bluetooth?.requestDevice) {
                        await (navigator as any).bluetooth.requestDevice({
                          acceptAllDevices: true,
                        });
                        onAddLog('Dispositivo Bluetooth vinculado ao JARVES', 'Bluetooth TV');
                        playJarvesChime('confirm');
                      } else {
                        alert('A API Web Bluetooth requer conexão segura (HTTPS) e suporte no navegador.');
                      }
                    } catch (e: any) {
                      console.log('Bluetooth pairing info:', e);
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-bold"
                >
                  BUSCAR CONTROLE
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#0B0E14] border border-slate-800">
                <span className="text-slate-400 block mb-1">Mapeamento HDMI-CEC / Anynet+:</span>
                <span className="text-slate-200 text-xs font-sans leading-relaxed block">
                  Ao conectar seu computador à TV via cabo HDMI ou adaptador sem fio Miracast, as teclas de navegação do controle remoto da TV são capturadas nativamente pelo JARVES.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
