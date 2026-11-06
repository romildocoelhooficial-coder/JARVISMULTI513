import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Gamepad2,
  Trophy,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Rocket,
  CircleDot,
  Award,
  Flame,
  Info,
  Layers,
  Car,
  Flag,
  Plane,
  Shield,
  Maximize2,
  Minimize2,
  Swords,
  Crown,
  X
} from 'lucide-react';
import { SpaceInvadersGame } from './games/SpaceInvadersGame';
import { PacmanGame } from './games/PacmanGame';
import { F1FerrariGame } from './games/F1FerrariGame';
import { DinoFlightGame } from './games/DinoFlightGame';
import { CavaleiroNegroPinballGame } from './games/CavaleiroNegroPinballGame';
import { MedievalChessGame } from './games/chess/MedievalChessGame';
import { GamepadStatusHUD } from './games/GamepadStatusHUD';
import { ArcadePodiumRanking } from './games/ArcadePodiumRanking';
import { UserAccount } from '../types';

interface GamesHubProps {
  currentUser: UserAccount;
  onAddLog: (action: string, category: string, details?: string) => void;
  onSaveSystem?: () => void;
  users?: UserAccount[];
  initialActiveGame?: 'space' | 'pacman' | 'f1' | 'flight' | 'cavaleiro' | 'chess';
  initialOnlineChessRoom?: {
    roomId: string;
    opponent: { id: string; name: string };
    playerColor: 'w' | 'b';
  } | null;
  onClearInitialChessRoom?: () => void;
}

