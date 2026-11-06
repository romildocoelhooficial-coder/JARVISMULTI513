import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  PieChart,
  Calendar,
  Tag,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Mic,
  Sparkles,
  Volume2,
  Radio,
  Save,
  CheckCircle2
} from 'lucide-react';
import { FinancialTransaction } from '../types';

interface FinancePanelProps {
  transactions: FinancialTransaction[];
  onAddTransaction: (t: Omit<FinancialTransaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onSpeakBalance?: () => void;
  onSaveSystem?: () => void;
  isSaving?: boolean;
  lastSavedTimestamp?: string;
  isDirty?: boolean;
}

export const FinancePanel: React.FC<FinancePanelProps> = ({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  onSpeakBalance,
  onSaveSystem,
  isSaving = false,
  lastSavedTimestamp,
  isDirty = false,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Geral');

  const categories = ['Geral', 'Servidores/Cloud', 'Alimentação', 'Tecnologia', 'Consultoria', 'Investimento', 'Assinaturas'];

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    onAddTransaction({
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      category,
      date: new Date().toLocaleDateString('pt-BR'),
    });

    setDescription('');
    setAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-orbitron font-bold text-sm tracking-wider text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            GESTÃO FINANCEIRA INTELIGENTE JARVES
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro rápido de despesas, entradas corporativas e acréscimo de valores por comando de voz de alta precisão.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSaveSystem && (
            <button
              id="btn-finance-save"
              type="button"
              onClick={onSaveSystem}
              disabled={isSaving}
              className={`text-[11px] font-orbitron font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isDirty
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                  : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40'
              } disabled:opacity-50`}
              title="Salvar alterações financeiras no cofre seguro"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>SALVANDO...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>SALVAR FINANÇAS</span>
                </>
              )}
            </button>
          )}

          {onSpeakBalance && (
            <button
              id="btn-finance-speak-balance"
              type="button"
              onClick={onSpeakBalance}
              className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-[#00F0FF] border border-cyan-500/30 flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all active:scale-95 cursor-pointer"
              title="Solicitar ao JARVES que fale o saldo financeiro em voz alta"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#00F0FF] animate-pulse" />
              <span>Ouvir Saldo em Voz</span>
            </button>
          )}
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            Voz Ativa: "Qual meu saldo?" / "Acrescentar R$"
          </span>
        </div>
      </div>

      {/* Voice Quick Assistant Card */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-[#121824] via-[#0B0E14] to-[#121824] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-200 block font-orbitron flex items-center gap-2">
              Comandos de Voz Financeiros
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/40">
                Síntese Vocal Ativa
              </span>
            </span>
            <span className="text-[11px] text-slate-400">
              Pergunte "Qual meu saldo?" para ouvir o resumo vocal, ou dite valores para lançar despesas e receitas.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSpeakBalance && (
            <button
              type="button"
              onClick={onSpeakBalance}
              className="px-2.5 py-1 rounded bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[11px] font-mono text-[#00F0FF] transition-all flex items-center gap-1"
            >
              <Volume2 className="w-3 h-3" />
              "Qual meu saldo?"
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onAddTransaction({
                description: 'Combustível (Comando de Voz)',
                amount: 250,
                type: 'expense',
                category: 'Transporte',
                date: new Date().toLocaleDateString('pt-BR'),
                source: 'voice',
              });
            }}
            className="px-2.5 py-1 rounded bg-[#0B0E14] hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-rose-300 transition-all hover:border-rose-400"
          >
            + R$ 250 (Combustível)
          </button>
          <button
            type="button"
            onClick={() => {
              onAddTransaction({
                description: 'Receita Consultoria (Comando de Voz)',
                amount: 1500,
                type: 'income',
                category: 'Trabalho',
                date: new Date().toLocaleDateString('pt-BR'),
                source: 'voice',
              });
            }}
            className="px-2.5 py-1 rounded bg-[#0B0E14] hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-emerald-300 transition-all hover:border-emerald-400"
          >
            + R$ 1500 (Receita)
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Net Balance */}
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-all">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-slate-400">Saldo Líquido</span>
              {onSpeakBalance && (
                <button
                  type="button"
                  onClick={onSpeakBalance}
                  className="p-1 rounded bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-[#00F0FF] transition-all cursor-pointer"
                  title="Falar saldo em voz alta"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className={`font-orbitron text-2xl font-bold mt-1 ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Disponível em conta</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-amber-400">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Total Income */}
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-slate-400">Receitas Totais</span>
            <div className="font-orbitron text-2xl font-bold text-emerald-400 mt-1">
              + R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-emerald-500/80 font-mono flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Entradas registradas
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Total Expense */}
        <div className="p-4 rounded-2xl bg-[#121824] border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-slate-400">Despesas Totais</span>
            <div className="font-orbitron text-2xl font-bold text-rose-400 mt-1">
              - R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-rose-500/80 font-mono flex items-center gap-1">
              <ArrowDownLeft className="w-3 h-3" /> Saídas computadas
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Transaction Form */}
        <div className="bg-[#121824] rounded-2xl border border-slate-800 p-5">
          <span className="font-orbitron text-xs font-bold text-slate-200 flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Plus className="w-4 h-4 text-[#00F0FF]" />
            NOVO LANÇAMENTO
          </span>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0E14] rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-1.5 text-xs font-semibold rounded transition-all ${
                  type === 'income'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Receita (+)
              </button>
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-1.5 text-xs font-semibold rounded transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Despesa (-)
              </button>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Descrição</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Servidor Cloud AWS / Venda Software"
                className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0FF]"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#00F0FF]"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#00F0FF]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              id="btn-add-transaction"
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-400 hover:opacity-90 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar no Balanço</span>
            </button>
          </form>
        </div>

        {/* Transactions List */}
        <div className="lg:col-span-2 bg-[#121824] rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <span className="font-orbitron text-xs font-bold text-slate-200">
                EXTRATO & TRANSAÇÕES REGISTRADAS
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {transactions.length} registros
              </span>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto">
              {transactions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#0B0E14] border border-slate-850 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        item.type === 'income'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {item.type === 'income' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <span>{item.description}</span>
                        {item.source === 'voice' && (
                          <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-[#00F0FF] border border-[#00F0FF]/30 font-mono">
                            <Mic className="w-2.5 h-2.5" />
                            Voz
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-sm font-bold ${
                        item.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.type === 'income' ? '+' : '-'} R${' '}
                      {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      onClick={() => onDeleteTransaction(item.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Excluir transação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Dica por voz: Diga "JARVES, adicionei despesa de 150 reais em servidores"</span>
            <span className="font-mono text-[#00F0FF]">Criptografado</span>
          </div>
        </div>
      </div>
    </div>
  );
};
