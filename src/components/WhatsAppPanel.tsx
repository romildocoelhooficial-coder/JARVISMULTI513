import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Phone,
  User,
  Clock,
  CheckCheck,
  Bell,
  Mail,
  ExternalLink,
  Plus,
  Sparkles,
  Zap,
  Power,
  Mic,
  ShieldCheck,
  RefreshCw,
  Save,
  Smartphone,
  PhoneCall,
  Check,
  CheckCircle2,
  Settings2,
  Radio,
  Info,
  Edit3,
  QrCode,
  Wifi,
  Server
} from 'lucide-react';
import { WhatsAppAutomationRule, WhatsAppOriginConfig } from '../types';
import { EvolutionGatewayPanel } from './EvolutionGatewayPanel';

interface Contact {
  id: string;
  name: string;
  phone: string;
  role: string;
  avatar: string;
  lastMessage?: string;
  unreadCount?: number;
}

interface WhatsAppMessage {
  id: string;
  recipient: string;
  phone: string;
  message: string;
  timestamp: string;
  status: 'Enviada' | 'Agendada' | 'Entregue';
}

interface WhatsAppPanelProps {
  onSendMessage: (recipient: string, message: string) => void;
  onAddLog: (action: string, device: string, target?: string) => void;
  automations?: WhatsAppAutomationRule[];
  onToggleAutomation?: (id: string) => void;
  onTriggerAutomation?: (id: string) => void;
  onAddAutomation?: (rule: Omit<WhatsAppAutomationRule, 'id'>) => void;
  onSaveSystem?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  originConfig?: WhatsAppOriginConfig;
  onUpdateOriginConfig?: (config: WhatsAppOriginConfig) => void;
}

