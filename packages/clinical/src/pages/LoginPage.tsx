import React, { useState } from 'react';
import { UserAccount, ClinicConfig } from '@optotipo/shared';
import { 
  Lock, 
  Mail, 
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';
import { authService } from '../services/authService';
import { OptomedBrandLogo } from '../components/SyncStatusBadge';

interface LoginPageProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState<string>('dr.meirelles');
  const [password, setPassword] = useState<string>('123456');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);


  // Campos de Cadastro de Nova Clínica
  const [regClinicName, setRegClinicName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regOwnerEmail, setRegOwnerEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regCountry, setRegCountry] = useState<'Brasil' | 'Paraguai'>('Brasil');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      const res = authService.login(identifier, password);
      setIsLoading(false);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    }, 300);
  };

  const handleRegisterClinic = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = authService.registerNewClinic({
      clinicName: regClinicName,
      ownerName: regOwnerName,
      ownerEmail: regOwnerEmail,
      phone: regPhone,
      city: regCity,
      country: regCountry,
      username: regUsername,
      password: regPassword,
      plan: 'trial'
    });

    if (res.success && res.user) {
      setSuccessMessage('Clínica cadastrada com sucesso! Iniciando seu período de teste grátis...');
      setTimeout(() => {
        onLoginSuccess(res.user!);
      }, 800);
    } else {
      setErrorMessage(res.error || 'Erro ao realizar cadastro.');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Luz ambiente de fundo - Azul Oftalmológico e Verde-Água / Teal */}
      <div 
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 bg-blue-600 transition-all duration-700" 
      />
      <div 
        className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-15 bg-teal-500 transition-all duration-700"
      />

      <div className="max-w-md w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Cabeçalho da Marca OPTOMED Oficial */}
        <div className="text-center flex flex-col items-center space-y-3">
          <OptomedBrandLogo size="lg" showText={true} />
          
          <div className="pt-1">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {mode === 'login' ? 'Acesso ao Consultório' : 'Cadastre sua Clínica'}
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {mode === 'login' 
                ? 'Entre com seu e-mail profissional ou usuário cadastrado' 
                : 'Experimente 14 dias grátis de acesso completo ao sistema'}
            </p>
          </div>
        </div>

        {/* Abas: Entrar ou Cadastrar Nova Clínica */}
        <div className="flex bg-slate-950/90 p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMessage(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              mode === 'login' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMessage(null); }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mode === 'register' 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Criar Nova Clínica</span>
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 font-medium text-center animate-shake">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 font-medium text-center">
            {successMessage}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Campo de E-mail ou Nome de Usuário */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 tracking-wide">
                E-MAIL OU USUÁRIO
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ex: meirelles@ivs.med.br ou dr.meirelles"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition-all"
                />
              </div>
            </div>

            {/* Campo de Senha */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 tracking-wide">
                  SENHA
                </label>
                <span className="text-[11px] text-teal-400 hover:underline cursor-pointer">
                  Esqueceu a senha?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-teal-400" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>


            {/* Botão de Entrada */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Conexão criptografada de alta segurança • Ponta a Ponta</span>
            </div>
          </form>
        ) : (
          /* FORMULÁRIO DE CADASTRO AUTÔNOMO (SAAS ONBOARDING) */
          <form onSubmit={handleRegisterClinic} className="space-y-3.5 text-xs">
            <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-2xl flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-[11px] text-slate-300">
                Ganhe <b>14 dias de acesso grátis</b>. Sem necessidade de cartão de crédito no cadastro.
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">NOME DA CLÍNICA / CONSULTÓRIO *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: Instituto da Visão e Saúde"
                  value={regClinicName}
                  onChange={(e) => setRegClinicName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">SEU NOME COMPLETO *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Dr. Fernando Souza"
                    value={regOwnerName}
                    onChange={(e) => setRegOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">WHATSAPP / TELEFONE *</label>
                  <input 
                    type="tel"
                    required
                    placeholder="+55 (45) 99999-0000"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">E-MAIL PROFISSIONAL *</label>
                <input 
                  type="email"
                  required
                  placeholder="contato@clinicavisao.com"
                  value={regOwnerEmail}
                  onChange={(e) => setRegOwnerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">CIDADE</label>
                  <input 
                    type="text"
                    placeholder="Foz do Iguaçu"
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">PAÍS</label>
                  <select
                    value={regCountry}
                    onChange={(e) => setRegCountry(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Brasil">Brasil 🇧🇷</option>
                    <option value="Paraguai">Paraguay 🇵🇾</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">USUÁRIO DE ACESSO *</label>
                  <input 
                    type="text"
                    required
                    placeholder="dr.fernando"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">SENHA *</label>
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              <span>Criar Minha Clínica & Começar Teste Grátis</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

