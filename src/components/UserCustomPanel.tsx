import React, { useState } from 'react';
import {
  User,
  Sliders,
  Palette,
  LayoutGrid,
  CheckCircle2,
  Save,
  Shield,
  Lock,
  Smartphone,
  Mail,
  FileText,
  Sparkles,
  Bot,
  DollarSign,
  Cpu,
  MessageSquare,
  Music,
  CheckSquare,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Send,
  Check,
  ExternalLink,
  ShieldCheck,
  Target,
  Languages,
  Gamepad2,
  Radio,
  Tv
} from 'lucide-react';
import {
  UserAccount,
  ActiveTab,
  FinancialTransaction,
  Habit,
  CalendarEvent,
  Project,
  WhatsAppAutomationRule,
  WhatsAppOriginConfig
} from '../types';
import { playJarvesChime } from '../utils/audioEffects';

interface UserCustomPanelProps {
  currentUser: UserAccount;
  onUpdateCurrentUser: (updatedUser: Partial<UserAccount>) => void;
  onNavigateToTab: (tab: ActiveTab) => void;
  onSaveToVault?: () => void;
  userTransactions?: FinancialTransaction[];
  userHabits?: Habit[];
  userCalendarEvents?: CalendarEvent[];
  userProjects?: Project[];
  userWhatsAppAutomations?: WhatsAppAutomationRule[];
  whatsAppOrigin?: WhatsAppOriginConfig;
  onUpdateOriginConfig?: (newOrigin: WhatsAppOriginConfig) => void;
}

