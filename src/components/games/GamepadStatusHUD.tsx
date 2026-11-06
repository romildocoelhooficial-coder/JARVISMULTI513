import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Zap,
  HelpCircle,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  pollActiveGamepad,
  formatGamepadName,
  triggerGamepadVibration,
  GamepadInputState
} from './gamepadController';

interface GamepadStatusHUDProps {
  activeGame: 'space' | 'pacman' | 'f1' | 'flight' | 'cavaleiro';
  onSwitchGame?: (game: 'space' | 'pacman' | 'f1' | 'flight' | 'cavaleiro') => void;
}

export const GamepadStatusHUD: React.FC<GamepadStatusHUDProps> = ({ activeGame, onSwitchGame }) => {
  const [gpState, setGpState] = useState<GamepadInputState>(pollActiveGamepad());
  const [showTester, setShowTester] = useState<boolean>(false);
  const [lastVibeNotice, setLastVibeNotice] = useState<string | null>(null);

  // Monitor gamepad connection and input activity
  useEffect(() => {
    let animId: number;

    const checkGamepad = () => {
      const state = pollActiveGamepad();
      setGpState(state);
      animId = requestAnimationFrame(checkGamepad);
    };

    animId = requestAnimationFrame(checkGamepad);

    const handleConnected = () => {
      triggerGamepadVibration(120, 0.4, 0.6);
    };

    window.addEventListener('gamepadconnected', handleConnected);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('gamepadconnected', handleConnected);
    };
  }, []);

  const handleTestVibration = () => {
    triggerGamepadVibration(300, 0.7, 0.9);
    setLastVibeNotice('Vibração dual-motor disparada!');
    setTimeout(() => setLastVibeNotice(null), 2500);
  };

  const isAnyButtonPressed =
    gpState.buttonSouth ||
    gpState.buttonEast ||
    gpState.buttonWest ||
    gpState.buttonNorth ||
    gpState.dpadUp ||
    gpState.dpadDown ||
    gpState.dpadLeft ||
    gpState.dpadRight ||
    gpState.start ||
    gpState.select ||
    gpState.l1 ||
    gpState.r1 ||
    Math.abs(gpState.axes[0]) > 0.3 ||
    Math.abs(gpState.axes[1]) > 0.3;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-[#0C1222] via-[#0E1529] to-[#0A0E1A] border border-cyan-500/30 p-4 shadow-xl transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            gpState.connected
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <Gamepad2 className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-orbitron font-bold text-xs tracking-wider text-slate-100 flex items-center gap-1.5">
                SUPORTE A JOYSTICK / GAMEPAD USB
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold flex items-center gap-1 ${
                gpState.connected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${gpState.connected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {gpState.connected ? 'JOYSTICK CONECTADO E ATIVO' : 'AGUARDANDO JOYSTICK'}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-0.5 font-mono">
              {gpState.connected ? (
                <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  {formatGamepadName(gpState.id)} • Pronto para jogar
                </span>
              ) : (
                <span className="text-slate-400">
                  Conecte seu controle USB (ex: KTS, DualShock, Xbox). <strong className="text-cyan-300">Pressione qualquer botão</strong> para ativar.
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {gpState.connected && (
            <button
              type="button"
              onClick={handleTestVibration}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Testar vibração do controle"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>TESTAR VIBRAÇÃO</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowTester(!showTester)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showTester
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showTester ? 'OCULTAR TESTADOR' : 'MAPA DE CONTROLES'}</span>
            {showTester ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {lastVibeNotice && (
        <div className="mt-2 text-[11px] text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1.5 rounded-xl animate-fade-in flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lastVibeNotice}</span>
        </div>
      )}

      {/* Expandable Gamepad Tester & Interactive Button Visualizer */}
      {showTester && (
        <div className="mt-4 pt-3 border-t border-slate-800 space-y-4 animate-in fade-in duration-200">
          {/* Quick Mapping Summary according to Active Game */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className={`p-3 rounded-xl border transition-all ${
              activeGame === 'flight'
                ? 'bg-sky-950/40 border-sky-400/50 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <div className="font-orbitron font-bold text-sky-400 mb-1 flex items-center gap-1.5">
                <span>✈️ MONOMOTOR DINOS & VEGAS</span>
                {activeGame === 'flight' && <span className="text-[9px] bg-sky-400/20 px-1.5 py-0.5 rounded text-sky-300">JOGO ATIVO</span>}
              </div>
              <ul className="space-y-1 text-[11px] font-mono">
                <li>• <strong>Analógico / D-Pad:</strong> Manche (Subir/Descer/Curvar)</li>
                <li>• <strong>R2 / Botão X (0):</strong> Potência (Throttle Up)</li>
                <li>• <strong>L2 / Botão ▢ (2):</strong> Flaps / Desacelerar</li>
                <li>• <strong>R1 / Botão △ (3):</strong> Boost Turbo WEP</li>
                <li>• <strong>Dual-Rumble:</strong> Elos, rugidos e pouso em Vegas</li>
              </ul>
            </div>

            <div className={`p-3 rounded-xl border transition-all ${
              activeGame === 'f1'
                ? 'bg-red-950/30 border-red-500/40 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <div className="font-orbitron font-bold text-red-400 mb-1 flex items-center gap-1.5">
                <span>🏎️ CORRIDA F1 FERRARI</span>
                {activeGame === 'f1' && <span className="text-[9px] bg-red-400/20 px-1.5 py-0.5 rounded text-red-300">JOGO ATIVO</span>}
              </div>
              <ul className="space-y-1 text-[11px] font-mono">
                <li>• <strong>Analógico / D-Pad (◄ ►):</strong> Esterçar Ferrari</li>
                <li>• <strong>R2 / Botão X / ◯:</strong> Acelerar gradual</li>
                <li>• <strong>L2 / Botão ▢:</strong> Freio / Desacelerar</li>
                <li>• <strong>R1 / Botão △:</strong> Nitro Turbo DRS</li>
                <li>• <strong>Dual-Rumble:</strong> Zebras e batidas</li>
              </ul>
            </div>

            <div className={`p-3 rounded-xl border transition-all ${
              activeGame === 'space'
                ? 'bg-teal-950/30 border-teal-500/40 text-teal-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <div className="font-orbitron font-bold text-teal-400 mb-1 flex items-center gap-1.5">
                <span>🚀 SPACE INVADERS</span>
                {activeGame === 'space' && <span className="text-[9px] bg-teal-400/20 px-1.5 py-0.5 rounded text-teal-300">JOGO ATIVO</span>}
              </div>
              <ul className="space-y-1 text-[11px] font-mono">
                <li>• <strong>Analógico / D-Pad (◄ ►):</strong> Mover nave</li>
                <li>• <strong>Botão X / ◯ / ▢ / R1:</strong> Disparar Lasers</li>
                <li>• <strong>START:</strong> Iniciar / Reiniciar</li>
                <li>• <strong>Dual-Rumble:</strong> Tiros e explosões</li>
              </ul>
            </div>

            <div className={`p-3 rounded-xl border transition-all ${
              activeGame === 'pacman'
                ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <div className="font-orbitron font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                <span>🟡 PAC-MAN NEON</span>
                {activeGame === 'pacman' && <span className="text-[9px] bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-300">JOGO ATIVO</span>}
              </div>
              <ul className="space-y-1 text-[11px] font-mono">
                <li>• <strong>Analógico / D-Pad:</strong> 4 direções</li>
                <li>• <strong>START / Botões Ação:</strong> Iniciar</li>
                <li>• <strong>Dual-Rumble:</strong> Pastilhas e fantasmas</li>
              </ul>
            </div>

            <div className={`p-3 rounded-xl border transition-all ${
              activeGame === 'cavaleiro'
                ? 'bg-red-950/30 border-amber-500/50 text-amber-200'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}>
              <div className="font-orbitron font-bold text-amber-400 mb-1 flex items-center gap-1.5">
                <span>⚔️ CAVALEIRO NEGRO</span>
                {activeGame === 'cavaleiro' && <span className="text-[9px] bg-amber-400/20 px-1.5 py-0.5 rounded text-amber-300">JOGO ATIVO</span>}
              </div>
              <ul className="space-y-1 text-[11px] font-mono">
                <li>• <strong>L1 / L2:</strong> Manete Esquerdo</li>
                <li>• <strong>R1 / R2:</strong> Manete Direito</li>
                <li>• <strong>Botão X / D-Pad Baixo:</strong> Lançar Bola (Plunger)</li>
                <li>• <strong>Triângulo / Círculo:</strong> Defesa Magnética (Magna-Save)</li>
                <li>• <strong>START:</strong> Iniciar Partida / Voz Robótica</li>
                <li>• <strong>Dual-Rumble:</strong> Bumpers, slingshots e flippers</li>
              </ul>
            </div>
          </div>

          {/* Interactive Live Button Visualizer (Reflecting user's KTS controller in the photo!) */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3 pb-2 border-b border-slate-800/80">
              <span className="flex items-center gap-1.5 text-slate-200 font-bold">
                <Radio className={`w-3.5 h-3.5 ${isAnyButtonPressed ? 'text-cyan-400 animate-spin' : 'text-slate-500'}`} />
                MONITOR DE ENTRADA DO CONTROLE EM TEMPO REAL
              </span>
              <span className="text-[11px] text-cyan-400">
                {gpState.connected ? 'Detectando sinais a 60 FPS' : 'Nenhum controle detectado'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-center text-xs font-mono">
              {/* D-Pad */}
              <div className={`p-2 rounded-lg border transition-all ${
                gpState.dpadUp || gpState.axes[1] < -0.3
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">D-PAD / STICK</div>
                <div className="font-bold text-sm">▲ CIMA</div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                gpState.dpadDown || gpState.axes[1] > 0.3
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">D-PAD / STICK</div>
                <div className="font-bold text-sm">▼ BAIXO</div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                gpState.dpadLeft || gpState.axes[0] < -0.3
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">D-PAD / STICK</div>
                <div className="font-bold text-sm">◄ ESQUERDA</div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                gpState.dpadRight || gpState.axes[0] > 0.3
                  ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">D-PAD / STICK</div>
                <div className="font-bold text-sm">► DIREITA</div>
              </div>

              {/* Action Buttons matching KTS style in the user's photo */}
              <div className={`p-2 rounded-lg border transition-all ${
                gpState.buttonSouth
                  ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">BOTÃO 0</div>
                <div className="font-bold text-sm text-cyan-400">✕ (DISPARAR)</div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                gpState.buttonEast
                  ? 'bg-red-500/30 text-red-300 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">BOTÃO 1</div>
                <div className="font-bold text-sm text-red-400">◯ (DISPARAR)</div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                gpState.buttonWest
                  ? 'bg-pink-500/30 text-pink-300 border-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">BOTÃO 2</div>
                <div className="font-bold text-sm text-pink-400">▢ (DISPARAR)</div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                gpState.buttonNorth
                  ? 'bg-teal-500/30 text-teal-300 border-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">BOTÃO 3</div>
                <div className="font-bold text-sm text-teal-400">△ (DISPARAR)</div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                gpState.r1
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">GATILHO R1</div>
                <div className="font-bold text-sm">R1 (TIRO)</div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                gpState.start
                  ? 'bg-purple-500/30 text-purple-300 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">CENTRAL</div>
                <div className="font-bold text-sm text-purple-400">START</div>
              </div>

              <div className={`p-2 rounded-lg border transition-all ${
                gpState.select
                  ? 'bg-purple-500/30 text-purple-300 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}>
                <div className="text-[10px] text-slate-400">CENTRAL</div>
                <div className="font-bold text-sm text-purple-400">SELECT</div>
              </div>

              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400">
                <div className="text-[10px] text-slate-500">ANALÓGICO X/Y</div>
                <div className="font-bold text-[11px] text-slate-300 truncate">
                  X:{gpState.axes[0].toFixed(2)} Y:{gpState.axes[1].toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/60">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Compatível com botão <strong>ANALOG</strong> ligado ou desligado no seu controle KTS.</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Padrão HID Gamepad API nativo do navegador
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
