import React, { useEffect, useState } from 'react';
import { Mic, Square, Volume2, Radio } from 'lucide-react';

interface ListeningIndicatorProps {
  isListening: boolean;
  onStopListening: () => void;
  continuousMode: boolean;
  transcript?: string;
}

export const ListeningIndicator: React.FC<ListeningIndicatorProps> = ({
  isListening,
  onStopListening,
  continuousMode,
  transcript = '',
}) => {
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>([
    25, 45, 60, 30, 80, 50, 95, 40, 70, 35, 85, 45, 60, 30, 75, 40
  ]);

  useEffect(() => {
    if (!isListening) return;

    const interval = setInterval(() => {
      setWaveAmplitudes(prev =>
        prev.map(() => Math.floor(Math.random() * 75) + 20)
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isListening]);

  if (!isListening) return null;

  return (
    <div
      id="listening-indicator-banner"
      className="relative overflow-hidden rounded-xl border border-[#00F0FF]/50 bg-gradient-to-r from-[#0B0E14] via-[#121824] to-[#0B0E14] p-3 shadow-[0_0_25px_rgba(0,240,255,0.25)]"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left: Indicator & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-9 h-9 rounded-full bg-[#00F0FF]/25 animate-ping" />
            <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#00F0FF] text-[#0B0E14] shadow-md">
              <Mic className="h-4 w-4 animate-pulse" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-bold text-sm tracking-wider text-[#00F0FF]">
                OUVINDO...
              </span>
              {continuousMode && (
                <span className="flex items-center gap-1 rounded bg-[#6C5CE7]/30 px-1.5 py-0.5 text-[10px] font-mono uppercase text-[#6C5CE7] border border-[#6C5CE7]/40">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  Modo Contínuo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              {transcript
                ? `"${transcript}"`
                : 'Fale um comando (ex: "Ligar câmera", "Enviar WhatsApp para Romildo", "Abrir VSCode")...'}
            </p>
          </div>
        </div>

        {/* Center: Audio Waveform Equalizer */}
        <div className="flex items-center gap-1 h-8 px-3 py-1 bg-black/40 rounded-lg border border-[#00F0FF]/20">
          {waveAmplitudes.map((amp, idx) => (
            <div
              key={idx}
              className="w-1 rounded-full bg-gradient-to-t from-[#6C5CE7] to-[#00F0FF] transition-all duration-100"
              style={{ height: `${amp}%` }}
            />
          ))}
        </div>

        {/* Right: Stop Action */}
        <button
          id="btn-stop-listening"
          onClick={onStopListening}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium transition-all"
        >
          <Square className="w-3 h-3 fill-rose-400" />
          <span>Interromper</span>
        </button>
      </div>
    </div>
  );
};