export const UserCustomPanel: React.FC<UserCustomPanelProps> = ({
  currentUser,
  onUpdateCurrentUser,
  onNavigateToTab,
  onSaveToVault,
  userTransactions = [],
  userHabits = [],
  userCalendarEvents = [],
  userProjects = [],
  userWhatsAppAutomations = [],
  whatsAppOrigin,
  onUpdateOriginConfig,
}) => {
  // Customization state
  const custom = currentUser.customSettings || {};

  const [themeColor, setThemeColor] = useState<string>(custom.themeColor || '#00F0FF');
  const [customTitle, setCustomTitle] = useState<string>(custom.customTitle || `Painel de ${currentUser.name}`);
  const [customStatusMsg, setCustomStatusMsg] = useState<string>(custom.customStatusMsg || 'Foco em Alta Performance');
  const [quickNotes, setQuickNotes] = useState<string>(custom.quickNotes || 'Minhas anotações e objetivos de hoje...');
  
  // WhatsApp Origin registration state
  const [originPhone, setOriginPhone] = useState(
    whatsAppOrigin?.phoneNumber || currentUser.phone || ''
  );
  const [originSender, setOriginSender] = useState(
    whatsAppOrigin?.senderName || currentUser.name || ''
  );
  const [originSavedMsg, setOriginSavedMsg] = useState(false);

  // Exclusive Personal Metrics
  const userBalance = userTransactions.reduce(
    (acc, t) => (t.type === 'income' ? acc + t.amount : acc - t.amount),
    0
  );
  const totalIncome = userTransactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = userTransactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const completedHabits = userHabits.filter((h) => h.completedToday).length;
  const pendingEvents = userCalendarEvents.filter((c) => !c.completed).length;
  const activeProjectsCount = userProjects.filter((p) => p.status === 'Em Andamento').length;
  const activeAutomationsCount = userWhatsAppAutomations.filter((a) => a.enabled).length;

  // Enabled widgets (Automações e Espelhamento ativados por padrão)
  const defaultWidgets = [
    'assistant',
    'whatsapp',
    'finance',
    'media',
    'devices',
    'habits',
    'automations',
    'mirroring',
  ];
  const [enabledWidgets, setEnabledWidgets] = useState<string[]>(() => {
    const saved = custom.enabledWidgets;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const merged = [...saved];
      if (!merged.includes('automations')) merged.push('automations');
      if (!merged.includes('mirroring')) merged.push('mirroring');
      return merged;
    }
    return defaultWidgets;
  });

  // Profile Edit State
  const [editName, setEditName] = useState(currentUser.name);
  const [editPhone, setEditPhone] = useState(currentUser.phone);
  const [editEmail, setEditEmail] = useState(currentUser.email);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const THEME_OPTIONS = [
    { name: 'Ciano Cibernético', hex: '#00F0FF', border: 'border-[#00F0FF]', bg: 'bg-[#00F0FF]' },
    { name: 'Esmeralda JARVES', hex: '#10B981', border: 'border-emerald-500', bg: 'bg-emerald-500' },
    { name: 'Roxo Quântico', hex: '#8B5CF6', border: 'border-purple-500', bg: 'bg-purple-500' },
    { name: 'Âmbar Laser', hex: '#F59E0B', border: 'border-amber-500', bg: 'bg-amber-500' },
    { name: 'Rosa Neon', hex: '#EC4899', border: 'border-pink-500', bg: 'bg-pink-500' },
  ];

  const WIDGET_OPTIONS: { id: string; label: string; icon: React.ReactNode; tab: ActiveTab; desc: string }[] = [
    {
      id: 'assistant',
      label: 'Terminal de Voz & IA',
      icon: <Bot className="w-5 h-5 text-[#00F0FF]" />,
      tab: 'assistant',
      desc: 'Reconhecimento por voz e inteligência artificial JARVES',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp & Mensagens',
      icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
      tab: 'whatsapp',
      desc: 'Linha de origem, disparador direto e automações',
    },
    {
      id: 'finance',
      label: 'Finanças Pessoais',
      icon: <DollarSign className="w-5 h-5 text-amber-400" />,
      tab: 'finance',
      desc: 'Lançamentos rápidos, extrato e controle de saldo',
    },
    {
      id: 'media',
      label: 'Mídia, MP3 & YouTube',
      icon: <Music className="w-5 h-5 text-fuchsia-400" />,
      tab: 'media',
      desc: 'Biblioteca de áudio local e pesquisa de vídeos',
    },
    {
      id: 'devices',
      label: 'Controle de Hardware',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      tab: 'devices',
      desc: 'Monitor de periféricos, câmera, volume e sistema',
    },
    {
      id: 'habits',
      label: 'Hábitos & Projetos',
      icon: <CheckSquare className="w-5 h-5 text-purple-400" />,
      tab: 'habits',
      desc: 'Acompanhamento de metas diárias e tarefas',
    },
    {
      id: 'translator',
      label: 'TRADUTOR & English Tutor',
      icon: <Languages className="w-5 h-5 text-teal-400" />,
      tab: 'translator',
      desc: 'Tutor de inglês, áudios, pronúncia e conversação guiada',
    },
    {
      id: 'games',
      label: 'JOGOS & Arcade 80s',
      icon: <Gamepad2 className="w-5 h-5 text-fuchsia-400" />,
      tab: 'games',
      desc: 'Space Invaders clássico e Pac-Man retro com som sintetizado',
    },
    {
      id: 'automations',
      label: 'AUTOMAÇÕES & IoT Remoto',
      icon: <Radio className="w-5 h-5 text-amber-400" />,
      tab: 'automations',
      desc: 'Controle por voz com Alexa, Google Home, Wi-Fi e Bluetooth para luzes e eletrônicos',
    },
    {
      id: 'mirroring',
      label: 'ESPELHAMENTO SMART TV',
      icon: <Tv className="w-5 h-5 text-sky-400" />,
      tab: 'mirroring',
      desc: 'Espelhar tela em Smart TVs Samsung, LG, Sony e Apple TV com navegação remota D-Pad',
    },
  ];

  const toggleWidget = (widgetId: string) => {
    setEnabledWidgets((prev) =>
      prev.includes(widgetId) ? prev.filter((id) => id !== widgetId) : [...prev, widgetId]
    );
  };

  const handleSavePreferences = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updatedUser: Partial<UserAccount> = {
      name: editName.trim() || currentUser.name,
      phone: editPhone.trim() || currentUser.phone,
      email: editEmail.trim() || currentUser.email,
      customSettings: {
        themeColor,
        customTitle: customTitle.trim() || `Painel de ${editName}`,
        customStatusMsg: customStatusMsg.trim(),
        quickNotes,
        enabledWidgets,
      },
    };

    if (newPassword.trim()) {
      updatedUser.password = newPassword.trim();
    }

    onUpdateCurrentUser(updatedUser);
    if (onSaveToVault) onSaveToVault();

    playJarvesChime('confirm');
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3500);
  };

  const isMasterAdmin = currentUser.role === 'Admin' || currentUser.username?.toLowerCase() === 'romildo';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner & User ID */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B0E14] via-[#121824] to-[#0B0E14] border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div
          className="absolute top-0 right-0 w-96 h-96 blur-3xl opacity-15 pointer-events-none rounded-full"
          style={{ backgroundColor: themeColor }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center p-0.5 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${themeColor}, #6C5CE7)` }}
              >
                <div className="w-full h-full rounded-2xl bg-[#0B0E14] flex items-center justify-center text-slate-100">
                  <User className="w-8 h-8" style={{ color: themeColor }} />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#0B0E14]" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-orbitron font-bold text-xl sm:text-2xl text-slate-100 tracking-wide">
                  {currentUser.name}
                </h1>
                <span
                  className={`text-xs font-mono uppercase px-2.5 py-0.5 rounded-full border ${
                    isMasterAdmin
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isMasterAdmin ? 'Master Admin' : 'Usuário Padrão'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
                <span>@{currentUser.username || 'usuario'}</span>
                <span>•</span>
                <span>{currentUser.email}</span>
                <span>•</span>
                <span className="text-emerald-400">{currentUser.phone}</span>
              </p>
            </div>
          </div>

          {/* Action Save Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSavePreferences()}
              className="px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider flex items-center gap-2 text-slate-950 transition-all shadow-lg hover:brightness-110 active:scale-95"
              style={{ backgroundColor: themeColor }}
            >
              <Save className="w-4 h-4" />
              <span>SALVAR PREFERÊNCIAS</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Suas configurações foram salvas com sucesso no cofre seguro do JARVES!</span>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* EXCLUSIVE USER DATA & METRICS CARDS */}
      {/* ========================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Dados e Métricas Pessoais (Exclusivos de {currentUser.name})</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Isolamento Criptográfico Ativo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Financeiro Exclusivo */}
          <div className="bg-[#0B0E14]/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-amber-500/50 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">Saldo Pessoal</span>
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-slate-100 mb-1">
                R$ {userBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span className="text-emerald-400">+R$ {totalIncome.toFixed(0)}</span>
                <span className="text-rose-400">-R$ {totalExpense.toFixed(0)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('finance')}
              className="mt-3.5 w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-amber-400 text-slate-300 hover:text-amber-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Abrir Módulo Financeiro</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Card 2: Hábitos Pessoais */}
          <div className="bg-[#0B0E14]/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-purple-500/50 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">Hábitos Ativos</span>
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-slate-100 mb-1">
                {completedHabits} / {userHabits.length}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {userHabits.length > 0
                  ? `${Math.round((completedHabits / userHabits.length) * 100)}% das metas diárias cumpridas`
                  : 'Nenhum hábito cadastrado'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('habits')}
              className="mt-3.5 w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-purple-400 text-slate-300 hover:text-purple-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Gerenciar Hábitos</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Card 3: Agenda & Compromissos */}
          <div className="bg-[#0B0E14]/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-cyan-500/50 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">Minha Agenda</span>
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-slate-100 mb-1">
                {pendingEvents} Pendentes
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {userCalendarEvents.length > 0
                  ? userCalendarEvents[0].title
                  : 'Agenda livre no momento'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('habits')}
              className="mt-3.5 w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Consultar Agenda</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* Card 4: WhatsApp de Origem Vinculado */}
          <div className="bg-[#0B0E14]/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">Linha WhatsApp</span>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base font-bold font-mono text-emerald-300 mb-1 truncate">
                {originPhone || currentUser.phone || 'Não registrado'}
              </div>
              <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{originSender || currentUser.name}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('whatsapp')}
              className="mt-3.5 w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700/70 hover:border-emerald-400 text-slate-300 hover:text-emerald-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Disparador WhatsApp</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Customization Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Visual Customization & Profile */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card: Theme & Styling */}
          <div className="bg-[#0B0E14]/90 rounded-2xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 border-b border-slate-800/80 pb-3">
              <Palette className="w-4 h-4" style={{ color: themeColor }} />
              <span>Cor Holográfica de Destaque</span>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-mono block">
                Selecione a atmosfera do seu painel:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {THEME_OPTIONS.map((opt) => {
                  const isSelected = themeColor === opt.hex;
                  return (
                    <button
                      key={opt.hex}
                      type="button"
                      onClick={() => setThemeColor(opt.hex)}
                      className={`h-10 rounded-xl flex items-center justify-center transition-all ${
                        isSelected
                          ? `ring-2 ring-offset-2 ring-offset-[#0B0E14] ring-white scale-105 shadow-md`
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: opt.hex }}
                      title={opt.name}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-slate-950 font-bold" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Dashboard Title */}
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">
                Título Personalizado do Painel:
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF]"
                placeholder="Ex: Central Executiva Pessoal"
              />
            </div>

            {/* Custom Status Message */}
            <div>
              <label className="text-xs text-slate-400 font-mono block mb-1">
                Frase de Status no HUD:
              </label>
              <input
                type="text"
                value={customStatusMsg}
                onChange={(e) => setCustomStatusMsg(e.target.value)}
                className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF]"
                placeholder="Ex: Foco Absoluto em Metas"
              />
            </div>
          </div>

          {/* Card: Quick Notes Scratchpad */}
          <div className="bg-[#0B0E14]/90 rounded-2xl border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Bloco de Notas Pessoal</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Cofre Local</span>
            </div>

            <textarea
              rows={4}
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="Digite lembretes, pautas e notas importantes..."
              className="w-full bg-[#121824] border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 resize-none font-mono"
            />
            <p className="text-[10px] text-slate-500 font-mono">
              Suas notas são salvas de forma privada no seu perfil criptografado.
            </p>
          </div>

          {/* Card: Permissions & Security */}
          <div className="bg-[#0B0E14]/90 rounded-2xl border border-slate-800 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 border-b border-slate-800/80 pb-3">
              <Shield className="w-4 h-4 text-rose-400" />
              <span>Nível de Acesso & Permissões</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#121824]">
                <span className="text-slate-300">Painel Personalizável</span>
                <span className="text-emerald-400 font-mono font-bold">ATIVADO</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#121824]">
                <span className="text-slate-300">Módulo Administrativo</span>
                {isMasterAdmin ? (
                  <span className="text-amber-400 font-mono font-bold">LIBERADO (MASTER)</span>
                ) : (
                  <span className="text-rose-400 font-mono flex items-center gap-1">
                    <Lock className="w-3 h-3" /> RESTRITO A ROMILDO
                  </span>
                )}
              </div>
            </div>

            {!isMasterAdmin && (
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono pt-1">
                Apenas o usuário <strong>Romildo</strong> (geoimoveissantos@gmail.com) possui credencial master para o painel de administração geral do sistema.
              </p>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Interactive Widgets & Active Modules */}
        <div className="space-y-6 lg:col-span-2">
          {/* Card: Widget Toggles */}
          <div className="bg-[#0B0E14]/90 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-orbitron">
                  <LayoutGrid className="w-5 h-5" style={{ color: themeColor }} />
                  WIDGETS & MÓDULOS ATIVOS
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ative ou desative os cartões do seu painel e acesse os módulos com 1 clique
                </p>
              </div>

              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                {enabledWidgets.length} Ativos
              </span>
            </div>

            {/* Widgets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {WIDGET_OPTIONS.map((widget) => {
                const isEnabled = enabledWidgets.includes(widget.id);
                return (
                  <div
                    key={widget.id}
                    className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                      isEnabled
                        ? 'bg-[#121824]/90 border-slate-700 shadow-sm'
                        : 'bg-[#0B0E14] border-slate-800/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-800/80">{widget.icon}</div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-100">{widget.label}</h4>
                          <p className="text-[11px] text-slate-400 leading-snug">{widget.desc}</p>
                        </div>
                      </div>

                      {/* Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleWidget(widget.id)}
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Quick Access Button */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">
                        {isEnabled ? 'Visível no painel' : 'Oculto'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onNavigateToTab(widget.tab)}
                        className="text-xs font-medium text-slate-300 hover:text-slate-100 hover:underline flex items-center gap-1"
                      >
                        <span>Abrir módulo</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: WhatsApp Origin Registration for this user */}
          <div className="bg-[#0B0E14]/90 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-orbitron">
                    LINHA WHATSAPP DE ORIGEM
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cadastre o número que dispara mensagens e automações no seu JARVES
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ativo</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-slate-300 mb-1">
                  Número de WhatsApp com DDD:
                </label>
                <input
                  type="text"
                  value={originPhone}
                  onChange={(e) => setOriginPhone(e.target.value)}
                  placeholder="Ex: 13 996361313 ou +55 13 99636-1313"
                  className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">
                  Nome do Remetente (Assinatura):
                </label>
                <input
                  type="text"
                  value={originSender}
                  onChange={(e) => setOriginSender(e.target.value)}
                  placeholder={`Ex: ${currentUser.name}`}
                  className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-slate-400 font-mono">
                Ao salvar, todas as mensagens autônomas e disparos deste usuário utilizarão este número como remetente.
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const clean = originPhone.replace(/\D/g, '');
                    const testUrl = `https://wa.me/${clean}?text=${encodeURIComponent(`[JARVES] Teste de conectividade da linha de origem ${originSender || currentUser.name}. Sistema online.`)}`;
                    window.open(testUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/60 font-mono text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Testar Disparo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const newOriginConfig: WhatsAppOriginConfig = {
                      phoneNumber: originPhone.trim(),
                      senderName: originSender.trim() || currentUser.name,
                      instanceId: whatsAppOrigin?.instanceId || `JARVES-${currentUser.username?.toUpperCase() || 'USER'}-01`,
                      status: 'connected',
                      gatewayMode: whatsAppOrigin?.gatewayMode || 'web_direct',
                      autoSign: whatsAppOrigin?.autoSign ?? true,
                      registeredAt: whatsAppOrigin?.registeredAt || new Date().toLocaleDateString('pt-BR'),
                      evolution: whatsAppOrigin?.evolution,
                    };
                    if (onUpdateOriginConfig) {
                      onUpdateOriginConfig(newOriginConfig);
                    }
                    onUpdateCurrentUser({
                      customSettings: {
                        ...(currentUser.customSettings || {}),
                        whatsAppOrigin: newOriginConfig,
                      },
                    });
                    playJarvesChime('confirm');
                    setOriginSavedMsg(true);
                    setTimeout(() => setOriginSavedMsg(false), 3000);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 hover:bg-emerald-400 transition-colors shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Linha de Origem</span>
                </button>
              </div>
            </div>

            {originSavedMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Linha WhatsApp de origem salva e sincronizada exclusivamente com seu painel!</span>
              </div>
            )}
          </div>

          {/* Card: User Media Library & MP3 / Videos Management */}
          <div className="bg-[#0B0E14]/90 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-[#00F0FF]">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-orbitron flex items-center gap-2">
                    BIBLIOTECA PESSOAL DE MÍDIA (MP3 & VÍDEOS)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Armazenamento individual no banco de dados e reprodução autônoma pela IA JARVES
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Isolado por Usuário
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#121824] border border-slate-800">
                <div className="text-fuchsia-400 font-bold mb-1 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>Músicas MP3 do Usuário</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Faixas MP3 armazenadas na tabela <code>usuario_musicas_mp3</code> com stream direto ou blob durável.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#121824] border border-slate-800">
                <div className="text-[#00F0FF] font-bold mb-1 flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5" />
                  <span>Vídeos (YouTube & Dailymotion)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Links salvos na tabela <code>usuario_videos_links</code> com player responsivo e pesquisa por voz.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400 font-mono">
                ✓ Comandos de voz da IA: "JARVES, tocar [música]" consulta seu banco primeiro antes da busca externa.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToTab('media')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00F0FF] to-blue-600 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 hover:brightness-110 transition-all shadow-md cursor-pointer"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>Abrir Meu Centro de Mídia</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Card: Edit User Profile Data */}
          <div className="bg-[#0B0E14]/90 rounded-2xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-orbitron">
                <User className="w-5 h-5 text-[#00F0FF]" />
                DADOS DO PERFIL
              </h3>
              <span className="text-xs font-mono text-slate-400">Edição de Cadastro</span>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Nome Completo:
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Login / Usuário (fixo):
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.username || currentUser.name}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-400 cursor-not-allowed font-mono"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    E-mail:
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>

                {/* WhatsApp Phone */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    WhatsApp com DDD:
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[#121824] border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-[#00F0FF] font-mono"
                  />
                </div>

                {/* Change Password */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Alterar Senha (deixe em branco para manter a atual):
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite a nova senha desejada"
                      className="w-full bg-[#121824] border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider flex items-center gap-2 text-slate-950 transition-all shadow-md hover:brightness-110 active:scale-95"
                  style={{ backgroundColor: themeColor }}
                >
                  <Save className="w-4 h-4" />
                  <span>SALVAR ALTERAÇÕES DE CADASTRO</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
