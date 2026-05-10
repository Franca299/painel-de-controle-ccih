import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Clock, ShieldOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// =====================================================================
// ProtectedRoute — Bloqueia acesso por status e role
// =====================================================================

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Verificando acesso...</p>
      </div>
    </div>
  );
}

function PendingScreen() {
  const { logout, user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
          <Clock className="w-10 h-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3">Aguardando Aprovação</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-2">
          Sua conta foi criada com sucesso!
        </p>
        <p className="text-slate-500 text-xs leading-relaxed mb-8 max-w-xs mx-auto">
          Um administrador precisa liberar o seu acesso antes de entrar no sistema. Isso pode levar algumas horas.
        </p>
        <div className="bg-amber-500/5 border border-amber-400/15 rounded-2xl px-5 py-4 mb-8 text-left">
          <p className="text-amber-300/80 text-xs font-semibold mb-1">Conta cadastrada</p>
          <p className="text-slate-400 text-xs font-mono">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="px-8 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

function BlockedScreen() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-400/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/10">
          <ShieldOff className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3">Acesso Bloqueado</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
          Sua conta foi suspensa pelo administrador. Entre em contato com a equipe de TI para mais informações.
        </p>
        <button
          onClick={logout}
          className="px-8 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

function ProfileErrorScreen() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-700/30 border border-slate-600/30 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-black text-white mb-3">Perfil não encontrado</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-4 max-w-xs mx-auto">
          Seu perfil de acesso não pôde ser carregado. Isso pode ocorrer se as regras do Firestore estiverem bloqueando a leitura.
        </p>
        <p className="text-slate-500 text-xs mb-8">
          Verifique as <strong className="text-slate-400">Security Rules</strong> no Firebase Console e tente novamente.
        </p>
        <button
          onClick={logout}
          className="px-8 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-700 transition-all"
        >
          Sair e tentar novamente
        </button>
      </div>
    </div>
  );
}

/** Rota protegida para usuários aprovados */
export default function ProtectedRoute() {
  const { user, userProfile, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;

  // Perfil ainda não foi criado/carregado — pode acontecer se as regras do
  // Firestore bloquearem a leitura do documento. Não travar — mostrar erro.
  if (!userProfile) return <ProfileErrorScreen />;

  if (userProfile.status === 'pendente') return <PendingScreen />;
  if (userProfile.status === 'bloqueado') return <BlockedScreen />;

  return <Outlet />;
}

/** Rota exclusiva para admins aprovados */
export function AdminRoute() {
  const { user, userProfile, loading } = useAuth();

  if (loading) return <Spinner />;
  if (!user || userProfile?.status !== 'aprovado') return <Navigate to="/login" replace />;
  if (userProfile.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
