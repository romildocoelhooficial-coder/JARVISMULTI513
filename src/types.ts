export type HardwareDevice = 'camera' | 'microphone' | 'bluetooth' | 'wifi';

export type ActiveTab =
  | 'assistant'
  | 'dashboard'
  | 'userpanel'
  | 'devices'
  | 'whatsapp'
  | 'finance'
  | 'hp12c'
  | 'habits'
  | 'admin'
  | 'media'
  | 'translator'
  | 'games'
  | 'automations'
  | 'mirroring';

export type TvBrand = 'samsung' | 'lg' | 'sony' | 'apple' | 'tcl' | 'roku' | 'generic';

export type TvProtocol = 'wifi_direct' | 'chromecast' | 'airplay' | 'miracast' | 'bluetooth_ble' | 'dlna';

export interface TvMirrorDevice {
  id: string;
  name: string;
  brand: TvBrand;
  model: string;
  protocol: TvProtocol;
  ipAddress: string;
  macAddress?: string;
  resolution: '4K UHD (3840x2160)' | '1080p FHD' | '720p HD';
  fps: number;
  signalDbm: number; // e.g. -42
  latencyMs: number; // e.g. 12
  status: 'disconnected' | 'connecting' | 'connected';
  bitrateMbps: number; // e.g. 28.5
  audioStreaming: boolean;
  remoteNavigationEnabled: boolean;
  lastConnected?: string;
}


export type SmartDeviceProtocol = 'alexa' | 'google' | 'wifi' | 'bluetooth' | 'matter' | 'zigbee';

export type SmartDeviceCategory =
  | 'light'
  | 'climate'
  | 'entertainment'
  | 'appliance'
  | 'security'
  | 'power'
  | 'outdoor';

export interface SmartDevice {
  id: string;
  name: string;
  room: string;
  category: SmartDeviceCategory;
  protocol: SmartDeviceProtocol;
  isOn: boolean;
  powerWatts: number;
  brightness?: number; // 0-100
  colorHex?: string;
  temperature?: number; // for AC (16-30)
  targetMode?: string; // eco, cool, turbo, fan
  volume?: number; // 0-100 for TV/Audio
  batteryLevel?: number; // for robot/locks
  isLocked?: boolean; // for smart locks
  ipAddress?: string;
  signalStrength: number; // dBm e.g. -54
  lastAction: string;
}

export interface SmartSceneRoutine {
  id: string;
  title: string;
  description: string;
  iconName: string;
  voiceTriggerPhrase: string;
  category: 'comfort' | 'cinema' | 'work' | 'sleep' | 'security' | 'morning';
  devicesAffectedCount: number;
  isActive: boolean;
  colorScheme: string;
  lastExecuted?: string;
}

export interface PronunciationFeedback {
  word: string;
  phoneticIpa?: string;
  tip: string;
  soundComparison?: string;
}

export interface EnglishTutorMessage {
  id: string;
  sender: 'user' | 'tutor';
  englishText: string;
  audioUrl?: string;
  translationPt?: string;
  pronunciationTips?: PronunciationFeedback[];
  grammarNotes?: string[];
  suggestedFollowups?: string[];
  repeatedPhrase?: string;
  repeatedPhrasePhonetic?: string;
  interactiveDialoguePrompt?: string;
  dialogueContext?: string;
  audioBlobBase64?: string;
  timestamp: string;
  mode?: 'conversation' | 'pronunciation' | 'translate' | 'roleplay';
  detectedUserSpeech?: string;
}

export interface ConversationTopic {
  id: string;
  title: string;
  level: 'Iniciante' | 'Intermediário' | 'Avançado';
  category: 'Trabalho' | 'Viagem' | 'Cotidiano' | 'Tecnologia' | 'Cultura';
  starterPrompt: string;
  starterPromptPt: string;
  iconName?: string;
}

export interface HardwareState {
  camera: boolean;
  microphone: boolean;
  bluetooth: boolean;
  wifi: boolean;
}

export interface SystemMetrics {
  cpu: number;
  ram: number;
  storage: number;
  temperature: number;
  networkDown: number;
  networkUp: number;
  battery: number;
  volume: number;
}

export interface FunctionCallDetail {
  name: string;
  args: Record<string, any>;
  result?: Record<string, any> | string;
  status: 'pending' | 'success' | 'error';
}

export interface ChatMessage {
  id: string;
  userId?: string;
  sender: 'user' | 'jarves' | 'system';
  text: string;
  speechText?: string;
  timestamp: string;
  functionCall?: FunctionCallDetail;
  audioPlayed?: boolean;
  imageUrl?: string;
  audioUrl?: string;
}

