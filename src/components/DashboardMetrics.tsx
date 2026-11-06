import React from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Thermometer,
  Wifi,
  BatteryCharging,
  DollarSign,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { SystemMetrics, CalendarEvent, Habit, FinancialTransaction } from '../types';

interface DashboardMetricsProps {
  metrics: SystemMetrics;
  calendarEvents: CalendarEvent[];
  habits: Habit[];
  transactions: FinancialTransaction[];
  onNavigateTab: (tab: any) => void;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  metrics,
  calendarEvents,
  habits,
  transactions,
  onNavigateTab,
}) => {
  // Financial balance calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIncome - totalExpenses;

  const completedHabitsToday = habits.filter((h) => h.completedToday).length;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#121824] via-[#0B0E14] to-[#121824] border border-[#00F0FF]/30 p-5 shadow-[0_0_25px_rgba(0,240,255,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
              <span className="font-orbitron font-bold text-xs tracking-widest text-[#00F0FF]">
                TELEMETRIA GERAL EM TEMPO REAL
              </span>
            </div>
            <h2 className="text-xl font-bold font-orbitron text-slate-100">
              Centro de Operações JARVES - Romildo
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Subsistemas de inteligência artificial, periféricos de máquina, automações e registros de produtividade operando em sincronia total.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-xl bg-[#0B0E14] border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Eficiência Core</span>
              <span className="font-orbitron text-base font-bold text-emerald-400">99.8%</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-[#0B0E14] border border-slate-800 text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">Latência</span>
              <span className="font-orbitron text-base font-bold text-[#00F0FF]">18ms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware / System Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* CPU */}
        <div className="p-3.5 rounded-xl bg-[#121824] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">CPU Core</span>
            <Cpu className="w-4 h-4 text-[#00F0FF]" />
          </div>
          <div className="font-orbitron text-lg font-bold text-slate-100">{metrics.cpu}%</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-[#00F0FF] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${metrics.cpu}%` }}
            />
          </div>
        </div>

        {/* RAM */}
        <div className="p-3.5 rounded-xl bg-[#121824] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">Memória RAM</span>
            <Activity className="w-4 h-4 text-[#6C5CE7]" />
          </div>
          <div className="font-orbitron text-lg font-bold text-slate-100">{metrics.ram}%</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-[#6C5CE7] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${metrics.ram}%` }}
            />
          </div>
        </div>

        {/* Storage */}
        <div className="p-3.5 rounded-xl bg-[#121824] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">Armazenamento</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-orbitron text-lg font-bold text-slate-100">{metrics.storage}%</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${metrics.storage}%` }}
            />
          </div>
        </div>

        {/* Temp */}
        <div className="p-3.5 rounded-xl bg-[#121824] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">Temperatura</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-orbitron text-lg font-bold text-slate-100">{metrics.temperature}°C</div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(metrics.temperature / 100) * 100}%` }}
            />
          </div>
        </div>

        {/* Network */}
        <div className="p-3.5 rounded-xl bg-[#121824] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">Rede Down</span>
            <Wifi className="w-4 h-4 text-sky-400" />
          </div>
          <div className="font-orbitron text-lg font-bold text-slate-100">{metrics.networkDown} Mb/s</div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">Up: {metrics.networkUp} Mb/s</div>
        </div>

        {/* Battery */}
        <div className="p-3.5 rounded-xl bg-[#121824] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-mono">Bateria</span>
            <BatteryCharging className="w-4 h-4 text-teal-400" />
          </div>
          <div className="font-orbitron text-lg font-bold text-slate-100">{metrics.battery}%</div>
          <div className="text-[10px] text-teal-400 font-mono mt-1">Carregando (AC)</div>
        </div>
      </div>

      {/* Summary Modules: Finanças, Hábitos, Agenda */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Finance Snapshot */}
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-orbitron text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                SALDO FINANCEIRO
              </span>
              <button
                onClick={() => onNavigateTab('finance')}
                className="text-xs text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <span>Ver Detalhes</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="font-orbitron text-2xl font-bold text-emerald-400 mb-2">
              R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-lg bg-[#0B0E14] border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Receitas</span>
                <span className="text-emerald-400 font-semibold">R$ {totalIncome.toFixed(2)}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0B0E14] border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Despesas</span>
                <span className="text-rose-400 font-semibold">R$ {totalExpenses.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fluxo de caixa positivo no período mensal</span>
          </div>
        </div>

        {/* Habits Snapshot */}
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-orbitron text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                METAS & HÁBITOS DE HOJE
              </span>
              <button
                onClick={() => onNavigateTab('habits')}
                className="text-xs text-purple-400 hover:underline flex items-center gap-0.5"
              >
                <span>Ver Todos</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-orbitron text-2xl font-bold text-[#00F0FF]">
                {completedHabitsToday} / {habits.length}
              </span>
              <span className="text-xs text-slate-400">concluídos</span>
            </div>

            <div className="space-y-1.5">
              {habits.slice(0, 3).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-[#0B0E14] border border-slate-850"
                >
                  <span className={h.completedToday ? 'text-slate-400 line-through' : 'text-slate-200'}>
                    {h.title}
                  </span>
                  <span className="font-mono text-[10px] text-purple-400">
                    🔥 {h.streak} dias
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            Acompanhamento contínuo de metas diárias.
          </div>
        </div>

        {/* Calendar / Appointments Snapshot */}
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-orbitron text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-400" />
                COMPROMISSOS & AGENDA
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-400">
                Sincronizado
              </span>
            </div>

            <div className="space-y-2">
              {calendarEvents.slice(0, 3).map((evt) => (
                <div
                  key={evt.id}
                  className="p-2 rounded-lg bg-[#0B0E14] border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200">{evt.title}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{evt.datetime}</div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {evt.category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            Diga ao JARVES: "Agendar reunião amanhã às 15h" para adicionar.
          </div>
        </div>
      </div>
    </div>
  );
};
