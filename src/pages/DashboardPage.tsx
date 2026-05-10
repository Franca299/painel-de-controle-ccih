import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Microscope, AlertTriangle, TrendingUp, History, Filter,
  MoreVertical, ChevronRight, FileText
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import FileDropZone from '../components/FileDropZone';
import { parseFile } from '../services/fileParser';
import { uploadCultures, subscribeToCultures } from '../services/firestoreService';
import { CultureRecord } from '../types';

import { useAuth } from '../contexts/AuthContext';

// =====================================================================
// DashboardPage — Painel Principal
// =====================================================================

const EVOLUTION_DATA = [
  { name: 'JAN', value: 180 }, { name: 'FEV', value: 160 },
  { name: 'MAR', value: 170 }, { name: 'ABR', value: 130 },
  { name: 'MAI', value: 140 }, { name: 'JUN', value: 90 },
];
const RESISTANCE_CURVE = [
  { name: 'S1', uti: 40, geral: 60 }, { name: 'S2', uti: 45, geral: 55 },
  { name: 'S3', uti: 55, geral: 50 }, { name: 'S4', uti: 50, geral: 45 },
  { name: 'S5', uti: 65, geral: 40 }, { name: 'S6', uti: 60, geral: 35 },
  { name: 'S7', uti: 75, geral: 30 }, { name: 'S8', uti: 70, geral: 25 },
];
const PIE_COLORS = ['#3b82f6', '#06b6d4', '#ef4444'];

