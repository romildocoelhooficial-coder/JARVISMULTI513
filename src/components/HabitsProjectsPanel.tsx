import React, { useState } from 'react';
import {
  CheckSquare,
  Flame,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  FolderGit2,
  Clock,
  Target,
  CheckCircle2,
  Circle,
  Save
} from 'lucide-react';
import { Habit, Project, CalendarEvent } from '../types';

interface HabitsProjectsPanelProps {
  habits: Habit[];
  onToggleHabit: (id: string) => void;
  onAddHabit: (title: string, category: string) => void;
  projects: Project[];
  onUpdateProjectProgress: (id: string, progress: number) => void;
  calendarEvents: CalendarEvent[];
  onAddCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onDeleteCalendarEvent: (id: string) => void;
  onSaveSystem?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
}

export const HabitsProjectsPanel: React.FC<HabitsProjectsPanelProps> = ({
  habits,
  onToggleHabit,
  onAddHabit,
  projects,
  onUpdateProjectProgress,
  calendarEvents,
  onAddCalendarEvent,
  onDeleteCalendarEvent,
  onSaveSystem,
  isSaving = false,
  isDirty = false,
}) => {
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Produtividade');

  // Calendar form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventCategory, setEventCategory] = useState<'Reunião' | 'Tarefa' | 'Pessoal' | 'Lembrete'>('Reunião');

  const handleHabitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    onAddHabit(newHabitTitle.trim(), newHabitCategory);
    setNewHabitTitle('');
  };

  const handleCalendarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDate) return;
    onAddCalendarEvent({
      title: eventTitle.trim(),
      datetime: eventDate,
      category: eventCategory,
      completed: false,
    });
    setEventTitle('');
    setEventDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-orbitron font-bold text-sm tracking-wider text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            RASTREADOR DE HÁBITOS, PROJETOS & AGENDA
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sincronização de metas diárias, streaks ininterruptos e monitoramento de entregas chave.
          </p>
        </div>

        {onSaveSystem && (
          <button
            id="btn-habits-save"
            type="button"
            onClick={onSaveSystem}
            disabled={isSaving}
            className={`self-start sm:self-auto text-[11px] font-orbitron font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isDirty
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
            } disabled:opacity-50`}
            title="Salvar alterações de hábitos, projetos e agenda no cofre seguro"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>SALVANDO...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>SALVAR HÁBITOS & AGENDA</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Hábitos Diários */}
        <div className="bg-[#121824] rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <span className="font-orbitron text-xs font-bold text-slate-200 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                HÁBITOS DIÁRIOS & STREAKS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {habits.filter((h) => h.completedToday).length}/{habits.length}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto mb-4">
              {habits.map((habit) => (
                <div
                  key={habit.id}
                  onClick={() => onToggleHabit(habit.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    habit.completedToday
                      ? 'bg-[#0B0E14] border-emerald-500/40 text-slate-400'
                      : 'bg-[#0B0E14]/80 border-slate-800 hover:border-purple-500/40 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {habit.completedToday ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500 hover:text-purple-400" />
                    )}
                    <div>
                      <div className={`text-xs font-semibold ${habit.completedToday ? 'line-through text-slate-400' : ''}`}>
                        {habit.title}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {habit.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px]">
                    <Flame className="w-3 h-3 fill-amber-400" />
                    <span>{habit.streak}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Add Habit */}
          <form onSubmit={handleHabitSubmit} className="pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={newHabitTitle}
              onChange={(e) => setNewHabitTitle(e.target.value)}
              placeholder="Novo hábito (ex: Meditação 10m)..."
              className="flex-1 bg-[#0B0E14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Center Column: Projetos Ativos */}
        <div className="bg-[#121824] rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <span className="font-orbitron text-xs font-bold text-slate-200 flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#00F0FF]" />
                PROJETOS ESTRATÉGICOS
              </span>
              <span className="text-xs text-slate-400 font-mono">{projects.length} ativos</span>
            </div>

            <div className="space-y-4">
              {projects.map((proj) => (
                <div key={proj.id} className="p-3.5 rounded-xl bg-[#0B0E14] border border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-200">{proj.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-[#00F0FF]">
                      {proj.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
                    <span>Progresso: {proj.progress}%</span>
                    <span>Prazo: {proj.deadline}</span>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[#6C5CE7] to-[#00F0FF] transition-all duration-300"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>

                  {/* Progress quick clickers */}
                  <div className="flex items-center justify-end gap-1">
                    {[25, 50, 75, 100].map((p) => (
                      <button
                        key={p}
                        onClick={() => onUpdateProjectProgress(proj.id, p)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          proj.progress >= p
                            ? 'bg-[#00F0FF]/20 text-[#00F0FF]'
                            : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs text-slate-400">
            Monitorado pelo protocolo autônomo JARVES.
          </div>
        </div>

        {/* Right Column: Calendário & Reuniões */}
        <div className="bg-[#121824] rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <span className="font-orbitron text-xs font-bold text-slate-200 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-sky-400" />
                AGENDA & COMPROMISSOS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {calendarEvents.length} eventos
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto mb-4">
              {calendarEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-2.5 rounded-xl bg-[#0B0E14] border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-200">{evt.title}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <Clock className="w-3 h-3 text-sky-400" />
                      <span>{evt.datetime}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {evt.category}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteCalendarEvent(evt.id)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    title="Remover evento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Calendar Form */}
          <form onSubmit={handleCalendarSubmit} className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">
              Agendar Novo Compromisso:
            </span>
            <input
              type="text"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Título (ex: Call Estratégica)..."
              className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                placeholder="Data/Hora (ex: Amanhã 15h)"
                className="bg-[#0B0E14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
              />
              <select
                value={eventCategory}
                onChange={(e) => setEventCategory(e.target.value as any)}
                className="bg-[#0B0E14] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-400"
              >
                <option value="Reunião">Reunião</option>
                <option value="Tarefa">Tarefa</option>
                <option value="Pessoal">Pessoal</option>
                <option value="Lembrete">Lembrete</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inserir na Agenda</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