export interface VoiceConfig {
  voiceType: 'masculino' | 'feminino';
  pitch: number;
  rate: number;
  continuousListening: boolean;
  autoSpeak: boolean;
  selectedVoiceURI?: string;
  ttsProvider?: 'fishaudio' | 'default';
  fishAudioApiKey?: string;
  fishAudioVoiceId?: string;
  fishAudioModel?: string;
}

export interface UserCustomSettings {
  themeColor?: string;
  customTitle?: string;
  avatarIcon?: string;
  quickNotes?: string;
  enabledWidgets?: string[];
  customStatusMsg?: string;
  whatsAppOrigin?: WhatsAppOriginConfig;
}

export interface UserAccount {
  id: string;
  name: string;
  username?: string;
  password?: string;
  email: string;
  status: 'Ativo' | 'Suspenso';
  phone: string;
  role: 'Admin' | 'User';
  lastAccess: string;
  lastIp: string;
  actionLogsCount: number;
  customSettings?: UserCustomSettings;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  action: string;
  device: string;
  target?: string;
  status: 'Concluído' | 'Falha' | 'Em Execução';
  actor: string;
}

export interface CalendarEvent {
  id: string;
  userId?: string;
  title: string;
  datetime: string;
  category: 'Reunião' | 'Tarefa' | 'Pessoal' | 'Lembrete';
  completed?: boolean;
}

export interface FinancialTransaction {
  id: string;
  userId?: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  source?: 'voice' | 'manual';
}

export interface WhatsAppAutomationRule {
  id: string;
  userId?: string;
  contactName: string;
  contactPhone: string;
  title: string;
  templateMessage: string;
  triggerType: 'daily_summary' | 'meeting_reminder' | 'finance_alert' | 'system_status' | 'custom';
  enabled: boolean;
  lastDispatched?: string;
}

export interface EvolutionApiConfig {
  serverUrl: string; // e.g. "https://evolution.seudominio.com" or "http://localhost:8080"
  apiKey: string; // Global API Key or Instance Token
  instanceName: string; // e.g. "JARVES-ORIGIN"
  originPhoneNumber: string; // e.g. "+55 11 99999-8888"
  senderName: string; // e.g. "Romildo (Master)"
  autoReplyAi: boolean; // Auto-reply incoming messages with JARVES AI
  webhookEnabled: boolean;
  webhookUrl?: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'unpaired';
  qrCodeBase64?: string; // QR code image data URI (data:image/png;base64,...)
  pairingCode?: string; // 8-digit pairing code (e.g. "1234-5678")
  batteryLevel?: number;
  pushName?: string;
  lastConnectedAt?: string;
  isSimulated?: boolean;
}

export interface EvolutionReceivedMessage {
  id: string;
  from: string; // Sender phone number or JID
  fromName: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  autoReplied?: boolean;
  replyText?: string;
  status?: 'received' | 'replied' | 'sent';
}

export interface WhatsAppOriginConfig {
  phoneNumber: string; // e.g. "+55 11 99999-8888"
  senderName: string; // e.g. "Romildo (Master)"
  instanceId: string; // e.g. "JARVES-ORIGIN-01"
  status: 'connected' | 'unpaired' | 'standby';
  gatewayMode: 'web_direct' | 'evolution_api' | 'api_gateway' | 'local_bridge';
  apiEndpoint?: string;
  apiKey?: string;
  autoSign: boolean; // Append JARVES origin signature
  registeredAt: string;
  evolution?: EvolutionApiConfig;
}

export interface Habit {
  id: string;
  userId?: string;
  title: string;
  streak: number;
  target: number;
  completedToday: boolean;
  category: string;
}

export interface Project {
  id: string;
  userId?: string;
  name: string;
  progress: number;
  deadline: string;
  status: 'Em Andamento' | 'Concluído' | 'Pausado';
}

export interface UserMp3Music {
  id: string;
  userId: string;
  title: string;
  artist: string;
  fileUrl: string;
  durationSeconds?: number;
  sizeBytes?: number;
  genre?: string;
  source?: 'manual_upload' | 'json_import' | 'preset' | 'url_stream';
  createdAt?: string;
}

export interface UserVideoLink {
  id: string;
  userId: string;
  title: string;
  artist: string;
  videoUrl: string;
  videoId: string;
  platform: 'youtube' | 'dailymotion' | 'direct';
  category?: string;
  description?: string;
  source?: 'manual_entry' | 'json_import' | 'preset';
  createdAt?: string;
}

export interface MediaImportPayload {
  musicas_mp3?: Array<{
    title: string;
    artist?: string;
    url?: string;
    file_url?: string;
    genre?: string;
    duration?: number;
  }>;
  videos_links?: Array<{
    title: string;
    artist?: string;
    url?: string;
    video_url?: string;
    platform?: 'youtube' | 'dailymotion' | 'direct';
    category?: string;
    description?: string;
  }>;
}

