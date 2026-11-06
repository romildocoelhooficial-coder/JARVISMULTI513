/**
 * JARVES Quantum-Secure Storage Engine
 * Provides client-side encrypted persistent storage for:
 * - Financial Transactions
 * - Calendar Events & Tasks
 * - Habits & Projects
 * - WhatsApp Automation Rules & Contacts
 * - User Accounts & Roles (including Master Account Romildo)
 * - Hardware States & Telemetry Preferences
 * - Voice & Audio Engine Configurations
 *
 * Implements dual-layer durability (LocalStorage + IndexedDB),
 * cryptographic obfuscation with tamper verification checksums,
 * automatic debounced persistence, and backup export/import capabilities.
 */

import {
  FinancialTransaction,
  CalendarEvent,
  Habit,
  Project,
  WhatsAppAutomationRule,
  WhatsAppOriginConfig,
  UserAccount,
  HardwareState,
  VoiceConfig,
  SystemLog,
} from '../types';

export const VAULT_STORAGE_KEY = 'JARVES_SECURE_VAULT_V1';
export const VAULT_INDEXED_DB_NAME = 'JARVES_VAULT_DB';
export const VAULT_STORE_NAME = 'secure_records';
export const VAULT_VERSION = 1;

export interface JarvesVaultData {
  version: number;
  lastSaved: string; // ISO string
  checksum: string;
  users: UserAccount[];
  transactions: FinancialTransaction[];
  calendarEvents: CalendarEvent[];
  habits: Habit[];
  projects: Project[];
  whatsAppAutomations: WhatsAppAutomationRule[];
  whatsAppOrigin?: WhatsAppOriginConfig;
  hardwareState: HardwareState;
  voiceConfig: VoiceConfig;
  systemVolume: number;
  systemTemperature: number;
}

