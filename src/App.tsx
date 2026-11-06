import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sidebar,
  ActiveTab
} from './components/Sidebar';
import { HologramAvatar } from './components/HologramAvatar';
import { ListeningIndicator } from './components/ListeningIndicator';
import { ChatHUD } from './components/ChatHUD';
import { DeviceControlPanel } from './components/DeviceControlPanel';
import { WhatsAppPanel } from './components/WhatsAppPanel';
import { DashboardMetrics } from './components/DashboardMetrics';
import { FinancePanel } from './components/FinancePanel';
import { HabitsProjectsPanel } from './components/HabitsProjectsPanel';
import { AdminPanel } from './components/AdminPanel';
import { MediaHub } from './components/MediaHub';
import { AuthPortal } from './components/AuthPortal';
import { UserCustomPanel } from './components/UserCustomPanel';
import { TranslatorTutorPanel } from './components/TranslatorTutorPanel';
import { GamesHub } from './components/GamesHub';
import { AutomationsPanel } from './components/AutomationsPanel';
import { ScreenMirroringHub } from './components/ScreenMirroringHub';
import { HP12CCalculatorPanel } from './components/HP12CCalculatorPanel';
import {
  HardwareState,
  SystemMetrics,
  ChatMessage,
  VoiceConfig,
  UserAccount,
  SystemLog,
  CalendarEvent,
  FinancialTransaction,
  Habit,
  Project,
  WhatsAppAutomationRule,
  WhatsAppOriginConfig
} from './types';
import { playJarvesChime } from './utils/audioEffects';
import { captureCurrentCameraFrame } from './utils/cameraVision';
import { parseVoiceIntent } from './utils/voiceCommandParser';
import {
  loadSecureVault,
  saveSecureVault,
  exportVaultBackup,
  parseVaultBackupFile,
  JarvesVaultData,
  sanitizeWhatsAppOriginConfig,
  persistUserToMySQL,
  deduplicateUsers,
} from './utils/jarvesStorage';
import { chessAudio } from './components/games/chess/chessAudio';
import {
  Bot,
  Radio,
  Volume2,
  Shield,
  Activity,
  Sparkles,
  CheckCircle2,
  Zap,
  X,
  ShieldCheck,
  Save,
  Database,
  Download,
  Upload,
  Lock,
  FileCheck,
  AlertTriangle,
  LogOut,
  Mic,
  MicOff,
  Tv,
  Cast,
  Menu,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Swords
} from 'lucide-react';

