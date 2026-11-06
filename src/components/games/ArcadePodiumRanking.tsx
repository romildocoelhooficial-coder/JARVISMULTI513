import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Crown,
  Award,
  Sparkles,
  Edit3,
  Check,
  X,
  Save,
  PlusCircle,
  Flame,
  Rocket,
  Car,
  Plane,
  CircleDot,
  RotateCcw,
  Zap,
  ShieldCheck,
  Shield,
  Lock,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { retroAudio } from './retroAudio';
import { triggerGamepadVibration } from './gamepadController';
import { UserAccount } from '../../types';

export interface PodiumEntry {
  id: string;
  rank: 1 | 2 | 3 | 4 | 5;
  playerName: string;
  score: number;
  gameId: 'space' | 'pacman' | 'f1' | 'flight' | 'cavaleiro' | 'general';
  gameName: string;
  date: string;
  recordTag?: string;
  userId?: string;
}

interface ArcadePodiumRankingProps {
  currentUser?: UserAccount;
  currentUserName?: string;
  currentUserRole?: 'Admin' | 'User';
  activeGameId?: 'space' | 'pacman' | 'f1' | 'flight' | 'cavaleiro';
  latestGameScores?: {
    space: number;
    pacman: number;
    f1: number;
    flight: number;
    cavaleiro?: number;
  };
  onLogRecord?: (playerName: string, gameName: string, score: number) => void;
}

const STORAGE_KEY = 'JARVES_ARCADE_PODIUM_TOP5_V1';