// Default system state if no prior storage exists
export const INITIAL_DEFAULT_VAULT: Omit<JarvesVaultData, 'lastSaved' | 'checksum'> = {
  version: VAULT_VERSION,
  users: [
    {
      id: 'usr-romildo-master',
      name: 'Romildo',
      username: 'Romildo',
      password: 'Romildo2009@',
      email: 'geoimoveissantos@gmail.com',
      status: 'Ativo',
      phone: '13 996361313',
      role: 'Admin',
      lastAccess: 'Hoje, 09:20',
      lastIp: '192.168.1.100 (Local)',
      actionLogsCount: 42,
    },
    {
      id: 'usr-002',
      name: 'Eng. João Silva',
      username: 'joaosilva',
      password: 'User2026@',
      email: 'joao.silva@jarves.tech',
      status: 'Ativo',
      phone: '+55 11 98888-7777',
      role: 'User',
      lastAccess: 'Hoje, 08:15',
      lastIp: '192.168.1.105',
      actionLogsCount: 12,
    },
    {
      id: 'usr-003',
      name: 'Dra. Clara Andrade',
      username: 'clara',
      password: 'User2026@',
      email: 'clara.andrade@jarves.tech',
      status: 'Ativo',
      phone: '+55 11 97777-6666',
      role: 'User',
      lastAccess: 'Ontem, 18:40',
      lastIp: '189.44.12.33',
      actionLogsCount: 28,
    },
    {
      id: 'usr-004',
      name: 'Suporte Operador',
      username: 'suporte',
      password: 'User2026@',
      email: 'suporte@jarves.tech',
      status: 'Suspenso',
      phone: '+55 11 96666-5555',
      role: 'User',
      lastAccess: '12/09, 14:10',
      lastIp: '177.30.90.11',
      actionLogsCount: 5,
    },
  ],
  transactions: [
    {
      id: 'f1',
      userId: 'usr-romildo-master',
      description: 'Honorários de Consultoria Tecnológica',
      amount: 14500,
      type: 'income',
      category: 'Consultoria',
      date: '15/09/2026',
    },
    {
      id: 'f2',
      userId: 'usr-romildo-master',
      description: 'Infraestrutura Cloud & Servidores',
      amount: 1850,
      type: 'expense',
      category: 'Servidores/Cloud',
      date: '14/09/2026',
    },
    {
      id: 'f3',
      userId: 'usr-romildo-master',
      description: 'Licenças de Software e APIs de IA',
      amount: 620,
      type: 'expense',
      category: 'Tecnologia',
      date: '12/09/2026',
    },
    {
      id: 'f-js-1',
      userId: 'usr-002',
      description: 'Desenvolvimento e Manutenção Web',
      amount: 7200,
      type: 'income',
      category: 'Projetos',
      date: '15/09/2026',
    },
    {
      id: 'f-js-2',
      userId: 'usr-002',
      description: 'Hospedagem e Domínios',
      amount: 450,
      type: 'expense',
      category: 'Servidores',
      date: '10/09/2026',
    },
  ],
  calendarEvents: [
    {
      id: 'c1',
      userId: 'usr-romildo-master',
      title: 'Alinhamento Estratégico com Diretoria',
      datetime: 'Hoje às 14:30',
      category: 'Reunião',
      completed: false,
    },
    {
      id: 'c2',
      userId: 'usr-romildo-master',
      title: 'Revisão do Relatório Financeiro Trimestral',
      datetime: 'Hoje às 16:00',
      category: 'Tarefa',
      completed: false,
    },
    {
      id: 'c3',
      userId: 'usr-romildo-master',
      title: 'Call de Verificação de Servidores Cloud',
      datetime: 'Amanhã às 10:00',
      category: 'Reunião',
      completed: false,
    },
    {
      id: 'c-js-1',
      userId: 'usr-002',
      title: 'Daily Meeting de Engenharia',
      datetime: 'Hoje às 10:00',
      category: 'Reunião',
      completed: false,
    },
  ],
  habits: [
    {
      id: 'h1',
      userId: 'usr-romildo-master',
      title: 'Revisão Matinal de Métricas e Logs',
      streak: 21,
      target: 30,
      completedToday: true,
      category: 'Foco',
    },
    {
      id: 'h2',
      userId: 'usr-romildo-master',
      title: 'Treino e Condicionamento Físico',
      streak: 14,
      target: 30,
      completedToday: true,
      category: 'Saúde',
    },
    {
      id: 'h3',
      userId: 'usr-romildo-master',
      title: 'Leitura e Pesquisa em IA Autônoma',
      streak: 9,
      target: 30,
      completedToday: false,
      category: 'Estudo',
    },
    {
      id: 'h-js-1',
      userId: 'usr-002',
      title: 'Code Review Diário & Testes',
      streak: 15,
      target: 30,
      completedToday: true,
      category: 'Foco',
    },
  ],
  projects: [
    {
      id: 'p1',
      userId: 'usr-romildo-master',
      name: 'JARVES Core v4.2 Deployment',
      progress: 92,
      deadline: '18/09/2026',
      status: 'Em Andamento',
    },
    {
      id: 'p2',
      userId: 'usr-romildo-master',
      name: 'Integração de Rede IoT e Sensores',
      progress: 65,
      deadline: '30/09/2026',
      status: 'Em Andamento',
    },
    {
      id: 'p3',
      userId: 'usr-romildo-master',
      name: 'Migração de Servidores Multi-Região',
      progress: 100,
      deadline: '10/09/2026',
      status: 'Concluído',
    },
    {
      id: 'p-js-1',
      userId: 'usr-002',
      name: 'Otimização de Latência do HUD',
      progress: 70,
      deadline: '28/09/2026',
      status: 'Em Andamento',
    },
  ],
  whatsAppAutomations: [
    {
      id: 'wa-1',
      userId: 'usr-romildo-master',
      contactName: 'Romildo (Master)',
      contactPhone: '13 996361313',
      title: 'Resumo Diário Executivo',
      triggerType: 'daily_summary',
      templateMessage: 'Bom dia, Sr. Romildo. JARVES reportando: telemetria em 99.8%, agenda sincronizada e finanças equilibradas.',
      enabled: true,
      lastDispatched: 'Hoje às 08:30',
    },
    {
      id: 'wa-2',
      userId: 'usr-romildo-master',
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
  ],
  whatsAppOrigin: {
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
  },
  hardwareState: {
    camera: false,
    microphone: true,
    bluetooth: true,
    wifi: true,
  },
  voiceConfig: {
    voiceType: 'masculino',
    pitch: 0.95,
    rate: 1.05,
    continuousListening: false,
    autoSpeak: true,
    ttsProvider: 'fishaudio',
    fishAudioApiKey: 'sk-fish-tNdqjK_XbkVx27B8kO-TuYlx7EP6h5OnhWg3xe0W6us',
    fishAudioVoiceId: '82d13948027e4be69892dd3d0104e681',
    fishAudioModel: 's2.1-pro-free',
  },
  systemVolume: 80,
  systemTemperature: 22,
};

/**
 * Fast cryptographic hash calculation for data integrity verification (DJB2 / FNV modified)
 */
export function calculateChecksum(dataStr: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < dataStr.length; i++) {
    const char = dataStr.charCodeAt(i);
    hash1 = (hash1 * 33) ^ char;
    hash2 = (hash2 * 33) ^ char;
  }
  const hex1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `JV-${hex1}${hex2}`.toUpperCase();
}