export const WhatsAppPanel: React.FC<WhatsAppPanelProps> = ({
  onSendMessage,
  onAddLog,
  automations = [],
  onToggleAutomation,
  onTriggerAutomation,
  onAddAutomation,
  onSaveSystem,
  isSaving = false,
  isDirty = false,
  originConfig,
  onUpdateOriginConfig,
}) => {
  const defaultOrigin: WhatsAppOriginConfig = {
    phoneNumber: '+55 11 99999-8888',
    senderName: 'Romildo (Master)',
    instanceId: 'JARVES-ORIGIN-01',
    status: 'connected',
    gatewayMode: 'web_direct',
    autoSign: true,
    registeredAt: '18/09/2026',
  };

  const currentOrigin = originConfig || defaultOrigin;
  const [activeSubTab, setActiveSubTab] = useState<'evolution' | 'messages' | 'automations' | 'origin'>('evolution');
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [originPhone, setOriginPhone] = useState(currentOrigin.phoneNumber);
  const [originSenderName, setOriginSenderName] = useState(currentOrigin.senderName);
  const [originInstanceId, setOriginInstanceId] = useState(currentOrigin.instanceId);
  const [originGatewayMode, setOriginGatewayMode] = useState<WhatsAppOriginConfig['gatewayMode']>(currentOrigin.gatewayMode);
  const [originAutoSign, setOriginAutoSign] = useState(currentOrigin.autoSign);
  const [originSaveSuccess, setOriginSaveSuccess] = useState(false);

  useEffect(() => {
    if (originConfig) {
      setOriginPhone(originConfig.phoneNumber);
      setOriginSenderName(originConfig.senderName);
      setOriginInstanceId(originConfig.instanceId);
      setOriginGatewayMode(originConfig.gatewayMode);
      setOriginAutoSign(originConfig.autoSign);
    }
  }, [originConfig]);

  const handleSaveOrigin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!originPhone.trim()) return;

    let formattedPhone = originPhone.trim();
    const digits = formattedPhone.replace(/\D/g, '');
    if (digits.length === 11 && !formattedPhone.startsWith('+')) {
      formattedPhone = `+55 (${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    const updated: WhatsAppOriginConfig = {
      phoneNumber: formattedPhone,
      senderName: originSenderName.trim() || 'Romildo (Master)',
      instanceId: originInstanceId.trim() || 'JARVES-ORIGIN-01',
      status: 'connected',
      gatewayMode: originGatewayMode,
      autoSign: originAutoSign,
      registeredAt: currentOrigin.registeredAt || new Date().toLocaleDateString('pt-BR'),
    };

    if (onUpdateOriginConfig) {
      onUpdateOriginConfig(updated);
    }
    onAddLog('WhatsApp de Origem Atualizado', 'WhatsApp Origem', `${updated.senderName} (${updated.phoneNumber})`);
    if (onSaveSystem) {
      onSaveSystem();
    }
    setIsEditingOrigin(false);
    setOriginSaveSuccess(true);
    setTimeout(() => setOriginSaveSuccess(false), 3500);
  };

  const handleTestOriginDispatch = () => {
    const cleanOriginPhone = currentOrigin.phoneNumber.replace(/\D/g, '') || '5511999998888';
    const testMsg = `*JARVES TELEMETRIA — TESTE DE ORIGEM*\n\nLinha remetente operacional e validada no sistema.\n• Origem: ${currentOrigin.senderName} (${currentOrigin.phoneNumber})\n• Instância: ${currentOrigin.instanceId}\n• Gateway: ${currentOrigin.gatewayMode === 'web_direct' ? 'Disparo Direto Web' : 'API Gateway'}\n• Timestamp: ${new Date().toLocaleTimeString('pt-BR')}`;
    const waUrl = `https://wa.me/${cleanOriginPhone}?text=${encodeURIComponent(testMsg)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onAddLog('Teste de WhatsApp de Origem Disparado', 'WhatsApp Origem', currentOrigin.phoneNumber);
  };

  const [contacts, setContacts] = useState<Contact[]>([
    {
      id: '1',
      name: 'Romildo (Master)',
      phone: '5511999998888',
      role: 'Administrador Principal',
      avatar: 'R',
      lastMessage: 'Status dos servidores JARVES operacional.',
      unreadCount: 0,
    },
    {
      id: '2',
      name: 'Engenharia de Software',
      phone: '5511988887777',
      role: 'Equipe Técnica',
      avatar: 'E',
      lastMessage: 'Deploy v4.2 aprovado em produção.',
      unreadCount: 1,
    },
    {
      id: '3',
      name: 'Diretoria Executiva',
      phone: '5511977776666',
      role: 'Gestão Estratégica',
      avatar: 'D',
      lastMessage: 'Reunião agendada para as 16h.',
      unreadCount: 0,
    },
    {
      id: '4',
      name: 'Suporte 24h JARVES',
      phone: '5511966665555',
      role: 'Central de Atendimento',
      avatar: 'S',
      lastMessage: 'Protocolo de automação ativo.',
      unreadCount: 0,
    },
  ]);

  const [selectedContact, setSelectedContact] = useState<Contact>(contacts[0]);
  const [customPhone, setCustomPhone] = useState('');
  const [messageText, setMessageText] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [recentDispatches, setRecentDispatches] = useState<WhatsAppMessage[]>([
    {
      id: 'w1',
      recipient: 'Romildo (Master)',
      phone: '5511999998888',
      message: 'Olá Romildo, todos os subsistemas foram inicializados.',
      timestamp: 'Hoje, 08:30',
      status: 'Entregue',
    },
    {
      id: 'w2',
      recipient: 'Engenharia de Software',
      phone: '5511988887777',
      message: 'Alerta de telemetria: CPU em carga normal de 14%.',
      timestamp: 'Hoje, 09:12',
      status: 'Entregue',
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const phoneToUse = customPhone.trim() || selectedContact.phone;
    const recipientName = customPhone.trim() ? customPhone : selectedContact.name;

    // Compose message with optional origin signature
    let dispatchText = messageText.trim();
    if (currentOrigin.autoSign) {
      dispatchText = `${dispatchText}\n\n— Enviado via JARVES [Origem: ${currentOrigin.phoneNumber}]`;
    }

    // Call prop handler
    onSendMessage(recipientName, dispatchText);
    onAddLog('Mensagem WhatsApp Enviada', 'WhatsApp', `${recipientName} (${phoneToUse}) [Origem: ${currentOrigin.phoneNumber}]`);

    // Add to dispatches
    const newMsg: WhatsAppMessage = {
      id: `w_${Date.now()}`,
      recipient: recipientName,
      phone: phoneToUse,
      message: dispatchText,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: scheduledTime ? 'Agendada' : 'Enviada',
    };
    setRecentDispatches([newMsg, ...recentDispatches]);

    // If Evolution API mode is selected or connected, send via Evolution Gateway
    if (currentOrigin.gatewayMode === 'evolution_api' || currentOrigin.evolution?.status === 'connected') {
      fetch('/api/evolution/message/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: phoneToUse,
          text: dispatchText,
          serverUrl: currentOrigin.evolution?.serverUrl || 'https://free.uazapi.com',
          apiKey: currentOrigin.evolution?.apiKey,
          instanceName: currentOrigin.evolution?.instanceName,
        }),
      }).catch((e) => console.warn('Evolution API dispatch:', e));
    }

    // Open actual WhatsApp Web / wa.me link
    const cleanPhone = phoneToUse.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(dispatchText)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    setMessageText('');
  };

  const quickTemplates = [
    'Bom dia! Relatório executivo do JARVES gerado com sucesso.',
    'Confirmando nosso compromisso agendado para hoje.',
    'Status operacional verificado: Todos os nós estão 100% ativos.',
    'Por favor, revise os apontamentos financeiros no dashboard.',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-orbitron font-bold text-sm tracking-wider text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            CENTRAL WHATSAPP & COMUNICAÇÃO JARVES
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Disparo automatizado de mensagens, lembretes de agenda e notificações diretas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onSaveSystem && (
            <button
              id="btn-whatsapp-save"
              type="button"
              onClick={onSaveSystem}
              disabled={isSaving}
              className={`text-[11px] font-orbitron font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isDirty
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
              } disabled:opacity-50`}
              title="Salvar regras e origem no cofre seguro"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>SALVANDO...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>SALVAR REGRAS & ORIGEM</span>
                </>
              )}
            </button>
          )}

          <span className="text-[11px] font-mono px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Gateway Conectado
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#0F141F] rounded-2xl border border-slate-800 overflow-x-auto shadow-sm">
        <button
          type="button"
          id="tab-evolution-gateway"
          onClick={() => setActiveSubTab('evolution')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-orbitron font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'evolution'
              ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <QrCode className="w-4 h-4 text-emerald-400" />
          <span>UAZAPI & EVOLUTION (QR CODE)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        <button
          type="button"
          id="tab-whatsapp-messages"
          onClick={() => setActiveSubTab('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-orbitron font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'messages'
              ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>CONVERSAS & CONTATOS</span>
        </button>

        <button
          type="button"
          id="tab-whatsapp-automations"
          onClick={() => setActiveSubTab('automations')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-orbitron font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'automations'
              ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>REGRAS AUTÔNOMAS ({automations.length})</span>
        </button>

        <button
          type="button"
          id="tab-whatsapp-origin"
          onClick={() => setActiveSubTab('origin')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-orbitron font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'origin'
              ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>LINHA DE ORIGEM</span>
        </button>
      </div>

      {/* 1. Evolution API Dedicated Environment */}
      {activeSubTab === 'evolution' && (
        <EvolutionGatewayPanel
          originConfig={currentOrigin}
          onUpdateOriginConfig={onUpdateOriginConfig}
          onAddLog={onAddLog}
          onSaveSystem={onSaveSystem}
        />
      )}

      {/* WHATSAPP DE ORIGEM — CADASTRO E CONFIGURAÇÃO DA LINHA REMETENTE */}
      {activeSubTab === 'origin' && (
      <div className="bg-[#121824] rounded-2xl border border-emerald-500/30 p-5 shadow-[0_0_24px_rgba(16,185,129,0.08)] relative overflow-hidden">
        {/* Visual Accent Glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent opacity-80" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-orbitron font-bold text-xs tracking-wider text-slate-100">
                  WHATSAPP DE ORIGEM (REMETENTE CADASTRADO NO JARVES)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LINHA MESTRE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Número registrado a partir do qual o JARVES dispara mensagens automáticas e diretas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              id="btn-test-whatsapp-origin"
              onClick={handleTestOriginDispatch}
              className="text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Disparar mensagem de teste de handshake para o número de origem"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              <span>Testar Linha</span>
            </button>

            <button
              type="button"
              id="btn-toggle-edit-origin"
              onClick={() => setIsEditingOrigin(!isEditingOrigin)}
              className={`text-xs font-orbitron font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                isEditingOrigin
                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingOrigin ? 'Fechar Formulário' : 'Cadastrar / Alterar'}</span>
            </button>
          </div>
        </div>

        {/* Current Origin Display Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-3 rounded-xl bg-[#0B0E14] border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Número Remetente (Linha Ativa)
            </span>
            <div className="text-lg font-orbitron font-bold text-emerald-400 tracking-wide flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{currentOrigin.phoneNumber}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Configurado com DDD para envio direto</span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0E14] border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Titular do Remetente
            </span>
            <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <User className="w-4 h-4 text-[#00F0FF] flex-shrink-0" />
              <span className="truncate">{currentOrigin.senderName}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              Instância: <code className="text-slate-400">{currentOrigin.instanceId}</code>
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0E14] border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              Modo & Assinatura Digital
            </span>
            <div className="text-xs font-mono text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{currentOrigin.gatewayMode === 'web_direct' ? 'Disparo Direto Web (wa.me)' : 'API Gateway'}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1">
              Assinatura: {currentOrigin.autoSign ? <span className="text-emerald-400 font-medium">Anexada no rodapé</span> : <span className="text-slate-400">Oculta</span>}
            </span>
          </div>
        </div>

        {/* Origin Registration Form (When active or opened) */}
        {isEditingOrigin && (
          <form onSubmit={handleSaveOrigin} className="mt-4 p-4 rounded-xl bg-[#0B0E14] border border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-orbitron font-bold text-emerald-400 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                FORMULÁRIO DE CADASTRO DO WHATSAPP DE ORIGEM
              </span>
              <span className="text-[11px] text-slate-400">Persiste no cofre criptografado</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Número de Origem (com DDD):
                </label>
                <input
                  type="text"
                  id="input-origin-phone"
                  value={originPhone}
                  onChange={(e) => setOriginPhone(e.target.value)}
                  placeholder="+55 11 99999-8888 ou 11999998888"
                  className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Nome do Remetente / Titular:
                </label>
                <input
                  type="text"
                  id="input-origin-sender"
                  value={originSenderName}
                  onChange={(e) => setOriginSenderName(e.target.value)}
                  placeholder="Romildo (Master)"
                  className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  ID de Instância JARVES:
                </label>
                <input
                  type="text"
                  id="input-origin-instance"
                  value={originInstanceId}
                  onChange={(e) => setOriginInstanceId(e.target.value)}
                  placeholder="JARVES-ORIGIN-01"
                  className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-300 block mb-1">
                  Modo de Gateway:
                </label>
                <select
                  id="select-origin-mode"
                  value={originGatewayMode}
                  onChange={(e) => setOriginGatewayMode(e.target.value as any)}
                  className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
                >
                  <option value="evolution_api">UazAPI (https://free.uazapi.com) & Evolution API (QR Code Real)</option>
                  <option value="web_direct">Disparo Direto Web (wa.me)</option>
                  <option value="api_gateway">API Gateway Segura</option>
                  <option value="local_bridge">Local Bridge / Emulador</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  id="check-origin-autosign"
                  checked={originAutoSign}
                  onChange={(e) => setOriginAutoSign(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <span>Anexar assinatura automática de origem nas mensagens ("— Enviado via JARVES [Origem: ...]")</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingOrigin(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-origin-confirm"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar WhatsApp de Origem</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {originSaveSuccess && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>WhatsApp de origem cadastrado e salvo com sucesso no cofre seguro!</span>
          </div>
        )}

        {/* Voice Command Suggestions for WhatsApp Origin & Messaging */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-slate-300 font-medium">
            <Mic className="w-3.5 h-3.5 text-[#00F0FF]" />
            Comandos de Voz Suportados:
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#0B0E14] border border-slate-800 text-emerald-300 font-mono">
            "Cadastrar WhatsApp de origem 11999998888"
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#0B0E14] border border-slate-800 text-emerald-300 font-mono">
            "Qual é o meu WhatsApp de origem"
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#0B0E14] border border-slate-800 text-slate-300 font-mono">
            "Enviar WhatsApp para Romildo dizendo que está pronto"
          </span>
          <span className="px-2 py-0.5 rounded-md bg-[#0B0E14] border border-slate-800 text-slate-300 font-mono">
            "Manda um zap para 11988887777 avisando da reunião"
          </span>
        </div>
      </div>
      )}

      {/* 2. Messages & Contacts */}
      {activeSubTab === 'messages' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact Directory */}
        <div className="bg-[#121824] rounded-2xl border border-slate-800 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <span className="font-orbitron text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#00F0FF]" />
              CONTATOS REGISTRADOS
            </span>
            <span className="text-xs text-slate-500">{contacts.length} cadastrados</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[380px]">
            {contacts.map((contact) => {
              const isSelected = selectedContact.id === contact.id;
              return (
                <button
                  key={contact.id}
                  onClick={() => {
                    setSelectedContact(contact);
                    setCustomPhone('');
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-[#0B0E14] border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                      : 'bg-[#121824]/50 border-slate-800 hover:bg-slate-800/40 text-slate-400'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
                    {contact.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 text-xs truncate">
                        {contact.name}
                      </span>
                      {contact.unreadCount ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500 text-black font-bold">
                          {contact.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono block truncate">
                      {contact.phone}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {contact.role}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Message Composer */}
        <div className="lg:col-span-2 bg-[#121824] rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span className="font-orbitron font-bold text-xs text-slate-200">
                  DISPARADOR DIRETO WHATSAPP
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  Origem: <strong>{currentOrigin.senderName}</strong> ({currentOrigin.phoneNumber})
                </span>
                <span className="text-slate-400">➔</span>
                <span className="text-slate-300">
                  Destino: <strong className="text-emerald-400">{selectedContact.name}</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleSend} className="space-y-4">
              {/* Optional Custom Phone */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Ou digite um número com DDD (ex: 5511999998888):
                </label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder={`Padrão: ${selectedContact.phone} (${selectedContact.name})`}
                  className="w-full bg-[#0B0E14] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Message Input */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Conteúdo da Mensagem:
                </label>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escreva a mensagem a ser enviada pelo JARVES..."
                  className="w-full bg-[#0B0E14] border border-slate-700 rounded-xl p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 resize-none font-rajdhani text-base"
                />
              </div>

              {/* Templates */}
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                  Modelos Rápidos:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {quickTemplates.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMessageText(tmpl)}
                      className="text-left p-2 rounded-lg bg-[#0B0E14] hover:bg-slate-800 text-[11px] text-slate-300 hover:text-emerald-400 border border-slate-800 transition-colors line-clamp-1"
                    >
                      "{tmpl}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-[#0B0E14] border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    title="Agendar horário (opcional)"
                  />
                  <span className="text-[10px] text-slate-500">Agendar disparo</span>
                </div>

                <button
                  type="submit"
                  id="btn-submit-whatsapp-message"
                  disabled={!messageText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar via WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </button>
              </div>
            </form>
          </div>

          {/* Recent Dispatches Log */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <span className="font-orbitron text-xs font-semibold text-slate-300 block mb-2">
              HISTÓRICO RECENTE DE DISPAROS
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {recentDispatches.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#0B0E14] border border-slate-850 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 truncate">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-200 font-semibold">{item.recipient}:</span>
                    <span className="text-slate-400 truncate">{item.message}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 3. Autonomous WhatsApp Automations for Registered Contacts */}
      {activeSubTab === 'automations' && (
      <div className="bg-[#121824] rounded-2xl border border-emerald-500/30 p-5 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="font-orbitron font-bold text-xs tracking-wider text-slate-100">
                MENSAGENS AUTOMÁTICAS PARA CONTATOS CADASTRADOS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ativação por Voz Suportada
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Rotinas automáticas programadas de WhatsApp para Romildo e equipes. Ative ou desative por comando de voz.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>Diga: "JARVES, ativar mensagens automáticas para o WhatsApp do Romildo"</span>
            </div>
          </div>
        </div>

        {/* Automation Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {automations.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                rule.enabled
                  ? 'bg-[#0B0E14] border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)]'
                  : 'bg-[#0B0E14]/60 border-slate-800 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold tracking-wider bg-slate-800 text-[#00F0FF]">
                    {rule.triggerType === 'daily_summary'
                      ? 'Resumo Diário'
                      : rule.triggerType === 'meeting_reminder'
                      ? 'Lembrete de Agenda'
                      : rule.triggerType === 'finance_alert'
                      ? 'Alerta Financeiro'
                      : 'Status de Sistema'}
                  </span>

                  <button
                    onClick={() => onToggleAutomation?.(rule.id)}
                    className={`flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded transition-all ${
                      rule.enabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                    title={rule.enabled ? 'Clique para desativar' : 'Clique para ativar'}
                  >
                    <Power className="w-3 h-3" />
                    <span>{rule.enabled ? 'ATIVO' : 'DESATIVADO'}</span>
                  </button>
                </div>

                <div className="font-semibold text-xs text-slate-200 mt-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{rule.contactName}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                  Tel: {rule.contactPhone}
                </div>

                <p className="text-xs text-slate-300 mt-2 p-2 rounded-lg bg-[#121824] border border-slate-800/80 italic font-mono text-[11px] line-clamp-2">
                  "{rule.templateMessage}"
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-850 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  {rule.lastDispatched || 'Aguardando gatilho'}
                </span>

                <button
                  onClick={() => onTriggerAutomation?.(rule.id)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium transition-all"
                  title="Disparar mensagem no WhatsApp agora"
                >
                  <Send className="w-3 h-3" />
                  <span>Disparar Agora</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
};
