import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Smartphone,
  Server,
  Key,
  Radio,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Bot,
  Copy,
  Check,
  Power,
  ShieldCheck,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Wifi,
  WifiOff,
  Activity,
  Layers,
  HelpCircle,
  Trash2,
  Cpu,
  User,
  Hash,
  Info,
  Zap
} from 'lucide-react';
import { EvolutionApiConfig, EvolutionReceivedMessage, WhatsAppOriginConfig } from '../types';

interface EvolutionGatewayPanelProps {
  originConfig?: WhatsAppOriginConfig;
  onUpdateOriginConfig?: (config: WhatsAppOriginConfig) => void;
  onAddLog: (action: string, device: string, target?: string) => void;
  onSaveSystem?: () => void;
}

export const EvolutionGatewayPanel: React.FC<EvolutionGatewayPanelProps> = ({
  originConfig,
  onUpdateOriginConfig,
  onAddLog,
  onSaveSystem,
}) => {
  // Evolution & UazAPI credentials & state
  const defaultEvolution: EvolutionApiConfig = {
    serverUrl: 'https://free.uazapi.com',
    apiKey: '',
    instanceName: 'JARVES-ORIGIN',
    originPhoneNumber: originConfig?.phoneNumber || '+55 11 99999-8888',
    senderName: originConfig?.senderName || 'Romildo (Master)',
    autoReplyAi: true,
    webhookEnabled: true,
    status: 'unpaired',
  };

  const initialEvolution: EvolutionApiConfig = originConfig?.evolution || defaultEvolution;

  const [serverUrl, setServerUrl] = useState(() => {
    const raw = initialEvolution.serverUrl;
    if (
      !raw ||
      raw === 'http://localhost:8080' ||
      raw.includes('railway') ||
      raw.includes('uazapi.dev') ||
      raw.includes('localhost')
    ) {
      return 'https://free.uazapi.com';
    }
    return raw;
  });
  const [apiKey, setApiKey] = useState(initialEvolution.apiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [instanceName, setInstanceName] = useState(initialEvolution.instanceName || 'JARVES-ORIGIN');
  const [originPhone, setOriginPhone] = useState(initialEvolution.originPhoneNumber || originConfig?.phoneNumber || '+55 11 99999-8888');
  const [senderName, setSenderName] = useState(initialEvolution.senderName || originConfig?.senderName || 'Romildo (Master)');
  const [autoReplyAi, setAutoReplyAi] = useState(initialEvolution.autoReplyAi ?? true);

  // Connection & QR Code state
  const [status, setStatus] = useState<EvolutionApiConfig['status']>(initialEvolution.status || 'unpaired');
  const [qrCodeBase64, setQrCodeBase64] = useState<string | undefined>(initialEvolution.qrCodeBase64);
  const [pairingCode, setPairingCode] = useState<string | undefined>(initialEvolution.pairingCode);
  const [activeConnectTab, setActiveConnectTab] = useState<'qrcode' | 'pairing'>('qrcode');
  const [lastConnectedAt, setLastConnectedAt] = useState<string | undefined>(initialEvolution.lastConnectedAt);

  // Operation flags
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [serverTestResult, setServerTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [qrCountdown, setQrCountdown] = useState(30);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedPairing, setCopiedPairing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Message dispatch state
  const [testRecipient, setTestRecipient] = useState('');
  const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste enviada diretamente pelo WhatsApp Real do JARVES.');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendSuccessNotice, setSendSuccessNotice] = useState<string | null>(null);

  // Messages inbox & webhook buffer
  const [messages, setMessages] = useState<EvolutionReceivedMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSimulatingIncoming, setIsSimulatingIncoming] = useState(false);

  // Computed Webhook URL
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/evolution/webhook`
    : 'https://ais-dev.run.app/api/evolution/webhook';

  const pollIntervalRef = useRef<any>(null);

  // Sync with initial props
  useEffect(() => {
    if (originConfig?.evolution) {
      const evo = originConfig.evolution;
      if (evo.serverUrl) {
        if (
          evo.serverUrl === 'http://localhost:8080' ||
          evo.serverUrl.includes('railway') ||
          evo.serverUrl.includes('uazapi.dev') ||
          evo.serverUrl.includes('localhost')
        ) {
          setServerUrl('https://free.uazapi.com');
        } else {
          setServerUrl(evo.serverUrl);
        }
      }
      if (evo.apiKey) setApiKey(evo.apiKey);
      if (evo.instanceName) setInstanceName(evo.instanceName);
      if (evo.originPhoneNumber) setOriginPhone(evo.originPhoneNumber);
      if (evo.senderName) setSenderName(evo.senderName);
      if (evo.autoReplyAi !== undefined) setAutoReplyAi(evo.autoReplyAi);
      if (evo.status) setStatus(evo.status);
      if (evo.qrCodeBase64) setQrCodeBase64(evo.qrCodeBase64);
      if (evo.pairingCode) setPairingCode(evo.pairingCode);
      if (evo.lastConnectedAt) setLastConnectedAt(evo.lastConnectedAt);
    }
  }, [originConfig]);

  // Load server config and messages on mount
  useEffect(() => {
    fetchServerConfig();
    fetchMessages();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // QR Code expiration countdown ticker
  useEffect(() => {
    if (status === 'connecting' && qrCodeBase64) {
      setQrCountdown(30);
      const timer = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            // Auto refresh status or request new QR code
            checkInstanceConnection();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, qrCodeBase64]);

  // Periodic status check while connecting
  useEffect(() => {
    if (status === 'connecting') {
      pollIntervalRef.current = setInterval(() => {
        checkInstanceConnection(true);
      }, 5000);
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    }
  }, [status, serverUrl, apiKey, instanceName]);

  // Robust JSON parser that never throws on non-JSON/HTML responses
  const parseJsonSafely = async <T = any>(res: Response): Promise<{ isJson: boolean; data: T | null; text: string }> => {
    try {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        return { isJson: true, data, text };
      } catch {
        return { isJson: false, data: null, text };
      }
    } catch (err: any) {
      return { isJson: false, data: null, text: err?.message || '' };
    }
  };

  const fetchServerConfig = async () => {
    try {
      const res = await fetch('/api/evolution/config');
      const { isJson, data } = await parseJsonSafely(res);
      if (res.ok && isJson && data) {
        if (data.serverUrl) {
          const cleanUrl =
            data.serverUrl === 'http://localhost:8080' ||
            data.serverUrl.includes('railway') ||
            data.serverUrl.includes('uazapi.dev') ||
            data.serverUrl.includes('localhost')
              ? 'https://free.uazapi.com'
              : data.serverUrl;
          if (
            !originConfig?.evolution?.serverUrl ||
            originConfig.evolution.serverUrl === 'http://localhost:8080' ||
            originConfig.evolution.serverUrl.includes('railway') ||
            originConfig.evolution.serverUrl.includes('uazapi.dev') ||
            originConfig.evolution.serverUrl.includes('localhost')
          ) {
            setServerUrl(cleanUrl);
          }
        }
        if (data.apiKey && !originConfig?.evolution?.apiKey) setApiKey(data.apiKey);
        if (data.instanceName && !originConfig?.evolution?.instanceName) setInstanceName(data.instanceName);
        if (data.originPhoneNumber && !originConfig?.evolution?.originPhoneNumber) setOriginPhone(data.originPhoneNumber);
        if (data.status) setStatus(data.status);
      }
    } catch (e) {
      console.warn('Could not fetch evolution config:', e);
    }
  };

  const fetchMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch('/api/evolution/messages');
      const { isJson, data } = await parseJsonSafely(res);
      if (res.ok && isJson && data && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.warn('Could not fetch evolution messages:', e);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // 1. Test Connection to Evolution Server
  const handleTestConnection = async () => {
    setIsTestingServer(true);
    setServerTestResult(null);
    const start = Date.now();

    try {
      const res = await fetch('/api/evolution/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl, apiKey }),
      });
      const { isJson, data } = await parseJsonSafely(res);
      const latency = Date.now() - start;

      if (isJson && data) {
        if (res.ok && data.success) {
          setServerTestResult({
            success: true,
            message: `${data.message || 'Conexão ativa!'} (${latency}ms)`,
            latency,
          });
          onAddLog('Evolution API Testada com Sucesso', 'WhatsApp Evolution', `${serverUrl} [${latency}ms]`);
        } else {
          setServerTestResult({
            success: false,
            message: data.hint || data.error || 'Servidor Evolution inacessível no momento.',
          });
        }
      } else {
        // Non-JSON response received (HTML error page, proxy, etc.)
        let directProbeOk = false;
        if (serverUrl && (serverUrl.startsWith('http://') || serverUrl.startsWith('https://'))) {
          try {
            const probeRes = await fetch(`${serverUrl.replace(/\/+$/, '')}/instance/fetchInstances`, {
              method: 'GET',
              headers: apiKey ? { apikey: apiKey } : undefined,
              signal: AbortSignal.timeout(3500),
            });
            if (probeRes.ok) directProbeOk = true;
          } catch {}
        }

        if (directProbeOk) {
          setServerTestResult({
            success: true,
            message: `Servidor Evolution alcançado com sucesso via conexão direta! (${latency}ms)`,
            latency,
          });
          onAddLog('Evolution API Testada (Direta)', 'WhatsApp Evolution', serverUrl);
        } else {
          const isLocalhost = serverUrl.includes('localhost') || serverUrl.includes('127.0.0.1');
          setServerTestResult({
            success: false,
            message: isLocalhost
              ? 'Em ambiente de produção na nuvem, "localhost" não alcança seu computador. Informe a URL pública da Evolution API (ex: https://evolution.seudominio.com ou ngrok), ou clique em "Simular Conexão" para testar.'
              : `Não foi possível obter resposta válida do servidor Evolution (Status ${res.status || 'sem resposta'}). Verifique se a URL informada está correta e online, ou use o modo "Simular Conexão".`,
          });
        }
      }
    } catch (err: any) {
      setServerTestResult({
        success: false,
        message: 'Falha de comunicação de rede ao testar servidor. Verifique a URL informada ou use o botão "Simular Conexão".',
      });
    } finally {
      setIsTestingServer(false);
    }
  };

  // 2. Generate QR Code / Connect Instance
  const handleGenerateQrCode = async (simulate = false) => {
    setIsGeneratingQr(true);
    try {
      if (simulate) {
        const res = await fetch('/api/evolution/simulate/connect', { method: 'POST' });
        const { isJson, data } = await parseJsonSafely(res);
        if (data?.base64) {
          setQrCodeBase64(data.base64);
          setPairingCode(data.pairingCode);
          setStatus('connecting');
          onAddLog('QR Code de Simulação Gerado', 'WhatsApp Evolution');
        }
        return;
      }

      // Try creating or connecting instance on Evolution API
      const res = await fetch('/api/evolution/instance/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl,
          apiKey,
          instanceName,
          qrcode: true,
        }),
      });

      const { isJson, data } = await parseJsonSafely(res);

      if (data && (data.qrcode || data.data?.qrcode?.base64 || data.base64)) {
        const qr = data.qrcode || data.data?.qrcode?.base64 || data.base64;
        setQrCodeBase64(qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`);
        setStatus('connecting');
      }

      if (data && (data.pairingCode || data.data?.pairingCode)) {
        setPairingCode(data.pairingCode || data.data?.pairingCode);
      }

      // If already connected
      if (data && (data.state === 'open' || data.data?.instance?.state === 'open')) {
        setStatus('connected');
        setLastConnectedAt(new Date().toLocaleTimeString('pt-BR'));
      }

      if (isJson && data?.success) {
        onAddLog('Instância Evolution Inicializada para Pareamento', 'WhatsApp Evolution', instanceName);
      } else {
        setServerTestResult({
          success: false,
          message: data?.error || data?.hint || 'Servidor Evolution não retornou QR Code. Você pode usar "Simular Conexão" para prosseguir com os testes.',
        });
      }
    } catch (err: any) {
      console.warn('Erro ao gerar QR Code:', err);
      // Offer simulation fallback
      setServerTestResult({
        success: false,
        message: 'Servidor Evolution não respondeu. Você pode usar "Simular Conexão" para testar visualmente.',
      });
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // 3. Check Instance Connection State
  const checkInstanceConnection = async (silent = false) => {
    if (!silent) setIsCheckingStatus(true);
    try {
      const res = await fetch(`/api/evolution/instance/status/${encodeURIComponent(instanceName)}?serverUrl=${encodeURIComponent(serverUrl)}&apiKey=${encodeURIComponent(apiKey)}`);
      const { isJson, data } = await parseJsonSafely(res);

      if (isJson && data) {
        if (data.connected || data.state === 'open') {
          setStatus('connected');
          setQrCodeBase64(undefined);
          setPairingCode(undefined);
          const timeNow = new Date().toLocaleTimeString('pt-BR');
          setLastConnectedAt(timeNow);
          if (!silent) {
            onAddLog('WhatsApp Real Pareado com Sucesso', 'WhatsApp Evolution', `${originPhone} (${senderName})`);
          }
        } else if (data.state === 'connecting') {
          setStatus('connecting');
        } else if (status === 'connected') {
          setStatus('disconnected');
        }
      }
    } catch (e) {
      if (!silent) console.warn('Status check failed:', e);
    } finally {
      if (!silent) setIsCheckingStatus(false);
    }
  };

  // 4. Disconnect / Logout Instance
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch(`/api/evolution/instance/logout/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl, apiKey }),
      });
      setStatus('disconnected');
      setQrCodeBase64(undefined);
      setPairingCode(undefined);
      onAddLog('Instância Evolution Desconectada', 'WhatsApp Evolution', instanceName);
    } catch (e) {
      setStatus('disconnected');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // 5. Send Real WhatsApp Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRecipient.trim() || !testMessage.trim() || isSendingMessage) return;

    setIsSendingMessage(true);
    setSendSuccessNotice(null);

    try {
      const res = await fetch('/api/evolution/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: testRecipient,
          text: testMessage,
          serverUrl,
          apiKey,
          instanceName,
          delay: 1200,
        }),
      });

      const { isJson, data } = await parseJsonSafely(res);

      if (res.ok && isJson && data && data.success) {
        setSendSuccessNotice(data.simulated ? 'Mensagem registrada em modo sandbox!' : 'Mensagem despachada com sucesso pelo WhatsApp Real!');
        onAddLog('Mensagem WhatsApp Despachada', 'Evolution API', testRecipient);
        fetchMessages();
        setTimeout(() => setSendSuccessNotice(null), 4500);
      } else {
        setSendSuccessNotice(`Erro: ${data?.error || 'Falha ao enviar mensagem.'}`);
        setTimeout(() => setSendSuccessNotice(null), 5000);
      }
    } catch (err: any) {
      setSendSuccessNotice('Erro de envio: Falha de comunicação com o servidor.');
      setTimeout(() => setSendSuccessNotice(null), 5000);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // 6. Simulate Incoming Message (Testing Sandbox)
  const handleSimulateIncoming = async () => {
    setIsSimulatingIncoming(true);
    try {
      const res = await fetch('/api/evolution/simulate/incoming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: '+55 11 98765-4321',
          name: 'Carlos Oliveira (Cliente)',
          text: 'Olá Romildo, você teria disponibilidade para alinhar o cronograma da entrega nesta quinta?',
        }),
      });
      if (res.ok) {
        fetchMessages();
        onAddLog('Mensagem Recebida Simulada & Respondida por IA', 'WhatsApp Evolution');
      }
    } catch (e) {
      console.warn('Simulation failed:', e);
    } finally {
      setIsSimulatingIncoming(false);
    }
  };

  // 7. Clear Messages Buffer
  const handleClearMessages = async () => {
    try {
      await fetch('/api/evolution/messages/clear', { method: 'POST' });
      setMessages([]);
      onAddLog('Histórico de Mensagens Evolution Limpo', 'WhatsApp Evolution');
    } catch (e) {}
  };

  // 8. Save Configuration to Vault & Runtime
  const handleSaveAllConfig = async () => {
    const rawUrl = serverUrl.trim();
    const finalUrl =
      !rawUrl ||
      rawUrl === 'http://localhost:8080' ||
      rawUrl.includes('uazapi.dev') ||
      rawUrl.includes('railway') ||
      rawUrl.includes('localhost')
        ? 'https://free.uazapi.com'
        : rawUrl;

    if (finalUrl !== serverUrl) {
      setServerUrl(finalUrl);
    }

    const evoConfig: EvolutionApiConfig = {
      serverUrl: finalUrl,
      apiKey: apiKey.trim(),
      instanceName: instanceName.trim(),
      originPhoneNumber: originPhone.trim(),
      senderName: senderName.trim(),
      autoReplyAi,
      webhookEnabled: true,
      webhookUrl,
      status,
      qrCodeBase64,
      pairingCode,
      lastConnectedAt,
    };

    // Update backend runtime config
    fetch('/api/evolution/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evoConfig),
    }).catch(() => {});

    // Update parent state & vault
    if (onUpdateOriginConfig) {
      const updatedOrigin: WhatsAppOriginConfig = {
        phoneNumber: originPhone.trim(),
        senderName: senderName.trim(),
        instanceId: instanceName.trim(),
        status: status === 'connected' ? 'connected' : 'unpaired',
        gatewayMode: 'evolution_api',
        apiEndpoint: finalUrl,
        apiKey: apiKey.trim(),
        autoSign: originConfig?.autoSign ?? true,
        registeredAt: originConfig?.registeredAt || new Date().toLocaleDateString('pt-BR'),
        evolution: evoConfig,
      };
      onUpdateOriginConfig(updatedOrigin);
    }

    if (onSaveSystem) {
      onSaveSystem();
    }

    onAddLog('Credenciais da Evolution API Salvas no Cofre', 'WhatsApp Evolution', `${senderName} (${originPhone})`);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const copyToClipboard = (text: string, type: 'webhook' | 'pairing') => {
    navigator.clipboard.writeText(text);
    if (type === 'webhook') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    } else {
      setCopiedPairing(true);
      setTimeout(() => setCopiedPairing(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Status & Mode */}
      <div className="bg-[#121824] rounded-2xl border border-emerald-500/30 p-5 shadow-[0_0_24px_rgba(16,185,129,0.08)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-90" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg flex-shrink-0 ${
              status === 'connected'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                : status === 'connecting'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.25)] animate-pulse'
                : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}>
              <Smartphone className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-orbitron font-bold text-sm tracking-wider text-slate-100">
                  UAZAPI (FREE.UAZAPI.COM) & EVOLUTION API — GATEWAY WHATSAPP REAL
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-bold ${
                  status === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : status === 'connecting'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    status === 'connected' ? 'bg-emerald-400 animate-ping' : status === 'connecting' ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  {status === 'connected' ? 'WHATSAPP CONECTADO' : status === 'connecting' ? 'AGUARDANDO LEITURA DO QR' : 'DESCONECTADO'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Conexão oficial via QR Code e Token de Instância com suporte nativo a <strong>UazAPI (https://free.uazapi.com)</strong> e <strong>Evolution API</strong> para envio e recebimento de mensagens reais.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSaveAllConfig}
              className={`text-xs font-orbitron font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                saveSuccess
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>SALVO NO COFRE!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SALVAR CREDENCIAIS</span>
                </>
              )}
            </button>

            {status === 'connected' ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-xs font-mono px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Desconectar do WhatsApp"
              >
                <Power className="w-3.5 h-3.5 text-rose-400" />
                <span>{isLoggingOut ? 'DESCONECTANDO...' : 'DESCONECTAR'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => checkInstanceConnection(false)}
                disabled={isCheckingStatus}
                className="text-xs font-mono px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                title="Verificar se o WhatsApp já foi escaneado"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin text-emerald-400' : ''}`} />
                <span>VERIFICAR STATUS</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Line */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Instância</span>
            <span className="font-mono text-slate-200 font-semibold">{instanceName || 'JARVES-ORIGIN'}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Número de Origem</span>
            <span className="font-mono text-emerald-400 font-semibold">{originPhone || 'Não configurado'}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Titular / Remetente</span>
            <span className="font-mono text-slate-200 font-semibold">{senderName || 'Romildo (Master)'}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Auto-Resposta JARVES AI</span>
            <span className={`font-mono font-semibold ${autoReplyAi ? 'text-cyan-400' : 'text-slate-400'}`}>
              {autoReplyAi ? 'Ativada (Gemini)' : 'Desativada'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: QR Code & Connection (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#121824] rounded-2xl border border-slate-800 p-5 shadow-lg relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <h4 className="font-orbitron font-bold text-xs tracking-wider text-slate-200">
                  PAREAMENTO VIA QR CODE
                </h4>
              </div>

              {/* Tabs: QR Code vs Pairing Code */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveConnectTab('qrcode')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    activeConnectTab === 'qrcode'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setActiveConnectTab('pairing')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    activeConnectTab === 'pairing'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pairing Code
                </button>
              </div>
            </div>

            {/* QR Code / Connection Box */}
            <div className="mt-4 flex flex-col items-center justify-center p-4 bg-slate-950/70 rounded-xl border border-slate-800 min-h-[310px] relative">
              {status === 'connected' ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <h5 className="font-orbitron font-bold text-sm text-emerald-300">WHATSAPP REAL PAREADO</h5>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
                      Sessão ativa e sincronizada com seu WhatsApp. Mensagens enviadas e recebidas em tempo real.
                    </p>
                    {lastConnectedAt && (
                      <span className="text-[10px] font-mono text-emerald-400/80 block mt-2">
                        Conectado desde às {lastConnectedAt}
                      </span>
                    )}
                  </div>
                </div>
              ) : qrCodeBase64 && activeConnectTab === 'qrcode' ? (
                <div className="flex flex-col items-center space-y-3">
                  {/* Holographic scanner effect frame */}
                  <div className="relative p-2 rounded-xl bg-white shadow-[0_0_24px_rgba(0,240,255,0.2)] border-2 border-emerald-500/40">
                    <img
                      src={qrCodeBase64}
                      alt="WhatsApp QR Code Evolution API"
                      className="w-56 h-56 object-contain rounded-lg"
                    />
                    {/* Corner Reticles */}
                    <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-500" />
                    <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-500" />
                    <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-500" />
                    <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-500" />
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span>Atualiza em <strong className="text-emerald-400">{qrCountdown}s</strong></span>
                  </div>
                </div>
              ) : activeConnectTab === 'pairing' && pairingCode ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto shadow-md">
                    <Hash className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Código de Conexão no WhatsApp</span>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <code className="text-2xl font-mono font-bold tracking-widest text-cyan-300 bg-cyan-950/60 px-4 py-1.5 rounded-lg border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                        {pairingCode}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(pairingCode, 'pairing')}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                        title="Copiar Código"
                      >
                        {copiedPairing ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 max-w-[240px] mx-auto">
                      No WhatsApp, selecione <strong>Conectar com código de telefone</strong> e digite este código.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                    <QrCode className="w-7 h-7" />
                  </div>
                  <div>
                    <h5 className="font-orbitron font-bold text-xs text-slate-300">PRONTO PARA CONECTAR</h5>
                    <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">
                      Clique no botão abaixo para gerar o QR Code de leitura do seu WhatsApp.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                id="btn-generate-evolution-qr"
                onClick={() => handleGenerateQrCode(false)}
                disabled={isGeneratingQr || status === 'connected'}
                className="text-xs font-orbitron font-bold py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingQr ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>GERANDO...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-3.5 h-3.5" />
                    <span>GERAR QR CODE</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleGenerateQrCode(true)}
                disabled={status === 'connected'}
                className="text-xs font-mono py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Gera um QR Code de teste em modo sandbox"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>SIMULAR QR TESTE</span>
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="font-orbitron font-bold text-[10px] text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>COMO CONECTAR NO SEU CELULAR:</span>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 pl-1 text-slate-400">
                <li>Abra o WhatsApp no seu smartphone.</li>
                <li>Acesse <strong>Configurações</strong> &gt; <strong>Aparelhos Conectados</strong>.</li>
                <li>Toque em <strong>Conectar Aparelho</strong> e aponte a câmera para o QR Code acima.</li>
              </ol>
            </div>
          </div>

          {/* Webhook Configuration Guide */}
          <div className="bg-[#121824] rounded-2xl border border-slate-800 p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h4 className="font-orbitron font-bold text-xs tracking-wider text-slate-200">
                  WEBHOOK DE RECEBIMENTO
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                AUTO-CONFIGURADO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Endpoint para o qual a Evolution API despacha as mensagens recebidas e eventos de conexão:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 selection:bg-cyan-500/30"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer flex-shrink-0"
                title="Copiar URL do Webhook"
              >
                {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Credentials, Dispatcher & Messages Monitor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Credentials Card (Pronto para o usuário inserir) */}
          <div className="bg-[#121824] rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <h4 className="font-orbitron font-bold text-xs tracking-wider text-slate-200">
                  CREDENCIAIS: UAZAPI (https://free.uazapi.com) & EVOLUTION API
                </h4>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingServer}
                className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Activity className={`w-3.5 h-3.5 ${isTestingServer ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isTestingServer ? 'TESTANDO...' : 'TESTAR CONEXÃO'}</span>
              </button>
            </div>

            {/* Quick Provider Presets */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  SELEÇÃO RÁPIDA DE SERVIÇO:
                </span>
                <a
                  href="https://uazapi.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <span>Documentação Oficial (uazapi.dev)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setServerUrl('https://free.uazapi.com');
                    setServerTestResult(null);
                    onAddLog('Preset UazAPI Free Selecionado', 'WhatsApp Gateway', 'https://free.uazapi.com');
                    fetch('/api/evolution/config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ serverUrl: 'https://free.uazapi.com' }),
                    }).catch(() => {});
                  }}
                  className={`px-3 py-2 rounded-lg text-left text-xs font-mono transition-all cursor-pointer border ${
                    serverUrl === 'https://free.uazapi.com' || serverUrl.includes('free.uazapi.com')
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)] font-bold'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">⚡ UazAPI Free (Padrão)</span>
                    {(serverUrl === 'https://free.uazapi.com' || serverUrl.includes('free.uazapi.com')) && (
                      <span className="text-[9px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.5 rounded">PADRÃO</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">https://free.uazapi.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setServerUrl('https://evolution-api-production-f602b.up.railway.app');
                    setServerTestResult(null);
                    onAddLog('Preset Evolution Railway Selecionado', 'WhatsApp Gateway');
                  }}
                  className={`px-3 py-2 rounded-lg text-left text-xs font-mono transition-all cursor-pointer border ${
                    serverUrl.includes('railway')
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">🌐 Evolution Cloud</span>
                    {serverUrl.includes('railway') && <span className="text-[9px] bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded">ATIVO</span>}
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Railway / Host Nuvem</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setServerUrl('http://localhost:8080');
                    setServerTestResult(null);
                  }}
                  className={`px-3 py-2 rounded-lg text-left text-xs font-mono transition-all cursor-pointer border ${
                    serverUrl.includes('localhost')
                      ? 'bg-slate-800 text-slate-100 border-slate-600 font-bold'
                      : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">💻 Localhost</span>
                    {serverUrl.includes('localhost') && <span className="text-[9px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">ATIVO</span>}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">http://localhost:8080</span>
                </button>
              </div>

              {(serverUrl.includes('uazapi.com') || serverUrl.includes('free.uazapi.com') || serverUrl.includes('uazapi.dev')) && (
                <div className="p-2.5 bg-cyan-950/40 rounded-lg border border-cyan-500/30 text-[11px] text-cyan-200/90 flex items-start gap-2">
                  <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-cyan-300">Instruções UazAPI (https://free.uazapi.com):</strong>
                    <p className="text-[10px] text-cyan-200/80 mt-0.5 leading-relaxed">
                      • <strong>URL Padrão Salva:</strong> <code className="text-cyan-300 bg-cyan-950 px-1 rounded">https://free.uazapi.com</code>.<br />
                      • <strong>Token da Instância:</strong> Cole o Token gerado no painel da sua instância UazAPI.<br />
                      • <strong>Nome da Instância:</strong> Digite o identificador da instância criada na UazAPI.<br />
                      • Em seguida clique em <strong>Testar Conexão</strong> e depois <strong>Gerar QR Code</strong>!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Test result feedback banner */}
            {serverTestResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                serverTestResult.success
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}>
                {serverTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">
                    {serverTestResult.success ? 'Conexão Estabelecida com Sucesso' : 'Falha de Conexão'}
                  </span>
                  <span>{serverTestResult.message}</span>
                </div>
              </div>
            )}

            {/* Credentials Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  URL da API (ex: https://free.uazapi.com):
                </label>
                <div className="relative">
                  <Server className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://free.uazapi.com ou https://evolution.seuservidor.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Token da Instância / API Key (UazAPI token / apikey):
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Cole aqui o Token da sua instância UazAPI"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-14 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-2 text-[10px] font-mono text-slate-400 hover:text-slate-200 px-1.5 py-0.5 rounded bg-slate-800 cursor-pointer"
                  >
                    {showApiKey ? 'OCULTAR' : 'VER'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Nome da Instância (UazAPI / Evolution):
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    placeholder="Nome da instância (ex: JARVES-ORIGIN ou teste)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Número de Origem WhatsApp:
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={originPhone}
                    onChange={(e) => setOriginPhone(e.target.value)}
                    placeholder="+55 11 99999-8888 ou 5511985171455"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Titular / Nome do Remetente:
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Romildo (Master)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>

              {/* Auto Reply AI Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-xs font-mono text-slate-200 font-bold flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    Auto-Resposta IA (JARVES)
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Responde contatos via WhatsApp automaticamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoReplyAi(!autoReplyAi)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    autoReplyAi ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    autoReplyAi ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Real Dispatcher Box */}
          <div className="bg-[#121824] rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h4 className="font-orbitron font-bold text-xs tracking-wider text-slate-200">
                  DISPARO REAL DE WHATSAPP
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Via Instância {instanceName || 'JARVES-ORIGIN'}
              </span>
            </div>

            {sendSuccessNotice && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{sendSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Número do Destinatário (com DDI e DDD):
                </label>
                <input
                  type="text"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="Ex: 5511988887777 ou +55 11 98888-7777"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-300 block mb-1">
                  Mensagem:
                </label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Escreva a mensagem a ser enviada pelo WhatsApp..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 resize-none"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Delay humano 1.2s + simulador de presença ativo</span>
                </div>

                <button
                  type="submit"
                  disabled={isSendingMessage || !testRecipient.trim() || !testMessage.trim()}
                  className="text-xs font-orbitron font-bold px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSendingMessage ? 'animate-ping' : ''}`} />
                  <span>{isSendingMessage ? 'ENVIANDO...' : 'ENVIAR WHATSAPP'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Webhook Messages Inbox & Auto-Reply Feed */}
          <div className="bg-[#121824] rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <h4 className="font-orbitron font-bold text-xs tracking-wider text-slate-200">
                  MENSAGENS RECEBIDAS & RESPOSTAS DA IA
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateIncoming}
                  disabled={isSimulatingIncoming}
                  className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 transition-all cursor-pointer"
                  title="Simular cliente enviando mensagem para testar resposta da IA"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{isSimulatingIncoming ? 'SIMULANDO...' : 'SIMULAR RECEBIMENTO'}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchMessages}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                  title="Atualizar lista"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                </button>

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearMessages}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 border border-slate-700 transition-all cursor-pointer"
                    title="Limpar mensagens"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages Feed */}
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  Nenhuma mensagem recebida ainda. Quando alguém enviar uma mensagem para o seu WhatsApp ou quando você clicar em <strong>Simular Recebimento</strong>, ela aparecerá aqui em tempo real.
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      msg.isFromMe
                        ? 'bg-slate-900/60 border-slate-800 ml-6'
                        : 'bg-slate-950/80 border-slate-800/80 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className={`font-bold flex items-center gap-1.5 ${
                        msg.isFromMe ? 'text-emerald-400' : 'text-cyan-300'
                      }`}>
                        {msg.isFromMe ? <Send className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {msg.fromName} ({msg.from})
                      </span>
                      <span className="text-slate-500">{msg.timestamp}</span>
                    </div>

                    <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                      "{msg.text}"
                    </p>

                    {/* Auto reply card if answered by AI */}
                    {msg.autoReplied && msg.replyText && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-xs">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 font-bold mb-1">
                          <Bot className="w-3.5 h-3.5 text-cyan-400" />
                          <span>RESPOSTA AUTOMÁTICA ENVIADA PELA IA JARVES:</span>
                        </div>
                        <p className="text-slate-300 text-[11px] leading-relaxed">
                          "{msg.replyText}"
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