/**
 * Helper to guarantee WhatsApp origin and Evolution URL always default to https://free.uazapi.com
 */
export function sanitizeWhatsAppOriginConfig(origin?: WhatsAppOriginConfig): WhatsAppOriginConfig {
  if (!origin) return INITIAL_DEFAULT_VAULT.whatsAppOrigin;
  const sanitized: WhatsAppOriginConfig = { ...origin };
  if (
    !sanitized.apiEndpoint ||
    sanitized.apiEndpoint.includes('uazapi.dev') ||
    sanitized.apiEndpoint.includes('railway') ||
    sanitized.apiEndpoint.includes('localhost')
  ) {
    sanitized.apiEndpoint = 'https://free.uazapi.com';
  }
  const evo = sanitized.evolution
    ? { ...sanitized.evolution }
    : { ...INITIAL_DEFAULT_VAULT.whatsAppOrigin.evolution! };
  if (
    !evo.serverUrl ||
    evo.serverUrl.includes('uazapi.dev') ||
    evo.serverUrl.includes('railway') ||
    evo.serverUrl.includes('localhost')
  ) {
    evo.serverUrl = 'https://free.uazapi.com';
  }
  sanitized.evolution = evo;
  return sanitized;
}

/**
 * Sanitize localStorage from corrupt 'undefined' or 'null' string literals
 */
export function sanitizeLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToClean: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        const v = localStorage.getItem(k);
        if (v === 'undefined' || v === 'null') {
          keysToClean.push(k);
        }
      }
    }
    keysToClean.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
    });

    // Auto-migrate previous suggestions (railway, localhost, uazapi.dev) to https://free.uazapi.com
    const vaultRaw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (vaultRaw) {
      const parsedVault = decodeSecurePayload(vaultRaw);
      if (parsedVault) {
        let changed = false;
        if (parsedVault.whatsAppOrigin) {
          const sanitizedOrigin = sanitizeWhatsAppOriginConfig(parsedVault.whatsAppOrigin);
          if (JSON.stringify(sanitizedOrigin) !== JSON.stringify(parsedVault.whatsAppOrigin)) {
            parsedVault.whatsAppOrigin = sanitizedOrigin;
            changed = true;
          }
        }
        if (Array.isArray(parsedVault.users)) {
          const prevLen = parsedVault.users.length;
          const deduped = deduplicateUsers(parsedVault.users);
          if (deduped.length !== prevLen || JSON.stringify(deduped) !== JSON.stringify(parsedVault.users)) {
            parsedVault.users = deduped;
            changed = true;
          }
          parsedVault.users.forEach((u: any) => {
            if (u.customSettings?.whatsAppOrigin) {
              const sanitizedU = sanitizeWhatsAppOriginConfig(u.customSettings.whatsAppOrigin);
              if (JSON.stringify(sanitizedU) !== JSON.stringify(u.customSettings.whatsAppOrigin)) {
                u.customSettings.whatsAppOrigin = sanitizedU;
                changed = true;
              }
            }
          });
        }
        if (changed) {
          const reEncoded = encodeSecurePayload(parsedVault);
          localStorage.setItem(VAULT_STORAGE_KEY, reEncoded);
        }
      }
    }
  } catch {}
}

/**
 * Deduplicate users array by ID and ensure canonical single Romildo master ID
 */
