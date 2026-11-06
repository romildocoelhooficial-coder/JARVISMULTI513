import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Radio,
  Wifi,
  Power,
  Zap,
  Mic,
  MicOff,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Volume2,
  Flame,
  Shield,
  ShieldCheck,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Tv,
  Coffee,
  Wind,
  Sun,
  Moon,
  Lock,
  Unlock,
  Home,
  Layers,
  Thermometer,
  Clock,
  Play,
  RotateCcw,
  Activity,
  Cpu,
  Smartphone,
  ChevronRight,
  Info,
  Check,
  X
} from 'lucide-react';
import { SmartDevice, SmartSceneRoutine, SmartDeviceProtocol, SmartDeviceCategory, UserAccount } from '../types';
import { playJarvesChime } from '../utils/audioEffects';

interface AutomationsPanelProps {
  currentUser?: UserAccount;
  onAddLog: (action: string, category: string, details?: string) => void;
  onSpeakText?: (text: string) => void;
}

// Initial Smart Devices
const DEFAULT_SMART_DEVICES: SmartDevice[] = [
  {
    id: 'dev-1',
    name: 'Lustre & Iluminação Principal',
    room: 'Sala de Estar',
    category: 'light',
    protocol: 'alexa',
    isOn: true,
    powerWatts: 65,
    brightness: 85,
    colorHex: '#FFF8E7',
    ipAddress: '192.168.1.141',
    signalStrength: -48,
    lastAction: 'Ligado via Alexa às 08:15',
  },
  {
    id: 'dev-2',
    name: 'Fita LED RGB NeoPixel',
    room: 'Escritório / Lab',
    category: 'light',
    protocol: 'wifi',
    isOn: true,
    powerWatts: 38,
    brightness: 90,
    colorHex: '#00F0FF',
    ipAddress: '192.168.1.155',
    signalStrength: -42,
    lastAction: 'Ciano JARVES definido por voz',
  },
  {
    id: 'dev-3',
    name: 'Ar-Condicionado Inverter 18k BTUs',
    room: 'Escritório / Lab',
    category: 'climate',
    protocol: 'google',
    isOn: true,
    powerWatts: 850,
    temperature: 22,
    targetMode: 'cool',
    ipAddress: '192.168.1.160',
    signalStrength: -55,
    lastAction: 'Modo Eco 22°C ativo via Google Home',
  },
  {
    id: 'dev-4',
    name: 'Smart TV 75" QLED & Soundbar',
    room: 'Sala de Estar',
    category: 'entertainment',
    protocol: 'google',
    isOn: true,
    powerWatts: 180,
    volume: 32,
    ipAddress: '192.168.1.120',
    signalStrength: -52,
    lastAction: 'Pareada e espelhada com JARVES (HDMI-CEC / Cast)',
  },
  {
    id: 'dev-5',
    name: 'Cafeteira Expresso Conectada',
    room: 'Cozinha',
    category: 'appliance',
    protocol: 'wifi',
    isOn: false,
    powerWatts: 1200,
    ipAddress: '192.168.1.182',
    signalStrength: -62,
    lastAction: 'Pronta para infusão remota',
  },
  {
    id: 'dev-6',
    name: 'Robô Aspirador Laser LIDAR',
    room: 'Geral',
    category: 'appliance',
    protocol: 'alexa',
    isOn: false,
    powerWatts: 45,
    batteryLevel: 94,
    targetMode: 'varredura',
    ipAddress: '192.168.1.190',
    signalStrength: -58,
    lastAction: 'Na base carregadora (94%)',
  },
  {
    id: 'dev-7',
    name: 'Fechadura Biométrica Digital',
    room: 'Entrada Principal',
    category: 'security',
    protocol: 'bluetooth',
    isOn: true,
    powerWatts: 8,
    isLocked: true,
    batteryLevel: 88,
    ipAddress: 'BLE:4A:8B:12:9C',
    signalStrength: -38,
    lastAction: 'Trancada com criptografia AES-128',
  },
  {
    id: 'dev-8',
    name: 'Iluminação Jardim & Fachada',
    room: 'Área Externa',
    category: 'outdoor',
    protocol: 'matter',
    isOn: false,
    powerWatts: 140,
    brightness: 100,
    ipAddress: '192.168.1.177',
    signalStrength: -67,
    lastAction: 'Agendado para ligar ao anoitecer',
  },
  {
    id: 'dev-9',
    name: 'Bomba da Piscina & Cascata',
    room: 'Área Externa',
    category: 'outdoor',
    protocol: 'wifi',
    isOn: false,
    powerWatts: 1100,
    ipAddress: '192.168.1.205',
    signalStrength: -71,
    lastAction: 'Desligada pelo temporizador',
  },
  {
    id: 'dev-10',
    name: 'Workstation & Servidores Jarvis',
    room: 'Escritório / Lab',
    category: 'power',
    protocol: 'wifi',
    isOn: true,
    powerWatts: 340,
    ipAddress: '192.168.1.10',
    signalStrength: -32,
    lastAction: 'Alimentação contínua 230V / Wake-on-LAN',
  },
  {
    id: 'dev-11',
    name: 'Ar-Condicionado Quarto Master',
    room: 'Quarto Master',
    category: 'climate',
    protocol: 'alexa',
    isOn: false,
    powerWatts: 780,
    temperature: 23,
    targetMode: 'cool',
    ipAddress: '192.168.1.164',
    signalStrength: -59,
    lastAction: 'Desligado às 07:00',
  },
  {
    id: 'dev-12',
    name: 'Abajur de Leitura Master',
    room: 'Quarto Master',
    category: 'light',
    protocol: 'matter',
    isOn: false,
    powerWatts: 12,
    brightness: 40,
    colorHex: '#FFDFBA',
    ipAddress: '192.168.1.173',
    signalStrength: -50,
    lastAction: 'Desligado via Matter',
  },
];