const SensitivityBadge = ({ cl }: { cl: string }) => {
  const configs: Record<string, string> = {
    R: 'bg-red-500/10 text-red-400 border-red-500/20',
    S: 'bg-green-500/10 text-green-400 border-green-500/20',
    I: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  const labels: Record<string, string> = { R: 'Resistente', S: 'Sensível', I: 'Intermediário' };
  const key = cl?.toUpperCase() || '';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${configs[key] || 'bg-slate-700 text-slate-300 border-slate-600'}`}>
      {labels[key] || cl || '—'}
    </span>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [allRecords, setAllRecords] = useState<CultureRecord[]>([]);
  const [firestoreActive, setFirestoreActive] = useState(false);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState('');
  const [filterSetor, setFilterSetor] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('');

  // Listener Firestore em tempo real
  useEffect(() => {
    const unsub = subscribeToCultures(
      (records) => {
        setAllRecords(records);
        setFirestoreActive(records.length > 0);
        setFirestoreLoading(false);
      },
      () => {
        setAllRecords([]);
        setFirestoreLoading(false);
      }
    );
    return unsub;
  }, []);

  // KPIs calculados dinamicamente
  const totalCulturas = new Set(allRecords.map(r => r.codigoOS)).size;
  const resistentes = allRecords.filter(r => r.classificacao?.toUpperCase() === 'R');
  const prevalenciaMDR = allRecords.length > 0
    ? Math.round((resistentes.length / allRecords.length) * 100 * 10) / 10
    : 0;
  const alertasCriticos = resistentes.filter(r => {
    const d = new Date(r.dataColeta?.split('/').reverse().join('-') || '');
    const diff = (Date.now() - d.getTime()) / 1000 / 3600;
    return diff <= 24;
  }).length;

  // Mapa de patógenos por unidade
  const unitMap = new Map<string, Map<string, number>>();
  for (const r of allRecords) {
    const unit = r.unidadeColeta || 'N/A';
    if (!unitMap.has(unit)) unitMap.set(unit, new Map());
    const agentRaw = r.resultado?.match(/(?:OBSE?\s*[-–]?\s*)([^\nN][^N]+?)(?:\s+Não|\s+Sim|$)/i)?.[1]?.trim() || 'Outro';
    const agentMap = unitMap.get(unit)!;
    agentMap.set(agentRaw, (agentMap.get(agentRaw) || 0) + 1);
  }
  const pathogenMap = Array.from(unitMap.entries()).map(([sector, agents]) => ({
    sector,
    total: Array.from(agents.values()).reduce((a, b) => a + b, 0),
    agents: Array.from(agents.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([name, count]) => ({ name, count })),
  }));

  // Perfil de multirresistência
  const resistanceProfileData = [
    { name: 'Resistentes (R)', value: resistentes.length, color: PIE_COLORS[2] },
    { name: 'Intermediários (I)', value: allRecords.filter(r => r.classificacao?.toUpperCase() === 'I').length, color: PIE_COLORS[1] },
    { name: 'Sensíveis (S)', value: allRecords.filter(r => r.classificacao?.toUpperCase() === 'S').length, color: PIE_COLORS[0] },
  ];

  // Handler de upload com diagnóstico detalhado
  const handleFileUpload = useCallback(async (file: File) => {
    setUploadStatus('📂 Analisando arquivo...');

    let records: CultureRecord[] = [];
    let total = 0;
    let diagnostics = '';

    try {
      const result = await parseFile(file, user?.email || 'anon');
      records   = result.records;
      total     = result.total;
      diagnostics = result.diagnostics;
    } catch (parseErr) {
      setUploadStatus(`❌ Erro ao ler arquivo: ${(parseErr as Error).message}`);
      return;
    }

    if (total === 0) {
      setUploadStatus(
        `⚠️ Nenhum registro válido encontrado. ` +
        `${diagnostics ? `Diagnóstico: ${diagnostics}` : 'Verifique se o arquivo tem as colunas corretas.'}`
      );
      return;
    }

    // Verificação de duplicidade total
    const existingIds = new Set(allRecords.map(r => r.id));
    const duplicateCount = records.filter(r => existingIds.has(r.id)).length;
    
    if (duplicateCount === records.length) {
      setUploadStatus('⚠️ Estes dados já estão no projeto. Arquivo ignorado por duplicidade.');
      return;
    }

    setUploadStatus(`✅ ${total} registros lidos. Salvando no Firestore...`);

    // Mostrar dados localmente de imediato (independente do Firestore)
    setAllRecords(prev => {
      const prevMap = new Map(prev.map(r => [r.id, r]));
      for (const r of records) prevMap.set(r.id, r); // upsert
      return Array.from(prevMap.values());
    });

    const { saved, skipped, errors, errorDetails } = await uploadCultures(records);

    if (errorDetails.some(e => e.includes('PERMISSÃO') || e.includes('permissions'))) {
      setUploadStatus(
        `✅ ${total} registros carregados localmente! ` +
        `⚠️ Firebase bloqueou o salvamento — acesse: ` +
        `console.firebase.google.com → Firestore → Regras → publique: allow read, write: if request.auth != null`
      );
    } else if (saved > 0) {
      setUploadStatus(`✅ ${saved} salvos no Firestore · ${skipped} já existiam · ${errors} erros`);
    } else {
      setUploadStatus(`⚠️ ${errors} erros ao salvar. Verifique o console (F12) para detalhes.`);
    }

    setTimeout(() => setUploadStatus(''), 15000);
  }, [user]);

  const recentRecords = allRecords.slice(0, 10);

  // Últimos 10 arquivos upados
  const lastUploadedFiles = useMemo(() => {
    const fileMap = new Map<string, { date: Date; name: string }>();
    for (const r of allRecords) {
      if (r.fileName && r.uploadedAt) {
        const d = new Date(r.uploadedAt);
        if (!fileMap.has(r.fileName) || d > fileMap.get(r.fileName)!.date) {
          fileMap.set(r.fileName, { date: d, name: r.fileName });
        }
      }
    }
    return Array.from(fileMap.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10);
  }, [allRecords]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <nav className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            <span>Controle de Infecção</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-blue-400">Painel Principal</span>
          </nav>
          <h2 className="text-4xl font-black text-white tracking-tight leading-tight">
            Painel de Controle Infectológico
          </h2>
          <p className="text-slate-400 mt-2 text-base">
            Monitoramento em tempo real e perfil de sensibilidade antimicrobiana.
            {firestoreActive && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-400 text-xs font-bold">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                Firestore Ativo
              </span>
            )}
          </p>
        </motion.div>

        <div className="flex flex-wrap items-end gap-4">
          {[
            { label: 'Período', opts: ['Últimos 30 dias', 'Últimos 90 dias', 'Ano corrente'], val: filterPeriodo, set: setFilterPeriodo },
            { label: 'Setor', opts: ['Todos os Setores', ...Array.from(new Set(allRecords.map(r => r.unidadeColeta).filter(Boolean)))], val: filterSetor, set: setFilterSetor },
          ].map(f => (
            <div key={f.label} className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">{f.label}</label>
              <select
                value={f.val}
                onChange={e => f.set(e.target.value)}
                className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-w-[180px] cursor-pointer transition-all"
              >
                {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <button className="flex items-center gap-2 h-[46px] px-6 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-xl text-sm font-bold hover:bg-blue-600/30 transition-all">
            <Filter className="w-4 h-4" /> Filtrar
          </button>
        </div>
      </section>

      {/* Drag & Drop Upload */}
      <FileDropZone onFileParsed={handleFileUpload} />
      {uploadStatus && (
        <div className={`-mt-4 px-6 py-3 rounded-xl text-sm font-medium text-center max-w-4xl mx-auto border ${
          uploadStatus.startsWith('❌') ? 'bg-red-500/10 border-red-500/20 text-red-300' :
          uploadStatus.startsWith('⚠️') ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' :
          'bg-green-500/10 border-green-500/20 text-green-300'
        }`}>
          {uploadStatus}
        </div>
      )}

      {/* Uploads Recentes */}
      {lastUploadedFiles.length > 0 && (
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wide flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            Últimos Arquivos Processados
          </h3>
          <div className="flex flex-wrap gap-3">
            {lastUploadedFiles.map(f => (
              <div key={f.name + f.date.toISOString()} className="flex items-center gap-3 bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs font-bold text-slate-300 max-w-[200px] truncate" title={f.name}>{f.name}</p>
                  <p className="text-[10px] text-slate-500">{f.date.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: Microscope, label: 'Total de Culturas (O.S.)', value: totalCulturas.toLocaleString('pt-BR'),
            trend: <TrendingUp className="w-3.5 h-3.5 text-blue-400" />, trendLabel: '+12% vs mês anterior',
            color: 'text-blue-400', bg: 'bg-blue-500/10',
          },
          {
            icon: AlertTriangle, label: 'Prevalência Resistentes', value: `${prevalenciaMDR}%`,
            trend: <TrendingUp className="w-3.5 h-3.5 text-red-400" />, trendLabel: 'Alerta crítico',
            color: 'text-amber-400', bg: 'bg-amber-500/10',
          },
          {
            icon: AlertTriangle, label: 'Alertas nas Últimas 24h', value: String(alertasCriticos).padStart(2, '0'),
            trend: <History className="w-3.5 h-3.5 text-slate-400" />, trendLabel: 'Registros resistentes recentes',
            color: 'text-red-400', bg: 'bg-red-500/10',
          },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex items-center gap-5 hover:border-slate-600 transition-all"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${kpi.bg}`}>
              <kpi.icon className={`w-7 h-7 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-3xl font-black text-white mt-0.5">{kpi.value}</h3>
              <p className="flex items-center gap-1 mt-1">
                {kpi.trend}
                <span className="text-[11px] font-semibold text-slate-400">{kpi.trendLabel}</span>
              </p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Charts Row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Incidência de Infecções</h3>
              <p className="text-xs text-slate-500">Culturas positivas — Mensal</p>
            </div>
            <button className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-700 transition-all">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={EVOLUTION_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} dy={10} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-white">Curva de Resistência</h3>
              <p className="text-xs text-slate-500">Tendências de Resistência</p>
            </div>
            <div className="flex gap-4">
              {[{ color: '#06b6d4', label: 'UTI' }, { color: '#f97316', label: 'Geral' }].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <span className="w-3 h-3 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={RESISTANCE_CURVE}>
                <defs>
                  <linearGradient id="gUti" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGeral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} dy={10} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
                <Area type="monotone" dataKey="uti" stroke="#06b6d4" fill="url(#gUti)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="geral" stroke="#f97316" fill="url(#gGeral)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </section>

      {/* Charts Row 2 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mapa de Patógenos */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8"
        >
          <h3 className="text-lg font-bold text-white mb-8">Mapa de Patógenos por Unidade</h3>
          <div className="space-y-6">
            {pathogenMap.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">Importe um arquivo Excel para visualizar os dados por unidade.</p>
            )}
            {pathogenMap.slice(0, 4).map((item) => (
              <div key={item.sector} className="space-y-2.5">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-sm font-bold text-slate-200 tracking-wide">{item.sector}</span>
                    <div className="flex gap-3 text-[10px] font-bold text-slate-500 mt-0.5">
                      {item.agents.map(a => <span key={a.name}>• {a.name}</span>)}
                    </div>
                  </div>
                  <span className="text-sm font-black text-blue-400">
                    {item.total} <span className="font-medium text-xs text-slate-500">Culturas</span>
                  </span>
                </div>
                <div className="flex h-7 rounded-lg overflow-hidden bg-slate-700/30">
                  {item.agents.map((a, i) => {
                    const pct = Math.round((a.count / item.total) * 100);
                    const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-orange-500', 'bg-purple-500'];
                    return (
                      <motion.div
                        key={a.name}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        viewport={{ once: true }}
                        className={`${colors[i % colors.length]} relative group cursor-pointer`}
                        title={`${a.name}: ${a.count}`}
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Análise de Multirresistência */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 flex flex-col"
        >
          <h3 className="text-lg font-bold text-white mb-8">Análise de Sensibilidade</h3>
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-around gap-8">
            <div className="relative w-52 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={resistanceProfileData} cx="50%" cy="50%" innerRadius={65} outerRadius={90}
                    paddingAngle={6} dataKey="value" animationBegin={200} animationDuration={1200} stroke="none">
                    {resistanceProfileData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-black text-white">{prevalenciaMDR}%</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Resist.</span>
              </div>
            </div>
            <div className="space-y-4">
              {resistanceProfileData.map(item => (
                <div key={item.name} className="flex items-center gap-3 hover:translate-x-1 transition-transform cursor-pointer">
                  <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <div>
                    <p className="text-sm font-bold text-slate-200">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.value} registros</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Preview table — últimas 10 culturas */}
      <section className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-700/50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white">Culturas Recentes</h3>
            <p className="text-xs text-slate-500">Últimas {recentRecords.length} entradas registradas</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-700/50">
                {['Nome do Paciente', 'Unidade', 'Material', 'Agente / Resultado', 'Antimicrobiano', 'Classificação', 'Data Coleta'].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30 text-sm">
              {recentRecords.map((row, i) => (
                <tr key={row.id} className={`hover:bg-blue-500/[0.04] transition-colors ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                  <td className="px-6 py-4 font-semibold text-slate-200">{row.nomePaciente}</td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{row.unidadeColeta}</td>
                  <td className="px-6 py-4 text-slate-400">{row.material}</td>
                  <td className="px-6 py-4 text-slate-300 italic text-xs max-w-[200px] truncate" title={row.resultado}>{row.resultado}</td>
                  <td className="px-6 py-4 text-slate-300">{row.antimicrobiano}</td>
                  <td className="px-6 py-4"><SensitivityBadge cl={row.classificacao} /></td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{row.dataColeta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
