import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, LayoutDashboard, Eye, History, MapPin,
  LogOut, Menu, X, ChevronRight, Microscope, Users,
} from 'lucide-react';
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VigilanciaPage from './pages/VigilanciaPage';
import AnaliseHistoricaPage from './pages/AnaliseHistoricaPage';
import MonitoramentoAreaPage from './pages/MonitoramentoAreaPage';
import AdminPage from './pages/AdminPage';

// =====================================================================
// App Shell — Painel de Controle Infectológico
// =====================================================================

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
  { to: '/vigilancia', icon: Eye, label: 'Vigilância de Culturas', id: 'nav-vigilancia' },
  { to: '/analise', icon: History, label: 'Análise Histórica', id: 'nav-analise' },
  { to: '/areas', icon: MapPin, label: 'Monitoramento por Área', id: 'nav-areas' },
];

function AppShell() {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isAdmin = userProfile?.role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative">
      {/* Sidebar Overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed top-0 left-0 h-full w-72 z-40 flex flex-col
          bg-slate-900 border-r border-white/[0.06]
          transition-transform duration-300 lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="px-6 py-7 flex items-center justify-between border-b border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-tight leading-none">Controle CCIH</p>
              <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold mt-0.5">Painel Infectológico</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] px-3 mb-4">MENU PRINCIPAL</p>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              id={item.id}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 text-blue-400/60" />}
                </>
              )}
            </NavLink>
          ))}

          {/* Seção Admin — visível apenas para admins */}
          {isAdmin && (
            <>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] px-3 mb-4 mt-6">ADMINISTRAÇÃO</p>
              <NavLink
                id="nav-admin"
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Users className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="flex-1">Gerenciar Usuários</span>
                    {isActive && <ChevronRight className="w-4 h-4 text-purple-400/60" />}
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-4 pb-6 pt-4 border-t border-white/[0.05] space-y-2">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3.5 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0">
                <Microscope className="w-4 h-4 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-slate-200 text-xs font-bold truncate">{userProfile?.nome || user?.email?.split('@')[0] || 'Usuário'}</p>
                <p className="text-slate-500 text-[10px] truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          <button
            id="btn-logout"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sair do Sistema
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar (mobile) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 bg-slate-900/90 border-b border-white/[0.06] backdrop-blur sticky top-0 z-20">
          <button
            id="btn-menu"
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-slate-200 p-2 rounded-xl hover:bg-slate-800 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span className="text-white font-black text-sm">Controle CCIH</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Scroll area */}
        <main className="flex-1 overflow-y-auto">
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/[0.04] blur-[120px] rounded-full" />
          </div>
          <div className="relative z-10 p-6 xl:p-10 max-w-[1600px] mx-auto">
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/vigilancia" element={<VigilanciaPage />} />
              <Route path="/analise" element={<AnaliseHistoricaPage />} />
              <Route path="/areas" element={<MonitoramentoAreaPage />} />
              {/* Rota admin — protegida internamente pelo AdminRoute */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppShell />} />
      </Route>
    </Routes>
  );
}
