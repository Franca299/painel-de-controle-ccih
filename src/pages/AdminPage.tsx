import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, CheckCircle2, Clock, ShieldOff, Crown, Shield,
  UserCheck, UserX, RefreshCw, Search,
} from 'lucide-react';
import { subscribeToAllUsers, updateUserStatus, updateUserRole } from '../services/userService';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../types';

// =====================================================================
// AdminPage — Gerenciamento de Acesso de Usuários
// =====================================================================

const STATUS_CONFIG = {
  aprovado: {
    label: 'Aprovado',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  pendente: {
    label: 'Pendente',
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
  },
  bloqueado: {
    label: 'Bloqueado',
    icon: ShieldOff,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    dot: 'bg-red-400',
  },
} as const;

function StatusBadge({ status }: { status: UserProfile['status'] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.border} border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: UserProfile['role'] }) {
  return role === 'admin' ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400">
      <Crown className="w-3 h-3" />
      Admin
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-700/60 border border-slate-600/40 text-slate-400">
      <Shield className="w-3 h-3" />
      Usuário
    </span>
  );
}

function InitialsAvatar({ nome, status }: { nome: string; status: UserProfile['status'] }) {
  const initials = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const colors = {
    aprovado: 'from-emerald-500 to-teal-600',
    pendente: 'from-amber-500 to-orange-600',
    bloqueado: 'from-red-500 to-rose-600',
  };

  return (
    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${colors[status]} flex items-center justify-center flex-shrink-0 shadow-lg`}>
      <span className="text-white text-sm font-black">{initials || '?'}</span>
    </div>
  );
}

export default function AdminPage() {
  const { userProfile: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleStatus = async (uid: string, status: UserProfile['status']) => {
    setActionLoading(`${uid}-${status}`);
    try { await updateUserStatus(uid, status); } finally { setActionLoading(null); }
  };

  const handleRole = async (uid: string, role: UserProfile['role']) => {
    setActionLoading(`${uid}-role`);
    try { await updateUserRole(uid, role); } finally { setActionLoading(null); }
  };

  const filtered = users.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: users.length,
    aprovado: users.filter(u => u.status === 'aprovado').length,
    pendente: users.filter(u => u.status === 'pendente').length,
    bloqueado: users.filter(u => u.status === 'bloqueado').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Gerenciamento de Acesso</h1>
        <p className="text-slate-400 text-sm mt-1">Aprove, bloqueie e gerencie os acessos ao sistema.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Aprovados', value: stats.aprovado, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Pendentes', value: stats.pendente, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Bloqueados', value: stats.bloqueado, icon: ShieldOff, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`rounded-2xl border p-5 ${item.bg}`}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-slate-400 text-sm font-semibold">{item.label}</span>
              </div>
              <p className={`text-4xl font-black mt-3 ${item.color}`}>{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filtro */}
      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-800/60 border border-white/8 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      {/* Lista de usuários */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(u => {
              const isSelf = u.uid === currentUser?.uid;
              return (
                <motion.div
                  key={u.uid}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5"
                >
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <InitialsAvatar nome={u.nome} status={u.status} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-bold text-sm truncate">{u.nome}</p>
                        {isSelf && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">
                            Você
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs truncate">{u.email}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <StatusBadge status={u.status} />
                        <RoleBadge role={u.role} />
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  {!isSelf && (
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      {u.status !== 'aprovado' && (
                        <button
                          onClick={() => handleStatus(u.uid, 'aprovado')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                        >
                          {actionLoading === `${u.uid}-aprovado`
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <UserCheck className="w-3 h-3" />}
                          Aprovar
                        </button>
                      )}
                      {u.status !== 'pendente' && (
                        <button
                          onClick={() => handleStatus(u.uid, 'pendente')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition-all disabled:opacity-50"
                        >
                          {actionLoading === `${u.uid}-pendente`
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <Clock className="w-3 h-3" />}
                          Pendente
                        </button>
                      )}
                      {u.status !== 'bloqueado' && (
                        <button
                          onClick={() => handleStatus(u.uid, 'bloqueado')}
                          disabled={!!actionLoading}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                        >
                          {actionLoading === `${u.uid}-bloqueado`
                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                            : <UserX className="w-3 h-3" />}
                          Bloquear
                        </button>
                      )}
                      <button
                        onClick={() => handleRole(u.uid, u.role === 'admin' ? 'user' : 'admin')}
                        disabled={!!actionLoading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-500/20 transition-all disabled:opacity-50"
                      >
                        {actionLoading === `${u.uid}-role`
                          ? <RefreshCw className="w-3 h-3 animate-spin" />
                          : <Crown className="w-3 h-3" />}
                        {u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