// Initial seeded records (Top 5 only)
const DEFAULT_RECORDS: Record<string, PodiumEntry[]> = {
  general: [
    {
      id: 'gen-1',
      rank: 1,
      playerName: 'ROMILDO COELHO',
      score: 154800,
      gameId: 'space',
      gameName: 'Space Invaders (Fase 4)',
      date: '24/10/2026',
      recordTag: 'RECORDISTA GERAL'
    },
    {
      id: 'gen-2',
      rank: 2,
      playerName: 'PILOTO MONZA',
      score: 128450,
      gameId: 'f1',
      gameName: 'Corrida F1 Ferrari',
      date: '24/10/2026',
      recordTag: 'VICE-CAMPEÃO'
    },
    {
      id: 'gen-3',
      rank: 3,
      playerName: 'COMANDANTE VEGAS',
      score: 96300,
      gameId: 'flight',
      gameName: 'Monomotor Dinos & Vegas',
      date: '23/10/2026',
      recordTag: '3º COLOCADO'
    },
    {
      id: 'gen-4',
      rank: 4,
      playerName: 'PAC-MASTER 80s',
      score: 72150,
      gameId: 'pacman',
      gameName: 'Pac-Man Neon',
      date: '22/10/2026',
      recordTag: '4º COLOCADO'
    },
    {
      id: 'gen-5',
      rank: 5,
      playerName: 'JARVES CYBER ACE',
      score: 58900,
      gameId: 'space',
      gameName: 'Space Invaders',
      date: '21/10/2026',
      recordTag: '5º COLOCADO'
    }
  ],
  space: [
    {
      id: 'sp-1',
      rank: 1,
      playerName: 'ROMILDO COELHO',
      score: 154800,
      gameId: 'space',
      gameName: 'Space Invaders',
      date: '24/10/2026',
      recordTag: 'CAMPEÃO FASE 4'
    },
    {
      id: 'sp-2',
      rank: 2,
      playerName: 'STAR DEFENDER',
      score: 84200,
      gameId: 'space',
      gameName: 'Space Invaders',
      date: '24/10/2026',
      recordTag: '2º LUGAR'
    },
    {
      id: 'sp-3',
      rank: 3,
      playerName: 'ALIEN HUNTER',
      score: 65100,
      gameId: 'space',
      gameName: 'Space Invaders',
      date: '23/10/2026',
      recordTag: '3º LUGAR'
    },
    {
      id: 'sp-4',
      rank: 4,
      playerName: 'ORBITAL SHIELD',
      score: 48900,
      gameId: 'space',
      gameName: 'Space Invaders',
      date: '22/10/2026',
      recordTag: '4º LUGAR'
    },
    {
      id: 'sp-5',
      rank: 5,
      playerName: 'CYBER PILOT',
      score: 36400,
      gameId: 'space',
      gameName: 'Space Invaders',
      date: '21/10/2026',
      recordTag: '5º LUGAR'
    }
  ],
  f1: [
    {
      id: 'f1-1',
      rank: 1,
      playerName: 'PILOTO MONZA',
      score: 128450,
      gameId: 'f1',
      gameName: 'Corrida F1 Ferrari',
      date: '24/10/2026',
      recordTag: 'POLE POSITION'
    },
    {
      id: 'f1-2',
      rank: 2,
      playerName: 'ROSSO CORSA 12',
      score: 104200,
      gameId: 'f1',
      gameName: 'Corrida F1 Ferrari',
      date: '24/10/2026',
      recordTag: '2º LUGAR'
    },
    {
      id: 'f1-3',
      rank: 3,
      playerName: 'TURBO DRS ACE',
      score: 82500,
      gameId: 'f1',
      gameName: 'Corrida F1 Ferrari',
      date: '23/10/2026',
      recordTag: '3º LUGAR'
    },
    {
      id: 'f1-4',
      rank: 4,
      playerName: 'SCUDERIA FAN',
      score: 63800,
      gameId: 'f1',
      gameName: 'Corrida F1 Ferrari',
      date: '22/10/2026',
      recordTag: '4º LUGAR'
    },
    {
      id: 'f1-5',
      rank: 5,
      playerName: 'GRAND PRIX VIP',
      score: 45000,
      gameId: 'f1',
      gameName: 'Corrida F1 Ferrari',
      date: '21/10/2026',
      recordTag: '5º LUGAR'
    }
  ],
  flight: [
    {
      id: 'fl-1',
      rank: 1,
      playerName: 'COMANDANTE VEGAS',
      score: 96300,
      gameId: 'flight',
      gameName: 'Monomotor Dinos & Vegas',
      date: '23/10/2026',
      recordTag: 'AS DOS CÉUS'
    },
    {
      id: 'fl-2',
      rank: 2,
      playerName: 'DINOSAUR EXPEDITION',
      score: 78500,
      gameId: 'flight',
      gameName: 'Monomotor Dinos & Vegas',
      date: '24/10/2026',
      recordTag: '2º LUGAR'
    },
    {
      id: 'fl-3',
      rank: 3,
      playerName: 'RUNWAY 09L',
      score: 61200,
      gameId: 'flight',
      gameName: 'Monomotor Dinos & Vegas',
      date: '23/10/2026',
      recordTag: '3º LUGAR'
    },
    {
      id: 'fl-4',
      rank: 4,
      playerName: 'SPHERE FLYER',
      score: 47900,
      gameId: 'flight',
      gameName: 'Monomotor Dinos & Vegas',
      date: '22/10/2026',
      recordTag: '4º LUGAR'
    },
    {
      id: 'fl-5',
      rank: 5,
      playerName: 'CANYON GLIDER',
      score: 35100,
      gameId: 'flight',
      gameName: 'Monomotor Dinos & Vegas',
      date: '21/10/2026',
      recordTag: '5º LUGAR'
    }
  ],
  pacman: [
    {
      id: 'pac-1',
      rank: 1,
      playerName: 'PAC-MASTER 80s',
      score: 72150,
      gameId: 'pacman',
      gameName: 'Pac-Man Neon',
      date: '22/10/2026',
      recordTag: 'MESTRE DO LABIRINTO'
    },
    {
      id: 'pac-2',
      rank: 2,
      playerName: 'GHOST BUSTER',
      score: 55400,
      gameId: 'pacman',
      gameName: 'Pac-Man Neon',
      date: '24/10/2026',
      recordTag: '2º LUGAR'
    },
    {
      id: 'pac-3',
      rank: 3,
      playerName: 'CHERRY EATER',
      score: 41800,
      gameId: 'pacman',
      gameName: 'Pac-Man Neon',
      date: '23/10/2026',
      recordTag: '3º LUGAR'
    },
    {
      id: 'pac-4',
      rank: 4,
      playerName: 'POWER PELLET',
      score: 30200,
      gameId: 'pacman',
      gameName: 'Pac-Man Neon',
      date: '22/10/2026',
      recordTag: '4º LUGAR'
    },
    {
      id: 'pac-5',
      rank: 5,
      playerName: 'NEON RUNNER',
      score: 21500,
      gameId: 'pacman',
      gameName: 'Pac-Man Neon',
      date: '21/10/2026',
      recordTag: '5º LUGAR'
    }
  ],
  cavaleiro: [
    {
      id: 'cav-1',
      rank: 1,
      playerName: 'ROMILDO COELHO',
      score: 168200,
      gameId: 'cavaleiro',
      gameName: 'Cavaleiro Negro Pinball',
      date: '24/10/2026',
      recordTag: 'CAMPEÃO TAITO 80s'
    },
    {
      id: 'cav-2',
      rank: 2,
      playerName: 'TAITO FLIPPER PRO',
      score: 134500,
      gameId: 'cavaleiro',
      gameName: 'Cavaleiro Negro Pinball',
      date: '24/10/2026',
      recordTag: 'VICE-CAMPEÃO'
    },
    {
      id: 'cav-3',
      rank: 3,
      playerName: 'DEFESA MAGNÉTICA',
      score: 105400,
      gameId: 'cavaleiro',
      gameName: 'Cavaleiro Negro Pinball',
      date: '23/10/2026',
      recordTag: '3º COLOCADO'
    },
    {
      id: 'cav-4',
      rank: 4,
      playerName: 'BLACK KNIGHT 80',
      score: 88900,
      gameId: 'cavaleiro',
      gameName: 'Cavaleiro Negro Pinball',
      date: '22/10/2026',
      recordTag: '4º COLOCADO'
    },
    {
      id: 'cav-5',
      rank: 5,
      playerName: 'MULTIBALL WIZARD',
      score: 67200,
      gameId: 'cavaleiro',
      gameName: 'Cavaleiro Negro Pinball',
      date: '21/10/2026',
      recordTag: '5º COLOCADO'
    }
  ]
};

