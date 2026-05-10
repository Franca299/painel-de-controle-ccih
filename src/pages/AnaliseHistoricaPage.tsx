import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Calendar, FlaskConical } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import SearchableSelect from '../components/SearchableSelect';
import { subscribeToCultures } from '../services/firestoreService';
import { CultureRecord } from '../types';
import { extractAgentFromResult } from '../services/fileParser';
import { normalizeClassification } from '../components/SensitivityHeatmap2D';
import SensitivityHeatmap2D, { HeatmapRecord } from '../components/SensitivityHeatmap2D';

// =====================================================================
// AnaliseHistoricaPage — Análise de Sensibilidade com Heatmap
// =====================================================================

const parseDateBR = (s: string): Date | null => {
  if (!s) return null;
  const parts = s.includes('/') ? s.split('/').reverse() : s.split('-');
  const d = new Date(parts.join('-'));
  return isNaN(d.getTime()) ? null : d;
};

const PctBar = ({ s, i, r }: { s: number; i: number; r: number }) => (
  <div className="flex h-2.5 rounded-full overflow-hidden w-full mt-2 gap-px bg-slate-700">
    {s > 0 && <div className="bg-green-500 transition-all duration-1000" style={{ width: `${s}%` }} title={`S: ${s}%`} />}
    {i > 0 && <div className="bg-amber-500 transition-all duration-1000" style={{ width: `${i}%` }} title={`I: ${i}%`} />}
    {r > 0 && <div className="bg-red-500 transition-all duration-1000" style={{ width: `${r}%` }} title={`R: ${r}%`} />}
  </div>
);

interface AgentProfile {
  antimicrobiano: string;
  total: number;
  s: number; i: number; r: number;
  pctS: number; pctI: number; pctR: number;
}