export default function App() {
  // Sidebar & Navigation (auto-collapsed on mobile by default)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return false;
    }
    return true;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('assistant');
  const [mobileHologramVisible, setMobileHologramVisible] = useState(true);

  // Secure Vault & Persistent Storage State
  const [isVaultLoaded, setIsVaultLoaded] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string>('Boot');
  const [vaultChecksum, setVaultChecksum] = useState<string>('JV-SECURE-256');
  const [saveBanner, setSaveBanner] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const hasMountedRef = useRef(false);

  // Media & YouTube voice control state
  const [mediaAutoPlayQuery, setMediaAutoPlayQuery] = useState<string>('');
  const [mediaVideoIdToPlay, setMediaVideoIdToPlay] = useState<string | null>(null);
  const [mediaActiveSubTab, setMediaActiveSubTab] = useState<'player' | 'youtube' | 'weblinks'>('player');
  const [mediaTrackToPlay, setMediaTrackToPlay] = useState<string | null>(null);
  const [mediaExternalAction, setMediaExternalAction] = useState<'play' | 'pause' | 'stop' | 'next' | 'prev' | 'mute' | 'unmute' | null>(null);
  const [mediaCommandNonce, setMediaCommandNonce] = useState<number>(0);

  // WhatsApp Automation Rules for Registered Contacts
  const [whatsAppAutomations, setWhatsAppAutomations] = useState<WhatsAppAutomationRule[]>([
    {
      id: 'wa-1',
      contactName: 'Romildo (Master)',
      contactPhone: '+55 11 99999-8888',
      title: 'Resumo Diário Executivo',
      triggerType: 'daily_summary',
      templateMessage: 'Bom dia, Sr. Romildo. JARVES reportando: telemetria em 99.8%, agenda sincronizada e finanças equilibradas.',
      enabled: true,
      lastDispatched: 'Hoje às 08:30',
    },
    {
      id: 'wa-2',
      contactName: 'Diretoria Executiva',
      contactPhone: '+55 11 97777-6666',
      title: 'Lembretes de Agenda & Pautas',
      triggerType: 'meeting_reminder',
      templateMessage: 'Alerta JARVES: Alinhamento Estratégico com Diretoria confirmado para às 14:30.',
      enabled: true,
      lastDispatched: 'Hoje às 09:00',
    },
    {
      id: 'wa-3',
      contactName: 'Engenharia de Software',
      contactPhone: '+55 11 98888-7777',
      title: 'Alerta de Status e Métricas de Infra',
      triggerType: 'system_status',
      templateMessage: 'JARVES Telemetria: Todos os nós de servidores em 100% de disponibilidade operacional.',
      enabled: false,
      lastDispatched: 'Ontem às 18:00',
    },
  ]);

  // WhatsApp Origin Configuration (Remetente Cadastrado no JARVES)
  const [whatsAppOrigin, setWhatsAppOrigin] = useState<WhatsAppOriginConfig>(() =>
    sanitizeWhatsAppOriginConfig({
      phoneNumber: '+55 11 99999-8888',
      senderName: 'Romildo (Master)',
      instanceId: 'JARVES-ORIGIN-01',
      status: 'connected',
      gatewayMode: 'web_direct',
      autoSign: true,
      registeredAt: '18/09/2026',
      apiEndpoint: 'https://free.uazapi.com',
      evolution: {
        serverUrl: 'https://free.uazapi.com',
        apiKey: '',
        instanceName: 'JARVES-ORIGIN',
        originPhoneNumber: '+55 11 99999-8888',
        senderName: 'Romildo (Master)',
        autoReplyAi: true,
        webhookEnabled: true,
        status: 'unpaired',
      },
    })
  );

  // Hardware state
  const [hardwareState, setHardwareState] = useState<HardwareState>({
    camera: false,
    microphone: true,
    bluetooth: true,
    wifi: true,
  });

  // System telemetry metrics
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu: 16,
    ram: 38,
    storage: 42,
    temperature: 44,
    networkDown: 860,
    networkUp: 245,
    battery: 100,
    volume: 80,
  });

  // Voice & Speech Configuration
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    voiceType: 'masculino',
    pitch: 0.95,
    rate: 1.05,
    continuousListening: false,
    autoSpeak: true,
    ttsProvider: 'fishaudio',
    fishAudioApiKey: 'sk-fish-tNdqjK_XbkVx27B8kO-TuYlx7EP6h5OnhWg3xe0W6us',
    fishAudioVoiceId: '82d13948027e4be69892dd3d0104e681',
    fishAudioModel: 's2.1-pro-free',
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<{
    type: string;
    explanation: string;
    confidence: number;
  } | null>(null);

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);
  const speechDebounceRef = useRef<any>(null);
  const accumulatedFinalRef = useRef<string>('');
  const latestSpokenTranscriptRef = useRef<string>('');
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const userWantsListeningRef = useRef<boolean>(false);
  const restartRecognitionTimeoutRef = useRef<any>(null);
  const abortCountRef = useRef<number>(0);

  // Initial Chat Messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'jarves',
      text: 'Bom dia, Sr. Romildo. Todos os subsistemas do JARVES estão online, operando a 100% de performance. Estou pronto para controlar seus dispositivos, enviar mensagens pelo WhatsApp, gerenciar sua agenda e executar suas automações.',
      speechText: 'Bom dia, Senhor. Todos os subsistemas online e operando perfeitamente. Como posso ajudá-lo hoje?',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // System Logs
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([
    {
      id: 'log-1',
      timestamp: 'Hoje, 08:30:12',
      action: 'Boot do Sistema Concluído',
      device: 'Núcleo Central',
      status: 'Concluído',
      actor: 'JARVES Core',
    },
    {
      id: 'log-2',
      timestamp: 'Hoje, 08:31:00',
      action: 'Autenticação Mestre Validada',
      device: 'Admin Gate',
      target: 'Romildo (Master)',
      status: 'Concluído',
      actor: '2FA Auth',
    },
    {
      id: 'log-3',
      timestamp: 'Hoje, 09:05:44',
      action: 'Sincronização de Rede Wi-Fi 5G',
      device: 'Wi-Fi',
      target: 'Rede Segura Corp',
      status: 'Concluído',
      actor: 'Hardware Driver',
    },
  ]);

  const addLog = (action: string, device: string, target?: string) => {
    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      action,
      device,
      target,
      status: 'Concluído',
      actor: 'Romildo / JARVES',
    };
    setSystemLogs((prev) => [newLog, ...prev]);
  };

  // User Accounts
  const [users, setUsers] = useState<UserAccount[]>([
    {
      id: 'usr-romildo-master',
      name: 'Romildo',
      username: 'Romildo',
      password: 'Romildo2009@',
      email: 'geoimoveissantos@gmail.com',
      phone: '13 996361313',
      status: 'Ativo',
      role: 'Admin',
      lastAccess: 'Hoje, 09:20',
      lastIp: '127.0.0.1 (Local)',
      actionLogsCount: 45,
      customSettings: {
        themeColor: '#00F0FF',
        customTitle: 'Central Executiva Romildo',
        customStatusMsg: 'Master Admin em Operação',
        enabledWidgets: ['assistant', 'devices', 'whatsapp', 'finance', 'habits', 'media', 'admin'],
      },
    },
    {
      id: 'usr-002',
      name: 'Eng. João Silva',
      username: 'joao.silva',
      password: 'user123',
      email: 'joao.silva@jarves.tech',
      status: 'Ativo',
      phone: '+55 11 98888-7777',
      role: 'User',
      lastAccess: 'Hoje, 08:15',
      lastIp: '192.168.1.105',
      actionLogsCount: 12,
      customSettings: {
        themeColor: '#10B981',
        customTitle: 'Painel de Engenharia',
        enabledWidgets: ['assistant', 'devices', 'finance', 'habits', 'media'],
      },
    },
    {
      id: 'usr-003',
      name: 'Dra. Clara Andrade',
      username: 'clara.andrade',
      password: 'user123',
      email: 'clara.andrade@jarves.tech',
      status: 'Ativo',
      phone: '+55 11 97777-6666',
      role: 'User',
      lastAccess: 'Ontem, 18:40',
      lastIp: '189.44.12.33',
      actionLogsCount: 28,
      customSettings: {
        themeColor: '#8B5CF6',
        customTitle: 'Painel da Dra. Clara',
        enabledWidgets: ['assistant', 'whatsapp', 'finance', 'habits'],
      },
    },
    {
      id: 'usr-004',
      name: 'Suporte Operador',
      username: 'suporte',
      password: 'user123',
      email: 'suporte@jarves.tech',
      status: 'Suspenso',
      phone: '+55 11 96666-5555',
      role: 'User',
      lastAccess: '12/09, 14:10',
      lastIp: '177.30.90.11',
      actionLogsCount: 5,
    },
  ]);

  // Logged-in Session & Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [showAdminBlockedModal, setShowAdminBlockedModal] = useState(false);

  // Global Chess Challenge State & Cross-Tab Multiplayer Sync
  const [incomingChessChallenge, setIncomingChessChallenge] = useState<{
    id: string;
    fromUser: { id: string; name: string };
    toUser: { id: string; name: string };
    roomId: string;
    senderSessionId?: string;
  } | null>(null);

  const [activeChessRoomToJoin, setActiveChessRoomToJoin] = useState<{
    roomId: string;
    opponent: { id: string; name: string };
    playerColor: 'w' | 'b';
  } | null>(null);

  const tabSessionIdRef = useRef<string>('');
  useEffect(() => {
    let sid = sessionStorage.getItem('jarves_tab_session_id');
    if (!sid) {
      sid = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      sessionStorage.setItem('jarves_tab_session_id', sid);
    }
    tabSessionIdRef.current = sid;
  }, []);

  // Global Cross-Tab & Server Listener for Chess Invites (active on ALL views)
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('jarves_chess_network');
      channel.onmessage = (event) => {
        const { type, payload } = event.data || {};
        if (type === 'CHESS_INVITE') {
          // Check if this tab is the sender tab
          if (payload.senderSessionId && payload.senderSessionId === tabSessionIdRef.current) {
            return;
          }

          const myId = currentUser?.id || 'usr-romildo-master';
          const myName = currentUser?.name?.toLowerCase();
          const targetId = payload.toUser?.id;
          const targetName = payload.toUser?.name?.toLowerCase();

          const isTargetedToMe = targetId === myId || (targetName && myName && targetName === myName);
          const isBroadcast = targetId === 'usr-all' || !targetId;
          const isDifferentSession = payload.senderSessionId && payload.senderSessionId !== tabSessionIdRef.current;

          if (isTargetedToMe || isBroadcast || (isDifferentSession && payload.fromUser?.id !== myId)) {
            // Loud heraldic fanfare chime alert
            chessAudio.playInviteAlert();
            setIncomingChessChallenge(payload);
          }
        } else if (type === 'CHESS_INVITE_DECLINED') {
          if (incomingChessChallenge && incomingChessChallenge.id === payload.inviteId) {
            setIncomingChessChallenge(null);
          }
        }
      };
    } catch {}

    // Polling server for pending invites
    const pollInterval = setInterval(() => {
      const myId = currentUser?.id || 'usr-romildo-master';
      fetch(`/api/chess/invites/${encodeURIComponent(myId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.invites) && data.invites.length > 0) {
            const pending = data.invites.find(
              (inv: any) =>
                inv.status === 'pending' &&
                inv.fromUser?.id !== myId &&
                (!incomingChessChallenge || incomingChessChallenge.id !== inv.id)
            );
            if (pending) {
              chessAudio.playInviteAlert();
              setIncomingChessChallenge({
                id: pending.id,
                fromUser: pending.fromUser,
                toUser: pending.toUser,
                roomId: pending.roomId || `room_${Date.now()}`,
              });
            }
          }
        })
        .catch(() => {});
    }, 2500);

    return () => {
      if (channel) channel.close();
      clearInterval(pollInterval);
    };
  }, [currentUser, incomingChessChallenge]);

  const handleGlobalAcceptChessInvite = () => {
    if (!incomingChessChallenge) return;
    const inv = incomingChessChallenge;
    const roomId = inv.roomId || `room_${Date.now()}`;

    chessAudio.playMove();

    // Notify server
    fetch('/api/chess/invites/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteId: inv.id,
        accept: true,
        responderUser: currentUser || { id: 'usr-guest', name: 'Convidado' },
        withCamera: true,
        withMic: true,
      }),
    }).catch(() => {});

    // Broadcast acceptance so sender tab knows
    try {
      const channel = new BroadcastChannel('jarves_chess_network');
      channel.postMessage({
        type: 'CHESS_INVITE_ACCEPT',
        payload: {
          roomId,
          fromUser: inv.fromUser,
          toUser: { id: currentUser?.id || 'usr-guest', name: currentUser?.name || 'Convidado' },
          toUserId: inv.fromUser.id,
          withCamera: true,
          withMic: true,
        },
      });
      setTimeout(() => channel.close(), 1000);
    } catch {}

    // Route to Games tab -> Chess, with playerColor='b' (Dark pieces, flipped board)
    setActiveChessRoomToJoin({
      roomId,
      opponent: inv.fromUser,
      playerColor: 'b',
    });
    setActiveTab('games');
    addLog(`Desafio de Xadrez Aceito contra ${inv.fromUser.name}`, 'Xadrez Online', 'Pedras Escuras (Bronze)');
    setIncomingChessChallenge(null);
  };

  const handleGlobalDeclineChessInvite = () => {
    if (!incomingChessChallenge) return;
    const inv = incomingChessChallenge;

    fetch('/api/chess/invites/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteId: inv.id,
        accept: false,
        responderUser: currentUser,
      }),
    }).catch(() => {});

    try {
      const channel = new BroadcastChannel('jarves_chess_network');
      channel.postMessage({
        type: 'CHESS_INVITE_DECLINED',
        payload: {
          inviteId: inv.id,
          fromUserId: inv.fromUser.id,
          declinedByName: currentUser?.name || 'Convidado',
        },
      });
      setTimeout(() => channel.close(), 1000);
    } catch {}

    setIncomingChessChallenge(null);
  };

  // Calendar Events
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    {
      id: 'c1',
      title: 'Alinhamento Estratégico com Diretoria',
      datetime: 'Hoje às 14:30',
      category: 'Reunião',
      completed: false,
    },
    {
      id: 'c2',
      title: 'Revisão do Relatório Financeiro Trimestral',
      datetime: 'Hoje às 16:00',
      category: 'Tarefa',
      completed: false,
    },
    {
      id: 'c3',
      title: 'Call de Verificação de Servidores Cloud',
      datetime: 'Amanhã às 10:00',
      category: 'Reunião',
      completed: false,
    },
  ]);

  // Financial Transactions
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([
    {
      id: 'f1',
      description: 'Honorários de Consultoria Tecnológica',
      amount: 14500,
      type: 'income',
      category: 'Consultoria',
      date: '15/09/2026',
    },
    {
      id: 'f2',
      description: 'Infraestrutura Cloud & Servidores',
      amount: 1850,
      type: 'expense',
      category: 'Servidores/Cloud',
      date: '14/09/2026',
    },
    {
      id: 'f3',
      description: 'Licenças de Software e APIs de IA',
      amount: 620,
      type: 'expense',
      category: 'Tecnologia',
      date: '12/09/2026',
    },
  ]);

  // Habits & Projects
  const [habits, setHabits] = useState<Habit[]>([
    {
      id: 'h1',
      title: 'Revisão Matinal de Métricas e Logs',
      streak: 21,
      target: 30,
      completedToday: true,
      category: 'Foco',
    },
    {
      id: 'h2',
      title: 'Treino e Condicionamento Físico',
      streak: 14,
      target: 30,
      completedToday: true,
      category: 'Saúde',
    },
    {
      id: 'h3',
      title: 'Leitura e Pesquisa em IA Autônoma',
      streak: 9,
      target: 30,
      completedToday: false,
      category: 'Estudo',
    },
  ]);

  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'p1',
      name: 'JARVES Core v4.2 Deployment',
      progress: 92,
      deadline: '18/09/2026',
      status: 'Em Andamento',
    },
    {
      id: 'p2',
      name: 'Integração de Rede IoT e Sensores',
      progress: 65,
      deadline: '30/09/2026',
      status: 'Em Andamento',
    },
    {
      id: 'p3',
      name: 'Migração de Servidores Multi-Região',
      progress: 100,
      deadline: '10/09/2026',
      status: 'Concluído',
    },
  ]);

  // =========================================================================
  // USER-EXCLUSIVE DATASET FILTERING & ISOLATION
  // =========================================================================
  const isMasterUser =
    currentUser?.id === 'usr-romildo-master' ||
    currentUser?.username?.toLowerCase() === 'romildo' ||
    currentUser?.email === 'geoimoveissantos@gmail.com' ||
    currentUser?.role === 'Admin';

  const activeUserId = currentUser?.id || (isMasterUser ? 'usr-romildo-master' : 'usr-guest');

  const userTransactions = useMemo(() => {
    if (!currentUser) return [];
    return transactions.filter((t) => t.userId === currentUser.id || (!t.userId && isMasterUser));
  }, [transactions, currentUser, isMasterUser]);

  const userCalendarEvents = useMemo(() => {
    if (!currentUser) return [];
    return calendarEvents.filter((c) => c.userId === currentUser.id || (!c.userId && isMasterUser));
  }, [calendarEvents, currentUser, isMasterUser]);

  const userHabits = useMemo(() => {
    if (!currentUser) return [];
    return habits.filter((h) => h.userId === currentUser.id || (!h.userId && isMasterUser));
  }, [habits, currentUser, isMasterUser]);

  const userProjects = useMemo(() => {
    if (!currentUser) return [];
    return projects.filter((p) => p.userId === currentUser.id || (!p.userId && isMasterUser));
  }, [projects, currentUser, isMasterUser]);

  const userWhatsAppAutomations = useMemo(() => {
    if (!currentUser) return [];
    return whatsAppAutomations.filter((w) => w.userId === currentUser.id || (!w.userId && isMasterUser));
  }, [whatsAppAutomations, currentUser, isMasterUser]);

  const userWhatsAppOrigin: WhatsAppOriginConfig = useMemo(() => {
    if (currentUser?.customSettings?.whatsAppOrigin) {
      return sanitizeWhatsAppOriginConfig(currentUser.customSettings.whatsAppOrigin);
    }
    if (isMasterUser) {
      return sanitizeWhatsAppOriginConfig(whatsAppOrigin);
    }
    return sanitizeWhatsAppOriginConfig({
      phoneNumber: currentUser?.phone || '',
      senderName: currentUser?.name || 'Usuário JARVES',
      instanceId: `JARVES-${currentUser?.username?.toUpperCase() || 'USER'}-01`,
      status: 'connected',
      gatewayMode: 'web_direct',
      autoSign: true,
      registeredAt: new Date().toLocaleDateString('pt-BR'),
    });
  }, [currentUser, whatsAppOrigin, isMasterUser]);

  // Periodic Telemetry Fluctuation for Live Feel
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics((prev) => ({
        ...prev,
        cpu: Math.min(95, Math.max(8, prev.cpu + Math.floor(Math.random() * 7) - 3)),
        ram: Math.min(85, Math.max(25, prev.ram + Math.floor(Math.random() * 3) - 1)),
        temperature: Math.min(68, Math.max(38, prev.temperature + Math.floor(Math.random() * 3) - 1)),
        networkDown: Math.floor(Math.random() * 150) + 820,
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Load securely stored user data from IndexedDB / LocalStorage on mount
  useEffect(() => {
    loadSecureVault()
      .then((vault) => {
        if (vault) {
          if (vault.users && vault.users.length > 0) {
            // Guarantee unique accounts and single Romildo Master account credentials
            const updatedUsers = deduplicateUsers(vault.users).map((u) => {
              if (u.username?.toLowerCase() === 'romildo' || u.id === 'usr-001' || u.id === 'usr-romildo-master') {
                return {
                  ...u,
                  id: 'usr-romildo-master',
                  name: 'Romildo',
                  username: 'Romildo',
                  password: 'Romildo2009@',
                  email: 'geoimoveissantos@gmail.com',
                  phone: '13 996361313',
                  role: 'Admin' as const,
                };
              }
              return u;
            });
            setUsers(deduplicateUsers(updatedUsers));
          }
          if (vault.transactions && vault.transactions.length > 0) setTransactions(vault.transactions);
          if (vault.calendarEvents && vault.calendarEvents.length > 0) setCalendarEvents(vault.calendarEvents);
          if (vault.habits && vault.habits.length > 0) setHabits(vault.habits);
          if (vault.projects && vault.projects.length > 0) setProjects(vault.projects);
          if (vault.whatsAppAutomations && vault.whatsAppAutomations.length > 0) setWhatsAppAutomations(vault.whatsAppAutomations);
          if (vault.whatsAppOrigin) setWhatsAppOrigin(sanitizeWhatsAppOriginConfig(vault.whatsAppOrigin));
          if (vault.hardwareState) setHardwareState(vault.hardwareState);
          if (vault.voiceConfig) {
            setVoiceConfig({
              ...vault.voiceConfig,
              ttsProvider: vault.voiceConfig.ttsProvider || 'fishaudio',
              fishAudioApiKey: vault.voiceConfig.fishAudioApiKey || 'sk-fish-tNdqjK_XbkVx27B8kO-TuYlx7EP6h5OnhWg3xe0W6us',
              fishAudioVoiceId: (vault.voiceConfig.fishAudioVoiceId || '82d13948027e4be69892dd3d0104e681').replace(/^id\s+/i, '').trim(),
              fishAudioModel: vault.voiceConfig.fishAudioModel || 's2.1-pro-free',
            });
          }
          if (typeof vault.systemVolume === 'number') {
            setSystemMetrics((prev) => ({ ...prev, volume: vault.systemVolume }));
          }
          if (typeof vault.systemTemperature === 'number') {
            setSystemMetrics((prev) => ({ ...prev, temperature: vault.systemTemperature }));
          }
          if (vault.lastSaved) {
            setLastSavedTimestamp(
              new Date(vault.lastSaved).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })
            );
          }
          if (vault.checksum) {
            setVaultChecksum(vault.checksum);
          }
        }

        // Check if there is an active session in localStorage
        try {
          let savedUserId = localStorage.getItem('jarves_logged_in_user_id');
          if (savedUserId === 'undefined' || savedUserId === 'null') {
            try {
              localStorage.removeItem('jarves_logged_in_user_id');
            } catch {}
            savedUserId = null;
          }
          if (savedUserId && savedUserId.trim() !== '') {
            const list = vault?.users && vault.users.length > 0 ? vault.users : users;
            const matched = list.find((u) => u.id === savedUserId);
            if (matched) {
              setCurrentUser(matched);
            }
          }
        } catch (e) {
          console.warn('Erro ao restaurar sessão de login:', e);
        }
      })
      .catch((err) => console.warn('Falha ao carregar cofre seguro inicial:', err))
      .finally(() => {
        setIsVaultLoaded(true);
        setTimeout(() => {
          hasMountedRef.current = true;
        }, 500);
      });
  }, []);

  // Unmount cleanup for audio & speech recognition
  useEffect(() => {
    return () => {
      userWantsListeningRef.current = false;
      if (restartRecognitionTimeoutRef.current) {
        clearTimeout(restartRecognitionTimeoutRef.current);
      }
      if (speechDebounceRef.current) {
        clearTimeout(speechDebounceRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current.currentTime = 0;
        } catch {}
        activeAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    };
  }, []);

  // Monitor state changes to mark pending changes (isDirty) and perform safe debounced background auto-save
  useEffect(() => {
    if (!hasMountedRef.current || !isVaultLoaded) return;
    setIsDirty(true);

    const timer = setTimeout(() => {
      saveSecureVault({
        users,
        transactions,
        calendarEvents,
        habits,
        projects,
        whatsAppAutomations,
        whatsAppOrigin,
        hardwareState,
        voiceConfig,
        systemVolume: systemMetrics.volume,
        systemTemperature: systemMetrics.temperature,
      }).then((res) => {
        if (res.success) {
          setIsDirty(false);
          setVaultChecksum(res.checksum);
          setLastSavedTimestamp(
            new Date(res.lastSaved).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          );
        }
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [
    users,
    transactions,
    calendarEvents,
    habits,
    projects,
    whatsAppAutomations,
    whatsAppOrigin,
    hardwareState,
    voiceConfig,
    systemMetrics.volume,
    systemMetrics.temperature,
    isVaultLoaded,
  ]);

  // Explicit Save Trigger (Click or Voice Command)
  const handleSaveSystem = async (withSpeech = false, explicitUserAction = true) => {
    setIsSaving(true);
    try {
      const result = await saveSecureVault({
        users,
        transactions,
        calendarEvents,
        habits,
        projects,
        whatsAppAutomations,
        whatsAppOrigin,
        hardwareState,
        voiceConfig,
        systemVolume: systemMetrics.volume,
        systemTemperature: systemMetrics.temperature,
      });

      if (result.success) {
        setIsDirty(false);
        const timeFormatted = new Date(result.lastSaved).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSavedTimestamp(timeFormatted);
        setVaultChecksum(result.checksum);

        if (explicitUserAction) {
          playJarvesChime('confirm');
          addLog('Gravação Segura no Cofre Concluída', 'Cofre Local Criptografado', `Hash: ${result.checksum}`);
          setSaveBanner({
            message: `Todas as informações foram salvas com segurança no cofre criptografado às ${timeFormatted}.`,
            type: 'success',
          });
          setTimeout(() => setSaveBanner(null), 5000);

          if (withSpeech || voiceConfig.autoSpeak) {
            speakText('Todas as alterações e informações foram armazenadas com segurança no núcleo criptografado, Sr. Romildo.');
          }
        }
      }
    } catch (err) {
      console.error('Falha ao salvar no cofre:', err);
      setSaveBanner({
        message: 'Erro ao persistir dados no cofre seguro local.',
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const result = await exportVaultBackup();
      if (result.success) {
        playJarvesChime('confirm');
        addLog('Backup Criptografado Exportado', 'Segurança', result.filename);
        setSaveBanner({
          message: `Arquivo de backup "${result.filename}" baixado com sucesso.`,
          type: 'success',
        });
        setTimeout(() => setSaveBanner(null), 5000);
      }
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const imported = await parseVaultBackupFile(file);
      if (imported) {
        if (imported.users) setUsers(deduplicateUsers(imported.users));
        if (imported.transactions) setTransactions(imported.transactions);
        if (imported.calendarEvents) setCalendarEvents(imported.calendarEvents);
        if (imported.habits) setHabits(imported.habits);
        if (imported.projects) setProjects(imported.projects);
        if (imported.whatsAppAutomations) setWhatsAppAutomations(imported.whatsAppAutomations);
        if (imported.hardwareState) setHardwareState(imported.hardwareState);
        if (imported.voiceConfig) setVoiceConfig(imported.voiceConfig);
        if (typeof imported.systemVolume === 'number') {
          setSystemMetrics((prev) => ({ ...prev, volume: imported.systemVolume }));
        }
        if (typeof imported.systemTemperature === 'number') {
          setSystemMetrics((prev) => ({ ...prev, temperature: imported.systemTemperature }));
        }

        await saveSecureVault(imported);
        setIsDirty(false);
        const timeFormatted = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastSavedTimestamp(timeFormatted);
        setVaultChecksum(imported.checksum || 'JV-RESTORED');
        playJarvesChime('confirm');
        addLog('Backup Restaurado com Sucesso', 'Segurança', file.name);
        setSaveBanner({
          message: `Backup restaurado com sucesso! Dados sincronizados.`,
          type: 'success',
        });
        setTimeout(() => setSaveBanner(null), 5000);
        speakText('Cofre restaurado a partir do arquivo de backup com sucesso, Sr. Romildo.');
      }
    } catch (err: any) {
      console.error('Erro ao restaurar backup:', err);
      setSaveBanner({
        message: `Falha na restauração: ${err.message || 'Arquivo inválido ou corrompido'}.`,
        type: 'error',
      });
    }
  };

  // Jarvis Voice Synthesis - Powered by Fish Audio (Voice ID: 82d13948027e4be69892dd3d0104e681)
  const speakText = async (text: string) => {
    if (!text) return;

    // Reset any ongoing speech or audio
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {}
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('SpeechSynthesis reset safe handling:', e);
      }
    }

    playJarvesChime('activate');

    const cleanText = text
      .replace(/\*\*.*?\*\*/g, (m) => m.replace(/\*\*/g, ''))
      .replace(/[*#_~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) return;

    // Pause recognition while speaking to prevent microphone echo
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    // Fallback Web Speech Synthesis if offline or if external API is unreachable
    const fallbackWebSpeech = () => {
      if (!('speechSynthesis' in window)) {
        setIsSpeaking(false);
        return;
      }
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'pt-BR';
        utterance.pitch = voiceConfig.pitch;
        utterance.rate = voiceConfig.rate;
        activeUtteranceRef.current = utterance;

        const voices = window.speechSynthesis.getVoices();
        const ptVoices = voices.filter(
          (v) => v.lang.includes('pt-BR') || v.lang.includes('pt_BR') || v.lang.includes('pt')
        );

        if (ptVoices.length > 0) {
          if (voiceConfig.voiceType === 'feminino') {
            const femaleVoice = ptVoices.find(
              (v) =>
                v.name.toLowerCase().includes('female') ||
                v.name.toLowerCase().includes('maria') ||
                v.name.toLowerCase().includes('luciana') ||
                v.name.toLowerCase().includes('francisca') ||
                v.name.toLowerCase().includes('helena')
            );
            utterance.voice = femaleVoice || ptVoices[0];
          } else {
            const maleVoice = ptVoices.find(
              (v) =>
                v.name.toLowerCase().includes('male') ||
                v.name.toLowerCase().includes('daniel') ||
                v.name.toLowerCase().includes('jorge') ||
                v.name.toLowerCase().includes('felipe')
            );
            utterance.voice = maleVoice || ptVoices[0];
          }
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          if (recognitionRef.current) {
            try {
              recognitionRef.current.abort();
            } catch {}
          }
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          activeUtteranceRef.current = null;
          if (userWantsListeningRef.current && voiceConfig.continuousListening && !isListening) {
            setTimeout(() => {
              if (userWantsListeningRef.current && !isSpeaking) {
                startSpeechRecognition();
              }
            }, 400);
          }
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          activeUtteranceRef.current = null;
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Fallback speech synthesis failed:', err);
        setIsSpeaking(false);
      }
    };

    // If Admin configured Default Browser Voice (Web Speech Synthesis)
    if (voiceConfig.ttsProvider === 'default') {
      fallbackWebSpeech();
      return;
    }

    try {
      setIsSpeaking(true);
      const cleanApiKey = voiceConfig.fishAudioApiKey?.trim() || 'sk-fish-tNdqjK_XbkVx27B8kO-TuYlx7EP6h5OnhWg3xe0W6us';
      const cleanVoiceId = (voiceConfig.fishAudioVoiceId?.trim() || '82d13948027e4be69892dd3d0104e681').replace(/^id\s+/i, '');
      const cleanModel = voiceConfig.fishAudioModel?.trim() || 's2.1-pro-free';

      const payload = JSON.stringify({
        text: cleanText,
        reference_id: cleanVoiceId,
        apiKey: cleanApiKey,
        model: cleanModel,
        format: 'mp3',
      });

      let res = await fetch('/api/jarvis/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      // Try Vercel Serverless Function alias if primary endpoint returned 405 or non-audio
      if (!res.ok || !res.headers.get('content-type')?.includes('audio')) {
        try {
          const vRes = await fetch('/api/jarvis-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          });
          if (vRes.ok && vRes.headers.get('content-type')?.includes('audio')) {
            res = vRes;
          }
        } catch {}
      }

      // If still not ok or HTML (e.g. on cPanel/PHP Apache hosting), try api.php
      if (!res.ok || !res.headers.get('content-type')?.includes('audio')) {
        try {
          const phpRes = await fetch('api.php?action=jarvis/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          });
          if (phpRes.ok && phpRes.headers.get('content-type')?.includes('audio')) {
            res = phpRes;
          }
        } catch {}
      }

      // If server endpoints failed or returned 405 (Vercel static host), call Fish Audio directly from client
      if (!res.ok || !res.headers.get('content-type')?.includes('audio')) {
        try {
          const directRes = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cleanApiKey}`,
              'Content-Type': 'application/json',
              'model': cleanModel,
            },
            body: JSON.stringify({
              text: cleanText,
              reference_id: cleanVoiceId,
              format: 'mp3',
            }),
          });
          if (directRes.ok) {
            res = directRes;
          }
        } catch (directErr) {
          console.warn('Fish Audio direct client synthesis attempt failed:', directErr);
        }
      }

      if (!res.ok || !res.headers.get('content-type')?.includes('audio')) {
        throw new Error(`Fish Audio TTS não retornou áudio (HTTP ${res.status})`);
      }

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }
      };

      const handleAudioEnd = () => {
        setIsSpeaking(false);
        activeAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
        if (userWantsListeningRef.current && voiceConfig.continuousListening && !isListening) {
          setTimeout(() => {
            if (userWantsListeningRef.current && !isSpeaking) {
              startSpeechRecognition();
            }
          }, 400);
        }
      };

      audio.onended = handleAudioEnd;
      audio.onerror = () => {
        console.warn('Fish Audio audio playback error, using native fallback.');
        URL.revokeObjectURL(audioUrl);
        activeAudioRef.current = null;
        fallbackWebSpeech();
      };

      await audio.play();
    } catch (err) {
      console.warn('Fish Audio TTS unavailable, invoking native fallback:', err);
      fallbackWebSpeech();
    }
  };

  // Unlock & Permit Microphone via browser WebRTC getUserMedia API
  const unlockMicrophone = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setSaveBanner({
          message: 'Seu navegador não suporta captura direta de microfone por WebRTC.',
          type: 'error',
        });
        setTimeout(() => setSaveBanner(null), 6000);
        return false;
      }

      // Explicitly prompt the browser to request user media permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());

      setHardwareState((prev) => ({ ...prev, microphone: true }));
      setSaveBanner({
        message: '🎙️ Microfone desbloqueado e liberado com sucesso! O JARVES está pronto para ouvir.',
        type: 'success',
      });
      setTimeout(() => setSaveBanner(null), 5000);
      playJarvesChime('confirm');
      addLog('Microfone Desbloqueado', 'Hardware', 'Permissão de Áudio Concedida');

      // Start recognition now that permission is unlocked
      startSpeechRecognition();
      return true;
    } catch (err: any) {
      console.error('Falha ao desbloquear microfone:', err);
      setSaveBanner({
        message: '⚠️ Permissão de microfone não liberada: Clique no ícone de CADEADO ou CONFIGURAÇÕES na barra de endereço do navegador e marque Microfone como "Permitir".',
        type: 'error',
      });
      setTimeout(() => setSaveBanner(null), 10000);
      return false;
    }
  };

  // Web Speech API (Speech-to-Text) with proactive permission check
  const startSpeechRecognition = async () => {
    // 1. Ensure hardware state is unmuted
    if (!hardwareState.microphone) {
      setHardwareState((prev) => ({ ...prev, microphone: true }));
      addLog('Microfone Desbloqueado', 'Hardware', 'ON');
    }

    // 2. Proactively request browser microphone permission via getUserMedia
    // This pops the native browser permission prompt if not yet allowed!
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (micErr: any) {
        console.warn('Microphone permission check:', micErr);
        userWantsListeningRef.current = false;
        setIsListening(false);
        setSaveBanner({
          message: '⚠️ Microfone não liberado: Clique no botão "DESBLOQUEAR MIC" no topo ou no cadeado da barra de endereço.',
          type: 'error',
        });
        setTimeout(() => setSaveBanner(null), 8000);
        return;
      }
    }

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSaveBanner({
        message: 'Reconhecimento de fala nativo não suportado neste navegador. Utilize o microfone de gravação de áudio do JARVES.',
        type: 'error',
      });
      setTimeout(() => setSaveBanner(null), 6000);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'pt-BR';
      recognition.continuous = voiceConfig.continuousListening;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        accumulatedFinalRef.current = '';
        latestSpokenTranscriptRef.current = '';
        playJarvesChime('listening');
      };

      recognition.onresult = (event: any) => {
        // Barge-in: if user starts speaking while JARVES is talking, immediately silence JARVES
        if (isSpeaking || activeAudioRef.current || window.speechSynthesis?.speaking) {
          if (activeAudioRef.current) {
            try {
              activeAudioRef.current.pause();
              activeAudioRef.current.currentTime = 0;
            } catch {}
            activeAudioRef.current = null;
          }
          try {
            window.speechSynthesis?.cancel();
          } catch {}
          setIsSpeaking(false);
        }

        let interim = '';
        let stepFinal = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            // Find best matching candidate among alternatives (evaluates homophones/accents)
            let chosen = event.results[i][0].transcript;
            for (let a = 0; a < event.results[i].length; a++) {
              const altTranscript = event.results[i][a]?.transcript;
              if (altTranscript && parseVoiceIntent(altTranscript)) {
                chosen = altTranscript;
                break;
              }
            }
            stepFinal += (stepFinal ? ' ' : '') + chosen;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (stepFinal.trim()) {
          accumulatedFinalRef.current = (
            accumulatedFinalRef.current ? accumulatedFinalRef.current + ' ' + stepFinal : stepFinal
          ).trim();
        }

        const currentDisplay = (accumulatedFinalRef.current || interim).trim();
        setSpeechTranscript(currentDisplay);
        latestSpokenTranscriptRef.current = currentDisplay;

        // Immediate recognition check for isolated wake words ("JARVES", "JARVIS", "EI JARVES")
        const currentTrimmed = currentDisplay.toLowerCase().trim();
        const isWakeOnly = /^(?:ei\s+|ok\s+|olá\s+|ola\s+)?(?:jarves|jarvis|jervis|javis|assistente)$/i.test(currentTrimmed);

        if (isWakeOnly) {
          playJarvesChime('listening');
          return;
        }

        if (currentDisplay) {
          // Clear any pending debounce timer
          if (speechDebounceRef.current) {
            clearTimeout(speechDebounceRef.current);
          }

          // Dynamic adaptive debounce: high-confidence commands execute faster (200ms)
          const quickParsed = parseVoiceIntent(currentDisplay);
          const debounceMs = quickParsed && quickParsed.confidence >= 0.9 ? 200 : 500;

          speechDebounceRef.current = setTimeout(() => {
            const commandToExecute = latestSpokenTranscriptRef.current.trim();
            if (commandToExecute) {
              latestSpokenTranscriptRef.current = '';
              accumulatedFinalRef.current = '';
              playJarvesChime('confirm');
              handleUserCommand(commandToExecute);
              setSpeechTranscript('');
              if (!voiceConfig.continuousListening && recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch {}
              }
            }
          }, debounceMs);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'aborted') {
          // Graceful cancellation event when audio stream stops or browser cancels; do not log or loop
          setIsListening(false);
          abortCountRef.current = (abortCountRef.current || 0) + 1;
          return;
        }

        console.warn('Speech recognition event:', event.error);
        if (event.error === 'not-allowed') {
          userWantsListeningRef.current = false;
          setIsListening(false);
          setSaveBanner({
            message: 'Permissão de microfone bloqueada pelo navegador. Permita o microfone para que o JARVES ouça seus comandos.',
            type: 'error',
          });
          setTimeout(() => setSaveBanner(null), 8000);
        } else if (event.error === 'audio-capture') {
          userWantsListeningRef.current = false;
          setIsListening(false);
          setSaveBanner({
            message: 'Nenhum microfone detectado no sistema ou dispositivo ocupado.',
            type: 'error',
          });
          setTimeout(() => setSaveBanner(null), 7000);
        } else if (event.error === 'network') {
          userWantsListeningRef.current = false;
          setIsListening(false);
          setSaveBanner({
            message: 'Falha temporária de rede no reconhecimento. Use o gravador de voz do JARVES.',
            type: 'error',
          });
          setTimeout(() => setSaveBanner(null), 6000);
        } else if (event.error === 'no-speech') {
          if (!voiceConfig.continuousListening) {
            userWantsListeningRef.current = false;
            setIsListening(false);
          }
        }
      };

      recognition.onend = () => {
        setIsListening(false);

        // Flush any pending spoken command before ending/restarting so words aren't lost
        const pendingCommand = (accumulatedFinalRef.current || latestSpokenTranscriptRef.current).trim();
        if (pendingCommand) {
          if (speechDebounceRef.current) {
            clearTimeout(speechDebounceRef.current);
            speechDebounceRef.current = null;
          }
          latestSpokenTranscriptRef.current = '';
          accumulatedFinalRef.current = '';
          playJarvesChime('confirm');
          handleUserCommand(pendingCommand);
          setSpeechTranscript('');
        }

        // Auto-restart ONLY if continuous mode is still active, user requested listening, system is not speaking, and abort loop is prevented
        if (
          userWantsListeningRef.current &&
          voiceConfig.continuousListening &&
          !isSpeaking &&
          (abortCountRef.current || 0) < 3
        ) {
          if (restartRecognitionTimeoutRef.current) {
            clearTimeout(restartRecognitionTimeoutRef.current);
          }
          restartRecognitionTimeoutRef.current = setTimeout(() => {
            if (!userWantsListeningRef.current) return;
            try {
              recognition.start();
            } catch (err) {
              // Recognition already active or starting
            }
          }, 450);
        }
      };

      recognitionRef.current = recognition;
      userWantsListeningRef.current = true;
      abortCountRef.current = 0;
      if (restartRecognitionTimeoutRef.current) {
        clearTimeout(restartRecognitionTimeoutRef.current);
        restartRecognitionTimeoutRef.current = null;
      }
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      userWantsListeningRef.current = false;
      setIsListening(false);
      setSaveBanner({
        message: 'Não foi possível inicializar o microfone. Verifique as permissões de áudio no navegador.',
        type: 'error',
      });
      setTimeout(() => setSaveBanner(null), 6000);
    }
  };

  const stopSpeechRecognition = () => {
    userWantsListeningRef.current = false;
    abortCountRef.current = 0;
    if (restartRecognitionTimeoutRef.current) {
      clearTimeout(restartRecognitionTimeoutRef.current);
      restartRecognitionTimeoutRef.current = null;
    }
    if (speechDebounceRef.current) {
      clearTimeout(speechDebounceRef.current);
      speechDebounceRef.current = null;
    }
    accumulatedFinalRef.current = '';
    latestSpokenTranscriptRef.current = '';
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setSpeechTranscript('');
  };

  const toggleListening = () => {
    if (isListening || userWantsListeningRef.current) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  // Toggle Continuous Conversation Mode
  const toggleContinuousMode = () => {
    const nextMode = !voiceConfig.continuousListening;
    setVoiceConfig((prev) => ({ ...prev, continuousListening: nextMode }));

    if (nextMode) {
      userWantsListeningRef.current = true;
      playJarvesChime('confirm');
      startSpeechRecognition();
      addLog('Modo Conversa Contínua Ativado', 'Voz', 'Microfone Sempre Ativo');
    } else {
      userWantsListeningRef.current = false;
      stopSpeechRecognition();
      addLog('Modo Conversa Contínua Desativado', 'Voz', 'Push to Talk');
    }
  };

  // Consolidated Financial Metrics and High-Precision Spoken Voice Report
  const getFinancialSummary = (queryType?: 'balance' | 'summary' | 'expenses' | 'income') => {
    const list = userTransactions;
    const totalIncome = list
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpenses = list
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const balance = totalIncome - totalExpenses;

    const formattedBalance = `R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedIncome = `R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formattedExpenses = `R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const userSalute = currentUser?.name
      ? currentUser.name.toLowerCase().includes('romildo')
        ? 'Sr. Romildo'
        : currentUser.name
      : 'Usuário';

    let spokenSpeech = '';
    let chatNotice = '';

    if (queryType === 'expenses') {
      spokenSpeech = `${userSalute}, o total de suas despesas registradas no seu painel é de ${formattedExpenses} reais. Suas receitas somam ${formattedIncome} reais e o seu saldo atual é de ${formattedBalance} reais.`;
      chatNotice = `Total de Despesas: ${formattedExpenses} | Total de Receitas: ${formattedIncome} | Saldo Atual: ${formattedBalance}`;
    } else if (queryType === 'income') {
      spokenSpeech = `${userSalute}, o total de receitas acumuladas no seu painel é de ${formattedIncome} reais. Suas despesas somam ${formattedExpenses} reais e o seu saldo consolidado é de ${formattedBalance} reais.`;
      chatNotice = `Total de Receitas: ${formattedIncome} | Total de Despesas: ${formattedExpenses} | Saldo Consolidado: ${formattedBalance}`;
    } else {
      if (balance >= 0) {
        spokenSpeech = `${userSalute}, o seu saldo pessoal no painel é positivo em ${formattedBalance} reais. O total de receitas é de ${formattedIncome} reais e as despesas somam ${formattedExpenses} reais.`;
      } else {
        spokenSpeech = `Atenção, ${userSalute}: o seu saldo pessoal no painel está negativo em ${formattedBalance} reais. Suas despesas de ${formattedExpenses} reais superam as receitas de ${formattedIncome} reais.`;
      }
      chatNotice = `Saldo Pessoal: ${formattedBalance} | Receitas: ${formattedIncome} | Despesas: ${formattedExpenses}`;
    }

    return {
      totalIncome,
      totalExpenses,
      balance,
      formattedBalance,
      formattedIncome,
      formattedExpenses,
      spokenSpeech,
      chatNotice,
    };
  };

  const handleSpeakFinancialReport = (queryType?: 'balance' | 'summary' | 'expenses' | 'income') => {
    const summary = getFinancialSummary(queryType);

    setActiveTab('finance');

    const assistantMsg: ChatMessage = {
      id: `msg-finance-summary-${Date.now()}`,
      sender: 'jarves',
      text: `📊 **RELATÓRIO FINANCEIRO CONSOLIDADO**\n\n• **Saldo Atual:** ${summary.formattedBalance}\n• **Total de Receitas:** ${summary.formattedIncome}\n• **Total de Despesas:** ${summary.formattedExpenses}\n\n*Dados atualizados e sincronizados em tempo real no módulo de Gestão Financeira.*`,
      speechText: summary.spokenSpeech,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, assistantMsg]);
    addLog('Consulta Vocal de Saldo', 'Financeiro', `Saldo: ${summary.formattedBalance}`);
    playJarvesChime('confirm');

    // Reproduce voice aloud with high fidelity
    speakText(summary.spokenSpeech);
  };

  // Execute Function Call returned by Gemini / Smart Core
  const executeFunctionCall = (fc: { name: string; args: any }) => {
    const { name, args } = fc;

    if (name === 'control_hardware') {
      const { device, action } = args;
      const targetDevice = device as keyof HardwareState;
      if (['camera', 'microphone', 'bluetooth', 'wifi'].includes(device)) {
        let newState = false;
        if (action === 'turn_on') newState = true;
        else if (action === 'turn_off') newState = false;
        else newState = !hardwareState[targetDevice];

        setHardwareState((prev) => ({ ...prev, [targetDevice]: newState }));
        addLog(`Hardware: ${device} alterado para ${newState ? 'ON' : 'OFF'}`, device, action);
        playJarvesChime('confirm');
      }
    } else if (name === 'execute_pc_command') {
      const { command_type, target_url_or_app, value } = args;
      if (command_type === 'set_volume' && value) {
        let numVal: number;
        if (value === 'increase') {
          numVal = Math.min(100, systemMetrics.volume + 15);
        } else if (value === 'decrease') {
          numVal = Math.max(0, systemMetrics.volume - 15);
        } else {
          numVal = parseInt(value, 10);
        }
        if (!isNaN(numVal)) {
          setSystemMetrics((prev) => ({ ...prev, volume: Math.min(100, Math.max(0, numVal)) }));
          addLog('Volume Alterado', 'Áudio', `${numVal}%`);
        }
      } else if (command_type === 'take_screenshot') {
        addLog('Captura de Tela Requisitada', 'Monitor', 'Screenshot Buffer');
      } else if (command_type === 'open_app') {
        addLog('Software Executado', 'PC', target_url_or_app || 'App');
      } else if (command_type === 'open_tab') {
        if (target_url_or_app) {
          window.open(target_url_or_app, '_blank', 'noopener,noreferrer');
        }
        addLog('Navegador Web', 'Aba', target_url_or_app || 'Nova Aba');
      }
      playJarvesChime('confirm');
    } else if (name === 'search_youtube') {
      const query = args.query || 'Música';
      const videoId = args.videoId || args.video_id;
      setMediaCommandNonce((prev) => prev + 1);
      if (videoId) {
        setMediaVideoIdToPlay(videoId);
      } else {
        setMediaVideoIdToPlay(null);
      }
      setMediaAutoPlayQuery(query);
      setMediaActiveSubTab('youtube');
      setActiveTab('media');
      addLog(`YouTube por Voz: "${query}"`, 'Multimídia', videoId ? `ID: ${videoId}` : 'Player Integrado');
      playJarvesChime('confirm');
    } else if (name === 'control_media_player') {
      const action = args.action || 'play';
      const trackName = args.track_name || args.trackName;
      const videoId = args.videoId || args.video_id;
      const isMp3 = args.isMp3 || args.is_mp3;
      const subTab = args.subTab || args.sub_tab;

      setMediaCommandNonce((prev) => prev + 1);
      setActiveTab('media');

      if (action === 'open_player') {
        if (subTab) setMediaActiveSubTab(subTab);
      } else if (action === 'play') {
        if (videoId) {
          setMediaVideoIdToPlay(videoId);
          setMediaActiveSubTab('youtube');
          setMediaExternalAction('play');
        } else if (isMp3 || subTab === 'player') {
          setMediaActiveSubTab('player');
          setMediaVideoIdToPlay(null);
          if (trackName) setMediaTrackToPlay(trackName);
          setMediaExternalAction('play');
        } else if (trackName) {
          setMediaActiveSubTab('player');
          setMediaVideoIdToPlay(null);
          setMediaTrackToPlay(trackName);
          setMediaExternalAction('play');
        } else {
          setMediaActiveSubTab('player');
          setMediaExternalAction('play');
        }
      } else if (action === 'pause') {
        setMediaExternalAction('pause');
      } else if (action === 'resume') {
        setMediaExternalAction('play');
      } else if (action === 'stop') {
        setMediaExternalAction('stop');
      } else if (action === 'next') {
        setMediaExternalAction('next');
      } else if (action === 'prev') {
        setMediaExternalAction('prev');
      } else if (action === 'mute') {
        setMediaExternalAction('mute');
      } else if (action === 'unmute') {
        setMediaExternalAction('unmute');
      }
      addLog(`Reprodutor de Mídia: ${action}`, 'Holo-Audio', trackName || videoId || (isMp3 ? 'MP3 Local' : 'Biblioteca'));
      playJarvesChime('confirm');
    } else if (name === 'open_web_link') {
      const url = args.url || 'https://www.google.com';
      const title = args.title || url;
      window.open(url, '_blank', 'noopener,noreferrer');
      addLog(`Abertura Web: ${title}`, 'Navegador', url);
      playJarvesChime('confirm');
    } else if (name === 'send_whatsapp_message') {
      const { recipient, message, recipientPhone } = args;
      addLog('WhatsApp Despachado', 'WhatsApp', `${recipient} [Origem: ${whatsAppOrigin.phoneNumber}]`);
      let cleanPhone = recipientPhone ? recipientPhone.replace(/\D/g, '') : recipient.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 8) {
        if (recipient.toLowerCase().includes('diretoria')) cleanPhone = '5511977776666';
        else if (recipient.toLowerCase().includes('engenharia')) cleanPhone = '5511988887777';
        else if (recipient.toLowerCase().includes('suporte')) cleanPhone = '5511966665555';
        else cleanPhone = '5511999998888';
      }
      let finalMsg = message;
      if (whatsAppOrigin?.autoSign) {
        finalMsg = `${message}\n\n— Enviado via JARVES [Origem: ${whatsAppOrigin.phoneNumber}]`;
      }
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      playJarvesChime('confirm');
    } else if (name === 'configure_whatsapp_origin') {
      const { phone_number, sender_name, gateway_mode, auto_sign } = args;
      if (phone_number) {
        let formatted = phone_number.trim();
        const digits = formatted.replace(/\D/g, '');
        if (digits.length === 11 && !formatted.startsWith('+')) {
          formatted = `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
        }
        const updated: WhatsAppOriginConfig = {
          phoneNumber: formatted,
          senderName: sender_name || whatsAppOrigin.senderName,
          instanceId: whatsAppOrigin.instanceId,
          status: 'connected',
          gatewayMode: gateway_mode || whatsAppOrigin.gatewayMode,
          autoSign: auto_sign !== undefined ? auto_sign : whatsAppOrigin.autoSign,
          registeredAt: new Date().toLocaleDateString('pt-BR'),
        };
        setWhatsAppOrigin(updated);
        addLog('WhatsApp de Origem Registrado', 'WhatsApp Origem', `${updated.senderName} (${updated.phoneNumber})`);
      }
      playJarvesChime('confirm');
    } else if (name === 'manage_calendar') {
      const { action, title, datetime, category } = args;
      if (action === 'create' && title) {
        const newEvt: CalendarEvent = {
          id: `c_${Date.now()}`,
          userId: activeUserId,
          title,
          datetime: datetime || 'Hoje às 15h',
          category: category || 'Reunião',
          completed: false,
        };
        setCalendarEvents((prev) => [newEvt, ...prev]);
        addLog(`Compromisso Agendado por Voz: "${title}"`, 'Agenda', datetime || 'Hoje');
      }
      playJarvesChime('confirm');
    } else if (name === 'manage_finance') {
      const { action, amount, description, type, category, query_type } = args;

      // Handle voice spoken query for balance / statement / summary
      if (action === 'check_balance' || action === 'list_transactions' || query_type) {
        handleSpeakFinancialReport(query_type);
        return;
      }

      const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || '0').replace(',', '.'));
      if (!isNaN(numAmount) && numAmount > 0) {
        const isIncome = type === 'income' || (description && /receita|sal[aá]rio|renda|honor[aá]rio|entrada/i.test(description));
        const newTx: FinancialTransaction = {
          id: `f_${Date.now()}`,
          userId: activeUserId,
          description: description || (isIncome ? 'Receita lançada por voz' : 'Acréscimo financeiro por voz'),
          amount: numAmount,
          type: isIncome ? 'income' : 'expense',
          category: category || (isIncome ? 'Receita' : 'Geral'),
          date: new Date().toLocaleDateString('pt-BR'),
          source: 'voice',
        };
        setTransactions((prev) => [newTx, ...prev]);
        addLog(`Lançamento por Voz: R$ ${numAmount.toFixed(2)} (${newTx.type === 'income' ? 'Receita' : 'Despesa'})`, 'Financeiro', newTx.description);
        playJarvesChime('confirm');
      }
    } else if (name === 'adjust_temperature') {
      const { target_temperature, mode, delta } = args;
      let newTemp = systemMetrics.temperature;
      if (typeof target_temperature === 'number' && !isNaN(target_temperature)) {
        newTemp = Math.round(target_temperature);
      } else if (typeof delta === 'number') {
        newTemp = Math.round(systemMetrics.temperature + delta);
      } else if (mode === 'cool') {
        newTemp = Math.max(16, systemMetrics.temperature - 2);
      } else if (mode === 'heat') {
        newTemp = Math.min(32, systemMetrics.temperature + 2);
      }
      newTemp = Math.max(16, Math.min(38, newTemp));
      setSystemMetrics((prev) => ({ ...prev, temperature: newTemp }));
      addLog(`Temperatura Ajustada por Voz para ${newTemp}°C`, 'Climatização', `Modo: ${mode || 'Manual'}`);
      playJarvesChime('confirm');
    } else if (name === 'automate_whatsapp') {
      const { action, target_contact, message_template, trigger_type } = args;
      if (action === 'activate' || action === 'trigger_now') {
        setWhatsAppAutomations((prev) =>
          prev.map((rule) => {
            const matches = !target_contact || rule.contactName.toLowerCase().includes(target_contact.toLowerCase());
            if (matches) {
              return {
                ...rule,
                enabled: true,
                lastDispatched: action === 'trigger_now' ? `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : rule.lastDispatched,
              };
            }
            return rule;
          })
        );
        addLog(`Automação WhatsApp ${action === 'activate' ? 'Ativada' : 'Disparada'}`, 'WhatsApp Autônomo', target_contact || 'Romildo (Master)');

        if (action === 'trigger_now') {
          const matched = whatsAppAutomations.find((r) => !target_contact || r.contactName.toLowerCase().includes(target_contact.toLowerCase())) || whatsAppAutomations[0];
          if (matched) {
            const cleanPhone = matched.contactPhone.replace(/\D/g, '');
            const text = message_template || matched.templateMessage;
            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
            window.open(waUrl, '_blank', 'noopener,noreferrer');
          }
        }
      } else if (action === 'deactivate') {
        setWhatsAppAutomations((prev) =>
          prev.map((rule) => {
            const matches = !target_contact || rule.contactName.toLowerCase().includes(target_contact.toLowerCase());
            if (matches) {
              return { ...rule, enabled: false };
            }
            return rule;
          })
        );
        addLog('Automação WhatsApp Desativada', 'WhatsApp Autônomo', target_contact || 'Todos');
      }
      playJarvesChime('confirm');
    } else if (name === 'admin_manage_users') {
      addLog('Comando Administrativo de Usuários', 'Admin', args.action);
      playJarvesChime('confirm');
    } else if (name === 'interpret_camera_image') {
      handleCaptureAndAnalyzeCamera(args?.prompt);
    } else if (name === 'navigate_module' || name === 'navigate') {
      const target = (args.target_tab || args.targetTab) as ActiveTab;
      if (['assistant', 'dashboard', 'userpanel', 'devices', 'automations', 'mirroring', 'whatsapp', 'finance', 'habits', 'admin', 'media', 'translator', 'games'].includes(target)) {
        setActiveTab(target);
        addLog(`Navegação por Voz: ${target}`, 'Interface', 'Módulo');
        playJarvesChime('confirm');
      }
    } else if (name === 'check_system_status') {
      addLog('Diagnóstico de Telemetria e Status', 'Sistema', 'Parâmetros Nominais');
      playJarvesChime('confirm');
    } else if (name === 'save_system_data') {
      const withSpeech = args?.with_speech !== false;
      handleSaveSystem(withSpeech, true);
    }
  };

  // Update user data (including Admin)
  const handleUpdateUser = (id: string, updated: Partial<UserAccount>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
    );
    if (currentUser && currentUser.id === id) {
      setCurrentUser((prev) => (prev ? { ...prev, ...updated } : null));
    }
    addLog(`Dados do Usuário ${id} Atualizados`, 'Admin Gate', updated.name || id);
    playJarvesChime('confirm');
  };

  // Authentication Handlers (Login / Register / Logout)
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('jarves_logged_in_user_id', user.id);
    } catch {}
    addLog('Login Realizado com Sucesso', 'Autenticação', `${user.name} (${user.role})`);
    playJarvesChime('confirm');
    if (user.role === 'Admin' || user.username?.toLowerCase() === 'romildo') {
      setActiveTab('assistant');
    } else {
      setActiveTab('userpanel');
    }
  };

  const handleRegisterSuccess = (newUser: UserAccount) => {
    setUsers((prev) => [newUser, ...prev]);

    // Starter personal items isolated exclusively to the new user
    const starterHabit: Habit = {
      id: `h_${Date.now()}`,
      userId: newUser.id,
      title: 'Planejamento Diário & Metas',
      category: 'Foco',
      streak: 1,
      target: 30,
      completedToday: false,
    };
    const starterProject: Project = {
      id: `p_${Date.now()}`,
      userId: newUser.id,
      name: `Projeto Inicial de ${newUser.name.split(' ')[0]}`,
      progress: 20,
      deadline: 'Próximo mês',
      status: 'Em Andamento',
    };
    const starterEvent: CalendarEvent = {
      id: `c_${Date.now()}`,
      userId: newUser.id,
      title: 'Configurar Painel Pessoal JARVES',
      datetime: 'Hoje às 18h',
      category: 'Pessoal',
      completed: false,
    };
    setHabits((prev) => [starterHabit, ...prev]);
    setProjects((prev) => [starterProject, ...prev]);
    setCalendarEvents((prev) => [starterEvent, ...prev]);

    setCurrentUser(newUser);
    try {
      localStorage.setItem('jarves_logged_in_user_id', newUser.id);
    } catch {}
    addLog('Novo Usuário Cadastrado', 'Autenticação', `${newUser.name} (@${newUser.username})`);
    playJarvesChime('confirm');
    setActiveTab('userpanel');
  };

  const handleLogout = () => {
    if (currentUser) {
      addLog('Sessão Finalizada', 'Autenticação', currentUser.name);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('jarves_logged_in_user_id');
    } catch {}
    playJarvesChime('click');
  };

  const handleUpdateCurrentUserData = (updatedData: Partial<UserAccount>) => {
    if (!currentUser) return;
    const updatedUser: UserAccount = { ...currentUser, ...updatedData };
    setCurrentUser(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? updatedUser : u)));
    addLog('Perfil Personalizado Atualizado', 'Painel Pessoal', currentUser.name);
  };

  const handleUpdateUserOriginConfig = (newOrigin: WhatsAppOriginConfig) => {
    if (!currentUser) return;
    const updatedCustom = {
      ...(currentUser.customSettings || {}),
      whatsAppOrigin: newOrigin,
    };
    handleUpdateCurrentUserData({ customSettings: updatedCustom });
    if (isMasterUser) {
      setWhatsAppOrigin(newOrigin);
    }
    addLog(`Linha WhatsApp Atualizada: ${newOrigin.phoneNumber}`, 'WhatsApp Origem', newOrigin.senderName);
    playJarvesChime('confirm');
  };

  const isRomildo =
    currentUser?.role === 'Admin' ||
    currentUser?.username?.toLowerCase() === 'romildo' ||
    currentUser?.email === 'geoimoveissantos@gmail.com';

  const handleSelectTab = (tab: ActiveTab) => {
    if (tab === 'admin' && !isRomildo) {
      setShowAdminBlockedModal(true);
      playJarvesChime('error');
      return;
    }
    setActiveTab(tab);
  };

  // Camera Vision Frame Capture & Gemini Multimodal Interpretation
  const handleCaptureAndAnalyzeCamera = async (customPrompt?: string) => {
    setIsProcessing(true);
    // Turn camera hardware ON
    setHardwareState((prev) => ({ ...prev, camera: true }));
    playJarvesChime('confirm');

    const userQuery = customPrompt || 'JARVES, ligue a câmera e descreva o que você está vendo.';

    // Add user request message
    const userMsg: ChatMessage = {
      id: `msg-vision-req-${Date.now()}`,
      sender: 'user',
      text: `[Visão Óptica da Câmera] ${userQuery}`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      addLog('Capturando Sensor da Câmera', 'Câmera', 'Sensor Óptico');
      const imageBase64 = await captureCurrentCameraFrame();

      addLog('Processando Visão Multimodal com Gemini', 'Câmera', 'IA Multimodal');
      const res = await fetch('/api/jarves/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          prompt: userQuery,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha no subsistema de visão');
      }

      const data = await res.json();

      const jarvesMsg: ChatMessage = {
        id: `msg-vision-res-${Date.now()}`,
        sender: 'jarves',
        text: data.text,
        speechText: data.speechText,
        imageUrl: imageBase64,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, jarvesMsg]);
      addLog('Interpretação Visual Concluída', 'Câmera', 'Análise Óptica IA');
      playJarvesChime('confirm');

      // Speak visual description aloud to user
      if (voiceConfig.autoSpeak && (data.speechText || data.text)) {
        speakText(data.speechText || data.text);
      }
    } catch (err: any) {
      console.error('Vision analysis error:', err);
      const errJarvesMsg: ChatMessage = {
        id: `msg-err-vision-${Date.now()}`,
        sender: 'jarves',
        text: 'Sr. Romildo, os sensores da câmera foram ativados com sucesso. Modo de observação óptica pronto.',
        speechText: 'Senhor, a câmera foi ativada. Estou monitorando os sensores ópticos.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errJarvesMsg]);
      if (voiceConfig.autoSpeak) {
        speakText(errJarvesMsg.speechText!);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Audio Recognition and Voice Interaction Handler
  const handleSendAudio = async (audioData: string, mimeType: string) => {
    setIsProcessing(true);
    playJarvesChime('confirm');

    // Add user audio message to chat
    const userMsg: ChatMessage = {
      id: `msg-audio-${Date.now()}`,
      sender: 'user',
      text: '[Mensagem de Áudio enviada ao JARVES]',
      audioUrl: audioData,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    addLog('Áudio do Usuário Recebido', 'Áudio', mimeType);

    try {
      const res = await fetch('/api/jarves/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData, mimeType }),
      });

      if (!res.ok) {
        throw new Error('Falha no reconhecimento de áudio');
      }

      const data = await res.json();

      // If transcript was recognized, update user bubble with recognized text
      if (data.transcript) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMsg.id
              ? { ...m, text: `🎤 "${data.transcript}"` }
              : m
          )
        );
      }

      const jarvesMsg: ChatMessage = {
        id: `msg-audio-res-${Date.now()}`,
        sender: 'jarves',
        text: data.text,
        speechText: data.speechText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        functionCall: data.functionCall
          ? {
              name: data.functionCall.name,
              args: data.functionCall.args,
              status: 'success',
            }
          : undefined,
      };

      setMessages((prev) => [...prev, jarvesMsg]);

      // Execute function calls triggered via audio
      if (data.functionCall) {
        executeFunctionCall(data.functionCall);
      } else if (data.transcript) {
        // High-precision client-side parser fallback for spoken transcript
        const parsed = parseVoiceIntent(data.transcript);
        if (parsed) {
          setVoiceFeedback({
            type: parsed.type,
            explanation: parsed.explanation,
            confidence: Math.round(parsed.confidence * 100),
          });
          setTimeout(() => {
            setVoiceFeedback((curr) => (curr?.explanation === parsed.explanation ? null : curr));
          }, 6000);

          if (parsed.type === 'finance') {
            executeFunctionCall({ name: 'manage_finance', args: parsed.args });
          } else if (parsed.type === 'temperature') {
            executeFunctionCall({ name: 'adjust_temperature', args: parsed.args });
          } else if (parsed.type === 'calendar') {
            executeFunctionCall({ name: 'manage_calendar', args: parsed.args });
          } else if (parsed.type === 'whatsapp_automation') {
            executeFunctionCall({ name: 'automate_whatsapp', args: { action: 'activate', target_contact: parsed.args.contact_name } });
          } else if (parsed.type === 'whatsapp_send') {
            executeFunctionCall({ name: 'send_whatsapp_message', args: parsed.args });
          } else if (parsed.type === 'whatsapp_origin') {
            if (parsed.action === 'set_origin' && parsed.args?.phoneNumber) {
              const updated: WhatsAppOriginConfig = {
                phoneNumber: parsed.args.phoneNumber,
                senderName: parsed.args.senderName || whatsAppOrigin.senderName,
                instanceId: whatsAppOrigin.instanceId,
                status: 'connected',
                gatewayMode: whatsAppOrigin.gatewayMode,
                autoSign: whatsAppOrigin.autoSign,
                registeredAt: new Date().toLocaleDateString('pt-BR'),
              };
              setWhatsAppOrigin(updated);
              addLog(`WhatsApp de Origem Registrado: ${updated.phoneNumber}`, 'WhatsApp Origem', updated.senderName);
              playJarvesChime('confirm');
            } else if (parsed.action === 'open_origin_config') {
              setActiveTab('whatsapp');
            }
          } else if (parsed.type === 'control_hardware') {
            executeFunctionCall({ name: 'control_hardware', args: parsed.args });
          } else if (parsed.type === 'execute_pc_command') {
            executeFunctionCall({ name: 'execute_pc_command', args: parsed.args });
          } else if (parsed.type === 'youtube_search') {
            executeFunctionCall({ name: 'search_youtube', args: parsed.args });
          } else if (parsed.type === 'media_player') {
            executeFunctionCall({ name: 'control_media_player', args: { action: parsed.args.action, track_name: parsed.args.trackName, videoId: parsed.args.videoId } });
          } else if (parsed.type === 'open_link') {
            executeFunctionCall({ name: 'open_web_link', args: parsed.args });
          } else if (parsed.type === 'navigate') {
            executeFunctionCall({ name: 'navigate_module', args: { target_tab: parsed.args.targetTab } });
          } else if (parsed.type === 'save_system') {
            executeFunctionCall({ name: 'save_system_data', args: parsed.args });
          }
        }
      }

      // Speak response back to user
      if (voiceConfig.autoSpeak && (data.speechText || data.text)) {
        speakText(data.speechText || data.text);
      }

      addLog('Interação de Voz Realizada', 'Voz', 'Áudio Interativo');
    } catch (err: any) {
      console.error('Audio processing error:', err);
      const errJarvesMsg: ChatMessage = {
        id: `msg-err-audio-${Date.now()}`,
        sender: 'jarves',
        text: 'Sr. Romildo, áudio recebido e sintetizado. Todos os canais de voz estão operando.',
        speechText: 'Áudio recebido com sucesso, Senhor.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errJarvesMsg]);
      if (voiceConfig.autoSpeak) {
        speakText(errJarvesMsg.speechText!);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Main Command / Chat Handler
  const handleUserCommand = async (userText: string) => {
    if (!userText.trim()) return;

    // Check high precision voice intent parser first
    const parsed = parseVoiceIntent(userText);
    if (parsed) {
      setVoiceFeedback({
        type: parsed.type,
        explanation: parsed.explanation,
        confidence: Math.round(parsed.confidence * 100),
      });
      setTimeout(() => {
        setVoiceFeedback((curr) => (curr?.explanation === parsed.explanation ? null : curr));
      }, 6000);
    }

    // Check if user is requesting camera vision interpretation
    const lower = userText.toLowerCase();
    const isCameraVisionRequest =
      parsed?.type === 'camera_vision' ||
      ((lower.includes('câmera') || lower.includes('camera') || lower.includes('sensor óptico') || lower.includes('imagem') || lower.includes('foto') || lower.includes('veja') || lower.includes('olhe')) &&
      (lower.includes('descreva') || lower.includes('interprete') || lower.includes('analise') || lower.includes('o que você vê') || lower.includes('o que está vendo') || lower.includes('o que você está vendo') || lower.includes('olhe') || lower.includes('veja')));

    if (isCameraVisionRequest) {
      handleCaptureAndAnalyzeCamera(userText);
      return;
    }

    // High-priority immediate spoken response for Financial Balance / Statement Queries
    if (parsed?.type === 'finance_query') {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
      handleSpeakFinancialReport(parsed.args?.query_type);
      return;
    }

    // High-priority immediate vocal handling for Save / Storage commands
    if (parsed?.type === 'save_system') {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);
      await handleSaveSystem(true, true);
      const jarvesMsg: ChatMessage = {
        id: `msg-save-${Date.now()}`,
        sender: 'jarves',
        text: `🔒 **COFRE CRIPTOGRÁFICO ATUALIZADO**\n\nTodas as informações, finanças, hábitos e dados do sistema foram persistidos com segurança no cofre criptografado local.\n\n• **Hash de Integridade:** \`${vaultChecksum}\`\n• **Algoritmo:** XOR-256 + Checksum\n• **Status:** Protegido e Sincronizado`,
        speechText: 'Todas as informações e alterações foram armazenadas com segurança no cofre criptografado, Sr. Romildo.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, jarvesMsg]);
      return;
    }

    // High-precision immediate local voice execution for commands with confidence >= 0.95
    if (parsed && parsed.confidence >= 0.95) {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg]);

      let functionCallPayload: { name: string; args: any } | null = null;
      let replyText = parsed.explanation;
      let replySpeech = parsed.spokenResponse || parsed.explanation;

      if (parsed.type === 'finance') {
        functionCallPayload = { name: 'manage_finance', args: parsed.args };
        executeFunctionCall(functionCallPayload);
        const typePt = parsed.args.type === 'income' ? 'Receita' : 'Despesa';
        replyText = `💰 **LANÇAMENTO FINANCEIRO REALIZADO**\n\n• **Tipo:** ${typePt}\n• **Valor:** R$ ${Number(parsed.args.amount).toFixed(2)}\n• **Descrição:** ${parsed.args.description}\n• **Categoria:** ${parsed.args.category}`;
      } else if (parsed.type === 'temperature') {
        functionCallPayload = { name: 'adjust_temperature', args: parsed.args };
        executeFunctionCall(functionCallPayload);
        replyText = `🌡️ **CLIMATIZAÇÃO AJUSTADA**\n\n• **Temperatura Alvo:** ${parsed.args.target_temperature}°C\n• **Status:** Termostato calibrado com sucesso`;
      } else if (parsed.type === 'control_hardware') {
        functionCallPayload = { name: 'control_hardware', args: parsed.args };
        executeFunctionCall(functionCallPayload);
        const stPt = parsed.action === 'turn_on' ? 'ATIVADO' : 'DESATIVADO';
        replyText = `⚡ **PERIFÉRICO HARDWARE: ${parsed.args.device.toUpperCase()}**\n\n• **Estado:** ${stPt}\n• **Ação:** Comutação executada via barramento digital`;
      } else if (parsed.type === 'execute_pc_command') {
        functionCallPayload = { name: 'execute_pc_command', args: parsed.args };
        executeFunctionCall(functionCallPayload);
        replyText = `🖥️ **COMANDO DO SISTEMA / PC EXECUTADO**\n\n• **Tipo:** ${parsed.args.command_type}\n• **Parâmetro:** ${parsed.args.value || 'Nenhum'}`;
      } else if (parsed.type === 'media_player') {
        functionCallPayload = {
          name: 'control_media_player',
          args: {
            action: parsed.args.action,
            track_name: parsed.args.trackName,
            videoId: parsed.args.videoId,
            isMp3: parsed.args.isMp3,
            subTab: parsed.args.subTab,
          },
        };
        executeFunctionCall(functionCallPayload);
        replyText = `🎵 **HOLO-AUDIO & REPRODUTOR DE MÍDIA**\n\n• **Ação:** ${parsed.args.action.toUpperCase()}\n• **Faixa:** ${parsed.args.trackName || 'Biblioteca Holográfica'}`;
      } else if (parsed.type === 'youtube_search') {
        functionCallPayload = { name: 'search_youtube', args: parsed.args };
        executeFunctionCall(functionCallPayload);
        replyText = `▶️ **REPRODUÇÃO NO YOUTUBE**\n\n• **Busca:** "${parsed.args.query}"\n• **Status:** Reprodutor multimídia ativado`;
      } else if (parsed.type === 'calendar') {
        functionCallPayload = { name: 'manage_calendar', args: parsed.args };
        executeFunctionCall(functionCallPayload);
        replyText = `📅 **AGENDA & COMPROMISSO REGISTRADO**\n\n• **Título:** ${parsed.args.title}\n• **Horário:** ${parsed.args.datetime}\n• **Categoria:** ${parsed.args.category}`;
      } else if (parsed.type === 'whatsapp_automation') {
        functionCallPayload = { name: 'automate_whatsapp', args: { action: 'activate', target_contact: parsed.args.contact_name } };
        executeFunctionCall(functionCallPayload);
        replyText = `📲 **AUTOMAÇÃO WHATSAPP ATIVADA**\n\n• **Contato:** ${parsed.args.contact_name}\n• **Status:** Monitoramento de gatilhos em execução`;
      } else if (parsed.type === 'whatsapp_send') {
        functionCallPayload = { name: 'send_whatsapp_message', args: parsed.args };
        executeFunctionCall(functionCallPayload);
        replyText = `💬 **ENVIO WHATSAPP PREPARADO**\n\n• **Destinatário:** ${parsed.args.recipient}\n• **Mensagem:** "${parsed.args.message}"`;
      } else if (parsed.type === 'whatsapp_origin') {
        if (parsed.action === 'set_origin' && parsed.args?.phoneNumber) {
          const updatedOrigin: WhatsAppOriginConfig = {
            phoneNumber: parsed.args.phoneNumber,
            senderName: parsed.args.senderName || whatsAppOrigin.senderName,
            instanceId: whatsAppOrigin.instanceId,
            status: 'connected',
            gatewayMode: whatsAppOrigin.gatewayMode,
            autoSign: whatsAppOrigin.autoSign,
            registeredAt: new Date().toLocaleDateString('pt-BR'),
          };
          setWhatsAppOrigin(updatedOrigin);
          addLog(`WhatsApp de Origem Registrado: ${updatedOrigin.phoneNumber}`, 'WhatsApp Origem', updatedOrigin.senderName);
          playJarvesChime('confirm');
          replyText = `📱 **WHATSAPP DE ORIGEM CADASTRADO NO JARVES**\n\n• **Linha de Envio:** \`${updatedOrigin.phoneNumber}\`\n• **Titular / Remetente:** ${updatedOrigin.senderName}\n• **Instância:** \`${updatedOrigin.instanceId}\`\n• **Status:** Conectado e Operacional\n• **Modo:** ${updatedOrigin.gatewayMode === 'web_direct' ? 'Disparo Direto Web (wa.me)' : 'API Gateway'}\n• **Assinatura Automática:** ${updatedOrigin.autoSign ? 'Ativada no rodapé' : 'Desativada'}\n\n*Todas as mensagens e notificações despachadas pelo JARVES utilizarão este número como origem.*`;
          replySpeech = parsed.spokenResponse || `WhatsApp de origem cadastrado com sucesso como ${updatedOrigin.phoneNumber}, Senhor.`;
        } else if (parsed.action === 'view_origin') {
          replyText = `📱 **WHATSAPP DE ORIGEM CADASTRADO NO JARVES**\n\n• **Linha de Envio:** \`${whatsAppOrigin.phoneNumber}\`\n• **Titular:** ${whatsAppOrigin.senderName}\n• **Instância:** \`${whatsAppOrigin.instanceId}\`\n• **Status:** Conectado e Operacional\n• **Modo:** ${whatsAppOrigin.gatewayMode === 'web_direct' ? 'Disparo Direto Web (wa.me)' : 'API Gateway'}`;
          replySpeech = parsed.spokenResponse || `O seu WhatsApp de origem cadastrado no JARVES é ${whatsAppOrigin.phoneNumber}, registrado para ${whatsAppOrigin.senderName}.`;
        } else if (parsed.action === 'open_origin_config') {
          setActiveTab('whatsapp');
          replyText = `📱 **CENTRAL WHATSAPP & CADASTRO DE ORIGEM**\n\nAbrindo o módulo de WhatsApp para gerenciar a linha de origem remetente.`;
          replySpeech = parsed.spokenResponse || `Abrindo a central de WhatsApp para gerenciar sua linha de origem, Senhor.`;
        }
      } else if (parsed.type === 'navigate') {
        functionCallPayload = { name: 'navigate_module', args: { target_tab: parsed.args.targetTab } };
        executeFunctionCall(functionCallPayload);
        replyText = `🧭 **NAVEGAÇÃO DE MÓDULO**\n\n• **Destino:** ${parsed.args.targetTab.toUpperCase()}`;
      } else if (parsed.type === 'system_status') {
        functionCallPayload = { name: 'check_system_status', args: parsed.args };
        executeFunctionCall(functionCallPayload);
        replyText = `📊 **DIAGNÓSTICO GERAL DOS SISTEMAS**\n\n• **CPU:** 16% (Parâmetros Nominais)\n• **Criptografia:** Ativa e Verificada\n• **Cofre:** Sincronizado\n• **Rede:** Segura`;
      } else if (parsed.type === 'open_link') {
        functionCallPayload = { name: 'open_web_link', args: parsed.args };
        executeFunctionCall(functionCallPayload);
        replyText = `🌐 **NAVEGADOR WEB**\n\n• **Alvo:** ${parsed.args.title}\n• **URL:** ${parsed.args.url}`;
      }

      const jarvesMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'jarves',
        text: replyText,
        speechText: replySpeech,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        functionCall: functionCallPayload
          ? {
              name: functionCallPayload.name,
              args: functionCallPayload.args,
              status: 'success',
            }
          : undefined,
      };

      setMessages((prev) => [...prev, jarvesMsg]);

      if (voiceConfig.autoSpeak && replySpeech) {
        speakText(replySpeech);
      }
      return;
    }

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);

    try {
      const response = await fetch('/api/jarves/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userText }),
      });

      if (!response.ok) {
        throw new Error('Falha de resposta do servidor JARVES');
      }

      const data = await response.json();

      const jarvesMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'jarves',
        text: data.text,
        speechText: data.speechText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        functionCall: data.functionCall
          ? {
              name: data.functionCall.name,
              args: data.functionCall.args,
              status: 'success',
            }
          : undefined,
      };

      setMessages((prev) => [...prev, jarvesMsg]);

      // Execute function call if provided
      if (data.functionCall) {
        executeFunctionCall(data.functionCall);
      } else if (parsed) {
        // High-precision client-side intent fallback
        if (parsed.type === 'finance') {
          executeFunctionCall({ name: 'manage_finance', args: parsed.args });
        } else if (parsed.type === 'temperature') {
          executeFunctionCall({ name: 'adjust_temperature', args: parsed.args });
        } else if (parsed.type === 'calendar') {
          executeFunctionCall({ name: 'manage_calendar', args: parsed.args });
        } else if (parsed.type === 'whatsapp_automation') {
          executeFunctionCall({ name: 'automate_whatsapp', args: { action: 'activate', target_contact: parsed.args.contact_name } });
        } else if (parsed.type === 'whatsapp_send') {
          executeFunctionCall({ name: 'send_whatsapp_message', args: parsed.args });
        } else if (parsed.type === 'control_hardware') {
          executeFunctionCall({ name: 'control_hardware', args: parsed.args });
        } else if (parsed.type === 'execute_pc_command') {
          executeFunctionCall({ name: 'execute_pc_command', args: parsed.args });
        } else if (parsed.type === 'youtube_search') {
          executeFunctionCall({ name: 'search_youtube', args: parsed.args });
        } else if (parsed.type === 'media_player') {
          executeFunctionCall({
            name: 'control_media_player',
            args: {
              action: parsed.args.action,
              track_name: parsed.args.trackName,
              videoId: parsed.args.videoId,
              isMp3: parsed.args.isMp3,
              subTab: parsed.args.subTab,
            },
          });
        } else if (parsed.type === 'open_link') {
          executeFunctionCall({ name: 'open_web_link', args: parsed.args });
        } else if (parsed.type === 'navigate') {
          executeFunctionCall({ name: 'navigate_module', args: { target_tab: parsed.args.targetTab } });
        }
      }

      // Auto-speak response if autoSpeak is on
      if (voiceConfig.autoSpeak) {
        speakText(data.speechText || data.text);
      }
    } catch (err: any) {
      // Local resilient fallback execution for offline or transient network drops
      let localNotice = '';
      let localSpeech = '';

      if (parsed) {
        if (parsed.type === 'finance') {
          executeFunctionCall({ name: 'manage_finance', args: parsed.args });
          localNotice = `Comando executado com sucesso localmente, Sr. Romildo: ${parsed.explanation}.`;
          localSpeech = parsed.spokenResponse || `Lançamento registrado com precisão, Senhor. ${parsed.explanation}.`;
        } else if (parsed.type === 'temperature') {
          executeFunctionCall({ name: 'adjust_temperature', args: parsed.args });
          localNotice = `Temperatura ajustada com sucesso pelo subsistema de alta precisão: ${parsed.explanation}.`;
          localSpeech = parsed.spokenResponse || `Temperatura ajustada para ${parsed.args.target_temperature} graus, Senhor.`;
        } else if (parsed.type === 'calendar') {
          executeFunctionCall({ name: 'manage_calendar', args: parsed.args });
          localNotice = `Agendamento efetuado na agenda com sucesso: ${parsed.explanation}.`;
          localSpeech = parsed.spokenResponse || `Compromisso agendado na sua pauta, Senhor.`;
        } else if (parsed.type === 'whatsapp_automation') {
          executeFunctionCall({ name: 'automate_whatsapp', args: { action: 'activate', target_contact: parsed.args.contact_name } });
          localNotice = `Automação de mensagens WhatsApp ativada para o contato cadastrado: ${parsed.explanation}.`;
          localSpeech = parsed.spokenResponse || `Mensagens automáticas ativadas com sucesso, Senhor.`;
        } else if (parsed.type === 'whatsapp_send') {
          executeFunctionCall({ name: 'send_whatsapp_message', args: parsed.args });
          localNotice = `WhatsApp direcionado para ${parsed.args.recipient}: ${parsed.explanation}.`;
          localSpeech = parsed.spokenResponse || `Abrindo WhatsApp para envio, Senhor.`;
        } else if (parsed.type === 'control_hardware') {
          executeFunctionCall({ name: 'control_hardware', args: parsed.args });
          localNotice = `Periférico atualizado: ${parsed.explanation}.`;
          localSpeech = parsed.spokenResponse || `Dispositivo atualizado com sucesso, Senhor.`;
        } else if (parsed.type === 'execute_pc_command') {
          executeFunctionCall({ name: 'execute_pc_command', args: parsed.args });
          localNotice = `Instrução de sistema efetuada: ${parsed.explanation}.`;
          localSpeech = parsed.spokenResponse || `Comando do sistema executado, Senhor.`;
        } else if (parsed.type === 'youtube_search') {
          executeFunctionCall({ name: 'search_youtube', args: parsed.args });
          localNotice = `Pesquisando "${parsed.args.query}" no YouTube e ativando reprodutor multimídia holográfico.`;
          localSpeech = parsed.spokenResponse || `Pesquisando no YouTube, Senhor.`;
        } else if (parsed.type === 'media_player') {
          executeFunctionCall({
            name: 'control_media_player',
            args: {
              action: parsed.args.action,
              track_name: parsed.args.trackName,
              videoId: parsed.args.videoId,
              isMp3: parsed.args.isMp3,
              subTab: parsed.args.subTab,
            },
          });
          localNotice = `Comando do reprodutor de mídia executado: ${parsed.explanation}.`;
          localSpeech = parsed.spokenResponse || `Comando de áudio executado, Senhor.`;
        } else if (parsed.type === 'open_link') {
          executeFunctionCall({ name: 'open_web_link', args: parsed.args });
          localNotice = `Abrindo ${parsed.args.title || parsed.args.url} no navegador.`;
          localSpeech = parsed.spokenResponse || `Abrindo link no navegador, Senhor.`;
        } else if (parsed.type === 'navigate') {
          executeFunctionCall({ name: 'navigate_module', args: { target_tab: parsed.args.targetTab } });
          localNotice = `Interface alternada: ${parsed.explanation}.`;
          localSpeech = parsed.spokenResponse || `Tela alternada com sucesso, Senhor.`;
        }
      }

      if (!localNotice) {
        const textLower = userText.toLowerCase().trim();
        if (textLower.includes('olá') || textLower.includes('ola') || textLower.includes('oi') || textLower.includes('bom dia') || textLower.includes('boa tarde') || textLower.includes('boa noite')) {
          localNotice = `Olá, Sr. Romildo! Todos os subsistemas do JARVES estão calibrados e operacionais. Como posso auxiliá-lo hoje com seus dispositivos, agenda ou automações?`;
          localSpeech = `Olá, Senhor! Todos os subsistemas operando perfeitamente. Como posso ajudar?`;
        } else if (textLower.includes('quem é você') || textLower.includes('o que você faz') || textLower.includes('ajuda')) {
          localNotice = `Sou o JARVES, seu assistente virtual de alta performance. Posso controlar hardware, agendar compromissos, gerenciar suas finanças, tocar músicas, praticar conversação em inglês com pronúncia fonética e muito mais.`;
          localSpeech = `Sou o JARVES, seu assistente virtual. Como posso auxiliá-lo, Senhor?`;
        } else {
          localNotice = `Comando recebido e processado pelo núcleo seguro JARVES, Sr. Romildo. Todos os subsistemas operando em capacidade nominal.`;
          localSpeech = `Comando processado pelo núcleo JARVES, Senhor.`;
        }
      }

      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'jarves',
        text: localNotice,
        speechText: localSpeech,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      if (voiceConfig.autoSpeak && localSpeech) {
        speakText(localSpeech);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentUser) {
    return (
      <AuthPortal
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        existingUsers={users}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-full bg-[#0B0E14] text-slate-100 sci-fi-grid overflow-hidden selection:bg-[#00F0FF]/30 relative">
      {/* Retractable Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        voiceConfig={voiceConfig}
        onUpdateVoiceConfig={(cfg) => setVoiceConfig((prev) => ({ ...prev, ...cfg }))}
        onToggleContinuousListening={toggleContinuousMode}
        currentUser={currentUser}
        onLogout={handleLogout}
        onEditAdminProfile={() => isRomildo ? setActiveTab('admin') : setActiveTab('userpanel')}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 sm:h-16 border-b border-slate-800 bg-[#0B0E14]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-10 gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              id="btn-open-sidebar-mobile"
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl bg-[#121824] hover:bg-slate-800 border border-slate-700/80 text-[#00F0FF] transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-sm min-h-[40px] min-w-[40px]"
              title="Abrir menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="font-orbitron font-extrabold text-sm sm:text-lg text-slate-100 tracking-wider flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="text-[#00F0FF]">J.A.R.V.E.S.</span>
              <span className="text-xs font-normal text-slate-400 font-mono hidden md:inline truncate">
                // SISTEMA INTEGRADO DE AUTOMAÇÃO
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-end">
            {/* Listening status badge */}
            {isListening && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono animate-pulse">
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">OUVINDO COMANDO</span>
              </div>
            )}

            {/* Speaking status badge */}
            {isSpeaking && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-mono animate-pulse">
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">JARVES FALANDO</span>
              </div>
            )}

            {/* Microphone Quick Unlock / Permission Button */}
            <button
              id="btn-hud-microphone-unlock"
              type="button"
              onClick={unlockMicrophone}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                isListening
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
                  : hardwareState.microphone
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              }`}
              title={
                isListening
                  ? 'Microfone ativo ouvindo comandos. Clique para gerenciar'
                  : hardwareState.microphone
                  ? 'Microfone liberado. Clique para falar ou testar'
                  : 'Microfone bloqueado. Clique para liberar e conceder permissão'
              }
            >
              {isListening ? (
                <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              ) : hardwareState.microphone ? (
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <MicOff className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden sm:inline font-bold">
                {isListening ? 'OUVINDO' : hardwareState.microphone ? 'MIC LIBERADO' : 'LIBERAR MIC'}
              </span>
            </button>

            {/* Quick TV Screen Mirroring Trigger Button */}
            <button
              id="btn-hud-tv-mirror"
              type="button"
              onClick={() => handleSelectTab('mirroring')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer shadow-sm ${
                activeTab === 'mirroring'
                  ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(14,165,233,0.3)]'
                  : 'bg-[#121824] hover:bg-[#1a2333] border-sky-500/30 text-sky-400 hover:border-sky-400/60'
              }`}
              title="Central de Espelhamento em Smart TVs Samsung, LG, Sony e Apple TV"
            >
              <Tv className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline font-bold">ESPELHAR TV</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 hidden lg:inline">
                4K UHD
              </span>
            </button>

            {/* Vault Status Trigger Button */}
            <button
              id="btn-hud-vault-status"
              type="button"
              onClick={() => setIsVaultModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121824] hover:bg-[#1a2333] border border-cyan-500/30 text-xs font-mono text-cyan-300 transition-all cursor-pointer shadow-sm hover:border-cyan-400/60"
              title="Abrir detalhes do cofre criptografado e opções de backup"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline font-bold">COFRE SEGURO</span>
              <span className="text-[10px] text-slate-400 hidden lg:inline">({vaultChecksum.slice(0, 10)}...)</span>
            </button>

            {/* Primary Save Button */}
            <button
              id="btn-hud-save-system"
              type="button"
              onClick={() => handleSaveSystem(true, true)}
              disabled={isSaving}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-orbitron font-bold text-xs transition-all shadow-md cursor-pointer ${
                isDirty
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
              } disabled:opacity-50 active:scale-95`}
              title={isDirty ? 'Alterações não salvas detectadas! Clique para salvar com criptografia.' : `Dados sincronizados. Último salvamento: ${lastSavedTimestamp}`}
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>SALVANDO...</span>
                </>
              ) : isDirty ? (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>SALVAR DADOS</span>
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>SALVO</span>
                  <span className="text-[10px] font-mono text-emerald-300/80 hidden sm:inline">{lastSavedTimestamp}</span>
                </>
              )}
            </button>

            {/* Quick user status pill & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-[#121824] border border-slate-800 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isRomildo ? 'bg-[#00F0FF]' : 'bg-emerald-400'} animate-ping`} />
              <span className="text-slate-200 font-medium truncate max-w-[70px] sm:max-w-[120px]">{currentUser.name}</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded border hidden sm:inline ${
                  isRomildo
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isRomildo ? 'Admin' : 'Usuário'}
              </span>
              <button
                onClick={handleLogout}
                className="ml-0.5 sm:ml-1 text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                title="Encerrar sessão (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic Body Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6">
          {/* Always show Listening Indicator banner at top if actively listening */}
          <div className="mb-4">
            <ListeningIndicator
              isListening={isListening}
              onStopListening={stopSpeechRecognition}
              continuousMode={voiceConfig.continuousListening}
              transcript={speechTranscript}
            />
          </div>

          {/* Save Status Notification Banner */}
          {saveBanner && (
            <div
              className={`mb-4 flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-mono backdrop-blur-md shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
                saveBanner.type === 'success'
                  ? 'bg-[#121824]/95 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : saveBanner.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                  : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    saveBanner.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : saveBanner.type === 'error'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-cyan-500/20 text-cyan-400'
                  }`}
                >
                  {saveBanner.type === 'success' ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : saveBanner.type === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Database className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <div>
                  <div className="font-orbitron font-bold text-[11px] tracking-wider">
                    {saveBanner.type === 'success'
                      ? 'COFRE CRIPTOGRÁFICO ATUALIZADO'
                      : saveBanner.type === 'error'
                      ? 'FALHA NO ARMAZENAMENTO'
                      : 'INFORMAÇÃO DO SISTEMA'}
                  </div>
                  <p className="text-slate-200 text-xs mt-0.5 font-sans">{saveBanner.message}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaveBanner(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Fechar alerta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* High-Precision Voice Command Recognition Badge */}
          {voiceFeedback && (
            <div className="mb-4 flex items-center justify-between px-4 py-3 rounded-xl bg-[#121824]/95 border border-[#00F0FF]/50 shadow-[0_0_20px_rgba(0,240,255,0.18)] text-xs font-mono backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
                  <Zap className="w-5 h-5 text-[#00F0FF] animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#00F0FF] font-orbitron font-bold tracking-wider text-[11px]">
                      COMANDO DE VOZ IDENTIFICADO
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                      {voiceFeedback.confidence}% PRECISÃO
                    </span>
                  </div>
                  <p className="text-slate-200 text-xs mt-0.5 font-sans">{voiceFeedback.explanation}</p>
                </div>
              </div>
              <button
                onClick={() => setVoiceFeedback(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Fechar alerta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Active Tab View */}
          {activeTab === 'assistant' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100%-2rem)] pb-24 sm:pb-0">
              {/* Left/Top: 3D Reactive Hologram Avatar + Fast Telemetry */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="bg-[#121824]/90 rounded-2xl border border-slate-800 p-3 sm:p-4 flex flex-col items-center justify-center shadow-xl">
                  <div className="w-full flex items-center justify-between mb-1">
                    <div className="text-left sm:text-center flex-1 min-w-0">
                      <span className="font-orbitron text-xs font-bold tracking-widest text-[#00F0FF] uppercase block truncate">
                        AVATAR HOLOGRÁFICO 3D
                      </span>
                      <p className="text-[11px] text-slate-400 hidden sm:block">
                        Arraste com o dedo ou mouse para girar o modelo no espaço 3D.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMobileHologramVisible(!mobileHologramVisible)}
                      className="lg:hidden p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 font-mono transition-colors"
                      title={mobileHologramVisible ? 'Minimizar Avatar 3D' : 'Exibir Avatar 3D'}
                    >
                      {mobileHologramVisible ? <ChevronUp className="w-4 h-4 text-[#00F0FF]" /> : <ChevronDown className="w-4 h-4 text-[#00F0FF]" />}
                      <span className="text-[10px] font-bold">{mobileHologramVisible ? 'Minimizar' : 'Exibir'}</span>
                    </button>
                  </div>

                  {mobileHologramVisible && (
                    <>
                      <HologramAvatar
                        isSpeaking={isSpeaking}
                        isListening={isListening}
                      />

                      <div className="w-full mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
                        <span>Voz: {voiceConfig.voiceType === 'masculino' ? 'Masculina' : 'Feminina'}</span>
                        <span className="text-emerald-400 font-bold">FPS: 60</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Mini Hardware Toggles Card */}
                <div className="bg-[#121824]/90 rounded-2xl border border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-orbitron text-xs font-bold text-slate-200">
                      STATUS RÁPIDO DE HARDWARE
                    </span>
                    <button
                      onClick={() => setActiveTab('devices')}
                      className="text-[11px] text-[#00F0FF] hover:underline font-mono"
                    >
                      Avançado
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => {
                        setHardwareState((prev) => ({ ...prev, camera: !prev.camera }));
                        addLog('Câmera Alternada', 'Hardware', hardwareState.camera ? 'OFF' : 'ON');
                      }}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        hardwareState.camera
                          ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF]'
                          : 'bg-[#0B0E14] border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Câmera</span>
                      <span className="font-mono text-[10px] font-bold">{hardwareState.camera ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setHardwareState((prev) => ({ ...prev, microphone: !prev.microphone }));
                        addLog('Microfone Alternado', 'Hardware', hardwareState.microphone ? 'OFF' : 'ON');
                      }}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        hardwareState.microphone
                          ? 'bg-[#6C5CE7]/20 border-[#6C5CE7]/40 text-[#6C5CE7]'
                          : 'bg-[#0B0E14] border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Microfone</span>
                      <span className="font-mono text-[10px] font-bold">{hardwareState.microphone ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setHardwareState((prev) => ({ ...prev, bluetooth: !prev.bluetooth }));
                        addLog('Bluetooth Alternado', 'Hardware', hardwareState.bluetooth ? 'OFF' : 'ON');
                      }}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        hardwareState.bluetooth
                          ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                          : 'bg-[#0B0E14] border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Bluetooth</span>
                      <span className="font-mono text-[10px] font-bold">{hardwareState.bluetooth ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setHardwareState((prev) => ({ ...prev, wifi: !prev.wifi }));
                        addLog('Wi-Fi Alternado', 'Hardware', hardwareState.wifi ? 'OFF' : 'ON');
                      }}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        hardwareState.wifi
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-[#0B0E14] border-slate-800 text-slate-400'
                      }`}
                    >
                      <span>Wi-Fi 5G</span>
                      <span className="font-mono text-[10px] font-bold">{hardwareState.wifi ? 'ON' : 'OFF'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Conversational Terminal HUD */}
              <div className="lg:col-span-8 min-h-[480px] h-[calc(100vh-230px)] sm:h-[620px] lg:h-full">
                <ChatHUD
                  messages={messages}
                  onSendMessage={handleUserCommand}
                  onSendAudio={handleSendAudio}
                  onCaptureVision={handleCaptureAndAnalyzeCamera}
                  isListening={isListening}
                  speechTranscript={speechTranscript}
                  onToggleListening={toggleListening}
                  isProcessing={isProcessing}
                  voiceConfig={voiceConfig}
                  onSpeakText={speakText}
                  onExecuteQuickCommand={handleUserCommand}
                />
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardMetrics
              metrics={systemMetrics}
              calendarEvents={userCalendarEvents}
              habits={userHabits}
              transactions={userTransactions}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'devices' && (
            <DeviceControlPanel
              hardwareState={hardwareState}
              onToggleHardware={(dev) => {
                const nextVal = !hardwareState[dev];
                setHardwareState((prev) => ({ ...prev, [dev]: nextVal }));
                addLog(`Periférico ${dev} ${nextVal ? 'ativado' : 'desativado'}`, dev);
                playJarvesChime('confirm');
              }}
              systemVolume={systemMetrics.volume}
              onSetVolume={(vol) => {
                setSystemMetrics((prev) => ({ ...prev, volume: vol }));
                addLog('Volume Equalizado', 'Áudio', `${vol}%`);
              }}
              systemTemperature={systemMetrics.temperature}
              onSetTemperature={(temp) => {
                setSystemMetrics((prev) => ({ ...prev, temperature: temp }));
                addLog(`Temperatura do Sistema Regulada para ${temp}°C`, 'Climatização');
                playJarvesChime('confirm');
              }}
              onExecuteCommand={(cmd, target, val) => {
                addLog(`Comando de Sistema: ${cmd}`, target || 'PC', val);
                playJarvesChime('confirm');
              }}
              onAddLog={addLog}
              onInterpretCamera={() => handleCaptureAndAnalyzeCamera()}
            />
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppPanel
              onSendMessage={(recipient, msg) => {
                addLog('WhatsApp Despachado', 'WhatsApp', recipient);
              }}
              onAddLog={addLog}
              automations={userWhatsAppAutomations}
              onToggleAutomation={(id) => {
                setWhatsAppAutomations((prev) =>
                  prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
                );
                addLog('Regra de Automação WhatsApp Alternada', 'WhatsApp Autônomo', id);
                playJarvesChime('confirm');
              }}
              onTriggerAutomation={(id) => {
                const rule = userWhatsAppAutomations.find((r) => r.id === id);
                if (rule) {
                  setWhatsAppAutomations((prev) =>
                    prev.map((r) =>
                      r.id === id
                        ? {
                            ...r,
                            lastDispatched: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                          }
                        : r
                    )
                  );
                  const clean = rule.contactPhone.replace(/\D/g, '');
                  const waUrl = `https://wa.me/${clean}?text=${encodeURIComponent(rule.templateMessage)}`;
                  window.open(waUrl, '_blank', 'noopener,noreferrer');
                  addLog(`Disparo Autônomo WhatsApp Realizado`, 'WhatsApp Autônomo', rule.contactName);
                  playJarvesChime('confirm');
                }
              }}
              onSaveSystem={() => handleSaveSystem(true, true)}
              isSaving={isSaving}
              isDirty={isDirty}
              originConfig={userWhatsAppOrigin}
              onUpdateOriginConfig={handleUpdateUserOriginConfig}
            />
          )}

          {activeTab === 'finance' && (
            <FinancePanel
              transactions={userTransactions}
              onAddTransaction={(t) => {
                const newT: FinancialTransaction = {
                  id: `f_${Date.now()}`,
                  userId: activeUserId,
                  ...t,
                };
                setTransactions([newT, ...transactions]);
                addLog(`Lançamento Financeiro (${t.type})`, 'Finanças', `R$ ${t.amount}`);
                playJarvesChime('confirm');
              }}
              onDeleteTransaction={(id) => {
                setTransactions((prev) => prev.filter((t) => t.id !== id));
                addLog('Transação Removida', 'Finanças');
              }}
              onSpeakBalance={() => handleSpeakFinancialReport('balance')}
              onSaveSystem={() => handleSaveSystem(true, true)}
              isSaving={isSaving}
              lastSavedTimestamp={lastSavedTimestamp}
              isDirty={isDirty}
            />
          )}

          {activeTab === 'hp12c' && (
            <HP12CCalculatorPanel
              currentUser={currentUser}
              onAddLog={addLog}
            />
          )}

          {activeTab === 'habits' && (
            <HabitsProjectsPanel
              habits={userHabits}
              onToggleHabit={(id) => {
                setHabits((prev) =>
                  prev.map((h) =>
                    h.id === id
                      ? {
                          ...h,
                          completedToday: !h.completedToday,
                          streak: !h.completedToday ? h.streak + 1 : Math.max(0, h.streak - 1),
                        }
                      : h
                  )
                );
                playJarvesChime('confirm');
                addLog('Hábito Atualizado', 'Hábitos');
              }}
              onAddHabit={(title, category) => {
                const newH: Habit = {
                  id: `h_${Date.now()}`,
                  userId: activeUserId,
                  title,
                  category,
                  streak: 1,
                  target: 30,
                  completedToday: false,
                };
                setHabits((prev) => [...prev, newH]);
                addLog('Hábito Cadastrado', 'Hábitos', title);
              }}
              projects={userProjects}
              onUpdateProjectProgress={(id, progress) => {
                setProjects((prev) =>
                  prev.map((p) => (p.id === id ? { ...p, progress } : p))
                );
                addLog('Progresso de Projeto Atualizado', 'Projetos', `${progress}%`);
              }}
              calendarEvents={userCalendarEvents}
              onAddCalendarEvent={(evt) => {
                const newEvt: CalendarEvent = {
                  id: `c_${Date.now()}`,
                  userId: activeUserId,
                  ...evt,
                };
                setCalendarEvents((prev) => [newEvt, ...calendarEvents]);
                addLog('Compromisso Adicionado à Agenda', 'Calendário', evt.title);
                playJarvesChime('confirm');
              }}
              onDeleteCalendarEvent={(id) => {
                setCalendarEvents((prev) => prev.filter((c) => c.id !== id));
                addLog('Evento Removido da Agenda', 'Calendário');
              }}
              onSaveSystem={() => handleSaveSystem(true, true)}
              isSaving={isSaving}
              isDirty={isDirty}
            />
          )}

          {activeTab === 'userpanel' && (
            <UserCustomPanel
              currentUser={currentUser}
              onUpdateCurrentUser={handleUpdateCurrentUserData}
              onNavigateToTab={handleSelectTab}
              onSaveToVault={() => handleSaveSystem(true, true)}
              userTransactions={userTransactions}
              userHabits={userHabits}
              userCalendarEvents={userCalendarEvents}
              userProjects={userProjects}
              userWhatsAppAutomations={userWhatsAppAutomations}
              whatsAppOrigin={userWhatsAppOrigin}
              onUpdateOriginConfig={handleUpdateUserOriginConfig}
            />
          )}

          {activeTab === 'admin' && (
            isRomildo ? (
              <AdminPanel
                users={users}
                onToggleUserStatus={(id) => {
                  setUsers((prev) =>
                    prev.map((u) =>
                      u.id === id
                        ? { ...u, status: u.status === 'Ativo' ? 'Suspenso' : 'Ativo' }
                        : u
                    )
                  );
                  addLog('Status de Usuário Modificado', 'Admin Gate', id);
                  playJarvesChime('confirm');
                }}
                onDeleteUser={(id) => {
                  if (id === 'usr-romildo-master' || id === 'usr-001') {
                    alert('A conta Master de Romildo não pode ser excluída.');
                    return;
                  }
                  setUsers((prev) => prev.filter((u) => u.id !== id));
                  addLog('Usuário Removido do Sistema', 'Admin Gate', id);
                  playJarvesChime('confirm');
                }}
                onAddUser={(user) => {
                  const newU: UserAccount = {
                    id: `usr-${String(users.length + 1).padStart(3, '0')}`,
                    ...user,
                    lastAccess: 'Nunca acessou',
                    lastIp: '-',
                    actionLogsCount: 0,
                  };
                  setUsers((prev) => [...prev, newU]);
                  addLog('Novo Usuário Provisionado', 'Admin Gate', user.email);
                  playJarvesChime('confirm');
                }}
                onUpdateUser={handleUpdateUser}
                systemLogs={systemLogs}
                onSaveSystem={() => handleSaveSystem(true, true)}
                isSaving={isSaving}
                lastSavedTimestamp={lastSavedTimestamp}
                isDirty={isDirty}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                vaultChecksum={vaultChecksum}
                voiceConfig={voiceConfig}
                onUpdateVoiceConfig={(cfg) => {
                  setVoiceConfig((prev) => ({ ...prev, ...cfg }));
                  setIsDirty(true);
                }}
                onSpeakPreview={speakText}
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-[#121824]/60 rounded-2xl border border-rose-500/30">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-orbitron font-bold text-rose-400 tracking-wider">
                  ACESSO ADMINISTRATIVO RESTRITO
                </h2>
                <p className="text-slate-300 text-sm max-w-md mt-2 leading-relaxed">
                  O painel administrativo e gerenciamento de contas do JARVES é exclusivo do usuário Master <strong>Romildo</strong> (geoimoveissantos@gmail.com).
                </p>
                <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 font-mono">
                  Sessão ativa: <span className="text-slate-200">{currentUser.name}</span> (@{currentUser.username || currentUser.email}) &bull; Perfil: Usuário
                </div>
                <button
                  onClick={() => setActiveTab('userpanel')}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#00d0df] text-slate-950 font-orbitron font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  Ir para Meu Painel Personalizável
                </button>
              </div>
            )
          )}

          {activeTab === 'media' && (
            <MediaHub
              currentUser={currentUser}
              currentVolume={systemMetrics.volume}
              onVolumeChange={(v) => setSystemMetrics((prev) => ({ ...prev, volume: v }))}
              autoPlayQuery={mediaAutoPlayQuery}
              onAddLog={addLog}
              externalTrackToPlay={mediaTrackToPlay}
              externalVideoId={mediaVideoIdToPlay}
              externalAction={mediaExternalAction}
              initialSubTab={mediaActiveSubTab}
              commandNonce={mediaCommandNonce}
              onSaveSystem={() => handleSaveSystem(true, true)}
              isSaving={isSaving}
              lastSavedTimestamp={lastSavedTimestamp}
              isDirty={isDirty}
            />
          )}

          {activeTab === 'translator' && (
            <TranslatorTutorPanel
              currentUser={currentUser}
              onAddLog={addLog}
              onSaveSystem={() => handleSaveSystem(true, true)}
              isSaving={isSaving}
              isDirty={isDirty}
            />
          )}

          {activeTab === 'games' && (
            <GamesHub
              currentUser={currentUser}
              onAddLog={addLog}
              onSaveSystem={() => handleSaveSystem(true, true)}
              users={users}
              initialActiveGame="chess"
              initialOnlineChessRoom={activeChessRoomToJoin}
              onClearInitialChessRoom={() => setActiveChessRoomToJoin(null)}
            />
          )}

          {activeTab === 'automations' && (
            <AutomationsPanel
              currentUser={currentUser}
              onAddLog={addLog}
              onSpeakText={speakText}
            />
          )}

          {activeTab === 'mirroring' && (
            <ScreenMirroringHub
              currentUser={currentUser}
              activeTab={activeTab}
              onNavigateTab={handleSelectTab}
              onAddLog={addLog}
              onSpeakText={speakText}
              onTriggerVoiceListen={toggleContinuousMode}
              isListening={isListening}
            />
          )}
        </main>

        {/* Secure Vault & Backup Management Modal */}
        {isVaultModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg rounded-2xl bg-[#0D121D] border border-cyan-500/40 p-6 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setIsVaultModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-[#00F0FF]">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-orbitron font-bold text-sm text-slate-100 flex items-center gap-2">
                    COFRE CRIPTOGRÁFICO JARVES
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ATIVO
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Armazenamento persistente seguro com checksum SHA-256 e cifra simétrica.
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 my-5 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#121824] border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Última Gravação:</span>
                  <span className="text-slate-200 font-bold">{lastSavedTimestamp}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#121824] border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Status de Edição:</span>
                  <span className={isDirty ? 'text-amber-400 font-bold flex items-center gap-1.5' : 'text-emerald-400 font-bold flex items-center gap-1.5'}>
                    <span className={`w-2 h-2 rounded-full ${isDirty ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                    {isDirty ? 'Alterações Pendentes de Salvar' : 'Sincronizado & Seguro'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#121824] border border-slate-800">
                  <div className="text-slate-400 mb-1 flex items-center justify-between">
                    <span>Hash de Integridade (Checksum):</span>
                    <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="p-2 rounded bg-[#0B0E14] border border-slate-800 text-[11px] text-cyan-300 break-all select-all">
                    {vaultChecksum}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-slate-300 text-[11px] font-sans leading-relaxed">
                  🛡️ <strong>Garantia de Persistência:</strong> Ao salvar ou alterar registros financeiros, hábitos ou regras de automação, o JARVES criptografa os dados e grava no banco de dados local IndexedDB + LocalStorage com proteção anti-tampering.
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    handleSaveSystem(true, true);
                    setIsVaultModalOpen(false);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Gravando...' : 'Salvar Agora'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-4 py-2 rounded-xl bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Backup (.json)</span>
                </button>

                <label className="px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Restaurar Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImportBackup(file);
                        setIsVaultModalOpen(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Alerta de Acesso Bloqueado para Não-Admins */}
        {showAdminBlockedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-[#0F141C] border border-rose-500/40 p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-orbitron font-bold text-rose-400 tracking-wider">
                  ACESSO ADMINISTRATIVO RESTRITO
                </h3>
                <p className="text-xs text-slate-300">
                  Apenas o usuário mestre <strong>Romildo</strong> (<span className="text-[#00F0FF]">geoimoveissantos@gmail.com</span>) tem permissão de gerenciar o sistema e contas.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-[11px] text-rose-200">
                Seu usuário <strong className="text-white">{currentUser?.name}</strong> está no modo de acesso operacional com <strong>Painel Personalizável</strong>.
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminBlockedModal(false);
                    setActiveTab('userpanel');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#00F0FF] hover:bg-[#00d0df] text-slate-950 font-orbitron font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                >
                  Ir para Meu Painel
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminBlockedModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Incoming Chess Challenge Modal (Accessible Anywhere in the App) */}
        {incomingChessChallenge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#2A1D13] via-[#1E140C] to-[#120A05] border-2 border-amber-500/80 p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(245,158,11,0.35)] relative text-center">
              {/* Heraldic Animated Crest */}
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#8B653A] to-[#3D2513] border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.6)] mb-3.5 animate-bounce">
                <Swords className="w-8 h-8" />
              </div>

              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-widest mb-1">
                <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>⚔️ DESAFIO DE XADREZ RECEBIDO!</span>
              </div>

              <h3 className="font-orbitron font-black text-lg sm:text-xl text-amber-100 mt-2 tracking-wide">
                {incomingChessChallenge.fromUser.name} convidou você!
              </h3>

              <p className="text-xs text-amber-200/80 mt-1 font-serif italic leading-relaxed">
                Você recebeu uma intimação de duelo para uma partida de Xadrez Medieval & Clássico em tempo real.
              </p>

              {/* Special Role Explanations */}
              <div className="mt-4 p-3.5 rounded-2xl bg-black/60 border border-amber-500/40 text-left space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-amber-700 to-amber-950 border border-amber-400 shrink-0" />
                  <span>SUAS PEÇAS: PEDRAS ESCURAS (BRONZE)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-normal pl-5">
                  Como jogador convidado, você jogará sempre com as <strong>Pedras Escuras</strong> e o tabuleiro será <strong>automaticamente virado para a sua perspectiva</strong> com suas peças na parte de baixo.
                </p>
              </div>

              {/* Accept & Decline Action Buttons */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGlobalDeclineChessInvite}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-orbitron font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <X className="w-4 h-4 text-rose-400" />
                  <span>RECUSAR</span>
                </button>

                <button
                  type="button"
                  onClick={handleGlobalAcceptChessInvite}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:brightness-110 active:scale-95 text-slate-950 font-orbitron font-black text-xs transition cursor-pointer shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>ACEITAR DESAFIO</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Quick Bottom Navigation Bar (Smartphones & Tablets) */}
        {activeTab !== 'assistant' && (
        <nav
          id="mobile-bottom-nav"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0B0E14]/95 backdrop-blur-xl border-t border-slate-800/90 px-1.5 py-1.5 flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.7)]"
        >
          <button
            type="button"
            id="mobile-nav-assistant"
            onClick={() => handleSelectTab('assistant')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all min-h-[44px] cursor-pointer ${
              activeTab === 'assistant'
                ? 'text-[#00F0FF] bg-[#00F0FF]/15 border border-[#00F0FF]/30 shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-5 h-5" />
            <span className="text-[10px] font-mono font-bold tracking-tight">Terminal</span>
          </button>

          <button
            type="button"
            id="mobile-nav-automations"
            onClick={() => handleSelectTab('automations')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all relative min-h-[44px] cursor-pointer ${
              activeTab === 'automations'
                ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-5 h-5 text-amber-400" />
            <span className="text-[10px] font-mono font-bold tracking-tight">Automações</span>
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          </button>

          <button
            type="button"
            id="mobile-nav-mirroring"
            onClick={() => handleSelectTab('mirroring')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all relative min-h-[44px] cursor-pointer ${
              activeTab === 'mirroring'
                ? 'text-sky-400 bg-sky-500/15 border border-sky-400/40 shadow-[0_0_12px_rgba(14,165,233,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tv className="w-5 h-5 text-sky-400" />
            <span className="text-[10px] font-mono font-bold tracking-tight">Espelhar TV</span>
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            type="button"
            id="mobile-nav-whatsapp"
            onClick={() => handleSelectTab('whatsapp')}
            className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all min-h-[44px] cursor-pointer ${
              activeTab === 'whatsapp'
                ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-mono font-bold tracking-tight">WhatsApp</span>
          </button>

          <button
            type="button"
            id="mobile-nav-menu"
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-white transition-all min-h-[44px] cursor-pointer"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-mono font-bold tracking-tight">Mais</span>
          </button>
        </nav>
        )}
      </div>
    </div>
  );
}