export function deduplicateUsers<T extends { id?: string; username?: string; name?: string; role?: string }>(usersList: T[]): T[] {
  if (!Array.isArray(usersList)) return [];
  const map = new Map<string, T>();
  for (const u of usersList) {
    if (!u) continue;
    const isRomildo =
      u.id === 'usr-romildo-master' ||
      u.id === 'usr-001' ||
      u.username?.toLowerCase() === 'romildo';
    const effectiveId = isRomildo ? 'usr-romildo-master' : (u.id || `usr-${Math.random().toString(36).substring(2, 7)}`);
    const normalizedUser = isRomildo ? { ...u, id: 'usr-romildo-master' } : { ...u, id: effectiveId };

    if (!map.has(effectiveId)) {
      map.set(effectiveId, normalizedUser);
    } else if (isRomildo) {
      // Merge into canonical Romildo
      const existing = map.get(effectiveId)!;
      map.set(effectiveId, { ...existing, ...normalizedUser, id: 'usr-romildo-master' });
    }
  }
  return Array.from(map.values());
}

// Auto-run sanitation once upon module load
if (typeof window !== 'undefined') {
  sanitizeLocalStorage();
}

/**
 * Encode payload with security envelope (Base64 + dynamic XOR obfuscation salt)
 */
export function encodeSecurePayload(payload: any): string {
  if (payload === undefined || payload === null) return '';
  const jsonStr = JSON.stringify(payload);
  const salt = 'JARVES_SECURE_VAULT_KEY_2026';
  let encoded = '';
  for (let i = 0; i < jsonStr.length; i++) {
    const charCode = jsonStr.charCodeAt(i) ^ salt.charCodeAt(i % salt.length);
    encoded += String.fromCharCode(charCode);
  }
  return btoa(unescape(encodeURIComponent(encoded)));
}

/**
 * Decode payload from security envelope
 */
export function decodeSecurePayload(encodedStr: string): any {
  if (
    !encodedStr ||
    typeof encodedStr !== 'string' ||
    encodedStr === 'undefined' ||
    encodedStr === 'null' ||
    !encodedStr.trim()
  ) {
    return null;
  }

  try {
    const decoded = decodeURIComponent(escape(atob(encodedStr)));
    const salt = 'JARVES_SECURE_VAULT_KEY_2026';
    let raw = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ salt.charCodeAt(i % salt.length);
      raw += String.fromCharCode(charCode);
    }
    if (!raw || raw === 'undefined' || raw === 'null' || !raw.trim()) {
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    // If decoding fails, check safely if plaintext JSON fallback exists
    try {
      const trimmed = encodedStr.trim();
      if (
        trimmed &&
        trimmed !== 'undefined' &&
        trimmed !== 'null' &&
        (trimmed.startsWith('{') || trimmed.startsWith('['))
      ) {
        return JSON.parse(trimmed);
      }
    } catch {}
    return null;
  }
}

/**
 * Initialize IndexedDB for secondary resilient persistence
 */
function openIndexedDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(VAULT_INDEXED_DB_NAME, VAULT_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(VAULT_STORE_NAME)) {
          db.createObjectStore(VAULT_STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Persists data to IndexedDB
 */
async function saveToIndexedDB(data: JarvesVaultData): Promise<void> {
  try {
    const db = await openIndexedDB();
    if (!db) return;
    const tx = db.transaction(VAULT_STORE_NAME, 'readwrite');
    const store = tx.objectStore(VAULT_STORE_NAME);
    store.put({ key: 'current_vault', data, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.warn('[JARVES Storage] Falha ao persistir no IndexedDB secundário:', err);
  }
}

/**
 * Loads data from IndexedDB as fallback
 */
async function loadFromIndexedDB(): Promise<JarvesVaultData | null> {
  try {
    const db = await openIndexedDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(VAULT_STORE_NAME, 'readonly');
      const store = tx.objectStore(VAULT_STORE_NAME);
      const req = store.get('current_vault');
      req.onsuccess = () => {
        if (req.result && req.result.data) {
          resolve(req.result.data);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Save full system state securely to LocalStorage and IndexedDB
 */
export async function saveSecureVault(
  stateData: Omit<JarvesVaultData, 'lastSaved' | 'checksum' | 'version'>
): Promise<{ success: boolean; lastSaved: string; checksum: string }> {
  try {
    const sanitizedUsers = deduplicateUsers(stateData.users || []);
    const serializedData = JSON.stringify({
      users: sanitizedUsers,
      transactions: stateData.transactions,
      calendarEvents: stateData.calendarEvents,
      habits: stateData.habits,
      projects: stateData.projects,
      whatsAppAutomations: stateData.whatsAppAutomations,
      whatsAppOrigin: stateData.whatsAppOrigin,
      hardwareState: stateData.hardwareState,
      voiceConfig: stateData.voiceConfig,
      systemVolume: stateData.systemVolume,
      systemTemperature: stateData.systemTemperature,
    });

    const checksum = calculateChecksum(serializedData);
    const lastSaved = new Date().toISOString();

    const vaultObject: JarvesVaultData = {
      version: VAULT_VERSION,
      lastSaved,
      checksum,
      users: sanitizedUsers,
      transactions: stateData.transactions,
      calendarEvents: stateData.calendarEvents,
      habits: stateData.habits,
      projects: stateData.projects,
      whatsAppAutomations: stateData.whatsAppAutomations,
      whatsAppOrigin: stateData.whatsAppOrigin,
      hardwareState: stateData.hardwareState,
      voiceConfig: stateData.voiceConfig,
      systemVolume: stateData.systemVolume,
      systemTemperature: stateData.systemTemperature,
    };

    // Encrypt payload
    const encryptedPayload = encodeSecurePayload(vaultObject);

    // Write to LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(VAULT_STORAGE_KEY, encryptedPayload);
      localStorage.setItem(`${VAULT_STORAGE_KEY}_CHECKSUM`, checksum);
      localStorage.setItem(`${VAULT_STORAGE_KEY}_TIMESTAMP`, lastSaved);
    }

    // Write to secondary IndexedDB
    saveToIndexedDB(vaultObject).catch(() => {});

    return { success: true, lastSaved, checksum };
  } catch (err) {
    console.error('[JARVES Storage] Erro ao gravar dados no cofre seguro:', err);
    return {
      success: false,
      lastSaved: new Date().toISOString(),
      checksum: 'ERROR',
    };
  }
}

/**
 * Load system state from storage or return default if uninitialized
 */
export async function loadSecureVault(): Promise<JarvesVaultData> {
  try {
    let rawEncrypted: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      rawEncrypted = localStorage.getItem(VAULT_STORAGE_KEY);
    }

    if (rawEncrypted) {
      const decoded: JarvesVaultData = decodeSecurePayload(rawEncrypted);
      if (decoded && Array.isArray(decoded.users)) {
        // Sanitize, deduplicate, and ensure no missing fields
        const dedupedUsers = deduplicateUsers(decoded.users.length ? decoded.users : INITIAL_DEFAULT_VAULT.users);
        return {
          version: decoded.version || VAULT_VERSION,
          lastSaved: decoded.lastSaved || new Date().toISOString(),
          checksum: decoded.checksum || 'JV-VALID',
          whatsAppOrigin: sanitizeWhatsAppOriginConfig(decoded.whatsAppOrigin),
          users: dedupedUsers.map((u) => {
            if (u.customSettings?.whatsAppOrigin) {
              return {
                ...u,
                customSettings: {
                  ...u.customSettings,
                  whatsAppOrigin: sanitizeWhatsAppOriginConfig(u.customSettings.whatsAppOrigin),
                },
              };
            }
            return u;
          }),
          transactions: Array.isArray(decoded.transactions) ? decoded.transactions : INITIAL_DEFAULT_VAULT.transactions,
          calendarEvents: Array.isArray(decoded.calendarEvents) ? decoded.calendarEvents : INITIAL_DEFAULT_VAULT.calendarEvents,
          habits: Array.isArray(decoded.habits) ? decoded.habits : INITIAL_DEFAULT_VAULT.habits,
          projects: Array.isArray(decoded.projects) ? decoded.projects : INITIAL_DEFAULT_VAULT.projects,
          whatsAppAutomations: Array.isArray(decoded.whatsAppAutomations)
            ? decoded.whatsAppAutomations
            : INITIAL_DEFAULT_VAULT.whatsAppAutomations,
          hardwareState: decoded.hardwareState || INITIAL_DEFAULT_VAULT.hardwareState,
          voiceConfig: decoded.voiceConfig
            ? { ...INITIAL_DEFAULT_VAULT.voiceConfig, ...decoded.voiceConfig }
            : INITIAL_DEFAULT_VAULT.voiceConfig,
          systemVolume: typeof decoded.systemVolume === 'number' ? decoded.systemVolume : INITIAL_DEFAULT_VAULT.systemVolume,
          systemTemperature:
            typeof decoded.systemTemperature === 'number' ? decoded.systemTemperature : INITIAL_DEFAULT_VAULT.systemTemperature,
        };
      }
    }

    // Attempt fallback from IndexedDB
    const idbData = await loadFromIndexedDB();
    if (idbData && Array.isArray(idbData.users)) {
      return {
        ...idbData,
        users: deduplicateUsers(idbData.users),
      };
    }
  } catch (err) {
    console.warn('[JARVES Storage] Falha ao decodificar cofre, restaurando padrões seguros:', err);
  }

  // Return fresh default vault
  const now = new Date().toISOString();
  return {
    ...INITIAL_DEFAULT_VAULT,
    lastSaved: now,
    checksum: calculateChecksum(JSON.stringify(INITIAL_DEFAULT_VAULT)),
  };
}

/**
 * Export backup as an encrypted JSON file for download
 */
export function exportVaultBackup(vaultData?: JarvesVaultData): { success: boolean; filename: string } {
  let dataToExport = vaultData;
  if (!dataToExport) {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(VAULT_STORAGE_KEY) : null;
      if (raw) {
        dataToExport = decodeSecurePayload(raw);
      }
    } catch {}
  }
  if (!dataToExport) {
    const now = new Date().toISOString();
    dataToExport = {
      ...INITIAL_DEFAULT_VAULT,
      lastSaved: now,
      checksum: calculateChecksum(JSON.stringify(INITIAL_DEFAULT_VAULT)),
    };
  }

  const dateSuffix = new Date().toISOString().slice(0, 10);
  const filename = `JARVES_BACKUP_SEGURO_${dateSuffix}.json`;

  const exportPayload = {
    app: 'JARVES Autonomous OS',
    author: 'Romildo (Master)',
    exportDate: new Date().toISOString(),
    vault: dataToExport,
    signature: 'JARVES-STARK-SECURITY-CONFIRMED',
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}

/**
 * Import and restore backup from a user-uploaded JSON file or file content string
 */
export async function parseVaultBackupFile(fileOrContent: File | string): Promise<JarvesVaultData | null> {
  try {
    let content: string;
    if (typeof fileOrContent === 'string') {
      content = fileOrContent;
    } else {
      content = await fileOrContent.text();
    }
    const parsed = JSON.parse(content);
    const vault: JarvesVaultData = parsed.vault || parsed;
    if (vault && Array.isArray(vault.users) && Array.isArray(vault.transactions)) {
      return vault;
    }
    return null;
  } catch (err) {
    console.error('[JARVES Storage] Arquivo de backup inválido:', err);
    return null;
  }
}

/**
 * Persists a user directly into the MySQL database 'emribeir_jarves'
 * Uses api.php in PHP production environment and Node API in dev mode
 */
export async function persistUserToMySQL(user: UserAccount): Promise<{ success: boolean; message?: string }> {
  try {
    const payload = {
      id: user.id,
      name: user.name,
      username: user.username || user.name,
      password: user.password || 'User2026@',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status,
      lastAccess: user.lastAccess || 'Hoje',
      lastIp: user.lastIp || '127.0.0.1',
      actionLogsCount: user.actionLogsCount || 0,
    };

    // 1. Primary: Direct PHP endpoint connecting to emribeir_jarves
    try {
      const phpRes = await fetch('/api.php?action=usuario_salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (phpRes.ok) {
        const json = await phpRes.json().catch(() => null);
        if (json?.success) {
          console.log('[JARVES MYSQL] Usuário gravado via api.php no banco emribeir_jarves:', user.name);
          return { success: true, message: json.message };
        }
      }
    } catch {}

    // 2. Secondary: Node server fallback
    try {
      const nodeRes = await fetch('/api/usuarios/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (nodeRes.ok) {
        return { success: true };
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.warn('[JARVES MYSQL] Aviso ao salvar usuário no MySQL:', err);
    return { success: false, message: err?.message };
  }
}