// Initial Smart Scene Routines
const DEFAULT_ROUTINES: SmartSceneRoutine[] = [
  {
    id: 'scene-1',
    title: 'Modo Cinema & Entretenimento',
    description: 'Apaga luzes principais, acende LED violeta a 15%, liga Smart TV 75", Receiver e regula AC para 21°C.',
    iconName: 'Tv',
    voiceTriggerPhrase: 'Alexa, ativar Modo Cinema',
    category: 'cinema',
    devicesAffectedCount: 4,
    isActive: false,
    colorScheme: 'from-purple-500/20 to-indigo-500/20 border-purple-500/50 text-purple-300',
    lastExecuted: 'Ontem às 21:15',
  },
  {
    id: 'scene-2',
    title: 'Modo Lab & Produtividade Máxima',
    description: 'Iluminação 100% branca fria, LED ciano JARVES, ar condicionado em 22°C e inicializa Workstation.',
    iconName: 'Zap',
    voiceTriggerPhrase: 'JARVES, ativar Modo Trabalho',
    category: 'work',
    devicesAffectedCount: 4,
    isActive: true,
    colorScheme: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/50 text-cyan-300',
    lastExecuted: 'Hoje às 08:00',
  },
  {
    id: 'scene-3',
    title: 'Modo Boa Noite (Total Blackout)',
    description: 'Desliga todas as luzes da casa, tranca fechaduras biométricas, desliga aparelhos e arma sensores.',
    iconName: 'Moon',
    voiceTriggerPhrase: 'Google, ativar Modo Boa Noite',
    category: 'sleep',
    devicesAffectedCount: 8,
    isActive: false,
    colorScheme: 'from-blue-500/20 to-slate-500/20 border-blue-500/50 text-blue-300',
    lastExecuted: 'Ontem às 23:45',
  },
  {
    id: 'scene-4',
    title: 'Bom Dia Romildo (Despertar Conectado)',
    description: 'Acende luzes em rampa suave 30% a 80%, liga cafeteira expresso, destrava portas e abre persianas.',
    iconName: 'Sun',
    voiceTriggerPhrase: 'JARVES, Bom Dia',
    category: 'morning',
    devicesAffectedCount: 5,
    isActive: false,
    colorScheme: 'from-amber-500/20 to-orange-500/20 border-amber-500/50 text-amber-300',
    lastExecuted: 'Hoje às 07:30',
  },
  {
    id: 'scene-5',
    title: 'Segurança Máxima & Alerta Perimetral',
    description: 'Tranca todas as portas biométricas, acende holofotes da fachada e jardim em 100% e ativa monitoramento.',
    iconName: 'Shield',
    voiceTriggerPhrase: 'Alexa, acionar Segurança Máxima',
    category: 'security',
    devicesAffectedCount: 4,
    isActive: false,
    colorScheme: 'from-rose-500/20 to-red-500/20 border-rose-500/50 text-rose-300',
    lastExecuted: 'Nunca acionado',
  },
];

