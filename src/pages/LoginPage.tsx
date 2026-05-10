import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle,
  Microscope, User, CheckCircle2, Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// =====================================================================
// LoginPage — Painel de Controle Infectológico
// =====================================================================

export default function LoginPage() {
  const { login, register, authError, clearError } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (mode === 'register') {
      if (!nome.trim()) { setLocalError('Informe seu nome completo.'); return; }
      if (password !== confirmPassword) { setLocalError('As senhas não coincidem.'); return; }
    }
    if (password.length < 6) { setLocalError('A senha deve ter ao menos 6 caracteres.'); return; }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/dashboard');
      } else {
        await register(email, password, nome);
        setRegistered(true); // Não navega — mostra tela de aguardo
      }
    } catch {
      // Error handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  const errorMessage = localError || authError;

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    clearError();
    setLocalError('');
    setRegistered(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-950 overflow-hidden relative">
      {/* Background decorativo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* Painel esquerdo — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-[520px] flex-shrink-0 p-14 relative z-10 border-r border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/40">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-tight">Controle CCIH</p>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">Sistema Hospitalar</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center">
              <Microscope className="w-6 h-6 text-blue-400" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
          </div>
          <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tight">
            Painel de<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              Controle
            </span><br />
            Infectológico
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
            Monitoramento epidemiológico em tempo real e análise de sensibilidade antimicrobiana integrada.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '24/7', label: 'Monitoramento' },
              { value: 'MDR', label: 'Detecção' },
              { value: '100%', label: 'Auditado' },
            ].map(item => (
              <div key={item.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-blue-400">{item.value}</p>
                <p className="text-slate-500 text-[11px] font-semibold mt-1 uppercase tracking-wide">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">© 2026 CCIH — Uso exclusivamente hospitalar</p>
      </div>

      {/* Painel direito — Formulário */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/8 rounded-3xl p-10 shadow-2xl shadow-black/50">
            {/* Ícone mobile */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-sm">Controle CCIH</span>
            </div>

            {/* Toggle Login/Cadastro */}
            <div className="flex bg-slate-800/60 border border-white/5 rounded-xl p-1 mb-8">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                    mode === m
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'login' ? 'Entrar' : 'Cadastrar'}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Tela de sucesso do cadastro */}
              {registered ? (
                <motion.div
                  key="registered"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-5">
                    <Clock className="w-8 h-8 text-amber-400" />
                  </div>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-bold">Conta criada com sucesso!</span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-3">Aguardando Aprovação</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6">
                    Um administrador precisa liberar seu acesso. Você receberá permissão em breve.
                  </p>
                  <button
                    onClick={() => switchMode('login')}
                    className="text-blue-400 text-sm font-bold hover:text-blue-300 transition-colors"
                  >
                    Voltar ao Login
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'login' ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-2xl font-black text-white mb-1">
                    {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
                  </h2>
                  <p className="text-slate-400 text-sm mb-8">
                    {mode === 'login'
                      ? 'Entre com suas credenciais hospitalares para acessar o painel.'
                      : 'Preencha os dados. Seu acesso será aprovado pelo administrador.'}
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Nome (apenas no cadastro) */}
                    <AnimatePresence>
                      {mode === 'register' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5 overflow-hidden"
                        >
                          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Nome Completo</label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              id="nome"
                              type="text"
                              value={nome}
                              onChange={(e) => setNome(e.target.value)}
                              placeholder="Dr. João da Silva"
                              className="w-full bg-slate-800/60 border border-white/8 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* E-mail */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">E-mail Institucional</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="medico@hospital.com.br"
                          required
                          className="w-full bg-slate-800/60 border border-white/8 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                      </div>
                    </div>

                    {/* Senha */}
                    <div className="space-y-1.5">
                      <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          id="password"
                          type={showPass ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full bg-slate-800/60 border border-white/8 rounded-xl pl-11 pr-12 py-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirmar Senha */}
                    <AnimatePresence>
                      {mode === 'register' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-1.5 overflow-hidden"
                        >
                          <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">Confirmar Senha</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type={showPass ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-slate-800/60 border border-white/8 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Erro */}
                    <AnimatePresence>
                      {errorMessage && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
                        >
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <p className="text-red-300 text-sm">{errorMessage}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Botão */}
                    <button
                      id="btn-submit-auth"
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 mt-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Aguarde...
                        </>
                      ) : (
                        mode === 'login' ? 'Acessar Painel' : 'Criar Conta'
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-slate-600 text-xs mt-6">
            Acesso restrito a profissionais autorizados · CCIH
          </p>
        </motion.div>
      </div>
    </div>
  );
}