export default function AnaliseHistoricaPage() {
  const [allRecords, setAllRecords] = useState<CultureRecord[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    return subscribeToCultures(records => setAllRecords(records));
  }, []);

  // Filtrar por período
  const filteredRecords = useMemo(() => {
    let records = allRecords;
    if (startDate) {
      const s = new Date(`${startDate}T00:00:00`);
      records = records.filter(r => {
        const d = parseDateBR(r.dataColeta);
        return d && d >= s;
      });
    }
    if (endDate) {
      const e = new Date(`${endDate}T23:59:59`);
      records = records.filter(r => {
        const d = parseDateBR(r.dataColeta);
        return d && d <= e;
      });
    }
    return records;
  }, [allRecords, startDate, endDate]);

  // Agentes únicos
  const uniqueAgents = useMemo(() => {
    const agents = new Set<string>();
    for (const r of filteredRecords) {
      const a = extractAgentFromResult(r.resultado);
      if (a && a.length > 2 && a !== 'Desconhecido') agents.add(a);
    }
    return Array.from(agents).sort();
  }, [filteredRecords]);

  // Perfil de sensibilidade do agente selecionado
  const agentProfile = useMemo((): AgentProfile[] => {
    if (!selectedAgent) return [];
    const kw = selectedAgent.toLowerCase();
    const agentRecs = filteredRecords.filter(r =>
      (r.resultado || '').toLowerCase().includes(kw) ||
      extractAgentFromResult(r.resultado).toLowerCase().includes(kw)
    );

    const byAbx = new Map<string, { s: number; i: number; r: number }>();
    for (const rec of agentRecs) {
      if (!rec.antimicrobiano) continue;
      if (!byAbx.has(rec.antimicrobiano)) byAbx.set(rec.antimicrobiano, { s: 0, i: 0, r: 0 });
      const c = byAbx.get(rec.antimicrobiano)!;
      const cl = normalizeClassification(rec.classificacao);
      if (cl === 'S') c.s++;
      else if (cl === 'I') c.i++;
      else if (cl === 'R') c.r++;
    }

    return Array.from(byAbx.entries())
      .map(([antimicrobiano, c]) => {
        const total = c.s + c.i + c.r;
        return {
          antimicrobiano, total, ...c,
          pctS: total > 0 ? Math.round((c.s / total) * 100) : 0,
          pctI: total > 0 ? Math.round((c.i / total) * 100) : 0,
          pctR: total > 0 ? Math.round((c.r / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.pctR - a.pctR);
  }, [filteredRecords, selectedAgent]);

  // Histórico temporal do agente selecionado
  const { agentHistoryData, topAtbs } = useMemo(() => {
    if (!selectedAgent) return { agentHistoryData: [], topAtbs: [] };
    const kw = selectedAgent.toLowerCase();
    const agentRecs = filteredRecords.filter(r =>
      (r.resultado || '').toLowerCase().includes(kw) ||
      extractAgentFromResult(r.resultado).toLowerCase().includes(kw)
    );

    const atbCounts = new Map<string, number>();
    for (const r of agentRecs) {
      if (r.antimicrobiano) {
        atbCounts.set(r.antimicrobiano, (atbCounts.get(r.antimicrobiano) || 0) + 1);
      }
    }
    const topAtbs = Array.from(atbCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]);

    if (topAtbs.length === 0) return { agentHistoryData: [], topAtbs: [] };

    const byMonth = new Map<string, { monthDate: Date; [atb: string]: any }>();

    for (const rec of agentRecs) {
      if (!rec.dataColeta || !rec.antimicrobiano) continue;
      if (!topAtbs.includes(rec.antimicrobiano)) continue;

      const d = parseDateBR(rec.dataColeta);
      if (!d) continue;

      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth.has(monthKey)) {
        const initObj: any = { monthDate: new Date(d.getFullYear(), d.getMonth(), 1) };
        for (const atb of topAtbs) {
          initObj[atb] = { s: 0, total: 0 };
        }
        byMonth.set(monthKey, initObj);
      }

      const m = byMonth.get(monthKey)!;
      m[rec.antimicrobiano].total++;
      if (normalizeClassification(rec.classificacao) === 'S') {
        m[rec.antimicrobiano].s++;
      }
    }

    const agentHistoryData = Array.from(byMonth.values())
      .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime())
      .map(item => {
        const res: any = { name: item.monthDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. de ', '/') };
        for (const atb of topAtbs) {
          res[atb] = item[atb].total > 0 ? Math.round((item[atb].s / item[atb].total) * 100) : null;
        }
        return res;
      });

    return { agentHistoryData, topAtbs };
  }, [filteredRecords, selectedAgent]);

  // Records para o heatmap 2D (todos os agentes × todos os ATBs)
  const heatmapRecords = useMemo((): HeatmapRecord[] =>
    filteredRecords
      .filter(r => r.antimicrobiano && r.classificacao)
      .map(r => ({
        agent: extractAgentFromResult(r.resultado),
        antibiotic: r.antimicrobiano,
        classification: r.classificacao,
      })),
    [filteredRecords]
  );

  // Estatísticas globais do período
  const globalStats = useMemo(() => {
    const total = filteredRecords.length;
    if (total === 0) return null;
    const s = filteredRecords.filter(r => normalizeClassification(r.classificacao) === 'S').length;
    const i = filteredRecords.filter(r => normalizeClassification(r.classificacao) === 'I').length;
    const r = filteredRecords.filter(r => normalizeClassification(r.classificacao) === 'R').length;
    return { total, s, i, r, pctS: Math.round((s / total) * 100), pctR: Math.round((r / total) * 100) };
  }, [filteredRecords]);

  const HEAT_COLORS = {
    R: { bg: '#7f1d1d', text: '#fca5a5' },
    I: { bg: '#78350f', text: '#fcd34d' },
    S: { bg: '#14532d', text: '#86efac' },
    '': { bg: '#1e293b', text: '#475569' },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <nav className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          <span>Controle de Infecção</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-blue-400">Análise Histórica</span>
        </nav>
        <h2 className="text-4xl font-black text-white tracking-tight">Análise Histórica de Sensibilidade</h2>
        <p className="text-slate-400 mt-2">Perfil de S/I/R por antimicrobiano, com heatmap multidimensional.</p>
      </section>

      {/* Filtro de período */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Período de análise:</span>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500"
          />
          <span className="text-slate-500 text-xs">até</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-blue-500"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-xs text-slate-500 hover:text-red-400 underline decoration-slate-700 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
        {globalStats && (
          <div className="sm:ml-auto flex items-center gap-5">
            {[
              { label: 'Total', value: globalStats.total, color: 'text-slate-300' },
              { label: 'Sensíveis', value: `${globalStats.pctS}%`, color: 'text-green-400' },
              { label: 'Resistentes', value: `${globalStats.pctR}%`, color: 'text-red-400' },
            ].map(st => (
              <div key={st.label} className="text-center">
                <p className={`text-lg font-black ${st.color}`}>{st.value}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{st.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Heatmap 2D global — todos os agentes × ATBs */}
      {heatmapRecords.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-700/50 flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-lg font-bold text-white">Heatmap Global — Agentes × Antimicrobianos</h3>
              <p className="text-xs text-slate-500">
                Todos os isolados do período · Célula = classificação predominante (% e total de testes)
              </p>
            </div>
          </div>
          <div className="p-8">
            <SensitivityHeatmap2D records={heatmapRecords} maxAgents={15} maxAntibiotics={20} />
          </div>
        </div>
      )}

      {/* Seleção de Agente específico */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
        <h3 className="text-base font-bold text-slate-300 mb-6">Análise Detalhada por Agente</h3>
        <div className="flex flex-col sm:flex-row gap-6 items-end">
          <div className="flex-1">
            <SearchableSelect
              id="select-agente"
              label="Agente Patogênico"
              options={uniqueAgents}
              value={selectedAgent}
              onChange={setSelectedAgent}
              placeholder={uniqueAgents.length > 0 ? 'Selecione ou pesquise um agente...' : 'Importe dados para ver agentes'}
            />
          </div>
          {selectedAgent && agentProfile.length > 0 && (
            <div className="flex items-center gap-6 bg-slate-700/40 border border-slate-600/40 rounded-xl px-6 py-3.5">
              {[
                { label: 'Sensíveis', value: agentProfile.reduce((a, p) => a + p.s, 0), color: 'text-green-400' },
                { label: 'Interm.',   value: agentProfile.reduce((a, p) => a + p.i, 0), color: 'text-amber-400' },
                { label: 'Resistentes', value: agentProfile.reduce((a, p) => a + p.r, 0), color: 'text-red-400' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Gráfico Histórico do Agente */}
        {selectedAgent && agentHistoryData.length > 0 && (
          <div className="mt-8 pt-8 border-t border-slate-700/50">
            <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wide flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Evolução Temporal de Sensibilidade
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={agentHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ fontSize: 12, fontWeight: 600 }}
                    labelStyle={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  {topAtbs.map((atb, idx) => {
                    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                    const color = COLORS[idx % COLORS.length];
                    return (
                      <Line 
                        key={atb} 
                        type="monotone" 
                        dataKey={atb} 
                        name={`${atb} (% Sensível)`}
                        stroke={color} 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: color, strokeWidth: 0 }} 
                        activeDot={{ r: 6 }} 
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Cards de antibiograma por agente */}
      {selectedAgent && agentProfile.length > 0 ? (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-700/50">
            <h3 className="text-lg font-bold text-white">
              Heatmap de Sensibilidade — <span className="text-blue-400 italic">{selectedAgent}</span>
            </h3>
            <div className="flex items-center gap-4 mt-2">
              {['S = Sensível', 'I = Intermediário', 'R = Resistente'].map((l, i) => (
                <span key={i} className={`text-[10px] font-black uppercase tracking-wide ${
                  i === 0 ? 'text-green-400' : i === 1 ? 'text-amber-400' : 'text-red-400'
                }`}>{l}</span>
              ))}
            </div>
          </div>

          {/* Cards de antibióticos */}
          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {agentProfile.map((profile, idx) => {
              const dominant = normalizeClassification(
                profile.pctR >= 50 ? 'R' : profile.pctS >= 60 ? 'S' : 'I'
              ) || (profile.pctR >= 50 ? 'R' : profile.pctS >= 60 ? 'S' : 'I');
              const bgColor = dominant === 'R' ? '#7f1d1d' : dominant === 'S' ? '#14532d' : '#78350f';
              return (
                <motion.div
                  key={profile.antimicrobiano}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-xl border border-slate-700/60 overflow-hidden"
                  style={{ background: `${bgColor}25` }}
                >
                  <div className="px-4 py-3 border-b border-slate-700/40">
                    <p className="font-bold text-sm text-slate-100 truncate">{profile.antimicrobiano}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{profile.total} testes</p>
                  </div>
                  <div className="px-4 py-3 space-y-1.5">
                    {[
                      { label: 'S', value: profile.pctS, count: profile.s, color: 'text-green-400', bar: 'bg-green-500' },
                      { label: 'I', value: profile.pctI, count: profile.i, color: 'text-amber-400', bar: 'bg-amber-500' },
                      { label: 'R', value: profile.pctR, count: profile.r, color: 'text-red-400',   bar: 'bg-red-500'   },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center justify-between text-xs">
                        <span className={`font-black ${stat.color} w-4`}>{stat.label}</span>
                        <div className="flex-1 mx-2 bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-1000 ${stat.bar}`} style={{ width: `${stat.value}%` }} />
                        </div>
                        <span className="text-slate-400 font-mono text-[11px] w-10 text-right">{stat.value}%</span>
                      </div>
                    ))}
                    <PctBar s={profile.pctS} i={profile.pctI} r={profile.pctR} />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Tabela detalhada */}
          <div className="border-t border-slate-700/50">
            <div className="px-8 py-5 border-b border-slate-700/40">
              <h3 className="text-base font-bold text-white">Tabela Detalhada de Sensibilidade</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700/50">
                    {['Antimicrobiano', 'Total Testes', '% Sensível', '% Intermediário', '% Resistente'].map(h => (
                      <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30 text-sm">
                  {agentProfile.map(profile => (
                    <tr key={profile.antimicrobiano} className="hover:bg-blue-500/[0.04] transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-200">{profile.antimicrobiano}</td>
                      <td className="px-6 py-4 text-slate-400">{profile.total}</td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-bold">{profile.pctS}%</span>
                        <span className="text-slate-600 text-xs ml-1">({profile.s})</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-amber-400 font-bold">{profile.pctI}%</span>
                        <span className="text-slate-600 text-xs ml-1">({profile.i})</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-400 font-bold">{profile.pctR}%</span>
                        <span className="text-slate-600 text-xs ml-1">({profile.r})</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : selectedAgent ? (
        <div className="bg-slate-800/30 border border-dashed border-slate-700/40 rounded-2xl p-16 text-center">
          <p className="text-slate-500 text-lg font-bold">Nenhum dado de antibiograma para este agente no período.</p>
        </div>
      ) : null}
    </div>
  );
}