export const ArcadePodiumRanking: React.FC<ArcadePodiumRankingProps> = ({
  currentUser,
  currentUserName = 'Romildo Coelho',
  currentUserRole = 'User',
  activeGameId = 'flight',
  latestGameScores,
  onLogRecord
}) => {
  const isAdmin = (currentUserRole || currentUser?.role) === 'Admin';

  const [activeCategory, setActiveCategory] = useState<'general' | 'space' | 'f1' | 'flight' | 'pacman' | 'cavaleiro'>('general');
  const [recordsMap, setRecordsMap] = useState<Record<string, PodiumEntry[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure each category has at most 5 entries
        const validated: Record<string, PodiumEntry[]> = {};
        for (const key of Object.keys(DEFAULT_RECORDS)) {
          if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
            validated[key] = parsed[key].slice(0, 5).map((entry: PodiumEntry, idx: number) => ({
              ...entry,
              rank: (idx + 1) as 1 | 2 | 3 | 4 | 5
            }));
          } else {
            validated[key] = DEFAULT_RECORDS[key];
          }
        }
        return validated;
      }
    } catch (e) {
      console.warn('Erro ao carregar ranking do podium:', e);
    }
    return DEFAULT_RECORDS;
  });

  // Inline editing state for a recordist's name and score (score only editable by admin)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [editingScore, setEditingScore] = useState<number>(0);

  // Modal / Form state to record current player's score into top 5
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>(currentUserName);
  const [newGameChoice, setNewGameChoice] = useState<'space' | 'pacman' | 'f1' | 'flight'>('space');
  const [newScoreValue, setNewScoreValue] = useState<number>(1000);
  const [recordSuccessBanner, setRecordSuccessBanner] = useState<string | null>(null);

  // Sync to localStorage
  const saveRecords = (newMap: Record<string, PodiumEntry[]>) => {
    setRecordsMap(newMap);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMap));
    } catch (e) {
      console.warn('Erro ao salvar ranking:', e);
    }
  };

  // Check if entry belongs to the current user
  const isCurrentUserRecordist = (entry: PodiumEntry): boolean => {
    if (entry.userId && currentUser?.id && entry.userId === currentUser.id) {
      return true;
    }
    const myName = (currentUserName || currentUser?.name || '').trim().toLowerCase();
    const entryName = (entry.playerName || '').trim().toLowerCase();
    if (myName && entryName === myName) return true;
    if (currentUser?.username && entryName === currentUser.username.trim().toLowerCase()) return true;
    return false;
  };

  // Rule: Usuario comum só pode editar o seu próprio record (nome) caso esteja classificado entre os 5 primeiros. Edição total somente o admin.
  const canUserEditRecord = (entry: PodiumEntry): boolean => {
    if (isAdmin) return true;
    const isOwner = isCurrentUserRecordist(entry);
    const isTop5 = entry.rank >= 1 && entry.rank <= 5;
    return isOwner && isTop5;
  };

  // Start inline editing of a recordist's record
  const handleStartEditName = (entry: PodiumEntry) => {
    if (!canUserEditRecord(entry)) {
      setRecordSuccessBanner('⚠️ Acesso restrito: Como usuário comum, você só pode editar o seu próprio recorde classificado no TOP 5.');
      setTimeout(() => setRecordSuccessBanner(null), 4000);
      return;
    }
    setEditingId(entry.id);
    setEditingName(entry.playerName);
    setEditingScore(entry.score);
  };

  // Commit change for a recordist in the podium
  const handleSaveName = (id: string) => {
    if (!editingName.trim()) return;

    const currentList = recordsMap[activeCategory] || [];
    const targetEntry = currentList.find((i) => i.id === id);
    if (!targetEntry || !canUserEditRecord(targetEntry)) {
      setRecordSuccessBanner('⚠️ Permissão negada para editar este registro.');
      setTimeout(() => setRecordSuccessBanner(null), 4000);
      setEditingId(null);
      return;
    }

    const updatedList = currentList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          playerName: editingName.trim().toUpperCase(),
          score: isAdmin && editingScore > 0 ? Number(editingScore) : item.score,
          date: new Date().toLocaleDateString('pt-BR')
        };
      }
      return item;
    });

    if (isAdmin && editingScore > 0) {
      updatedList.sort((a, b) => b.score - a.score);
      updatedList.forEach((item, idx) => {
        item.rank = (idx + 1) as 1 | 2 | 3 | 4 | 5;
      });
    }

    const newMap = {
      ...recordsMap,
      [activeCategory]: updatedList
    };

    saveRecords(newMap);
    setEditingId(null);
    retroAudio.playLaser();
    triggerGamepadVibration(60, 0.4, 0.3);

    setRecordSuccessBanner(isAdmin ? 'Registro atualizado com sucesso (Edição Total Admin)!' : 'Seu nome de recordista foi atualizado no TOP 5!');
    setTimeout(() => setRecordSuccessBanner(null), 4000);

    if (onLogRecord) {
      const entry = updatedList.find((i) => i.id === id);
      if (entry) {
        onLogRecord(entry.playerName, entry.gameName, entry.score);
      }
    }
  };

  // Submit a new record into the Top 5
  const handleRecordNewScore = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPlayerName = isAdmin ? newPlayerName.trim().toUpperCase() : (currentUserName || currentUser?.name || 'JOGADOR').trim().toUpperCase();
    if (!finalPlayerName || newScoreValue <= 0) return;

    const gameNames: Record<string, string> = {
      space: 'Space Invaders',
      f1: 'Corrida F1 Ferrari',
      flight: 'Monomotor Dinos & Vegas',
      pacman: 'Pac-Man Neon',
      cavaleiro: 'Cavaleiro Negro Pinball'
    };

    const targetGameName = gameNames[newGameChoice];
    const newEntry: PodiumEntry = {
      id: `rec-${Date.now()}`,
      rank: 1, // Will be recalculated
      playerName: finalPlayerName,
      userId: currentUser?.id,
      score: Number(newScoreValue),
      gameId: newGameChoice,
      gameName: targetGameName,
      date: new Date().toLocaleDateString('pt-BR'),
      recordTag: 'NOVO RECORDE'
    };

    // Update specific game category
    const specificList = [...(recordsMap[newGameChoice] || [])];
    specificList.push(newEntry);
    specificList.sort((a, b) => b.score - a.score);
    // Strictly top 5 only! Os demais não aparecem
    const top5Specific = specificList.slice(0, 5).map((item, idx) => ({
      ...item,
      rank: (idx + 1) as 1 | 2 | 3 | 4 | 5
    }));

    // Update general category
    const generalList = [...(recordsMap.general || [])];
    generalList.push(newEntry);
    generalList.sort((a, b) => b.score - a.score);
    // Strictly top 5 only!
    const top5General = generalList.slice(0, 5).map((item, idx) => ({
      ...item,
      rank: (idx + 1) as 1 | 2 | 3 | 4 | 5
    }));

    const updatedMap: Record<string, PodiumEntry[]> = {
      ...recordsMap,
      [newGameChoice]: top5Specific,
      general: top5General
    };

    saveRecords(updatedMap);
    setShowRecordModal(false);
    retroAudio.playStartJingle();
    triggerGamepadVibration(200, 0.8, 0.9);

    setRecordSuccessBanner(`🎉 Parabéns, ${newEntry.playerName}! Recorde de ${newEntry.score.toLocaleString('pt-BR')} PTS gravado no TOP 5!`);
    setTimeout(() => setRecordSuccessBanner(null), 5000);

    if (onLogRecord) {
      onLogRecord(newEntry.playerName, targetGameName, newEntry.score);
    }
  };

  // Reset to default top 5 factory records (Admin only)
  const handleResetPodium = () => {
    if (!isAdmin) {
      setRecordSuccessBanner('⚠️ Permissão negada: Apenas o Administrador pode restaurar os recordes de fábrica.');
      setTimeout(() => setRecordSuccessBanner(null), 3000);
      return;
    }
    if (window.confirm('Deseja restaurar as pontuações e recordistas padrão do Podium?')) {
      saveRecords(DEFAULT_RECORDS);
      retroAudio.playExplosion();
      setRecordSuccessBanner('Podium restaurado aos recordes de fábrica pelo Administrador.');
      setTimeout(() => setRecordSuccessBanner(null), 3000);
    }
  };

  const currentRecords = (recordsMap[activeCategory] || []).slice(0, 5);
  const firstPlace = currentRecords.find((r) => r.rank === 1);
  const secondPlace = currentRecords.find((r) => r.rank === 2);
  const thirdPlace = currentRecords.find((r) => r.rank === 3);
  const fourthPlace = currentRecords.find((r) => r.rank === 4);
  const fifthPlace = currentRecords.find((r) => r.rank === 5);

  const getGameIcon = (gameId: string) => {
    switch (gameId) {
      case 'space':
        return <Rocket className="w-3.5 h-3.5 text-teal-400" />;
      case 'f1':
        return <Car className="w-3.5 h-3.5 text-red-400" />;
      case 'flight':
        return <Plane className="w-3.5 h-3.5 text-sky-400" />;
      case 'pacman':
        return <CircleDot className="w-3.5 h-3.5 text-amber-400" />;
      case 'cavaleiro':
        return <Shield className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Trophy className="w-3.5 h-3.5 text-yellow-400" />;
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-b from-[#090D18] via-[#0C1224] to-[#080B16] border border-amber-500/30 p-5 shadow-2xl relative overflow-hidden space-y-6">
      {/* Background Neon Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-gradient-to-b from-amber-500/15 via-yellow-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 via-yellow-500/20 to-orange-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl font-orbitron font-bold text-slate-100 tracking-wide flex items-center gap-2">
                PODIUM DOS CAMPEÕES
                <span className="text-amber-400 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 font-mono font-bold">
                  TOP 5 EXCLUSIVO
                </span>
                {isAdmin ? (
                  <span className="text-purple-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                    <Shield className="w-3 h-3 text-purple-400" />
                    EDIÇÃO TOTAL (ADMIN)
                  </span>
                ) : (
                  <span className="text-cyan-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 font-bold flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-cyan-400" />
                    EDIÇÃO DE NOME: APENAS RECORDISTA TITULAR (TOP 5)
                  </span>
                )}
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Hall da Fama dos 5 primeiros colocados. O titular no TOP 5 pode atualizar seu nome; edição total liberada para Administrador.
            </p>
          </div>
        </div>

        {/* Action Button: Gravar Nome do Recordista */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              // Pre-fill score from active game if available
              if (latestGameScores && latestGameScores[activeGameId]) {
                setNewScoreValue(latestGameScores[activeGameId] || 1000);
              }
              setNewGameChoice(activeGameId);
              setNewPlayerName(currentUserName || currentUser?.name || 'JOGADOR');
              setShowRecordModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-orbitron font-bold text-xs shadow-[0_0_18px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            title="Gravar seu nome e pontuação no Ranking Top 5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>GRAVAR MEU NOME</span>
          </button>

          {isAdmin && (
            <button
              onClick={handleResetPodium}
              className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-300 hover:text-white transition-colors cursor-pointer"
              title="Restaurar recordes de fábrica (Apenas Administrador)"
            >
              <RotateCcw className="w-4 h-4 text-purple-400" />
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {recordSuccessBanner && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono font-bold">{recordSuccessBanner}</span>
        </div>
      )}

      {/* Category Tabs: Geral + Jogos Específicos (Todos limitados ao TOP 5) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/90 border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('general')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'general'
              ? 'bg-amber-500 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.5)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>RANKING GERAL (TOP 5)</span>
        </button>

        <button
          onClick={() => setActiveCategory('space')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'space'
              ? 'bg-teal-500 text-slate-950 shadow-[0_0_14px_rgba(20,184,166,0.5)]'
              : 'text-slate-400 hover:text-teal-300 hover:bg-slate-900'
          }`}
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>SPACE INVADERS</span>
        </button>

        <button
          onClick={() => setActiveCategory('f1')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'f1'
              ? 'bg-red-600 text-white shadow-[0_0_14px_rgba(225,6,0,0.5)]'
              : 'text-slate-400 hover:text-red-300 hover:bg-slate-900'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>CORRIDA F1 FERRARI</span>
        </button>

        <button
          onClick={() => setActiveCategory('flight')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'flight'
              ? 'bg-sky-500 text-slate-950 shadow-[0_0_14px_rgba(56,189,248,0.5)]'
              : 'text-slate-400 hover:text-sky-300 hover:bg-slate-900'
          }`}
        >
          <Plane className="w-3.5 h-3.5" />
          <span>MONOMOTOR VEGAS</span>
        </button>

        <button
          onClick={() => setActiveCategory('pacman')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'pacman'
              ? 'bg-yellow-400 text-slate-950 shadow-[0_0_14px_rgba(250,204,21,0.5)]'
              : 'text-slate-400 hover:text-yellow-300 hover:bg-slate-900'
          }`}
        >
          <CircleDot className="w-3.5 h-3.5" />
          <span>PAC-MAN NEON</span>
        </button>

        <button
          onClick={() => setActiveCategory('cavaleiro')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all shrink-0 cursor-pointer ${
            activeCategory === 'cavaleiro'
              ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white shadow-[0_0_14px_rgba(245,158,11,0.5)]'
              : 'text-slate-400 hover:text-amber-300 hover:bg-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>CAVALEIRO NEGRO</span>
        </button>
      </div>

      {/* 3D VISUAL PODIUM (TOP 3 PEDESTALS) */}
      <div className="pt-8 pb-4 px-2">
        <div className="max-w-xl mx-auto flex items-end justify-center gap-2 sm:gap-4">
          {/* 2º LUGAR - PRATA (Esquerda) */}
          {secondPlace && (
            <div className="flex-1 flex flex-col items-center">
              <div className="relative mb-2 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/90 border-2 border-slate-300 flex items-center justify-center text-slate-200 shadow-[0_0_15px_rgba(203,213,225,0.4)]">
                  <Medal className="w-6 h-6 text-slate-300" />
                </div>
                <div className="mt-1 font-orbitron font-bold text-xs text-slate-200 truncate max-w-[110px]">
                  {secondPlace.playerName}
                </div>
                <div className="text-[11px] font-mono text-cyan-300 font-bold">
                  {secondPlace.score.toLocaleString('pt-BR')} <span className="text-[9px]">PTS</span>
                </div>
                {canUserEditRecord(secondPlace) ? (
                  <button
                    onClick={() => handleStartEditName(secondPlace)}
                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-950 font-bold bg-slate-200 hover:bg-white shadow transition cursor-pointer"
                    title={isAdmin ? "Editar recorde (Edição Total Admin)" : "Editar seu próprio nome de recordista"}
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>{isAdmin ? "Editar" : "Editar Meu Nome"}</span>
                  </button>
                ) : (
                  <div
                    className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-slate-500 bg-slate-900/60 border border-slate-800"
                    title={`Registro protegido de ${secondPlace.playerName}. Apenas o titular no TOP 5 ou Admin pode alterar.`}
                  >
                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                    <span>Protegido</span>
                  </div>
                )}
              </div>

              {/* Pedestal 2º Lugar */}
              <div className="w-full h-28 rounded-t-xl bg-gradient-to-b from-slate-300 via-slate-600 to-slate-800 border-t-2 border-x-2 border-slate-300/80 p-2 text-center flex flex-col justify-between shadow-[0_0_20px_rgba(203,213,225,0.2)]">
                <span className="font-orbitron font-extrabold text-2xl text-slate-900 drop-shadow">2º</span>
                <span className="text-[10px] font-mono text-slate-200 uppercase font-bold tracking-wider">PRATA</span>
              </div>
            </div>
          )}

          {/* 1º LUGAR - OURO (Centro, Maior Altitude) */}
          {firstPlace && (
            <div className="flex-1 flex flex-col items-center -mt-6">
              <div className="relative mb-2 text-center">
                {/* Floating Gold Crown */}
                <Crown className="w-7 h-7 text-amber-400 mx-auto animate-bounce mb-0.5 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 border-2 border-amber-200 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.7)]">
                  <Trophy className="w-7 h-7 text-slate-950 fill-current" />
                </div>
                <div className="mt-1 font-orbitron font-black text-sm text-amber-300 truncate max-w-[130px] drop-shadow">
                  {firstPlace.playerName}
                </div>
                <div className="text-xs font-mono text-amber-400 font-extrabold">
                  {firstPlace.score.toLocaleString('pt-BR')} <span className="text-[10px]">PTS</span>
                </div>
                {canUserEditRecord(firstPlace) ? (
                  <button
                    onClick={() => handleStartEditName(firstPlace)}
                    className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] text-slate-950 font-black bg-amber-400 hover:bg-amber-300 shadow transition cursor-pointer"
                    title={isAdmin ? "Editar recorde (Edição Total Admin)" : "Editar seu próprio nome como campeão"}
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>{isAdmin ? "Editar" : "Editar Meu Nome"}</span>
                  </button>
                ) : (
                  <div
                    className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-slate-500 bg-slate-900/60 border border-slate-800"
                    title={`Registro protegido de ${firstPlace.playerName}. Apenas o titular no TOP 5 ou Admin pode alterar.`}
                  >
                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                    <span>Protegido</span>
                  </div>
                )}
              </div>

              {/* Pedestal 1º Lugar */}
              <div className="w-full h-36 rounded-t-xl bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-800 border-t-2 border-x-2 border-amber-200 p-2 text-center flex flex-col justify-between shadow-[0_0_30px_rgba(245,158,11,0.4)]">
                <span className="font-orbitron font-black text-3xl text-slate-950 drop-shadow">1º</span>
                <span className="text-[11px] font-mono text-amber-100 uppercase font-black tracking-widest">CAMPEÃO</span>
              </div>
            </div>
          )}

          {/* 3º LUGAR - BRONZE (Direita) */}
          {thirdPlace && (
            <div className="flex-1 flex flex-col items-center">
              <div className="relative mb-2 text-center">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-950/80 border-2 border-amber-600 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.35)]">
                  <Medal className="w-6 h-6 text-amber-500" />
                </div>
                <div className="mt-1 font-orbitron font-bold text-xs text-amber-200 truncate max-w-[110px]">
                  {thirdPlace.playerName}
                </div>
                <div className="text-[11px] font-mono text-amber-300 font-bold">
                  {thirdPlace.score.toLocaleString('pt-BR')} <span className="text-[9px]">PTS</span>
                </div>
                {canUserEditRecord(thirdPlace) ? (
                  <button
                    onClick={() => handleStartEditName(thirdPlace)}
                    className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-amber-950 font-bold bg-amber-400 hover:bg-amber-300 shadow transition cursor-pointer"
                    title={isAdmin ? "Editar recorde (Edição Total Admin)" : "Editar seu próprio nome de recordista"}
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>{isAdmin ? "Editar" : "Editar Meu Nome"}</span>
                  </button>
                ) : (
                  <div
                    className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-slate-500 bg-slate-900/60 border border-slate-800"
                    title={`Registro protegido de ${thirdPlace.playerName}. Apenas o titular no TOP 5 ou Admin pode alterar.`}
                  >
                    <Lock className="w-2.5 h-2.5 text-slate-500" />
                    <span>Protegido</span>
                  </div>
                )}
              </div>

              {/* Pedestal 3º Lugar */}
              <div className="w-full h-20 rounded-t-xl bg-gradient-to-b from-amber-600 via-amber-700 to-amber-950 border-t-2 border-x-2 border-amber-500/80 p-2 text-center flex flex-col justify-between shadow-[0_0_20px_rgba(217,119,6,0.2)]">
                <span className="font-orbitron font-extrabold text-2xl text-amber-200 drop-shadow">3º</span>
                <span className="text-[10px] font-mono text-amber-200 uppercase font-bold tracking-wider">BRONZE</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4º E 5º COLOCADOS (HONRA TOP 5 - OS DEMAIS NÃO APARECEM) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {fourthPlace && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-cyan-500/30 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-orbitron font-bold text-sm">
                4º
              </div>
              <div>
                <div className="text-xs font-orbitron font-bold text-slate-100 flex items-center gap-1.5">
                  <span>{fourthPlace.playerName}</span>
                  {getGameIcon(fourthPlace.gameId)}
                  {isCurrentUserRecordist(fourthPlace) && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      SEU
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {fourthPlace.gameName} &bull; {fourthPlace.date}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-cyan-400 text-sm">
                {fourthPlace.score.toLocaleString('pt-BR')} PTS
              </div>
              {canUserEditRecord(fourthPlace) ? (
                <button
                  onClick={() => handleStartEditName(fourthPlace)}
                  className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-white font-mono underline cursor-pointer"
                  title={isAdmin ? "Editar recorde (Edição Total Admin)" : "Editar seu próprio nome como recordista"}
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>{isAdmin ? "Editar" : "Gravar Meu Nome"}</span>
                </button>
              ) : (
                <span className="text-[9px] text-slate-500 font-mono flex items-center justify-end gap-1">
                  <Lock className="w-2.5 h-2.5 text-slate-600" />
                  <span>Protegido</span>
                </span>
              )}
            </div>
          </div>
        )}

        {fifthPlace && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-orbitron font-bold text-sm">
                5º
              </div>
              <div>
                <div className="text-xs font-orbitron font-bold text-slate-100 flex items-center gap-1.5">
                  <span>{fifthPlace.playerName}</span>
                  {getGameIcon(fifthPlace.gameId)}
                  {isCurrentUserRecordist(fifthPlace) && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      SEU
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {fifthPlace.gameName} &bull; {fifthPlace.date}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-emerald-400 text-sm">
                {fifthPlace.score.toLocaleString('pt-BR')} PTS
              </div>
              {canUserEditRecord(fifthPlace) ? (
                <button
                  onClick={() => handleStartEditName(fifthPlace)}
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-300 hover:text-white font-mono underline cursor-pointer"
                  title={isAdmin ? "Editar recorde (Edição Total Admin)" : "Editar seu próprio nome como recordista"}
                >
                  <Edit3 className="w-2.5 h-2.5" />
                  <span>{isAdmin ? "Editar" : "Gravar Meu Nome"}</span>
                </button>
              ) : (
                <span className="text-[9px] text-slate-500 font-mono flex items-center justify-end gap-1">
                  <Lock className="w-2.5 h-2.5 text-slate-600" />
                  <span>Protegido</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FULL RANKING TABLE (EXCLUSIVAMENTE ATÉ O 5º COLOCADO - OS DEMAIS NÃO APARECEM) */}
      <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-3 overflow-hidden">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-orbitron font-bold text-slate-400">
          <span>RANKING GERAL (TOP 5 CLASSIFICADOS)</span>
          <span className="text-[10px] font-mono text-amber-400">REGRA: APENAS ATÉ O 5º COLOCADO</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {currentRecords.map((entry) => {
            const isOwner = isCurrentUserRecordist(entry);
            const canEdit = canUserEditRecord(entry);

            return (
              <div
                key={`${entry.id}-${entry.rank}-${entry.gameId}`}
                className={`py-2.5 px-2 flex items-center justify-between gap-3 transition-colors rounded-lg ${
                  entry.rank === 1
                    ? 'bg-amber-500/10'
                    : entry.rank === 2
                    ? 'bg-slate-400/5'
                    : entry.rank === 3
                    ? 'bg-amber-700/5'
                    : 'hover:bg-slate-900/50'
                } ${isOwner ? 'ring-1 ring-emerald-500/40 bg-emerald-950/10' : ''}`}
              >
                {/* Rank & Icon */}
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center font-orbitron font-extrabold text-xs shrink-0 ${
                      entry.rank === 1
                        ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                        : entry.rank === 2
                        ? 'bg-slate-300 text-slate-950'
                        : entry.rank === 3
                        ? 'bg-amber-600 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {entry.rank}º
                  </span>

                  {/* Player Name with Inline Edit */}
                  <div className="min-w-0">
                    {editingId === entry.id ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="bg-slate-900 border border-amber-400 text-amber-300 font-orbitron text-xs px-2 py-1 rounded outline-none w-36 sm:w-48 uppercase font-bold"
                          placeholder="NOME DO RECORDISTA"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName(entry.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        {isAdmin && (
                          <input
                            type="number"
                            value={editingScore}
                            onChange={(e) => setEditingScore(Number(e.target.value))}
                            className="bg-slate-900 border border-purple-400 text-purple-300 font-mono text-xs px-2 py-1 rounded outline-none w-24 font-bold"
                            placeholder="PONTOS"
                            title="Alterar pontuação (Exclusivo Administrador)"
                          />
                        )}
                        <button
                          onClick={() => handleSaveName(entry.id)}
                          className="p-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                          title="Confirmar Edição"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-orbitron font-bold text-xs sm:text-sm text-slate-100 truncate">
                          {entry.playerName}
                        </span>
                        {isOwner && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            SEU RECORDE
                          </span>
                        )}
                        {entry.recordTag && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {entry.recordTag}
                          </span>
                        )}
                        {canEdit ? (
                          <button
                            onClick={() => handleStartEditName(entry)}
                            className="text-slate-400 hover:text-amber-400 transition cursor-pointer p-0.5 rounded hover:bg-slate-800"
                            title={isAdmin ? "Editar recorde (Edição Total Admin)" : "Editar seu próprio nome como recordista Top 5"}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        ) : (
                          <span title={`Apenas ${entry.playerName} ou o Administrador pode editar este registro.`}>
                            <Lock className="w-3 h-3 text-slate-600" />
                          </span>
                        )}
                      </div>
                    )}

                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                      <span className="flex items-center gap-1 text-slate-300">
                        {getGameIcon(entry.gameId)}
                        {entry.gameName}
                      </span>
                      <span>&bull;</span>
                      <span>{entry.date}</span>
                    </div>
                  </div>
                </div>

                {/* Score & Badge */}
                <div className="text-right shrink-0">
                  <div
                    className={`font-mono font-extrabold text-sm sm:text-base ${
                      entry.rank === 1
                        ? 'text-amber-400'
                        : entry.rank === 2
                        ? 'text-slate-200'
                        : entry.rank === 3
                        ? 'text-amber-500'
                        : 'text-cyan-400'
                    }`}
                  >
                    {entry.score.toLocaleString('pt-BR')}{' '}
                    <span className="text-[10px] font-normal text-slate-400">PTS</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 uppercase">
                    {entry.rank === 1 ? '🥇 Recorde Ouro' : entry.rank === 2 ? '🥈 Recorde Prata' : entry.rank === 3 ? '🥉 Recorde Bronze' : 'Top 5 Registrado'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: GRAVAR NOVO RECORDE NO TOP 5 */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0B101D] border-2 border-amber-500/60 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(245,158,11,0.3)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-orbitron font-bold text-sm">
                <Trophy className="w-5 h-5" />
                <span>GRAVAR RECORDE NO TOP 5</span>
              </div>
              <button
                onClick={() => setShowRecordModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordNewScore} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-bold text-slate-300">
                    NOME DO RECORDISTA:
                  </label>
                  {!isAdmin && (
                    <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Vinculado à sua conta
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  readOnly={!isAdmin}
                  value={isAdmin ? newPlayerName : (currentUserName || currentUser?.name || 'JOGADOR')}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="EX: ROMILDO COELHO"
                  className={`w-full border font-orbitron text-sm px-3 py-2 rounded-xl outline-none uppercase font-bold ${
                    isAdmin
                      ? 'bg-slate-950 border-purple-500/50 focus:border-purple-400 text-slate-100'
                      : 'bg-slate-900/80 border-slate-700 text-cyan-300 cursor-not-allowed'
                  }`}
                />
                {!isAdmin && (
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Como usuário comum, seu recorde é gravado sob seu nome oficial. Caso fique entre os 5 primeiros, poderá editá-lo.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  JOGO DO RECORDE:
                </label>
                <select
                  value={newGameChoice}
                  onChange={(e) => setNewGameChoice(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 text-slate-100 font-mono text-xs px-3 py-2 rounded-xl outline-none"
                >
                  <option value="space">👾 Space Invaders Arcade (Fase 4)</option>
                  <option value="f1">🏎️ Corrida F1 Ferrari Monza</option>
                  <option value="flight">✈️ Monomotor Dinos & Vegas</option>
                  <option value="pacman">🟡 Pac-Man Neon Arcade</option>
                  <option value="cavaleiro">⚔️ Cavaleiro Negro Pinball (Taito 80s)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                  PONTUAÇÃO ATINGIDA (PONTOS):
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newScoreValue}
                  onChange={(e) => setNewScoreValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 text-amber-400 font-mono font-bold text-base px-3 py-2 rounded-xl outline-none"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300/90 font-mono">
                ℹ️ Esta pontuação será classificada no Ranking Geral e no Ranking do jogo. Se estiver entre as 5 maiores pontuações, entrará diretamente no Podium!
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecordModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-orbitron font-bold text-xs shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:brightness-110 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>SALVAR NO PODIUM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