export const AutomationsPanel: React.FC<AutomationsPanelProps> = ({
  currentUser,
  onAddLog,
  onSpeakText,
}) => {
  // State for Devices and Scenes
  const [devices, setDevices] = useState<SmartDevice[]>(() => {
    try {
      const saved = localStorage.getItem('JARVES_SMART_DEVICES_V1');
      return saved ? JSON.parse(saved) : DEFAULT_SMART_DEVICES;
    } catch {
      return DEFAULT_SMART_DEVICES;
    }
  });

  const [routines, setRoutines] = useState<SmartSceneRoutine[]>(() => {
    try {
      const saved = localStorage.getItem('JARVES_SMART_ROUTINES_V1');
      return saved ? JSON.parse(saved) : DEFAULT_ROUTINES;
    } catch {
      return DEFAULT_ROUTINES;
    }
  });

  // Filters
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on' | 'off'>('all');

  // Voice Command Studio State
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [lastExecutedCommand, setLastExecutedCommand] = useState<{
    text: string;
    target: string;
    protocol: string;
    confidence: number;
    timestamp: string;
  } | null>({
    text: 'Modo Lab & Produtividade ativado com sucesso',
    target: 'Workstation & LED NeoPixel',
    protocol: 'WiFi 6 / Alexa Skill',
    confidence: 99.8,
    timestamp: 'Hoje às 08:32',
  });

  // Modal States
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isAddRoutineModalOpen, setIsAddRoutineModalOpen] = useState(false);

  // New Device Form State
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceRoom, setNewDeviceRoom] = useState('Sala de Estar');
  const [newDeviceCategory, setNewDeviceCategory] = useState<SmartDeviceCategory>('light');
  const [newDeviceProtocol, setNewDeviceProtocol] = useState<SmartDeviceProtocol>('wifi');
  const [newDeviceWatts, setNewDeviceWatts] = useState(50);
  const [newDeviceIp, setNewDeviceIp] = useState('192.168.1.');

  // New Routine Form State
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');
  const [newRoutineVoice, setNewRoutineVoice] = useState('');
  const [newRoutineCategory, setNewRoutineCategory] = useState<'comfort' | 'cinema' | 'work' | 'sleep' | 'security' | 'morning'>('comfort');

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null);

  // Save to LocalStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('JARVES_SMART_DEVICES_V1', JSON.stringify(devices));
    } catch (e) {
      console.warn('Erro ao salvar dispositivos:', e);
    }
  }, [devices]);

  useEffect(() => {
    try {
      localStorage.setItem('JARVES_SMART_ROUTINES_V1', JSON.stringify(routines));
    } catch (e) {
      console.warn('Erro ao salvar rotinas:', e);
    }
  }, [routines]);

  // Total Power Consumption
  const totalPowerWatts = useMemo(() => {
    return devices.reduce((sum, d) => sum + (d.isOn ? d.powerWatts : 0), 0);
  }, [devices]);

  const activeDevicesCount = useMemo(() => {
    return devices.filter((d) => d.isOn).length;
  }, [devices]);

  // Unique Rooms list for filter
  const roomList = useMemo(() => {
    const set = new Set(devices.map((d) => d.room));
    return ['all', ...Array.from(set)];
  }, [devices]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (selectedRoom !== 'all' && d.room !== selectedRoom) return false;
      if (selectedProtocol !== 'all' && d.protocol !== selectedProtocol) return false;
      if (statusFilter === 'on' && !d.isOn) return false;
      if (statusFilter === 'off' && d.isOn) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.room.toLowerCase().includes(q) ||
          d.protocol.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [devices, selectedRoom, selectedProtocol, statusFilter, searchQuery]);

  // Voice intent interpreter
  const processVoiceAutomationCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    setVoiceTranscript(rawText);

    let feedbackMessage = '';
    let targetDeviceName = '';
    let usedProtocol = 'WiFi / BLE';

    playJarvesChime('confirm');

    // 1. Routine checks
    if (text.includes('cinema') || text.includes('filme') || text.includes('netflix')) {
      executeRoutine('scene-1');
      return;
    }
    if (text.includes('trabalho') || text.includes('lab') || text.includes('produtividade')) {
      executeRoutine('scene-2');
      return;
    }
    if (text.includes('boa noite') || text.includes('dormir') || text.includes('desligar tudo')) {
      executeRoutine('scene-3');
      return;
    }
    if (text.includes('bom dia') || text.includes('acordar')) {
      executeRoutine('scene-4');
      return;
    }
    if (text.includes('segurança') || text.includes('alerta') || text.includes('perímetro')) {
      executeRoutine('scene-5');
      return;
    }

    // 2. Specific device toggles
    if (text.includes('café') || text.includes('cafeteira') || text.includes('expresso')) {
      setDevices((prev) =>
        prev.map((d) => (d.category === 'appliance' && d.name.includes('Cafeteira') ? { ...d, isOn: true, lastAction: 'Iniciada por comando de voz' } : d))
      );
      feedbackMessage = 'Cafeteira inteligente conectada ativada via Wi-Fi. Infusão iniciada.';
      targetDeviceName = 'Cafeteira Expresso';
      usedProtocol = 'WiFi 2.4GHz';
    } else if (text.includes('ar condicionado') || text.includes('ar-condicionado') || text.includes('clima')) {
      const turnOn = !text.includes('deslig');
      setDevices((prev) =>
        prev.map((d) => (d.category === 'climate' ? { ...d, isOn: turnOn, lastAction: turnOn ? 'Ligado por voz' : 'Desligado por voz' } : d))
      );
      feedbackMessage = turnOn ? 'Ar-condicionado Inverter ligado em 22°C modo silencioso.' : 'Ar-condicionado desligado com sucesso.';
      targetDeviceName = 'Climatização Inverter';
      usedProtocol = 'Google Home / Alexa';
    } else if (text.includes('tv') || text.includes('televisão') || text.includes('soundbar')) {
      const turnOn = !text.includes('deslig');
      setDevices((prev) =>
        prev.map((d) => (d.category === 'entertainment' ? { ...d, isOn: turnOn, lastAction: turnOn ? 'Ligado por voz' : 'Desligado por voz' } : d))
      );
      feedbackMessage = turnOn ? 'Smart TV 75" QLED e Soundbar ativados via Google Cast.' : 'Smart TV desligada.';
      targetDeviceName = 'Smart TV 75"';
      usedProtocol = 'Google Home Graph';
    } else if (text.includes('piscina') || text.includes('cascata') || text.includes('irrigação')) {
      const turnOn = !text.includes('deslig');
      setDevices((prev) =>
        prev.map((d) => (d.name.includes('Piscina') || d.name.includes('Jardim') ? { ...d, isOn: turnOn, lastAction: turnOn ? 'Ligado por voz' : 'Desligado por voz' } : d))
      );
      feedbackMessage = turnOn ? 'Bomba da piscina e iluminação externa acionadas via relé Wi-Fi.' : 'Área externa desligada.';
      targetDeviceName = 'Bomba da Piscina & Jardim';
      usedProtocol = 'Sonoff WiFi 4CH';
    } else if (text.includes('luz') || text.includes('ilumina') || text.includes('led')) {
      const turnOn = !text.includes('deslig');
      // If color requested
      let newColor = '';
      if (text.includes('azul') || text.includes('ciano')) newColor = '#00F0FF';
      else if (text.includes('vermelh')) newColor = '#FF0055';
      else if (text.includes('verde')) newColor = '#00FF66';
      else if (text.includes('roxo') || text.includes('violeta')) newColor = '#C084FC';
      else if (text.includes('amarel') || text.includes('dourad')) newColor = '#FACC15';

      setDevices((prev) =>
        prev.map((d) => {
          if (d.category === 'light') {
            return {
              ...d,
              isOn: turnOn,
              colorHex: newColor || d.colorHex,
              lastAction: turnOn ? `Ligado por voz (${newColor ? 'cor ajustada' : 'brilho padrão'})` : 'Desligado por voz',
            };
          }
          return d;
        })
      );
      feedbackMessage = turnOn
        ? `Iluminação inteligente ligada com sucesso.${newColor ? ' Cor ajustada no espectro cromático.' : ''}`
        : 'Todas as luzes inteligentes foram apagadas.';
      targetDeviceName = 'Iluminação & Fitas LED';
      usedProtocol = 'Alexa & Bluetooth BLE';
    } else if (text.includes('porta') || text.includes('tranc') || text.includes('fechadura')) {
      const lock = !text.includes('destranc') && !text.includes('abrir');
      setDevices((prev) =>
        prev.map((d) => (d.category === 'security' ? { ...d, isLocked: lock, lastAction: lock ? 'Trancada por voz' : 'Destravada por voz' } : d))
      );
      feedbackMessage = lock ? 'Fechadura biométrica trancada com trava magnética.' : 'Fechadura biométrica destravada temporariamente.';
      targetDeviceName = 'Fechadura Biométrica';
      usedProtocol = 'Bluetooth BLE 5.3';
    } else {
      // Default toggle lights
      setDevices((prev) =>
        prev.map((d) => (d.id === 'dev-1' ? { ...d, isOn: !d.isOn, lastAction: 'Alternado por comando geral' } : d))
      );
      feedbackMessage = `Comando interpretado: "${rawText}". Ação remota enviada aos dispositivos.`;
      targetDeviceName = 'Dispositivos Gerais';
      usedProtocol = 'WiFi Mesh IoT';
    }

    setLastExecutedCommand({
      text: feedbackMessage,
      target: targetDeviceName,
      protocol: usedProtocol,
      confidence: 99.4,
      timestamp: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
    });

    onAddLog(`Automação por Voz: ${rawText}`, 'IoT Remoto', feedbackMessage);

    if (onSpeakText) {
      onSpeakText(feedbackMessage);
    }
  };

  // Start / Stop Speech Recognition
  const toggleVoiceListening = () => {
    if (isVoiceListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback: simulate immediate high-tech command
      const simulationCommands = [
        'Alexa, ligar iluminação principal da sala',
        'Google, preparar café expresso',
        'Ativar Modo Cinema e desligar luzes',
        'Ligar Fita LED ciano e Workstation no Lab',
        'Trancar fechadura biométrica',
      ];
      const randomCmd = simulationCommands[Math.floor(Math.random() * simulationCommands.length)];
      processVoiceAutomationCommand(randomCmd);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsVoiceListening(true);
        playJarvesChime('listening');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        processVoiceAutomationCommand(transcript);
        setIsVoiceListening(false);
      };

      recognition.onerror = () => {
        setIsVoiceListening(false);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsVoiceListening(false);
    }
  };

  // Toggle individual device
  const handleToggleDevice = (id: string) => {
    playJarvesChime('confirm');
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextState = !d.isOn;
          const msg = `Dispositivo ${d.name} ${nextState ? 'LIGADO' : 'DESLIGADO'}`;
          onAddLog(msg, 'IoT Automação', `${d.room} via ${d.protocol.toUpperCase()}`);
          return {
            ...d,
            isOn: nextState,
            lastAction: `${nextState ? 'Ligado' : 'Desligado'} manualmente às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          };
        }
        return d;
      })
    );
  };

  // Toggle Lock
  const handleToggleLock = (id: string) => {
    playJarvesChime('confirm');
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextLock = !d.isLocked;
          const msg = `Fechadura ${nextLock ? 'TRANCADA' : 'DESTRAVADA'}`;
          onAddLog(msg, 'Segurança IoT', d.room);
          return {
            ...d,
            isLocked: nextLock,
            lastAction: `${nextLock ? 'Trancada' : 'Destravada'} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          };
        }
        return d;
      })
    );
  };

  // Update slider values (brightness, temperature, volume)
  const handleUpdateDeviceProperty = (id: string, property: keyof SmartDevice, value: any) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [property]: value } : d))
    );
  };

  // Execute macro routine scene
  const executeRoutine = (routineId: string) => {
    playJarvesChime('confirm');
    const r = routines.find((item) => item.id === routineId);
    if (!r) return;

    if (routineId === 'scene-1') {
      // Modo Cinema
      setDevices((prev) =>
        prev.map((d) => {
          if (d.category === 'light' && d.room === 'Sala de Estar') {
            return { ...d, isOn: false, lastAction: 'Apagado por Modo Cinema' };
          }
          if (d.name.includes('Fita LED')) {
            return { ...d, isOn: true, brightness: 20, colorHex: '#C084FC', lastAction: 'Violeta 20% para Cinema' };
          }
          if (d.category === 'entertainment') {
            return { ...d, isOn: true, volume: 38, lastAction: 'Ligado via HDMI-CEC' };
          }
          if (d.category === 'climate' && d.room.includes('Sala')) {
            return { ...d, isOn: true, temperature: 21, lastAction: '21°C para Cinema' };
          }
          return d;
        })
      );
    } else if (routineId === 'scene-2') {
      // Modo Lab
      setDevices((prev) =>
        prev.map((d) => {
          if (d.name.includes('Workstation')) {
            return { ...d, isOn: true, lastAction: 'Inicializado para Trabalho' };
          }
          if (d.name.includes('Fita LED')) {
            return { ...d, isOn: true, brightness: 100, colorHex: '#00F0FF', lastAction: 'Ciano JARVES 100%' };
          }
          if (d.category === 'climate' && d.room.includes('Lab')) {
            return { ...d, isOn: true, temperature: 22, lastAction: '22°C Frio Contínuo' };
          }
          return d;
        })
      );
    } else if (routineId === 'scene-3') {
      // Modo Boa Noite (Desligar tudo)
      setDevices((prev) =>
        prev.map((d) => {
          if (d.category === 'security') {
            return { ...d, isLocked: true, lastAction: 'Travamento Noturno' };
          }
          if (d.name.includes('Servidores')) return d; // Keep servers
          return { ...d, isOn: false, lastAction: 'Desligado por Modo Boa Noite' };
        })
      );
    } else if (routineId === 'scene-4') {
      // Bom Dia
      setDevices((prev) =>
        prev.map((d) => {
          if (d.category === 'light') {
            return { ...d, isOn: true, brightness: 60, colorHex: '#FFF8E7', lastAction: 'Amanhecer Gradual' };
          }
          if (d.name.includes('Cafeteira')) {
            return { ...d, isOn: true, lastAction: 'Preparo de café iniciado' };
          }
          if (d.category === 'security') {
            return { ...d, isLocked: true, lastAction: 'Segurança matinal ativa' };
          }
          return d;
        })
      );
    } else if (routineId === 'scene-5') {
      // Segurança Máxima
      setDevices((prev) =>
        prev.map((d) => {
          if (d.category === 'security') {
            return { ...d, isLocked: true, lastAction: 'Bloqueio Imediato' };
          }
          if (d.category === 'outdoor') {
            return { ...d, isOn: true, brightness: 100, lastAction: 'Holofotes Alerta 100%' };
          }
          return d;
        })
      );
    }

    // Update routine active status
    setRoutines((prev) =>
      prev.map((item) => ({
        ...item,
        isActive: item.id === routineId,
        lastExecuted: item.id === routineId ? `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : item.lastExecuted,
      }))
    );

    const spoken = `Rotina ${r.title} executada com sucesso. ${r.devicesAffectedCount} dispositivos sincronizados.`;
    setLastExecutedCommand({
      text: spoken,
      target: r.title,
      protocol: 'Alexa / Google / WiFi',
      confidence: 99.9,
      timestamp: `Hoje às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    });

    onAddLog(`Cena Acionada: ${r.title}`, 'Automação Macro', r.description);

    if (onSpeakText) {
      onSpeakText(spoken);
    }
  };

  // Add new device handler
  const handleAddNewDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;

    const newDev: SmartDevice = {
      id: `dev-${Date.now()}`,
      name: newDeviceName.trim(),
      room: newDeviceRoom,
      category: newDeviceCategory,
      protocol: newDeviceProtocol,
      isOn: false,
      powerWatts: Number(newDeviceWatts) || 40,
      brightness: newDeviceCategory === 'light' ? 80 : undefined,
      temperature: newDeviceCategory === 'climate' ? 22 : undefined,
      colorHex: newDeviceCategory === 'light' ? '#00F0FF' : undefined,
      ipAddress: newDeviceIp.trim() || '192.168.1.210',
      signalStrength: -45,
      lastAction: 'Pareado ao JARVES Hub',
    };

    setDevices((prev) => [newDev, ...prev]);
    onAddLog(`Novo Dispositivo Cadastrado: ${newDev.name}`, 'IoT Provisionamento', `${newDev.room} • ${newDev.protocol.toUpperCase()}`);
    playJarvesChime('confirm');

    setNewDeviceName('');
    setIsAddDeviceModalOpen(false);
  };

  // Helper for protocol badge styling
  const renderProtocolBadge = (protocol: SmartDeviceProtocol) => {
    switch (protocol) {
      case 'alexa':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00CAFF]/15 text-[#00CAFF] border border-[#00CAFF]/30">
            <Radio className="w-3 h-3" /> Alexa
          </span>
        );
      case 'google':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Home className="w-3 h-3" /> Google Home
          </span>
        );
      case 'wifi':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Wifi className="w-3 h-3" /> WiFi 6
          </span>
        );
      case 'bluetooth':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Activity className="w-3 h-3" /> Bluetooth BLE
          </span>
        );
      case 'matter':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Layers className="w-3 h-3" /> Matter
          </span>
        );
      case 'zigbee':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <Cpu className="w-3 h-3" /> Zigbee 3.0
          </span>
        );
    }
  };

  // Helper for device icon
  const getDeviceIcon = (category: SmartDeviceCategory, isOn: boolean) => {
    switch (category) {
      case 'light':
        return <Sun className={`w-5 h-5 ${isOn ? 'text-amber-300 animate-pulse' : 'text-slate-500'}`} />;
      case 'climate':
        return <Wind className={`w-5 h-5 ${isOn ? 'text-cyan-300 animate-spin' : 'text-slate-500'}`} />;
      case 'entertainment':
        return <Tv className={`w-5 h-5 ${isOn ? 'text-indigo-400' : 'text-slate-500'}`} />;
      case 'appliance':
        return <Coffee className={`w-5 h-5 ${isOn ? 'text-amber-400' : 'text-slate-500'}`} />;
      case 'security':
        return <ShieldCheck className={`w-5 h-5 ${isOn ? 'text-emerald-400' : 'text-slate-500'}`} />;
      case 'power':
        return <Zap className={`w-5 h-5 ${isOn ? 'text-cyan-400' : 'text-slate-500'}`} />;
      case 'outdoor':
        return <Flame className={`w-5 h-5 ${isOn ? 'text-teal-400' : 'text-slate-500'}`} />;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Futuristic Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#0C1220] via-[#0A101C] to-[#070B14] border border-[#00F0FF]/30 shadow-[0_0_30px_rgba(0,240,255,0.08)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F0FF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00F0FF]/20 to-purple-500/20 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.25)]">
            <Radio className="w-7 h-7 text-[#00F0FF] animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-orbitron font-extrabold text-white tracking-wider">
                AUTOMAÇÕES & CONTROLE REMOTO
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40">
                JARVES IoT OS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                MÓDULO ATIVO POR PADRÃO
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Acionamento por Comando de Voz com conexões integradas <strong>Alexa</strong>, <strong>Google Home</strong>, <strong>Wi-Fi 6</strong> e <strong>Bluetooth BLE</strong>.
            </p>
          </div>
        </div>

        {/* Global Controls & Add Device */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 relative z-10 w-full sm:w-auto">
          <button
            onClick={toggleVoiceListening}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-orbitron font-bold text-xs tracking-wide transition-all shadow-lg cursor-pointer min-h-[44px] ${
              isVoiceListening
                ? 'bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse'
                : 'bg-gradient-to-r from-[#00F0FF] to-cyan-400 text-slate-950 hover:brightness-110 shadow-[0_0_20px_rgba(0,240,255,0.35)]'
            }`}
            title="Pressione para falar comando de automação por voz"
          >
            {isVoiceListening ? <Mic className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4" />}
            <span className="truncate">{isVoiceListening ? 'OUVINDO...' : 'COMANDO DE VOZ'}</span>
          </button>

          <button
            onClick={() => setIsAddDeviceModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-orbitron font-bold text-xs transition-all shadow cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span className="truncate">NOVO DISPOSITIVO</span>
          </button>
        </div>
      </div>

      {/* 2. Live Protocol Bridges & Energy Telemetry Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Alexa Bridge */}
        <div className="p-3.5 rounded-xl bg-[#0E1524]/90 border border-[#00CAFF]/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">AMAZON ALEXA</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-orbitron font-bold text-[#00CAFF] flex items-center gap-1">
              <Radio className="w-3.5 h-3.5" /> ONLINE
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ping: 14ms &bull; Skill v3</div>
          </div>
        </div>

        {/* Google Home Bridge */}
        <div className="p-3.5 rounded-xl bg-[#0E1524]/90 border border-amber-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">GOOGLE HOME</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-orbitron font-bold text-amber-300 flex items-center gap-1">
              <Home className="w-3.5 h-3.5" /> ONLINE
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Nest Graph &bull; 18ms</div>
          </div>
        </div>

        {/* WiFi 6 Mesh */}
        <div className="p-3.5 rounded-xl bg-[#0E1524]/90 border border-emerald-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">WI-FI 6 MESH</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-orbitron font-bold text-emerald-300 flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" /> 14 NÓS
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">2.4G/5G &bull; Ping: 4ms</div>
          </div>
        </div>

        {/* Bluetooth BLE 5.3 */}
        <div className="p-3.5 rounded-xl bg-[#0E1524]/90 border border-blue-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">BLUETOOTH 5.3</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-orbitron font-bold text-blue-300 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> ATIVO
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">6 Beacons pareados</div>
          </div>
        </div>

        {/* Matter & Zigbee */}
        <div className="p-3.5 rounded-xl bg-[#0E1524]/90 border border-purple-500/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">MATTER / ZIGBEE</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-orbitron font-bold text-purple-300 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> AES-128
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">Thread Border Router</div>
          </div>
        </div>

        {/* Energy Telemetry */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/40 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyan-300">POTÊNCIA ATIVA</span>
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          </div>
          <div className="mt-2">
            <div className="text-base font-orbitron font-black text-cyan-300">
              {totalPowerWatts.toLocaleString('pt-BR')} W
            </div>
            <div className="text-[10px] text-slate-300 font-mono mt-0.5">
              {activeDevicesCount} de {devices.length} ligados
            </div>
          </div>
        </div>
      </div>

      {/* 3. Voice Command Studio & Audio Recognition Terminal */}
      <div className="p-5 rounded-2xl bg-[#0C111C]/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF]">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <span className="font-orbitron font-bold text-sm text-slate-100 tracking-wider">
                CENTRAL DE COMANDOS DE VOZ REMOTOS
              </span>
              <p className="text-[11px] text-slate-400">
                Fale naturalmente ou clique nos comandos rápidos de simulação inteligente.
              </p>
            </div>
          </div>

          {/* Quick Voice Command Audio feedback toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Status:</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              PRONTO PARA ESCUTA
            </span>
          </div>
        </div>

        {/* Live Audio Visualizer Wave (when listening) */}
        {isVoiceListening && (
          <div className="p-4 rounded-xl bg-[#070B14] border border-rose-500/50 flex flex-col items-center justify-center gap-2 animate-pulse">
            <div className="flex items-center gap-1.5 h-8">
              {[40, 75, 90, 60, 100, 45, 80, 95, 70, 50, 85, 95, 60, 40].map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-rose-500 rounded-full animate-bounce"
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              ))}
            </div>
            <span className="text-xs font-orbitron font-bold text-rose-400 tracking-wider">
              CAPTURANDO ÁUDIO DO MICROFONE... DIGA SEU COMANDO
            </span>
          </div>
        )}

        {/* Last Executed Command Banner */}
        {lastExecutedCommand && (
          <div className="p-3.5 rounded-xl bg-[#111827]/80 border border-[#00F0FF]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-orbitron font-bold text-[#00F0FF] uppercase tracking-wide">
                    ÚLTIMO COMANDO EXECUTADO
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {lastExecutedCommand.confidence}% PRECISÃO
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {lastExecutedCommand.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-200 font-sans mt-0.5 font-medium">
                  "{lastExecutedCommand.text}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right shrink-0">
              <span className="text-[10px] font-mono text-slate-400">Alvo: <strong className="text-slate-200">{lastExecutedCommand.target}</strong></span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {lastExecutedCommand.protocol}
              </span>
            </div>
          </div>
        )}

        {/* Quick Voice Simulation Buttons */}
        <div>
          <span className="text-xs font-orbitron font-bold text-slate-300 block mb-2 tracking-wide">
            TESTAR COMANDOS DE VOZ RÁPIDOS:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Alexa, ligar luzes da sala', cmd: 'Alexa, ligar luzes da sala' },
              { label: 'Google, ativar Modo Cinema', cmd: 'Google, ativar Modo Cinema' },
              { label: 'JARVES, ativar Modo Trabalho', cmd: 'JARVES, ativar Modo Trabalho' },
              { label: 'Preparar café expresso', cmd: 'Preparar café expresso' },
              { label: 'Luzes em Ciano Cyberpunk', cmd: 'Mudar cor das luzes para ciano' },
              { label: 'Desligar ar-condicionado', cmd: 'Desligar ar-condicionado' },
              { label: 'Trancar fechadura biométrica', cmd: 'Trancar fechadura biométrica' },
              { label: 'Ligar bomba da piscina e cascata', cmd: 'Ligar bomba da piscina e cascata' },
              { label: 'Modo Boa Noite (Desligar Tudo)', cmd: 'Ativar Modo Boa Noite' },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => processVoiceAutomationCommand(item.cmd)}
                className="px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-[#00F0FF]/15 hover:border-[#00F0FF]/50 border border-slate-800 text-slate-300 hover:text-[#00F0FF] text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Play className="w-3 h-3 text-cyan-400 fill-current" />
                <span>"{item.label}"</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Macro Routines & Smart Scenes (Cenas Inteligentes) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-orbitron font-bold text-white tracking-wider">
              ROTINAS & CENAS INTELIGENTES (MACRO AUTOMAÇÃO)
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {routines.length} Cenas Pré-Programadas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {routines.map((r) => (
            <div
              key={r.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden bg-gradient-to-b ${r.colorScheme} ${
                r.isActive ? 'ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'opacity-90 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/20 flex items-center justify-center">
                    {r.iconName === 'Tv' && <Tv className="w-4 h-4 text-purple-300" />}
                    {r.iconName === 'Zap' && <Zap className="w-4 h-4 text-cyan-300" />}
                    {r.iconName === 'Moon' && <Moon className="w-4 h-4 text-blue-300" />}
                    {r.iconName === 'Sun' && <Sun className="w-4 h-4 text-amber-300" />}
                    {r.iconName === 'Shield' && <Shield className="w-4 h-4 text-rose-300" />}
                  </div>

                  {r.isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-400 text-slate-950 animate-pulse">
                      ATIVA AGORA
                    </span>
                  )}
                </div>

                <h3 className="text-xs font-orbitron font-bold text-white line-clamp-1">
                  {r.title}
                </h3>
                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {r.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                  <span>Gatilho de Voz:</span>
                  <span className="font-bold text-white truncate max-w-[120px]">"{r.voiceTriggerPhrase}"</span>
                </div>

                <button
                  onClick={() => executeRoutine(r.id)}
                  className={`w-full py-1.5 rounded-lg text-xs font-orbitron font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    r.isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                      : 'bg-black/50 hover:bg-black/80 text-white border border-white/20'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{r.isActive ? 'REATIVAR CENA' : 'EXECUTAR CENA'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Smart Devices Grid (Luzes, Aparelhos Eletrônicos & Tudo que pode ser ligado remotamente) */}
      <div className="space-y-4">
        {/* Controls Bar & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-[#0B101D] border border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-orbitron font-bold text-slate-300 mr-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" /> CÔMODOS:
            </span>
            {roomList.map((room) => (
              <button
                key={room}
                onClick={() => setSelectedRoom(room)}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  selectedRoom === room
                    ? 'bg-[#00F0FF] text-slate-950 font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {room === 'all' ? 'Todos os Cômodos' : room}
              </button>
            ))}
          </div>

          {/* Quick Search & State Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar aparelho..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 w-44 font-mono"
              />
            </div>

            <select
              value={selectedProtocol}
              onChange={(e) => setSelectedProtocol(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="all">Todas Tecnologias</option>
              <option value="alexa">Amazon Alexa</option>
              <option value="google">Google Home</option>
              <option value="wifi">WiFi 6 Mesh</option>
              <option value="bluetooth">Bluetooth BLE</option>
              <option value="matter">Matter</option>
            </select>
          </div>
        </div>

        {/* Devices Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDevices.map((device) => {
            return (
              <div
                key={device.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden bg-[#0D1322]/90 ${
                  device.isOn
                    ? 'border-[#00F0FF]/50 shadow-[0_0_20px_rgba(0,240,255,0.12)]'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Header: Icon, Name, Room, Protocol */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                          device.isOn
                            ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_14px_rgba(0,240,255,0.3)]'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}
                      >
                        {getDeviceIcon(device.category, device.isOn)}
                      </div>
                      <div>
                        <h4 className="text-xs font-orbitron font-bold text-white line-clamp-1">
                          {device.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {device.room}
                        </span>
                      </div>
                    </div>

                    {/* Protocol Badge */}
                    {renderProtocolBadge(device.protocol)}
                  </div>

                  {/* Device Specific Controls */}
                  <div className="mt-3 space-y-2.5 bg-black/40 p-2.5 rounded-lg border border-slate-800/60 text-xs">
                    {/* Light: Brightness & Color picker */}
                    {device.category === 'light' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Brilho Dimerizável</span>
                          <span className="text-cyan-300 font-bold">{device.brightness || 80}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={device.brightness || 80}
                          onChange={(e) => handleUpdateDeviceProperty(device.id, 'brightness', Number(e.target.value))}
                          disabled={!device.isOn}
                          className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
                        />

                        {/* Preset color swatches */}
                        {device.colorHex && (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-mono text-slate-400">Cor RGB:</span>
                            <div className="flex items-center gap-1.5">
                              {['#00F0FF', '#C084FC', '#FACC15', '#00FF66', '#FF0055', '#FFFFFF'].map((color) => (
                                <button
                                  key={color}
                                  onClick={() => handleUpdateDeviceProperty(device.id, 'colorHex', color)}
                                  disabled={!device.isOn}
                                  className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                                    device.colorHex === color ? 'scale-125 border-white ring-1 ring-cyan-400' : 'border-black/50'
                                  }`}
                                  style={{ backgroundColor: color }}
                                  title={`Cor ${color}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Climate: Temperature adjustment */}
                    {device.category === 'climate' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Temperatura do Ar</span>
                          <span className="text-cyan-300 font-bold font-orbitron">{device.temperature || 22}°C</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleUpdateDeviceProperty(device.id, 'temperature', Math.max(16, (device.temperature || 22) - 1))}
                            disabled={!device.isOn}
                            className="px-2 py-0.5 rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 font-mono text-xs"
                          >
                            -1°C
                          </button>
                          <input
                            type="range"
                            min="16"
                            max="28"
                            value={device.temperature || 22}
                            onChange={(e) => handleUpdateDeviceProperty(device.id, 'temperature', Number(e.target.value))}
                            disabled={!device.isOn}
                            className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
                          />
                          <button
                            onClick={() => handleUpdateDeviceProperty(device.id, 'temperature', Math.min(28, (device.temperature || 22) + 1))}
                            disabled={!device.isOn}
                            className="px-2 py-0.5 rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 font-mono text-xs"
                          >
                            +1°C
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Entertainment: Volume */}
                    {device.category === 'entertainment' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>Volume Receiver</span>
                          <span className="text-indigo-300 font-bold">{device.volume || 30}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={device.volume || 30}
                          onChange={(e) => handleUpdateDeviceProperty(device.id, 'volume', Number(e.target.value))}
                          disabled={!device.isOn}
                          className="w-full accent-indigo-400 h-1 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
                        />
                      </div>
                    )}

                    {/* Security: Smart Lock */}
                    {device.category === 'security' && (
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[10px] font-mono text-slate-400">Trava Biométrica:</span>
                        <button
                          onClick={() => handleToggleLock(device.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            device.isLocked
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {device.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          <span>{device.isLocked ? 'TRANCADA' : 'ABERTA'}</span>
                        </button>
                      </div>
                    )}

                    {/* Technical Meta: Watts, IP, Signal */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                      <span>Consumo: <strong className={device.isOn ? 'text-amber-300' : 'text-slate-500'}>{device.isOn ? `${device.powerWatts}W` : '0W'}</strong></span>
                      <span className="text-slate-500">{device.ipAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action: Toggle Power Button */}
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[170px]" title={device.lastAction}>
                    {device.lastAction}
                  </div>

                  <button
                    onClick={() => handleToggleDevice(device.id)}
                    className={`px-3 py-1.5 rounded-lg font-orbitron font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      device.isOn
                        ? 'bg-[#00F0FF] text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{device.isOn ? 'LIGADO' : 'LIGAR'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Modal: Add New Smart Device */}
      {isAddDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-[#0D121D] border border-cyan-500/40 p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddDeviceModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-[#00F0FF]">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-orbitron font-bold text-base text-white">
                  CADASTRAR NOVO DISPOSITIVO
                </h3>
                <p className="text-xs text-slate-400">
                  Integre aparelhos Wi-Fi, Bluetooth, Alexa, Google Home ou Matter.
                </p>
              </div>
            </div>

            <form onSubmit={handleAddNewDevice} className="space-y-3.5">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Nome do Aparelho / Luz:</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fita LED Quarto, TV Sala, Cafeteira..."
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Cômodo / Local:</label>
                  <select
                    value={newDeviceRoom}
                    onChange={(e) => setNewDeviceRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Sala de Estar">Sala de Estar</option>
                    <option value="Escritório / Lab">Escritório / Lab</option>
                    <option value="Quarto Master">Quarto Master</option>
                    <option value="Cozinha">Cozinha</option>
                    <option value="Área Externa">Área Externa</option>
                    <option value="Garagem">Garagem</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Tecnologia / Bridge:</label>
                  <select
                    value={newDeviceProtocol}
                    onChange={(e) => setNewDeviceProtocol(e.target.value as SmartDeviceProtocol)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value="alexa">Amazon Alexa</option>
                    <option value="google">Google Home</option>
                    <option value="wifi">WiFi 6 Mesh</option>
                    <option value="bluetooth">Bluetooth BLE</option>
                    <option value="matter">Matter Protocol</option>
                    <option value="zigbee">Zigbee 3.0</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Categoria:</label>
                  <select
                    value={newDeviceCategory}
                    onChange={(e) => setNewDeviceCategory(e.target.value as SmartDeviceCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  >
                    <option value="light">Iluminação / Luz</option>
                    <option value="climate">Ar-Condicionado / Clima</option>
                    <option value="entertainment">TV / Áudio</option>
                    <option value="appliance">Eletrodoméstico</option>
                    <option value="security">Fechadura / Alarme</option>
                    <option value="power">Tomada Inteligente</option>
                    <option value="outdoor">Área Externa / Jardim</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">Potência Estimada (W):</label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={newDeviceWatts}
                    onChange={(e) => setNewDeviceWatts(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Endereço IP ou Identificador:</label>
                <input
                  type="text"
                  value={newDeviceIp}
                  onChange={(e) => setNewDeviceIp(e.target.value)}
                  placeholder="192.168.1.xxx ou BLE:xx:xx"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddDeviceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white font-mono text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-orbitron font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  SALVAR DISPOSITIVO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
