import React from 'react';
import {
  Bot,
  LayoutDashboard,
  Cpu,
  MessageSquare,
  DollarSign,
  CheckSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Mic,
  Volume2,
  Radio,
  User,
  Power,
  Sparkles,
  Edit2,
  Music,
  Sliders,
  LogOut,
  Lock,
  Languages,
  Gamepad2,
  Wifi,
  Tv,
  Calculator,
  X
} from 'lucide-react';
import { VoiceConfig, UserAccount, ActiveTab } from '../types';
export type { ActiveTab };

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  voiceConfig: VoiceConfig;
  onUpdateVoiceConfig: (newConfig: Partial<VoiceConfig>) => void;
  onToggleContinuousListening: () => void;
  currentUser?: UserAccount;
  onEditAdminProfile?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  activeTab,
  onSelectTab,
  voiceConfig,
  onUpdateVoiceConfig,
  onToggleContinuousListening,
  currentUser,
  onEditAdminProfile,
  onLogout,
}) => {
  const isRomildo =
    currentUser?.role === 'Admin' ||
    currentUser?.username?.toLowerCase() === 'romildo' ||
    currentUser?.email === 'geoimoveissantos@gmail.com';

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: string; locked?: boolean }[] = [
    {
      id: 'userpanel',
      label: 'Meu Painel Pessoal',
      icon: <Sliders className="w-5 h-5 text-[#00F0FF]" />,
      badge: 'Custom',
    },
    {
      id: 'assistant',
      label: 'Terminal & Voz',
      icon: <Bot className="w-5 h-5 text-[#00F0FF]" />,
      badge: 'Live',
    },
    {
      id: 'automations',
      label: 'AUTOMAÇÕES',
      icon: <Radio className="w-5 h-5 text-amber-400 animate-pulse" />,
      badge: 'Ativo',
    },
    {
      id: 'mirroring',
      label: 'ESPELHAMENTO TV',
      icon: <Tv className="w-5 h-5 text-sky-400" />,
      badge: 'Pareado',
    },
    {
      id: 'dashboard',
      label: 'Dashboard Executivo',
      icon: <LayoutDashboard className="w-5 h-5 text-indigo-400" />,
    },
    {
      id: 'devices',
      label: 'Controle de Dispositivos',
      icon: <Cpu className="w-5 h-5 text-cyan-400" />,
      badge: 'PC/Mobile',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp & Mensagens',
      icon: <MessageSquare className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'finance',
      label: 'Gestão Financeira',
      icon: <DollarSign className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'hp12c',
      label: 'HP 12C Financeira',
      icon: <Calculator className="w-5 h-5 text-amber-400" />,
      badge: 'RPN 1981',
    },
    {
      id: 'habits',
      label: 'Hábitos & Projetos',
      icon: <CheckSquare className="w-5 h-5 text-purple-400" />,
    },
    {
      id: 'media',
      label: 'Mídia & Holo-Audio',
      icon: <Music className="w-5 h-5 text-fuchsia-400" />,
      badge: 'MP3/YouTube',
    },
    {
      id: 'translator',
      label: 'TRADUTOR',
      icon: <Languages className="w-5 h-5 text-teal-400" />,
      badge: 'English Tutor',
    },
    {
      id: 'games',
      label: 'JOGOS',
      icon: <Gamepad2 className="w-5 h-5 text-fuchsia-400" />,
      badge: 'Arcade 80s',
    },
    {
      id: 'admin',
      label: 'Painel Administrativo',
      icon: isRomildo ? <ShieldCheck className="w-5 h-5 text-rose-400" /> : <Lock className="w-5 h-5 text-slate-500" />,
      badge: isRomildo ? '2FA/JWT' : 'Apenas Romildo',
      locked: !isRomildo,
    },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden animate-fade-in transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        id="main-sidebar"
        className={`
          fixed md:relative inset-y-0 left-0 z-50 md:z-30 flex flex-col border-r border-slate-800 bg-[#0B0E14]/98 md:bg-[#0B0E14]/95 backdrop-blur-2xl transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0 w-72 max-w-[85vw] shadow-[0_0_50px_rgba(0,0,0,0.8)] md:shadow-none' : '-translate-x-full md:translate-x-0 md:w-20 hidden md:flex'}
        `}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#121824] to-[#0B0E14] border border-[#00F0FF]/40 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <span className="font-orbitron font-black text-sm text-[#00F0FF]">J</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
            </div>

            {(isOpen || typeof window !== 'undefined') && (
              <div className={`flex flex-col ${!isOpen ? 'md:hidden' : ''}`}>
                <span className="font-orbitron font-extrabold text-base tracking-widest text-slate-100 flex items-center gap-1.5">
                  JARVES
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                    v4.2
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 truncate">
                  Alta Performance AI
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Mobile Close Button */}
            <button
              id="btn-close-sidebar-mobile"
              onClick={onToggle}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Fechar menu lateral"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop Retract / Expand Button */}
            <button
              id="btn-toggle-sidebar"
              onClick={onToggle}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-[#00F0FF] hover:bg-slate-800/60 transition-colors"
              title={isOpen ? 'Recolher menu' : 'Expandir menu'}
            >
              {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>

      {/* User Profile Card (Romildo / Current User) */}
      <div className="p-3 border-b border-slate-800/80 bg-[#121824]/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6C5CE7] to-[#00F0FF] p-[2px] shadow-sm">
                <div className="w-full h-full rounded-full bg-[#0B0E14] flex items-center justify-center text-slate-200">
                  <User className="w-5 h-5 text-[#00F0FF]" />
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0B0E14]" />
            </div>

            {isOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-slate-100 truncate">
                  {currentUser?.name || 'Romildo'}
                </span>
                <span className="text-[11px] text-slate-400 truncate font-mono">
                  {currentUser?.email || 'romildocoelhooficial@gmail.com'}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                      isRomildo
                        ? 'bg-[#6C5CE7]/30 text-[#6C5CE7] border-[#6C5CE7]/40'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isRomildo ? 'Master Admin' : 'Usuário'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {isOpen && onEditAdminProfile && (
              <button
                onClick={onEditAdminProfile}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-[#00F0FF]/20 text-slate-400 hover:text-[#00F0FF] transition-colors"
                title="Editar dados do perfil / Painel"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                title="Encerrar sessão (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Voice Configuration & Controls (Only when expanded or compact icons) */}
      {isOpen ? (
        <div className="p-3 border-b border-slate-800/80 space-y-3 bg-[#0B0E14]/60">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Síntese de Voz</span>
            <Volume2 className="w-3.5 h-3.5 text-[#00F0FF]" />
          </div>

          {/* Male / Female Voice Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#121824] rounded-lg border border-slate-800">
            <button
              id="toggle-voice-masculina"
              onClick={() => onUpdateVoiceConfig({ voiceType: 'masculino', pitch: 0.95 })}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                voiceConfig.voiceType === 'masculino'
                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Voz Masculina
            </button>
            <button
              id="toggle-voice-feminina"
              onClick={() => onUpdateVoiceConfig({ voiceType: 'feminino', pitch: 1.2 })}
              className={`px-2 py-1 text-xs rounded font-medium transition-all ${
                voiceConfig.voiceType === 'feminino'
                  ? 'bg-[#6C5CE7]/25 text-[#6C5CE7] border border-[#6C5CE7]/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Voz Feminina
            </button>
          </div>

          {/* Continuous Conversation Toggle */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#121824] border border-slate-800">
            <div className="flex items-center gap-2">
              <Radio
                className={`w-4 h-4 ${
                  voiceConfig.continuousListening ? 'text-[#00F0FF] animate-pulse' : 'text-slate-500'
                }`}
              />
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-200">
                  Conversa Contínua
                </span>
                <span className="text-[10px] text-slate-400">
                  {voiceConfig.continuousListening ? 'Ativa (Sempre ouvindo)' : 'Inativa (Push to talk)'}
                </span>
              </div>
            </div>

            <button
              id="toggle-continuous-mode"
              onClick={onToggleContinuousListening}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                voiceConfig.continuousListening ? 'bg-[#00F0FF]' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#0B0E14] shadow ring-0 transition duration-200 ease-in-out ${
                  voiceConfig.continuousListening ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-b border-slate-800/80 flex flex-col items-center gap-2">
          <button
            onClick={() => onUpdateVoiceConfig({ voiceType: voiceConfig.voiceType === 'masculino' ? 'feminino' : 'masculino' })}
            className="p-2 rounded-lg bg-[#121824] hover:bg-slate-800 text-[#00F0FF]"
            title={`Voz: ${voiceConfig.voiceType}`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleContinuousListening}
            className={`p-2 rounded-lg ${
              voiceConfig.continuousListening
                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                : 'bg-[#121824] text-slate-400'
            }`}
            title="Modo contínuo"
          >
            <Radio className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => {
                onSelectTab(item.id);
                if (typeof window !== 'undefined' && window.innerWidth < 768 && isOpen) {
                  onToggle();
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#121824] to-[#0B0E14] text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]/60 active:bg-[#121824]'
              }`}
              title={!isOpen ? item.label : undefined}
            >
              <div className="flex-shrink-0">{item.icon}</div>

              {(isOpen || typeof window !== 'undefined') && (
                <div className={`flex items-center justify-between flex-1 truncate ${!isOpen ? 'md:hidden' : ''}`}>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Status & Logout */}
      <div className="p-3 border-t border-slate-800 bg-[#0B0E14]/90 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {(isOpen || typeof window !== 'undefined') && (
              <span className={!isOpen ? 'md:hidden' : ''}>JARVES Core Ativo</span>
            )}
          </div>
          {(isOpen || typeof window !== 'undefined') && (
            <span className={`font-mono text-[10px] text-[#00F0FF] ${!isOpen ? 'md:hidden' : ''}`}>PT-BR</span>
          )}
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/80 hover:bg-rose-500/15 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-medium transition-all ${
              !isOpen ? 'md:hidden' : ''
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        )}
      </div>
    </aside>
    </>
  );
};
