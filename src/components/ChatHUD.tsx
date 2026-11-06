import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Camera,
  Calendar,
  Layers,
  ArrowRight,
  Upload,
  Square,
  Play,
  Pause,
  Eye,
  FileAudio,
  Radio,
  BookOpen,
  X,
  DollarSign,
  Thermometer,
  Zap,
  Check
} from 'lucide-react';
import { ChatMessage, FunctionCallDetail, VoiceConfig } from '../types';
import { detectLiveVoiceIntentPreview } from '../utils/voiceCommandParser';

interface ChatHUDProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSendAudio?: (audioData: string, mimeType: string) => void;
  onCaptureVision?: (prompt?: string) => void;
  isListening: boolean;
  speechTranscript?: string;
  onToggleListening: () => void;
  isProcessing: boolean;
  voiceConfig: VoiceConfig;
  onSpeakText: (text: string) => void;
  onExecuteQuickCommand: (cmd: string) => void;
}

export const ChatHUD: React.FC<ChatHUDProps> = ({
  messages,
  onSendMessage,
  onSendAudio,
  onCaptureVision,
  isListening,
  speechTranscript = '',
  onToggleListening,
  isProcessing,
  voiceConfig,
  onSpeakText,
  onExecuteQuickCommand,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Recording State (MediaRecorder)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioActionError, setAudioActionError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Image zoom modal state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // High Precision Voice Commands Guide Modal
  const [showVoiceGuide, setShowVoiceGuide] = useState(false);
  const [selectedGuideCategory, setSelectedGuideCategory] = useState<string>('all');
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, isRecordingAudio]);

  // Audio recorder timer
  useEffect(() => {
    if (isRecordingAudio) {
      setRecordingSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecordingAudio]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  // Start recording user voice note
  const startRecordingAudioNote = async () => {
    setAudioActionError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAudioActionError('Gravação de áudio não suportada neste navegador.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      let chosenMime = 'audio/webm';
      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
        for (const cand of candidates) {
          if (MediaRecorder.isTypeSupported(cand)) {
            chosenMime = cand;
            options = { mimeType: cand };
            break;
          }
        }
      }

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = options.mimeType ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;
      const actualMime = mediaRecorder.mimeType || chosenMime;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          if (onSendAudio) {
            onSendAudio(base64Data, actualMime);
          } else {
            onSendMessage('Comando de voz gravado enviado para interpretação.');
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (err: any) {
      console.error('Failed to record audio note:', err);
      setIsRecordingAudio(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setAudioActionError('Não foi possível acessar o microfone. Verifique as permissões de áudio do navegador.');
      setTimeout(() => setAudioActionError(null), 7000);
    }
  };

  // Stop recording user voice note
  const stopRecordingAudioNote = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping mediaRecorder:', e);
      }
      setIsRecordingAudio(false);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // Handle uploaded audio file
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (onSendAudio) {
        onSendAudio(base64, file.type || 'audio/mp3');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const VOICE_COMMANDS_CATALOG = [
    {
      category: 'finance',
      categoryLabel: 'Finanças & Lançamentos',
      badgeColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
      commands: [
        {
          phrase: 'Acrescentar 200 reais no financeiro como combustível',
          result: 'Lança despesa de R$ 200,00 na categoria Transporte/Geral',
          spoken: 'Lançamento registrado: despesa de R$ 200,00 em Transporte.',
        },
        {
          phrase: 'Adicionar receita de 1500 reais de consultoria',
          result: 'Lança receita de R$ 1.500,00 na categoria Consultoria',
          spoken: 'Receita de R$ 1.500,00 lançada com sucesso no saldo.',
        },
        {
          phrase: 'Lançar gasto de 45 reais com almoço',
          result: 'Registra saída de R$ 45,00 em Alimentação',
          spoken: 'Lançamento de despesa de R$ 45,00 efetuado.',
        },
      ],
    },
    {
      category: 'climate',
      categoryLabel: 'Climatização & Temperatura',
      badgeColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
      commands: [
        {
          phrase: 'Ajustar temperatura para 22 graus',
          result: 'Regula a temperatura do sistema/ambiente para 22°C',
          spoken: 'Temperatura do sistema ajustada para 22 graus Celsius.',
        },
        {
          phrase: 'Aumentar temperatura em 2 graus',
          result: 'Eleva a temperatura em +2°C com confirmação de voz',
          spoken: 'Temperatura aumentada em 2 graus Celsius.',
        },
        {
          phrase: 'Resfriar o sistema para 19 graus',
          result: 'Reduz a temperatura alvo para 19°C',
          spoken: 'Sistema térmico ajustado para 19 graus Celsius.',
        },
      ],
    },
    {
      category: 'calendar',
      categoryLabel: 'Agenda & Compromissos',
      badgeColor: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
      commands: [
        {
          phrase: 'Agendar reunião com diretoria amanhã às 15 horas',
          result: 'Insere compromisso na agenda no dia e horário informados',
          spoken: 'Reunião com diretoria agendada para amanhã às 15 horas.',
        },
        {
          phrase: 'Marcar consulta médica na sexta às 10 horas',
          result: 'Registra consulta médica na categoria Pessoal',
          spoken: 'Consulta médica agendada para sexta-feira às 10 horas.',
        },
      ],
    },
    {
      category: 'whatsapp',
      categoryLabel: 'WhatsApp & Automações',
      badgeColor: 'text-green-400 bg-green-500/15 border-green-500/30',
      commands: [
        {
          phrase: 'Ativar mensagens automáticas para o WhatsApp do Romildo',
          result: 'Habilita regra autônoma de despacho automático para Romildo',
          spoken: 'Automação de mensagens WhatsApp ativada para Romildo.',
        },
        {
          phrase: 'Enviar WhatsApp para Romildo dizendo que o relatório está pronto',
          result: 'Prepara envio de mensagem direta pelo WhatsApp Web',
          spoken: 'Mensagem formatada e pronta para envio no WhatsApp.',
        },
      ],
    },
    {
      category: 'vision',
      categoryLabel: 'Visão Óptica & Câmera',
      badgeColor: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
      commands: [
        {
          phrase: 'JARVES, olhe pela câmera e descreva o que você está vendo',
          result: 'Liga câmera, captura frame óptico e realiza análise com IA multimodal',
          spoken: 'Ativando sensores ópticos para inspeção visual do ambiente.',
        },
      ],
    },
    {
      category: 'hardware',
      categoryLabel: 'Controle de Hardware',
      badgeColor: 'text-sky-400 bg-sky-500/15 border-sky-500/30',
      commands: [
        {
          phrase: 'Ligar câmera / Desligar microfone / Ativar Wi-Fi',
          result: 'Controla periféricos instantaneamente com confirmação sonora',
          spoken: 'Periférico calibrado e atualizado conforme solicitado.',
        },
      ],
    },
    {
      category: 'pc',
      categoryLabel: 'Sistema & PC',
      badgeColor: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
      commands: [
        {
          phrase: 'Ajustar volume para 80%',
          result: 'Define nível de volume do sistema para 80%',
          spoken: 'Volume do sistema definido para 80 por cento.',
        },
        {
          phrase: 'Tirar print da tela',
          result: 'Aciona buffer de captura de tela instantânea',
          spoken: 'Captura de tela processada e armazenada.',
        },
      ],
    },
    {
      category: 'nav',
      categoryLabel: 'Navegação por Voz',
      badgeColor: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
      commands: [
        {
          phrase: 'Abrir financeiro / Ver dispositivos / Mostrar agenda / Painel admin',
          result: 'Alterna a visualização da interface para o módulo solicitado',
          spoken: 'Alternando visualização da interface para o módulo solicitado.',
        },
      ],
    },
  ];

  const quickCommands = [
    { label: 'Visão da Câmera', cmd: 'JARVES, olhe pela câmera e descreva o que você está vendo', isVision: true },
    { label: '+R$ 200 Combustível', cmd: 'Acrescentar 200 reais no financeiro como combustível' },
    { label: 'Temp para 22°C', cmd: 'Ajustar temperatura para 22 graus' },
    { label: 'Reunião Amanhã 15h', cmd: 'Agendar reunião com diretoria amanhã às 15 horas' },
    { label: 'Zap Automático Romildo', cmd: 'Ativar mensagens automáticas para o WhatsApp do Romildo' },
    { label: 'Volume 80%', cmd: 'Ajustar volume do sistema para 80%' },
    { label: 'Ligar Câmera', cmd: 'JARVES, ligar câmera do dispositivo' },
    { label: 'Tirar Print', cmd: 'Tirar print de tela agora' },
    { label: 'Abrir Financeiro', cmd: 'Abrir financeiro' },
  ];

  const renderBottomDock = () => (
    <div
      id="jarves-terminal-voice-dock"
      className={
        isMobile
          ? "fixed bottom-0 left-0 right-0 z-50 bg-[#0B0E14]/98 backdrop-blur-2xl border-t border-cyan-500/40 shadow-[0_-12px_40px_rgba(0,0,0,0.95)] p-2 pb-[calc(0.6rem+env(safe-area-inset-bottom,0px))]"
          : "p-2 sm:p-3 bg-[#121824] border-t border-slate-800"
      }
    >
      {/* Voice Recording Bar (Active State) */}
      {isRecordingAudio && (
        <div className="px-4 py-3 bg-rose-950/40 border-t border-rose-500/40 flex items-center justify-between animate-pulse mb-2 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono text-xs text-rose-300 font-bold">
              GRAVANDO ÁUDIO PARA O JARVES: {recordingSeconds}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecordingAudio(false)}
              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={stopRecordingAudioNote}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Concluir & Enviar</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Continuous / Real-time Voice Recognition HUD (Speech-to-Text) */}
      {isListening && (
        <div className="px-4 py-3 bg-[#00F0FF]/10 border-t border-[#00F0FF]/30 flex flex-col gap-2 animate-in fade-in duration-150 mb-2 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
              </span>
              <span className="font-mono text-xs font-bold tracking-wider text-cyan-300 flex items-center gap-1.5">
                <span>RECONHECIMENTO DE VOZ ATIVO</span>
                <span className="text-[10px] text-slate-400 font-normal">| {voiceConfig.continuousListening ? 'Modo Contínuo' : 'Comando Direto'}</span>
              </span>
            </div>

            {/* Live Intent Preview Badge */}
            {speechTranscript && (() => {
              const preview = detectLiveVoiceIntentPreview(speechTranscript);
              if (!preview) return null;
              return (
                <div
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wide border flex items-center gap-1.5 animate-pulse"
                  style={{ backgroundColor: `${preview.color}20`, borderColor: `${preview.color}80`, color: preview.color }}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{preview.label}</span>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center gap-3 bg-[#0B0E14]/80 p-2.5 rounded-xl border border-cyan-500/20">
            {/* Holographic sound bars animation */}
            <div className="flex items-end gap-1 h-5 flex-shrink-0">
              <div className="w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
              <div className="w-1 bg-cyan-300 rounded-full animate-bounce [animation-delay:-0.15s] h-5" />
              <div className="w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.45s] h-4" />
              <div className="w-1 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.2s] h-2" />
            </div>

            <p className="text-xs font-mono text-slate-200 flex-1 truncate">
              {speechTranscript ? (
                <span>&ldquo;{speechTranscript}&rdquo;</span>
              ) : (
                <span className="text-slate-500 italic">Fale seu comando... (ex: &quot;salvar&quot;, &quot;desligar câmera&quot;, &quot;volume 80&quot;, &quot;pausar música&quot;, &quot;gastei 50 no mercado&quot;)</span>
              )}
            </p>

            <button
              onClick={onToggleListening}
              className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Parar
            </button>
          </div>
        </div>
      )}

      {/* Input / Voice Bar Form & Action Buttons */}
      <div className={isMobile ? "p-0" : ""}>
        {/* Mobile-Only Quick Media & Tools Tray */}
        <div className="flex sm:hidden items-center justify-between gap-1.5 pb-2 mb-1.5 border-b border-slate-800/60 overflow-x-auto text-[11px] font-mono">
          <button
            type="button"
            onClick={isRecordingAudio ? stopRecordingAudioNote : startRecordingAudioNote}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all ${
              isRecordingAudio
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-[#0B0E14] text-purple-300 border-purple-500/30'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isRecordingAudio ? 'Parar Nota' : 'Gravar Nota'}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B0E14] text-slate-300 border border-slate-800 hover:text-[#00F0FF]"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Enviar Áudio</span>
          </button>

          {onCaptureVision && (
            <button
              type="button"
              onClick={() => onCaptureVision()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B0E14] text-cyan-300 border border-cyan-500/30"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              <span>Câmera</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowVoiceGuide(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0B0E14] text-amber-300 border border-amber-500/30"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Comandos</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2">
          {/* Real-time Voice Recognition Toggle Button (Microphone) */}
          <button
            type="button"
            id="btn-voice-input-toggle"
            onClick={onToggleListening}
            className={`relative flex items-center justify-center w-11 h-11 rounded-xl transition-all shadow-md flex-shrink-0 cursor-pointer ${
              isListening
                ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse'
                : 'bg-[#0B0E14] text-[#00F0FF] border border-[#00F0FF]/40 hover:bg-[#00F0FF]/10'
            }`}
            title={isListening ? 'Parar de ouvir' : 'Falar em tempo real (Speech-to-Text)'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Desktop Only: Record Voice Note Button */}
          <button
            type="button"
            id="btn-record-audio-note"
            onClick={isRecordingAudio ? stopRecordingAudioNote : startRecordingAudioNote}
            className={`hidden sm:flex items-center justify-center w-11 h-11 rounded-xl transition-all shadow-md flex-shrink-0 cursor-pointer ${
              isRecordingAudio
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-[#0B0E14] text-purple-400 border border-purple-500/40 hover:bg-purple-500/15'
            }`}
            title="Gravar mensagem de áudio"
          >
            <Radio className="w-5 h-5" />
          </button>

          {/* Desktop Only: Upload Audio File Button */}
          <button
            type="button"
            id="btn-upload-audio"
            onClick={() => fileInputRef.current?.click()}
            className="hidden sm:flex items-center justify-center w-10 h-11 rounded-xl bg-[#0B0E14] text-slate-400 border border-slate-800 hover:text-[#00F0FF] hover:border-[#00F0FF]/40 transition-all flex-shrink-0 cursor-pointer"
            title="Enviar arquivo de áudio (.mp3, .wav, .ogg)"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleAudioFileUpload}
          />

          {/* Desktop Only: Instant Camera Capture Button */}
          {onCaptureVision && (
            <button
              type="button"
              id="btn-camera-vision-instant"
              onClick={() => onCaptureVision()}
              className="hidden sm:flex items-center justify-center w-10 h-11 rounded-xl bg-[#0B0E14] text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/15 transition-all flex-shrink-0 cursor-pointer"
              title="Ligar câmera e analisar imagem com JARVES"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}

          {/* Text Input (Message field) */}
          <div className="relative flex-1 min-w-0">
            <input
              id="jarves-chat-input"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua ordem para o JARVES..."
              className="w-full bg-[#0B0E14] border border-slate-700/80 focus:border-[#00F0FF] rounded-xl px-3 sm:px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00F0FF]/50 transition-all font-rajdhani text-base"
              disabled={isProcessing}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="btn-send-message"
            disabled={!inputText.trim() || isProcessing}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#6C5CE7] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-[#0B0E14] font-bold shadow-md transition-all flex-shrink-0 cursor-pointer"
            title="Enviar comando"
          >
            <Send className="w-4 h-4 text-slate-950 fill-slate-950" />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0B0E14]/90 rounded-2xl border border-slate-800/80 sm:backdrop-blur-md overflow-hidden shadow-2xl">
      {/* Top HUD Status Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#121824]/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#00F0FF]" />
          <span className="font-orbitron text-xs tracking-wider text-slate-200">
            TERMINAL DE VOZ, ÁUDIO & VISÃO JARVES
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          {/* Voice Guide Button */}
          <button
            onClick={() => setShowVoiceGuide(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/35 text-xs font-semibold transition-all shadow-sm"
            title="Ver catálogo de comandos de voz de alta precisão"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guia de Voz</span>
            <span className="sm:hidden">Comandos</span>
          </button>

          {/* Quick Trigger Camera Vision */}
          {onCaptureVision && (
            <button
              onClick={() => onCaptureVision()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-xs font-semibold transition-all"
              title="Ligar câmera e analisar imagem com IA"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Visão Óptica</span>
            </button>
          )}

          <span className="hidden md:flex items-center gap-1.5 font-mono text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Voz: {voiceConfig.voiceType === 'masculino' ? 'Masculina' : 'Feminina'}
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-36 sm:pb-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isSystem = msg.sender === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-xs font-mono text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-[#00F0FF]" />
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1">
                  {isUser ? 'Romildo (Você)' : 'JARVES'}
                  {msg.imageUrl && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-[#00F0FF] border border-[#00F0FF]/30">
                      Óptico
                    </span>
                  )}
                  {msg.audioUrl && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Voz
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {msg.timestamp}
                </span>
              </div>

              <div
                className={`relative max-w-[90%] sm:max-w-[78%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-slate-100 border border-slate-700 shadow-md rounded-tr-none'
                    : 'bg-[#121824]/95 text-slate-200 border border-[#00F0FF]/30 shadow-[0_0_15px_rgba(0,240,255,0.08)] rounded-tl-none'
                }`}
              >
                {/* Speech Button for JARVES Messages */}
                {!isUser && (
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#00F0FF] flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Resposta JARVES
                    </span>
                    <button
                      onClick={() => onSpeakText(msg.speechText || msg.text)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0B0E14] hover:bg-[#00F0FF]/20 text-slate-400 hover:text-[#00F0FF] text-[11px] font-mono transition-colors border border-slate-800"
                      title="Ouvir resposta por voz"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Falar</span>
                    </button>
                  </div>
                )}

                {/* Captured Camera Image Display */}
                {msg.imageUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-[#00F0FF]/40 bg-black/90 p-1">
                    <div className="flex items-center justify-between px-2 py-1 bg-[#0B0E14] border-b border-slate-800 mb-1 text-[10px] font-mono text-[#00F0FF]">
                      <span className="flex items-center gap-1">
                        <Camera className="w-3 h-3" /> QUADRO DA CÂMERA ANALISADO
                      </span>
                      <button
                        onClick={() => setPreviewImage(msg.imageUrl || null)}
                        className="hover:underline flex items-center gap-0.5 text-slate-300"
                      >
                        <Eye className="w-3 h-3" /> Expandir
                      </button>
                    </div>
                    <img
                      src={msg.imageUrl}
                      alt="Captura da Câmera JARVES"
                      className="w-full max-h-56 object-contain rounded cursor-pointer hover:opacity-95 transition-opacity"
                      onClick={() => setPreviewImage(msg.imageUrl || null)}
                    />
                  </div>
                )}

                {/* User Audio Message Display */}
                {msg.audioUrl && (
                  <div className="mb-2 p-2.5 rounded-xl bg-[#0B0E14] border border-[#6C5CE7]/40 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-[#6C5CE7]/20 text-[#6C5CE7]">
                      <FileAudio className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[11px] font-mono text-slate-300 font-semibold mb-1">
                        Mensagem de Voz Gravada
                      </div>
                      <audio controls src={msg.audioUrl} className="h-8 w-full max-w-xs" />
                    </div>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Function Call Visual Badge & Payload */}
                {msg.functionCall && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <div className="rounded-xl bg-[#0B0E14] border border-[#00F0FF]/30 p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-mono font-bold text-[#00F0FF]">
                            EXECUÇÃO: {msg.functionCall.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Sucesso
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-slate-400 mt-1 bg-slate-950/60 p-2 rounded border border-slate-900 overflow-x-auto">
                        {JSON.stringify(msg.functionCall.args, null, 2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-start gap-2">
            <div className="rounded-2xl rounded-tl-none bg-[#121824] border border-[#00F0FF]/40 p-3 flex items-center gap-2 text-xs font-mono text-[#00F0FF]">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping" />
              <span>JARVES PROCESSANDO REQUISIÇÃO...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="px-3 py-2 bg-[#0B0E14] border-t border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
        <span className="text-[10px] font-mono uppercase text-slate-500 flex-shrink-0">
          Sugestões:
        </span>
        {quickCommands.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (item.isVision && onCaptureVision) {
                onCaptureVision();
              } else {
                onExecuteQuickCommand(item.cmd);
              }
            }}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-rajdhani flex items-center gap-1 transition-all ${
              item.isVision
                ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 hover:bg-[#00F0FF]/25 font-bold'
                : 'bg-[#121824] hover:bg-slate-800 text-slate-300 hover:text-[#00F0FF] border border-slate-800 hover:border-[#00F0FF]/40'
            }`}
          >
            {item.isVision && <Camera className="w-3 h-3" />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Audio Error Alert Banner */}
      {audioActionError && (
        <div className="px-4 py-2.5 bg-amber-950/80 border-t border-amber-500/50 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{audioActionError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  const s = await navigator.mediaDevices.getUserMedia({ audio: true });
                  s.getTracks().forEach((t) => t.stop());
                  setAudioActionError(null);
                  startRecordingAudioNote();
                } catch {
                  alert('Para liberar o microfone: clique no ícone de CADEADO ou CONFIGURAÇÕES ao lado da URL no navegador e mude o Microfone para "Permitir".');
                }
              }}
              className="text-slate-950 bg-amber-400 hover:bg-amber-300 font-bold text-xs px-2.5 py-1 rounded-lg font-mono transition-all cursor-pointer shadow"
            >
              LIBERAR AGORA
            </button>
            <button
              type="button"
              onClick={() => setAudioActionError(null)}
              className="text-amber-400 hover:text-amber-200 text-xs font-mono px-2 py-1 rounded bg-amber-900/50 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Spacer on mobile so message history has clear bottom clearance */}
      {isMobile && <div className="h-28 sm:hidden shrink-0 pointer-events-none" />}

      {/* Terminal Voice & Message Bottom Dock: Portaled to document.body on mobile to remain 100% fixed at rodapé */}
      {isMobile && typeof document !== 'undefined'
        ? createPortal(renderBottomDock(), document.body)
        : renderBottomDock()}

      {/* Modal for Zoomed Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] p-2 bg-[#121824] rounded-2xl border border-[#00F0FF]/50 shadow-[0_0_50px_rgba(0,240,255,0.2)]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs font-mono text-[#00F0FF]">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4" /> QUADRO DA CÂMERA - VISÃO COMPUTACIONAL JARVES
              </span>
              <span className="text-slate-400">Clique fora para fechar</span>
            </div>
            <img
              src={previewImage}
              alt="Quadro da Câmera Ampliado"
              className="max-h-[75vh] w-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Modal for High-Precision Voice Commands Guide */}
      {showVoiceGuide && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl max-h-[88vh] bg-[#0F141F] border border-[#00F0FF]/40 rounded-2xl shadow-[0_0_40px_rgba(0,240,255,0.2)] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-[#121824] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/40 flex items-center justify-center text-[#00F0FF]">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-orbitron font-bold text-sm text-slate-100 flex items-center gap-2">
                    GUIA DE COMANDOS DE VOZ DE ALTA PRECISÃO
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                      CALIBRADO PT-BR
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pronuncie comandos com clareza para respostas imediatas e sem ruídos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVoiceGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="px-6 py-2.5 bg-[#0B0E14] border-b border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'finance', label: 'Finanças' },
                { id: 'climate', label: 'Temperatura' },
                { id: 'calendar', label: 'Agenda' },
                { id: 'whatsapp', label: 'WhatsApp' },
                { id: 'vision', label: 'Visão Óptica' },
                { id: 'hardware', label: 'Hardware' },
                { id: 'pc', label: 'Sistema' },
                { id: 'nav', label: 'Navegação' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedGuideCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all ${
                    selectedGuideCategory === cat.id
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50 font-bold shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Scrollable Command List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {VOICE_COMMANDS_CATALOG.filter(
                (cat) => selectedGuideCategory === 'all' || cat.category === selectedGuideCategory
              ).map((categoryGroup) => (
                <div key={categoryGroup.category} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border ${categoryGroup.badgeColor}`}>
                      {categoryGroup.categoryLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {categoryGroup.commands.map((cmd, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-[#121824]/80 border border-slate-800/80 hover:border-[#00F0FF]/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[#00F0FF] font-semibold">
                              "{cmd.phrase}"
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            <span className="text-slate-500 font-mono text-[11px]">Ação: </span>
                            {cmd.result}
                          </p>
                          <p className="text-[11px] text-slate-400 italic">
                            <span className="text-slate-500 font-mono">Resposta verbal: </span>
                            "{cmd.spoken}"
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            onExecuteQuickCommand(cmd.phrase);
                            setShowVoiceGuide(false);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all self-end sm:self-center shrink-0"
                          title="Testar este comando de voz agora"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Testar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* High Accuracy Speaking Tips */}
              <div className="p-4 rounded-xl bg-[#00F0FF]/5 border border-[#00F0FF]/20 text-xs text-slate-300 space-y-1.5">
                <span className="font-orbitron font-bold text-[#00F0FF] text-[11px] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> DICAS PARA PRECISÃO MÁXIMA DE VOZ:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li>Diga valores monetários com a moeda: <span className="text-slate-200">"acrescentar 200 reais no financeiro"</span> ou <span className="text-slate-200">"adicionar receita de 1500 reais"</span>.</li>
                  <li>Especifique temperaturas com a unidade: <span className="text-slate-200">"ajustar temperatura para 22 graus"</span>.</li>
                  <li>Agendamentos com horário claro: <span className="text-slate-200">"agendar reunião amanhã às 15 horas"</span>.</li>
                  <li>Ativação de WhatsApp para Romildo: <span className="text-slate-200">"ativar mensagens automáticas para o WhatsApp do Romildo"</span>.</li>
                </ul>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#121824] border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowVoiceGuide(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold"
              >
                Fechar Guia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
