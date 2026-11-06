import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Mail,
  Smartphone,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity
} from 'lucide-react';
import { UserAccount } from '../types';
import { playJarvesChime } from '../utils/audioEffects';

interface AuthPortalProps {
  onLoginSuccess: (user: UserAccount) => void;
  onRegisterSuccess: (newUser: UserAccount) => void;
  existingUsers: UserAccount[];
}

export const AuthPortal: React.FC<AuthPortalProps> = ({
  onLoginSuccess,
  onRegisterSuccess,
  existingUsers,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Registration Form States
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimmedId = loginIdentifier.trim().toLowerCase();
    const trimmedPass = loginPassword.trim();

    if (!trimmedId || !trimmedPass) {
      setLoginError('Por favor, informe seu usuário/e-mail e senha.');
      playJarvesChime('error');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      // 1. Check if user matches Romildo explicitly
      const isRomildoLogin =
        (trimmedId === 'romildo' || trimmedId === 'geoimoveissantos@gmail.com') &&
        trimmedPass === 'Romildo2009@';

      // 2. Or search in existingUsers array
      const matchedUser = existingUsers.find((u) => {
        const matchId =
          u.username?.toLowerCase() === trimmedId ||
          u.email.toLowerCase() === trimmedId ||
          u.name.toLowerCase() === trimmedId;

        const matchPass = u.password ? u.password === trimmedPass : false;
        return matchId && (matchPass || (isRomildoLogin && (u.username?.toLowerCase() === 'romildo' || u.role === 'Admin')));
      });

      if (isRomildoLogin) {
        // Find existing Romildo account or generate the canonical Romildo master account
        const romildoAccount: UserAccount = matchedUser || {
          id: 'usr-romildo-master',
          name: 'Romildo',
          username: 'Romildo',
          password: 'Romildo2009@',
          email: 'geoimoveissantos@gmail.com',
          phone: '13 996361313',
          status: 'Ativo',
          role: 'Admin',
          lastAccess: 'Hoje',
          lastIp: '127.0.0.1 (Local)',
          actionLogsCount: 45,
          customSettings: {
            themeColor: '#00F0FF',
            customTitle: 'Terminal Master JARVES',
            enabledWidgets: ['assistant', 'devices', 'whatsapp', 'finance', 'habits', 'media', 'admin'],
          },
        };

        playJarvesChime('confirm');
        setIsProcessing(false);
        onLoginSuccess(romildoAccount);
        return;
      }

      if (matchedUser) {
        if (matchedUser.status === 'Suspenso') {
          setLoginError('Esta conta de usuário encontra-se suspensa pelo Administrador.');
          playJarvesChime('error');
          setIsProcessing(false);
          return;
        }

        playJarvesChime('confirm');
        setIsProcessing(false);
        onLoginSuccess(matchedUser);
        return;
      }

      // If credentials do not match
      setLoginError('Credenciais incorretas. Verifique seu login ou senha informados.');
      playJarvesChime('error');
      setIsProcessing(false);
    }, 450);
  };

  // Handle Registration
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccessMsg('');

    const cleanName = regName.trim();
    const cleanUsername = regUsername.trim().toLowerCase();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPhone = regPhone.trim();
    const cleanPass = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanName || !cleanUsername || !cleanEmail || !cleanPhone || !cleanPass) {
      setRegError('Preencha todos os campos obrigatórios para criar sua conta.');
      playJarvesChime('error');
      return;
    }

    if (cleanUsername === 'romildo' || cleanEmail === 'geoimoveissantos@gmail.com') {
      setRegError('O nome de usuário Romildo e o e-mail geoimoveissantos@gmail.com são exclusivos do Master Admin.');
      playJarvesChime('error');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setRegError('A senha e a confirmação de senha não coincidem.');
      playJarvesChime('error');
      return;
    }

    if (cleanPass.length < 4) {
      setRegError('A senha deve possuir pelo menos 4 caracteres.');
      playJarvesChime('error');
      return;
    }

    // Check if username or email already exists
    const userExists = existingUsers.some(
      (u) => u.username?.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
    );

    if (userExists) {
      setRegError('Este nome de usuário ou e-mail já está cadastrado no sistema.');
      playJarvesChime('error');
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const newUser: UserAccount = {
        id: `usr-${Date.now()}`,
        name: cleanName,
        username: cleanUsername,
        password: cleanPass,
        email: cleanEmail,
        phone: cleanPhone,
        status: 'Ativo',
        role: 'User', // Standard users always receive 'User' role
        lastAccess: 'Hoje',
        lastIp: '192.168.1.150',
        actionLogsCount: 1,
        customSettings: {
          themeColor: '#10B981',
          customTitle: `Painel de ${cleanName.split(' ')[0]}`,
          enabledWidgets: ['assistant', 'devices', 'whatsapp', 'finance', 'habits', 'media'],
          customStatusMsg: 'Ambiente Pessoal Operacional',
        },
      };

      playJarvesChime('confirm');
      setIsProcessing(false);
      setRegSuccessMsg('Cadastro realizado com sucesso! Inicializando seu painel personalizável...');
      
      setTimeout(() => {
        onRegisterSuccess(newUser);
      }, 700);
    }, 500);
  };

  return (
    <div className="min-h-screen w-full bg-[#070A0F] text-slate-100 flex flex-col justify-between relative overflow-x-hidden selection:bg-[#00F0FF]/30 selection:text-[#00F0FF]">
      {/* Background Matrix/Grid & Glow Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(#121824_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-[#00F0FF]/10 via-[#6C5CE7]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-[500px] h-[300px] bg-gradient-to-t from-emerald-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Top Bar / Branding */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-slate-800/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#121824] to-[#0B0E14] border border-[#00F0FF]/40 shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center justify-center">
            <span className="font-orbitron font-black text-lg text-[#00F0FF]">J</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-orbitron font-extrabold text-base tracking-widest text-slate-100">
                JARVES
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30">
                v4.5 SECURE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Plataforma de Inteligência e Automação Executiva
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121824]/80 border border-slate-800 text-xs font-mono text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Cofre Criptografado SHA-256</span>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          {/* Card Wrapper */}
          <div className="bg-[#0B0E14]/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00F0FF] to-transparent" />

            {/* Header Icon & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-[#121824] to-[#0B0E14] border border-slate-700/80 shadow-inner mb-3">
                <ShieldCheck className="w-8 h-8 text-[#00F0FF]" />
              </div>
              <h1 className="font-orbitron font-bold text-xl sm:text-2xl text-slate-100 tracking-wide">
                PORTAL DE ACESSO JARVES
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Faça login ou crie sua conta para acessar seu painel pessoal de inteligência e produtividade.
              </p>
            </div>

            {/* Mode Tabs: Login vs Register */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#121824] rounded-2xl border border-slate-800 mb-6">
              <button
                type="button"
                id="tab-btn-login"
                onClick={() => {
                  setActiveTab('login');
                  setLoginError('');
                  playJarvesChime('click');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                  activeTab === 'login'
                    ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_12px_rgba(0,240,255,0.15)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Entrar (Login)</span>
              </button>

              <button
                type="button"
                id="tab-btn-register"
                onClick={() => {
                  setActiveTab('register');
                  setRegError('');
                  playJarvesChime('click');
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                  activeTab === 'register'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Criar Conta (Cadastro)</span>
              </button>
            </div>

            {/* ================================================= */}
            {/* TAB 1: LOGIN FORM */}
            {/* ================================================= */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-shake">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* Login Identifier */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Usuário ou E-mail:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login-identifier"
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Digite seu usuário ou e-mail"
                      className="w-full bg-[#121824] border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] transition-all"
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono text-slate-300">
                      Senha:
                    </label>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full bg-[#121824] border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#00F0FF] focus:ring-1 focus:ring-[#00F0FF] transition-all"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded bg-[#121824] border-slate-700 text-[#00F0FF] focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Manter conectado neste dispositivo</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  id="btn-login-submit"
                  disabled={isProcessing}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#00A8FF] text-slate-950 font-bold text-sm tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>AUTENTICANDO...</span>
                    </>
                  ) : (
                    <>
                      <span>ENTRAR NO SISTEMA</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ================================================= */}
            {/* TAB 2: REGISTER FORM */}
            {/* ================================================= */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {regError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-shake">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccessMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>{regSuccessMsg}</span>
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Nome Completo:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-reg-name"
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo"
                      className="w-full bg-[#121824] border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1">
                    Nome de Usuário / Login de Acesso:
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <span className="font-mono text-xs font-bold">@</span>
                    </div>
                    <input
                      id="input-reg-username"
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
                      placeholder="Ex: carloseduardo (único no sistema)"
                      className="w-full bg-[#121824] border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Email & WhatsApp in 2 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      E-mail:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="input-reg-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="usuario@email.com"
                        className="w-full bg-[#121824] border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      WhatsApp com DDD:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <input
                        id="input-reg-phone"
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="Ex: 11 99999-8888"
                        className="w-full bg-[#121824] border border-slate-700/80 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Passwords in 2 cols */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Password */}
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Criar Senha:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="input-reg-password"
                        type={regShowPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Mínimo 4 dígitos"
                        className="w-full bg-[#121824] border border-slate-700/80 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowPassword(!regShowPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {regShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-mono text-slate-300 mb-1">
                      Confirmar Senha:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        id="input-reg-confirm-password"
                        type={regShowPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                        className="w-full bg-[#121824] border border-slate-700/80 rounded-xl pl-10 pr-3.5 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Permission Notice */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                  <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Seu painel é exclusivo e pessoal. Todos os seus lançamentos financeiros, hábitos, projetos, agenda e automações são armazenados com isolamento total na sua conta.
                  </p>
                </div>

                {/* Submit Register */}
                <button
                  type="submit"
                  id="btn-register-submit"
                  disabled={isProcessing}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-bold text-sm tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>CRIANDO SEU PAINEL...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>CADASTRAR E ACESSAR MEU PAINEL</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
