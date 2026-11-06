import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Bluetooth,
  Wifi,
  WifiOff,
  Monitor,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Search,
  ExternalLink,
  Code,
  Music,
  Chrome,
  Terminal as TerminalIcon,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Download,
  Maximize2,
  Thermometer,
  Flame,
  Snowflake
} from 'lucide-react';
import { HardwareState } from '../types';

interface DeviceControlPanelProps {
  hardwareState: HardwareState;
  onToggleHardware: (device: keyof HardwareState) => void;
  systemVolume: number;
  onSetVolume: (vol: number) => void;
  systemTemperature?: number;
  onSetTemperature?: (temp: number) => void;
  onExecuteCommand: (cmdType: string, target?: string, val?: string) => void;
  onAddLog: (action: string, device: string, target?: string) => void;
  onInterpretCamera?: () => void;
}

export const DeviceControlPanel: React.FC<DeviceControlPanelProps> = ({
  hardwareState,
  onToggleHardware,
  systemVolume,
  onSetVolume,
  systemTemperature = 22,
  onSetTemperature,
  onExecuteCommand,
  onAddLog,
  onInterpretCamera,
}) => {
  const [isPlayingMedia, setIsPlayingMedia] = useState(false);
  const [webSearchQuery, setWebSearchQuery] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [cameraStreamActive, setCameraStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle actual browser webcam when camera toggle is ON
  useEffect(() => {
    if (hardwareState.camera) {
      navigator.mediaDevices?.getUserMedia?.({ video: true })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setCameraStreamActive(true);
          setCameraError(null);
        })
        .catch((err) => {
          console.log('Camera access in iframe / sandbox simulated:', err.message);
          setCameraStreamActive(false);
          setCameraError('Dispositivo em modo simulação óptica holográfica.');
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraStreamActive(false);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [hardwareState.camera]);

  const handleScreenshot = async () => {
    onExecuteCommand('take_screenshot', 'DisplayCapture');
    try {
      if (navigator.mediaDevices?.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setScreenshotPreview(dataUrl);

        stream.getTracks().forEach(t => t.stop());
        onAddLog('Captura de Tela Realizada', 'Monitor', 'buffer_screenshot.png');
      } else {
        throw new Error('Fallback capture');
      }
    } catch {
      // Create futuristic HUD snapshot mock
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0B0E14';
        ctx.fillRect(0, 0, 800, 450);
        ctx.fillStyle = '#00F0FF';
        ctx.font = '24px Orbitron';
        ctx.fillText('JARVES SYSTEM SNAPSHOT - CAPTURA HUD', 40, 80);
        ctx.fillStyle = '#94A3B8';
        ctx.font = '16px Space Grotesk';
        ctx.fillText(`Timestamp: ${new Date().toLocaleString('pt-BR')}`, 40, 120);
        ctx.fillText(`Usuário: Romildo | Dispositivos: Câmera(${hardwareState.camera ? 'ON' : 'OFF'}) Mic(${hardwareState.microphone ? 'ON' : 'OFF'})`, 40, 150);
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, 740, 390);
        setScreenshotPreview(canvas.toDataURL('image/png'));
      }
      onAddLog('Captura de Tela Realizada (HUD Snapshot)', 'Monitor', 'snapshot_jarves.png');
    }
  };

  const handleWebSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webSearchQuery.trim()) return;
    const url = `https://www.google.com/search?q=${encodeURIComponent(webSearchQuery)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onExecuteCommand('open_tab', url, webSearchQuery);
    onAddLog('Pesquisa Web', 'Navegador', webSearchQuery);
    setWebSearchQuery('');
  };

  const softwareList = [
    { name: 'VSCode', icon: <Code className="w-5 h-5 text-sky-400" />, desc: 'Editor de Código', url: 'https://vscode.dev' },
    { name: 'Spotify', icon: <Music className="w-5 h-5 text-emerald-400" />, desc: 'Streaming de Áudio', url: 'https://open.spotify.com' },
    { name: 'Chrome', icon: <Chrome className="w-5 h-5 text-amber-400" />, desc: 'Navegador Web', url: 'https://google.com' },
    { name: 'Terminal', icon: <TerminalIcon className="w-5 h-5 text-purple-400" />, desc: 'Linha de Comando', local: true },
    { name: 'WhatsApp Web', icon: <MessageCircle className="w-5 h-5 text-emerald-500" />, desc: 'Mensagens Instantâneas', url: 'https://web.whatsapp.com' },
  ];

  return (
    <div className="space-y-6">
      {/* Hardware Peripherals Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-orbitron font-bold text-sm tracking-wider text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF]" />
            CONTROLE DE HARDWARE & PERIFÉRICOS
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Tempo real
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Camera Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              hardwareState.camera
                ? 'bg-[#121824] border-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                : 'bg-[#121824]/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${hardwareState.camera ? 'bg-[#00F0FF]/20 text-[#00F0FF]' : 'bg-slate-800 text-slate-500'}`}>
                {hardwareState.camera ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${hardwareState.camera ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {hardwareState.camera ? 'LIGADA' : 'DESLIGADA'}
              </span>
            </div>
            <div className="font-semibold text-slate-200 text-sm">Câmera Óptica</div>
            <div className="text-[11px] text-slate-400 mb-3">Vídeo & Sensores</div>
            <button
              id="btn-toggle-camera"
              onClick={() => onToggleHardware('camera')}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                hardwareState.camera
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 hover:bg-[#00F0FF]/30'
              }`}
            >
              {hardwareState.camera ? 'Desativar' : 'Ativar Câmera'}
            </button>
          </div>

          {/* Microphone Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              hardwareState.microphone
                ? 'bg-[#121824] border-[#6C5CE7] shadow-[0_0_15px_rgba(108,92,231,0.2)]'
                : 'bg-[#121824]/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${hardwareState.microphone ? 'bg-[#6C5CE7]/20 text-[#6C5CE7]' : 'bg-slate-800 text-slate-500'}`}>
                {hardwareState.microphone ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${hardwareState.microphone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {hardwareState.microphone ? 'LIGADO' : 'MUDO'}
              </span>
            </div>
            <div className="font-semibold text-slate-200 text-sm">Microfone</div>
            <div className="text-[11px] text-slate-400 mb-3">Captura de Áudio</div>
            <button
              id="btn-toggle-mic"
              onClick={() => onToggleHardware('microphone')}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                hardwareState.microphone
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-[#6C5CE7]/20 text-[#6C5CE7] border border-[#6C5CE7]/40 hover:bg-[#6C5CE7]/30'
              }`}
            >
              {hardwareState.microphone ? 'Mutar' : 'Ligar Microfone'}
            </button>
          </div>

          {/* Bluetooth Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              hardwareState.bluetooth
                ? 'bg-[#121824] border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                : 'bg-[#121824]/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${hardwareState.bluetooth ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-500'}`}>
                <Bluetooth className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${hardwareState.bluetooth ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {hardwareState.bluetooth ? 'PAREADO' : 'OFF'}
              </span>
            </div>
            <div className="font-semibold text-slate-200 text-sm">Bluetooth</div>
            <div className="text-[11px] text-slate-400 mb-3">Fones / Periféricos</div>
            <button
              id="btn-toggle-bluetooth"
              onClick={() => onToggleHardware('bluetooth')}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                hardwareState.bluetooth
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-sky-500/20 text-sky-400 border border-sky-500/40 hover:bg-sky-500/30'
              }`}
            >
              {hardwareState.bluetooth ? 'Desconectar' : 'Ativar Bluetooth'}
            </button>
          </div>

          {/* Wi-Fi Card */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              hardwareState.wifi
                ? 'bg-[#121824] border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                : 'bg-[#121824]/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${hardwareState.wifi ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {hardwareState.wifi ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${hardwareState.wifi ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                {hardwareState.wifi ? '5G ONLINE' : 'OFF'}
              </span>
            </div>
            <div className="font-semibold text-slate-200 text-sm">Wi-Fi Rede</div>
            <div className="text-[11px] text-slate-400 mb-3">Banda Larga 1 Gbps</div>
            <button
              id="btn-toggle-wifi"
              onClick={() => onToggleHardware('wifi')}
              className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                hardwareState.wifi
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {hardwareState.wifi ? 'Desconectar' : 'Conectar Wi-Fi'}
            </button>
          </div>
        </div>

        {/* Live Camera View HUD (when camera is on) */}
        {hardwareState.camera && (
          <div className="mt-4 p-3 rounded-xl bg-[#121824] border border-[#00F0FF]/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="font-orbitron text-xs text-[#00F0FF]">
                  TRANSMISSÃO ÓPTICA AO VIVO (HUD CAM)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">1080p @ 60fps</span>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black/80 flex items-center justify-center border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!cameraStreamActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
                  <Camera className="w-12 h-12 text-[#00F0FF]/50 mb-2 animate-pulse" />
                  <span className="text-sm font-semibold text-slate-200">
                    Sensor Óptico Ativo no Sistema
                  </span>
                  <span className="text-xs text-slate-400 mt-1 max-w-sm">
                    {cameraError || 'Canal de streaming seguro sincronizado pelo protocolo JARVES.'}
                  </span>
                </div>
              )}
              {/* Sci-fi crosshair overlays */}
              <div className="absolute inset-0 pointer-events-none border border-[#00F0FF]/20 m-4">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00F0FF]" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#00F0FF]" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#00F0FF]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00F0FF]" />
              </div>
            </div>

            {/* Vision Interpretation Bar */}
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0B0E14] border border-slate-800">
              <span className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
                Canal óptico calibrado para visão computacional do JARVES
              </span>
              {onInterpretCamera && (
                <button
                  id="btn-interpret-camera-hud"
                  onClick={onInterpretCamera}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Interpretar Imagem com JARVES</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* System Commands, Volume HUD & Temperature Control */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Temperature & Thermal Control HUD */}
        <div className="p-4 rounded-xl bg-[#121824]/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-orbitron font-semibold text-xs text-slate-200 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-400" />
                CONTROLE DE TEMPERATURA
              </span>
              <span className="font-mono text-sm font-bold text-amber-400">
                {systemTemperature}°C
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-2">
              Climatização do ambiente & arrefecimento térmico dos nós JARVES.
            </p>

            <input
              id="slider-system-temperature"
              type="range"
              min="16"
              max="32"
              value={systemTemperature}
              onChange={(e) => onSetTemperature?.(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />

            <div className="flex items-center justify-between mt-3 text-xs gap-1">
              <button
                type="button"
                onClick={() => onSetTemperature?.(18)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                  systemTemperature === 18 ? 'bg-cyan-500/20 text-[#00F0FF] border border-[#00F0FF]/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Snowflake className="w-3 h-3 text-cyan-400" />
                18°C
              </button>
              <button
                type="button"
                onClick={() => onSetTemperature?.(21)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                  systemTemperature === 21 ? 'bg-cyan-500/20 text-[#00F0FF] border border-[#00F0FF]/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                21°C
              </button>
              <button
                type="button"
                onClick={() => onSetTemperature?.(24)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                  systemTemperature === 24 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                24°C
              </button>
              <button
                type="button"
                onClick={() => onSetTemperature?.(26)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                  systemTemperature === 26 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-400" />
                26°C
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1 text-[#00F0FF]">
              <Mic className="w-3 h-3" />
              Voz: "Mudar temperatura para 21 graus"
            </span>
          </div>
        </div>

        {/* Volume & Audio Output */}
        <div className="p-4 rounded-xl bg-[#121824]/80 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="font-orbitron font-semibold text-xs text-slate-200 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-[#00F0FF]" />
              VOLUME DO SISTEMA
            </span>
            <span className="font-mono text-sm font-bold text-[#00F0FF]">
              {systemVolume}%
            </span>
          </div>

          <input
            id="slider-system-volume"
            type="range"
            min="0"
            max="100"
            value={systemVolume}
            onChange={(e) => onSetVolume(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
          />

          <div className="flex items-center justify-between mt-3 text-xs">
            <button
              onClick={() => onSetVolume(0)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Mudo (0%)
            </button>
            <button
              onClick={() => onSetVolume(50)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              50%
            </button>
            <button
              onClick={() => onSetVolume(80)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              80%
            </button>
            <button
              onClick={() => onSetVolume(100)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Máximo
            </button>
          </div>

          {/* Media Player Controls */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <span className="text-xs text-slate-400">Controle de Mídia:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onAddLog('Mídia', 'Player', 'Faixa Anterior')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Anterior"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                id="btn-play-pause-media"
                onClick={() => {
                  setIsPlayingMedia(!isPlayingMedia);
                  onAddLog('Mídia', 'Player', isPlayingMedia ? 'Pausado' : 'Reproduzindo');
                }}
                className="p-2 rounded-lg bg-[#00F0FF] hover:bg-[#00F0FF]/80 text-[#0B0E14] font-bold"
                title={isPlayingMedia ? 'Pausar' : 'Reproduzir'}
              >
                {isPlayingMedia ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onAddLog('Mídia', 'Player', 'Próxima Faixa')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Próxima"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Screenshot / Captura de Tela */}
        <div className="p-4 rounded-xl bg-[#121824]/80 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-orbitron font-semibold text-xs text-slate-200 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#6C5CE7]" />
                CAPTURA DE TELA (SCREENSHOT)
              </span>
              <span className="text-[10px] font-mono text-slate-400">Buffer Instantâneo</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Capture a tela ativa do seu computador ou smartphone para análise ótica do JARVES.
            </p>
          </div>

          <div className="space-y-2">
            <button
              id="btn-take-screenshot"
              onClick={handleScreenshot}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6C5CE7] to-[#00F0FF] hover:opacity-90 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Tirar Print de Tela Agora</span>
            </button>

            {screenshotPreview && (
              <div className="mt-2 p-2 rounded-lg bg-[#0B0E14] border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={screenshotPreview} alt="Print" className="w-12 h-8 object-cover rounded border border-slate-700" />
                  <span className="text-[11px] text-slate-300 font-mono">print_screen.png</span>
                </div>
                <a
                  href={screenshotPreview}
                  download="jarves_screenshot.png"
                  className="p-1.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] hover:bg-[#00F0FF]/30 text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Web Navigation Bar */}
      <div className="p-4 rounded-xl bg-[#121824]/80 border border-slate-800">
        <span className="font-orbitron font-semibold text-xs text-slate-200 flex items-center gap-2 mb-2">
          <Search className="w-4 h-4 text-[#00F0FF]" />
          NAVEGAÇÃO WEB & PESQUISA ONLINE
        </span>
        <form onSubmit={handleWebSearch} className="flex gap-2">
          <input
            id="input-web-search"
            type="text"
            value={webSearchQuery}
            onChange={(e) => setWebSearchQuery(e.target.value)}
            placeholder="Digite termo para pesquisar ou abrir URL..."
            className="flex-1 bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF]"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>Pesquisar</span>
          </button>
        </form>
      </div>

      {/* Software Execution Launcher */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-orbitron font-bold text-sm tracking-wider text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6C5CE7]" />
            EXECUÇÃO DE SOFTWARES & APLICATIVOS
          </h3>
          <span className="text-[11px] font-mono text-slate-400">Launchers rápidos</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {softwareList.map((app) => (
            <div
              key={app.name}
              className="p-3.5 rounded-xl bg-[#121824] border border-slate-800 hover:border-[#00F0FF]/50 transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-slate-900 group-hover:bg-[#00F0FF]/10 transition-colors">
                  {app.icon}
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  Pronto
                </span>
              </div>
              <div>
                <div className="font-semibold text-slate-200 text-sm">{app.name}</div>
                <div className="text-[11px] text-slate-400 mb-3">{app.desc}</div>
              </div>
              <button
                id={`btn-launch-${app.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => {
                  if (app.url) window.open(app.url, '_blank', 'noopener,noreferrer');
                  onExecuteCommand('open_app', app.name);
                  onAddLog('Software Iniciado', 'PC', app.name);
                }}
                className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-[#00F0FF]/20 text-slate-300 hover:text-[#00F0FF] border border-slate-700 hover:border-[#00F0FF]/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Executar</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