export const GamesHub: React.FC<GamesHubProps> = ({
  currentUser,
  onAddLog,
  users = [],
  initialActiveGame = 'chess',
  initialOnlineChessRoom = null,
  onClearInitialChessRoom,
}) => {
  const [selectedGame, setSelectedGame] = useState<'space' | 'pacman' | 'f1' | 'flight' | 'cavaleiro' | 'chess'>(initialActiveGame);

  useEffect(() => {
    if (initialOnlineChessRoom) {
      setSelectedGame('chess');
    }
  }, [initialOnlineChessRoom]);
  const [spaceScore, setSpaceScore] = useState<number>(0);
  const [pacmanScore, setPacmanScore] = useState<number>(0);
  const [f1Score, setF1Score] = useState<number>(0);
  const [flightScore, setFlightScore] = useState<number>(0);
  const [cavaleiroScore, setCavaleiroScore] = useState<number>(0);

  // Full Screen State & Ref
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const gameContainerRef = useRef<HTMLDivElement | null>(null);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      onAddLog('Modo Tela Cheia Ativado', 'Arcade Games', `Jogo: ${selectedGame}`);
      try {
        if (gameContainerRef.current) {
          if (gameContainerRef.current.requestFullscreen) {
            gameContainerRef.current.requestFullscreen().catch(() => {});
          } else if ((gameContainerRef.current as any).webkitRequestFullscreen) {
            (gameContainerRef.current as any).webkitRequestFullscreen();
          }
        }
      } catch (e) {}
    } else {
      setIsFullscreen(false);
      onAddLog('Modo Tela Cheia Desativado', 'Arcade Games');
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitFullscreenElement) {
          (document as any).webkitExitFullscreen();
        }
      } catch (e) {}
    }
  }, [isFullscreen, onAddLog, selectedGame]);

  useEffect(() => {
    const handleFsChange = () => {
      const isNativeFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const handleCavaleiroScore = useCallback((score: number) => {
    setCavaleiroScore(score);
    if (score > 10000 && score % 10000 === 0) {
      onAddLog('Novo Recorde em Cavaleiro Negro Pinball', 'Arcade Games', `Pontuação: ${score.toLocaleString('pt-BR')}`);
    }
  }, [onAddLog]);

  const handleCavaleiroGameOver = useCallback((finalScore: number) => {
    onAddLog('⚔️ Partida Finalizada no Cavaleiro Negro Pinball', 'Cavaleiro Negro Taito', `Pontos: ${finalScore.toLocaleString('pt-BR')}`);
  }, [onAddLog]);

  const handleSpaceScore = useCallback((score: number) => {
    setSpaceScore(score);
    if (score > 1000 && score % 1000 === 0) {
      onAddLog('Novo Recorde em Space Invaders', 'Arcade Games', `Pontuação: ${score}`);
    }
  }, [onAddLog]);

  const handlePacmanScore = useCallback((score: number) => {
    setPacmanScore(score);
    if (score > 1000 && score % 1000 === 0) {
      onAddLog('Novo Recorde em Pac-Man', 'Arcade Games', `Pontuação: ${score}`);
    }
  }, [onAddLog]);

  const handleF1Score = useCallback((score: number) => {
    setF1Score(score);
    if (score > 2000 && score % 2000 === 0) {
      onAddLog('Novo Recorde em Corrida F1 Ferrari', 'Arcade Games', `Pontuação: ${score}`);
    }
  }, [onAddLog]);

  const handleF1Finish = useCallback((timeSeconds: number, topSpeedKmh: number) => {
    onAddLog('🏁 Linha de Chegada Atingida na F1!', 'Corrida F1 Ferrari', `Tempo: ${timeSeconds.toFixed(2)}s | Vel. Máx: ${topSpeedKmh} km/h`);
  }, [onAddLog]);

  const handleFlightScore = useCallback((score: number) => {
    setFlightScore(score);
    if (score > 2000 && score % 2000 === 0) {
      onAddLog('Novo Recorde no Voo Monomotor', 'Arcade Games', `Pontuação: ${score}`);
    }
  }, [onAddLog]);

  const handleFlightFinish = useCallback((stats: { timeSeconds: number; ringsCollected: number; finalScore: number }) => {
    onAddLog('✈️ Pouso em Las Vegas Concluído!', 'Monomotor Dinos & Vegas', `Tempo: ${stats.timeSeconds.toFixed(1)}s | Elos: ${stats.ringsCollected}/20 | Pontos: ${stats.finalScore}`);
  }, [onAddLog]);

  return (
    <div id="games-hub-panel" className="space-y-6 animate-in fade-in duration-300">
      {/* Arcade Station Master Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0C1222] via-[#16112C] to-[#0D101C] border border-fuchsia-500/30 p-6 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-40 bottom-0 w-48 h-48 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400 shadow-[0_0_25px_rgba(217,70,239,0.35)]">
              <Gamepad2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-orbitron font-bold text-slate-100 tracking-wide">
                  JOGOS & ARCADE RETRO 80s
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 animate-pulse">
                  JARVES ARCADE STATION
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Simulador de voo com avião monomotor branco e vermelho sobre o Vale dos Dinossauros até Las Vegas, Corrida F1 com a Ferrari Vermelha e clássicos arcade dos anos 80, com áudio sintetizado original (Web Audio API), suporte nativo a joystick USB/Bluetooth e controles responsivos.
              </p>
            </div>
          </div>

          {/* Quick Game Switcher Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 w-full lg:w-auto flex-wrap">
            <button
              onClick={() => {
                setSelectedGame('chess');
                onAddLog('Jogo Aberto: Xadrez Medieval (3D e Cenital)', 'Arcade');
              }}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs transition-all ${
                selectedGame === 'chess'
                  ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse'
                  : 'text-[#E5C38F] hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>♟️ XADREZ MEDIEVAL</span>
            </button>

            <button
              onClick={() => {
                setSelectedGame('cavaleiro');
                onAddLog('Jogo Aberto: Cavaleiro Negro Pinball (Taito 1980s)', 'Arcade');
              }}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs transition-all ${
                selectedGame === 'cavaleiro'
                  ? 'bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse'
                  : 'text-amber-400 hover:text-amber-200 hover:bg-slate-800/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>⚔️ CAVALEIRO NEGRO</span>
            </button>

            <button
              onClick={() => {
                setSelectedGame('flight');
                onAddLog('Jogo Aberto: Monomotor Dinos & Vegas', 'Arcade');
              }}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs transition-all ${
                selectedGame === 'flight'
                  ? 'bg-gradient-to-r from-sky-500 via-blue-500 to-amber-400 text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Plane className="w-4 h-4" />
              <span>MONOMOTOR DINOS & VEGAS</span>
            </button>

            <button
              onClick={() => {
                setSelectedGame('f1');
                onAddLog('Jogo Aberto: Corrida F1 Ferrari', 'Arcade');
              }}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs transition-all ${
                selectedGame === 'f1'
                  ? 'bg-gradient-to-r from-red-600 via-red-500 to-amber-500 text-slate-950 shadow-[0_0_20px_rgba(225,6,0,0.5)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>CORRIDA F1 FERRARI</span>
            </button>

            <button
              onClick={() => {
                setSelectedGame('space');
                onAddLog('Jogo Aberto: Space Invaders', 'Arcade');
              }}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs transition-all ${
                selectedGame === 'space'
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(20,184,166,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Rocket className="w-4 h-4" />
              <span>SPACE INVADERS</span>
            </button>

            <button
              onClick={() => {
                setSelectedGame('pacman');
                onAddLog('Jogo Aberto: Pac-Man', 'Arcade');
              }}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs transition-all ${
                selectedGame === 'pacman'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CircleDot className="w-4 h-4" />
              <span>PAC-MAN NEON</span>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('arcade-podium-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-orbitron font-bold text-xs text-amber-300 bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"
              title="Acessar Podium e Ranking dos 5 Primeiros Colocados"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>PODIUM TOP 5</span>
            </button>

            {/* Universal Fullscreen Toggle for All Games */}
            <button
              onClick={toggleFullscreen}
              className={`flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-orbitron font-bold text-xs transition-all cursor-pointer ${
                isFullscreen
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 hover:bg-rose-500/35 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                  : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
              }`}
              title={isFullscreen ? 'Sair da Tela Cheia (ESC)' : 'Ativar Modo Tela Cheia (Full Screen) para qualquer jogo'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-rose-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
              <span>{isFullscreen ? 'SAIR TELA CHEIA' : 'TELA CHEIA'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Gamepad / Joystick Controller HUD */}
      <GamepadStatusHUD activeGame={selectedGame} onSwitchGame={setSelectedGame} />

      {/* Game Stage Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Main Game Screen (3 cols) or Fullscreen Master Stage */}
        <div
          ref={gameContainerRef}
          className={
            isFullscreen
              ? 'fixed inset-0 z-50 bg-[#07040A]/98 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto flex flex-col items-center justify-start'
              : 'lg:col-span-3'
          }
        >
          {/* Floating Fullscreen Header & Game Switcher Toolbar */}
          {isFullscreen && (
            <div className="w-full max-w-5xl mb-3 flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-[#0F1424]/90 border border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.2)]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-orbitron font-bold text-xs sm:text-sm text-cyan-300 tracking-wider">
                  MODO TELA CHEIA ATIVO: {selectedGame === 'cavaleiro' ? '⚔️ CAVALEIRO NEGRO' : selectedGame === 'flight' ? '✈️ MONOMOTOR' : selectedGame === 'f1' ? '🏎️ F1 FERRARI' : selectedGame === 'space' ? '🚀 SPACE INVADERS' : '🟡 PAC-MAN'}
                </span>
              </div>

              {/* In-Fullscreen Quick Game Switcher */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedGame('chess')}
                  className={`px-2.5 py-1 rounded-lg font-orbitron font-bold text-[10px] transition ${
                    selectedGame === 'chess' ? 'bg-amber-600 text-amber-100 shadow' : 'text-slate-400 hover:text-white bg-slate-800/80'
                  }`}
                >
                  ♟️ Xadrez
                </button>
                <button
                  onClick={() => setSelectedGame('cavaleiro')}
                  className={`px-2.5 py-1 rounded-lg font-orbitron font-bold text-[10px] transition ${
                    selectedGame === 'cavaleiro' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-800/80'
                  }`}
                >
                  ⚔️ Cavaleiro
                </button>
                <button
                  onClick={() => setSelectedGame('flight')}
                  className={`px-2.5 py-1 rounded-lg font-orbitron font-bold text-[10px] transition ${
                    selectedGame === 'flight' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-800/80'
                  }`}
                >
                  ✈️ Avião
                </button>
                <button
                  onClick={() => setSelectedGame('f1')}
                  className={`px-2.5 py-1 rounded-lg font-orbitron font-bold text-[10px] transition ${
                    selectedGame === 'f1' ? 'bg-red-600 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-800/80'
                  }`}
                >
                  🏎️ F1
                </button>
                <button
                  onClick={() => setSelectedGame('space')}
                  className={`px-2.5 py-1 rounded-lg font-orbitron font-bold text-[10px] transition ${
                    selectedGame === 'space' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-800/80'
                  }`}
                >
                  🚀 Space
                </button>
                <button
                  onClick={() => setSelectedGame('pacman')}
                  className={`px-2.5 py-1 rounded-lg font-orbitron font-bold text-[10px] transition ${
                    selectedGame === 'pacman' ? 'bg-yellow-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white bg-slate-800/80'
                  }`}
                >
                  🟡 Pac-Man
                </button>

                {/* Exit Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 text-xs font-orbitron font-bold transition cursor-pointer"
                  title="Sair da Tela Cheia (Tecla ESC)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>SAIR TELA CHEIA (ESC)</span>
                </button>
              </div>
            </div>
          )}

          {/* Normal Mode Stage Header with Fullscreen Trigger */}
          {!isFullscreen && (
            <div className="flex items-center justify-between px-3 py-2 mb-3 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-200 font-orbitron text-[11px] font-bold">
                  {selectedGame === 'chess' && '♟️ XADREZ CLÁSSICO & MEDIEVAL (3D CATEDRAL & CENITAL)'}
                  {selectedGame === 'cavaleiro' && '⚔️ CAVALEIRO NEGRO PINBALL (TAITO 1980)'}
                  {selectedGame === 'flight' && '✈️ MONOMOTOR DINOS & VEGAS 3D'}
                  {selectedGame === 'f1' && '🏎️ CORRIDA F1 FERRARI VERMELHA'}
                  {selectedGame === 'space' && '🚀 SPACE INVADERS CLÁSSICO'}
                  {selectedGame === 'pacman' && '🟡 PAC-MAN NEON ARCADE'}
                </span>
              </span>
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-orbitron font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                title="Jogar este jogo em Tela Cheia (Full Screen)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>TELA CHEIA FULL SCREEN</span>
              </button>
            </div>
          )}

          <div className="w-full">
            {selectedGame === 'chess' && (
              <MedievalChessGame
                currentUser={currentUser}
                onAddLog={onAddLog}
                onToggleFullscreen={toggleFullscreen}
                isFullscreen={isFullscreen}
                users={users}
                initialOnlineRoom={initialOnlineChessRoom}
                onClearInitialOnlineRoom={onClearInitialChessRoom}
              />
            )}
            {selectedGame === 'cavaleiro' && (
              <CavaleiroNegroPinballGame
                onScoreUpdate={handleCavaleiroScore}
                onGameOver={handleCavaleiroGameOver}
                onToggleFullscreen={toggleFullscreen}
                isFullscreen={isFullscreen}
              />
            )}
            {selectedGame === 'flight' && (
              <DinoFlightGame onScoreUpdate={handleFlightScore} onMissionFinish={handleFlightFinish} />
            )}
            {selectedGame === 'f1' && (
              <F1FerrariGame onScoreUpdate={handleF1Score} onRaceFinish={handleF1Finish} />
            )}
            {selectedGame === 'space' && (
              <SpaceInvadersGame onScoreUpdate={handleSpaceScore} />
            )}
            {selectedGame === 'pacman' && (
              <PacmanGame onScoreUpdate={handlePacmanScore} />
            )}
          </div>
        </div>

        {/* Sidebar Arcade Info & Hall of Fame (1 col) */}
        <div className="space-y-4">
          {/* Quick Hall of Fame / Podium Top 5 Sidebar Card */}
          <div className="rounded-2xl bg-gradient-to-br from-[#090D18] to-[#120E1F] border border-amber-500/30 p-4 shadow-xl">
            <div className="flex items-center justify-between text-xs font-orbitron font-bold text-amber-400 mb-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>PODIUM TOP 5</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                1º AO 5º
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
              O recordista pode gravar seu nome ao lado do ranking geral até o quinto 5 colocado.
            </p>
            <button
              onClick={() => {
                const el = document.getElementById('arcade-podium-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-orbitron font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>VER PODIUM & RECORDISTAS</span>
            </button>
          </div>

          {/* Active Game Info Card */}
          <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-cyan-400 mb-3 pb-2 border-b border-slate-800">
              <Info className="w-4 h-4" />
              <span>SOBRE O JOGO ATUAL</span>
            </div>

            {selectedGame === 'chess' ? (
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-amber-400 font-mono">Xadrez Medieval Gótico:</strong> Jogo clássico em tabuleiro esculpido em carvalho antigo com guarnições de ferro forjado e peças maciças de prata polida e bronze oxidado.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1.5 text-[11px]">
                  <div className="text-amber-300 font-bold flex items-center justify-between">
                    <span>Recursos Especiais:</span>
                    <span className="text-[10px] text-amber-400">2 Ângulos & IA</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400">&bull; 2 Pontos de Vista:</span>
                    <span className="font-mono text-slate-300">3D Catedral e Cenital Plana</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Movimentação Tátil:</span>
                    <span className="font-mono text-slate-300">Arrastar & Soltar ou Clique</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400">&bull; Modo Multijogador:</span>
                    <span className="font-mono text-slate-300">Convite para Usuários Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400">&bull; Motor JARVES IA:</span>
                    <span className="font-mono text-slate-300">Minimax com Poda Alpha-Beta</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-rose-400 font-bold">⚠️ Alertas em Voz:</span>
                    <span className="font-mono font-bold text-rose-300">Avisos de Xeque e Xeque-Mate</span>
                  </div>
                </div>
              </div>
            ) : selectedGame === 'cavaleiro' ? (
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-amber-400 font-mono">Cavaleiro Negro (Taito do Brasil / 1980):</strong> Clássico absoluto dos fliperamas dos anos 80. O jogo se apresenta com a lendária voz robótica sintetizada:
                </p>
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] italic text-center">
                  &ldquo;Eu sou o cavaleiro negro a procura de um desafio!&rdquo;
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1.5 text-[11px]">
                  <div className="text-amber-300 font-bold flex items-center justify-between">
                    <span>Mecânicas da Máquina:</span>
                    <span className="text-[10px] text-amber-400">Taito • 3 Bolas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-400">&bull; Manetes (Flippers):</span>
                    <span className="font-mono text-slate-300">Esquerda [A/←] e Direita [D/→]</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Lançamento da Bola:</span>
                    <span className="font-mono text-slate-300">Mola / Plunger [Espaço/↓]</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400">&bull; Defesa Magnética:</span>
                    <span className="font-mono text-slate-300">Magna-Save [M / Shift / Y]</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400">&bull; Rampa Elevada:</span>
                    <span className="font-mono text-slate-300">+2.500 pts no 2º Andar</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400">&bull; Alvos da Espada:</span>
                    <span className="font-mono text-slate-300">Multiplicadores 2X, 3X, 4X, 5X</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-amber-300 font-bold">🦁 Leões & Bumpers:</span>
                    <span className="font-mono font-bold text-amber-300">500 pts por rebatida</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  ⚡ <strong>Controles Fidedignos:</strong> Use o teclado, botões de toque na tela ou os botões L1/L2 e R1/R2 do seu controle USB/Bluetooth com resposta instantânea e sons mecânicos de solenóide!
                </p>
              </div>
            ) : selectedGame === 'flight' ? (
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-sky-400 font-mono">Monomotor • Vale dos Dinossauros a Las Vegas:</strong> Voe com um clássico avião monomotor branco e vermelho em uma expedição aérea épica.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-sky-500/20 space-y-1.5 text-[11px]">
                  <div className="text-amber-300 font-bold flex items-center justify-between">
                    <span>Missão de Voo:</span>
                    <span className="text-[10px] text-sky-400">Pista 09L ✈️ Vegas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-400">&bull; Aeronave:</span>
                    <span className="font-mono text-slate-300">Monomotor Branco & Vermelho</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400">&bull; Vale dos Dinos:</span>
                    <span className="font-mono text-slate-300">Pterodáctilos, Braquiossauros & T-Rex</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Elos de Marcação:</span>
                    <span className="font-mono text-slate-300">20 Anéis Aéreos (+10s comb. & Combo)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400">&bull; Destino:</span>
                    <span className="font-mono text-slate-300">Aeroporto de Las Vegas (McCarran)</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-amber-300 font-bold">🎰 Las Vegas Strip:</span>
                    <span className="font-mono font-bold text-sky-300">Sphere, Luxor & Pouso Seguro</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  ⚡ <strong>Manche Analógico:</strong> Puxe para subir altitude, empurre para descer e incline as asas para curvar suavemente. Acelere com R2 e desacelere para o pouso com L2!
                </p>
              </div>
            ) : selectedGame === 'f1' ? (
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-red-400 font-mono">Corrida F1 • Ferrari Monza Grand Prix:</strong> Você pilota a icônica Ferrari Rosso Corsa V12 em alta velocidade pelo Autódromo de Monza.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-red-500/20 space-y-1.5 text-[11px]">
                  <div className="text-amber-300 font-bold flex items-center justify-between">
                    <span>Missão do Piloto:</span>
                    <span className="text-[10px] text-red-400">330+ km/h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-red-400">&bull; Ferrari Passeio:</span>
                    <span className="font-mono text-slate-300">Motor V12 Rosso Corsa</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Turbo DRS:</span>
                    <span className="font-mono text-slate-300">Espaço ou R1 no joystick</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400">&bull; Obstáculos:</span>
                    <span className="font-mono text-slate-300">Óleo, Cones e Carros Rivais</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400">&bull; 3 Checkpoints:</span>
                    <span className="font-mono text-slate-300">+15s de tempo bônus</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-amber-300 font-bold">🏁 Linha de Chegada:</span>
                    <span className="font-mono font-bold text-emerald-400">Troféu de Ouro</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  ⚡ <strong>Volante Analógico:</strong> O controle KTS/USB oferece resposta precisa e proporcional, com feedback tátil de vibração nas zebras e curvas!
                </p>
              </div>
            ) : selectedGame === 'space' ? (
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-teal-400 font-mono">Space Invaders (1978):</strong> Criado por Tomohiro Nishikado. Você pilota uma nave de ataque defendendo a Terra contra frotas de naves invasoras alienígenas.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-teal-500/20 space-y-1 text-[11px]">
                  <div className="text-teal-300 font-bold">Tabela de Pontos:</div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Nave Mãe (UFO):</span>
                    <span className="font-mono font-bold text-amber-400">100 a 300 pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Saucer Dourado:</span>
                    <span className="font-mono font-bold text-amber-400">40 pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Polvo Cyan:</span>
                    <span className="font-mono font-bold text-amber-400">25 pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Invasor Amarelo:</span>
                    <span className="font-mono font-bold text-amber-400">20 pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Arrowhead Vermelho:</span>
                    <span className="font-mono font-bold text-amber-400">10 pts</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  ⚡ <strong>Marcha acelerada:</strong> Quanto menos naves invasoras restarem, mais rápido elas marcharão e mais intenso fica o som descendente de 4 tons!
                </p>
              </div>
            ) : (
              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>
                  <strong className="text-amber-400 font-mono">Pac-Man (1980):</strong> Criado por Toru Iwatani. Guie o Pac-Man pelo labirinto devorando todas as pastilhas e evitando os 4 fantasmas coloridos.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1 text-[11px]">
                  <div className="text-amber-300 font-bold">Os Fantasmas & Bônus:</div>
                  <div className="flex items-center justify-between">
                    <span className="text-rose-400">&bull; Blinky (Vermelho):</span>
                    <span className="font-mono text-slate-300">Caçador direto</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-pink-400">&bull; Pinky (Rosa):</span>
                    <span className="font-mono text-slate-300">Emboscador</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-400">&bull; Inky (Cyan):</span>
                    <span className="font-mono text-slate-300">Imprevisível</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400">&bull; Clyde (Laranja):</span>
                    <span className="font-mono text-slate-300">Tímido</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <span className="text-red-500 font-bold">🍒 Cerejas Bônus:</span>
                    <span className="font-mono font-bold text-amber-400">+100 pts</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  ⚡ <strong>Pastilha de Força:</strong> Coma as pastilhas grandes piscantes nos cantos para deixar os fantasmas azuis e vulneráveis por alguns segundos!
                </p>
              </div>
            )}
          </div>

          {/* Retro Audio Technology Card */}
          <div className="rounded-2xl bg-[#090D18] border border-slate-800 p-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-emerald-400 mb-2">
              <Zap className="w-4 h-4" />
              <span>SÍNTESE DE ÁUDIO WEB</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              O áudio dos jogos utiliza síntese pura por osciladores eletrônicos (onda quadrada, dente de serra e ruído branco) processados em tempo real pela <strong>Web Audio API</strong> nativa do navegador.
            </p>
            <div className="mt-2 text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              ✓ Sem arquivos de áudio externos<br />
              ✓ Zero latência de disparo<br />
              ✓ Fidedigno ao hardware dos anos 80
            </div>
          </div>

          {/* Gamepad USB Support Card */}
          <div className="rounded-2xl bg-[#090D18] border border-cyan-500/30 p-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-orbitron font-bold text-cyan-400 mb-2">
              <Gamepad2 className="w-4 h-4" />
              <span>JOYSTICK KTS & USB PLUG & PLAY</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              O JARVES Arcade reconhece nativamente controles USB e Bluetooth (KTS, DualShock, Xbox e genéricos) com polling em 60 FPS e feedback háptico dual-rumble.
            </p>
            <div className="mt-2 text-[10px] font-mono text-cyan-300 bg-cyan-950/40 p-2.5 rounded-lg border border-cyan-500/20 space-y-1">
              <div>✓ <strong>Cavaleiro Negro Pinball:</strong> L1/L2 manete esq., R1/R2 manete dir., X/A mola plunger, △/Y magna-save</div>
              <div>✓ <strong>Monomotor Dinos & Vegas:</strong> Manche analógico + R2 potência + L2 flaps + R1 boost WEP</div>
              <div>✓ <strong>Corrida F1 Ferrari:</strong> Volante analógico + R2 acelerar + L2 freio + R1 turbo DRS</div>
              <div>✓ <strong>Space Invaders:</strong> Analógico/D-Pad + Fogo nos botões X/◯/▢/R1</div>
              <div>✓ <strong>Pac-Man:</strong> Analógico/D-Pad com 4 direções suaves</div>
              <div>✓ <strong>START:</strong> Iniciar ou reiniciar partida</div>
              <div>✓ <strong>Vibração Dual-Rumble:</strong> Flippers, molas, bumpers, zebras e rugidos</div>
            </div>
          </div>
        </div>
      </div>

      {/* PODIUM & RANKING TOP 5 (OS 5 PRIMEIROS COLOCADOS - OS DEMAIS NÃO APARECEM) */}
      <div id="arcade-podium-section" className="pt-2">
        <ArcadePodiumRanking
          currentUser={currentUser}
          currentUserName={currentUser?.name || 'Romildo Coelho'}
          currentUserRole={currentUser?.role || 'User'}
          activeGameId={selectedGame}
          latestGameScores={{
            cavaleiro: cavaleiroScore,
            space: spaceScore,
            pacman: pacmanScore,
            f1: f1Score,
            flight: flightScore
          }}
          onLogRecord={(playerName, gameName, score) => {
            onAddLog(`🏆 Novo Recorde Gravado no Podium: ${playerName} (${score} pts em ${gameName})`, 'Arcade Podium');
          }}
        />
      </div>
    </div>
  );
};
