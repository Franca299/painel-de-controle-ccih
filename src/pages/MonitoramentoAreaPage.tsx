import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Activity, AlertTriangle, Building2, FlaskConical, ChevronDown, Calendar } from 'lucide-react';
import { subscribeToCultures } from '../services/firestoreService';
import { CultureRecord } from '../types';
import { extractAgentFromResult } from '../services/fileParser';
import SensitivityHeatmap2D, { normalizeClassification, HeatmapRecord } from '../components/SensitivityHeatmap2D';
import CultureDetailModal from '../components/CultureDetailModal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// =====================================================================
// MonitoramentoAreaPage — Monitoramento por Área/Unidade
// =====================================================================

export default function MonitoramentoAreaPage() {
  const [allRecords, setAllRecords] = useState<CultureRecord[]>([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [modalOS, setModalOS] = useState<{ os: string; nome: string } | null>(null);
  const [hoveredRecord, setHoveredRecord] = useState<CultureRecord | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [period, setPeriod] = useState<'all' | '30d' | '90d' | '1y'>('all');

  useEffect(() => {
    return subscribeToCultures(records => setAllRecords(records));
  }, []);

  // Unidades únicas
  const uniqueUnits = useMemo(
    () => [...new Set(allRecords.map(r => r.unidadeColeta).filter(Boolean))].sort(),
    [allRecords]
  );

  // Métricas por unidade
  const unitMetrics = useMemo(() => {
    return uniqueUnits.map(unit => {
      const records = allRecords.filter(r => r.unidadeColeta === unit);
      const os = new Set(records.map(r => r.codigoOS)).size;
      const resistant = records.filter(r => normalizeClassification(r.classificacao) === 'R').length;
      const total = records.length;
      const pctR = total > 0 ? Math.round((resistant / total) * 100) : 0;

      const agentCount = new Map<string, number>();
      for (const r of records) {
        const a = extractAgentFromResult(r.resultado);
        agentCount.set(a, (agentCount.get(a) || 0) + 1);
      }
      const topAgents = Array.from(agentCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

      return { unit, os, resistant, total, pctR, topAgents };
    });
  }, [allRecords, uniqueUnits]);

  // Dados para gráfico comparativo
  const chartData = useMemo(() => unitMetrics.map(m => ({
    name: m.unit.length > 12 ? m.unit.slice(0, 12) + '…' : m.unit,
    fullName: m.unit,
    culturas: m.os,
    resistentes: m.resistant,
    pctR: m.pctR,
  })), [unitMetrics]);

  const parseDateBR = (s: string): Date | null => {
    if (!s) return null;
    const datePart = s.split(' ')[0] || s.split('T')[0];
    if (!datePart) return null;

    let year, month, day;
    if (datePart.includes('/')) {
      const parts = datePart.split('/');
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
      }
    } else if (datePart.includes('-')) {
      const parts = datePart.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
        } else {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          year = parseInt(parts[2], 10);
        }
      }
    }

    if (year !== undefined && month !== undefined && day !== undefined) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  // Registros da unidade selecionada filtrados por período
  const unitRecords = useMemo(() => {
    if (!selectedUnit) return [];
    let records = allRecords.filter(r => r.unidadeColeta === selectedUnit);
    if (period !== 'all') {
      const now = Date.now();
      const ms = { '30d': 30, '90d': 90, '1y': 365 }[period] * 86400000;
      records = records.filter(r => {
        const d = parseDateBR(r.dataColeta);
        return d && (now - d.getTime()) <= ms;
      });
    }
    return records;
  }, [allRecords, selectedUnit, period]);

  // Materiais disponíveis na unidade
  const materials = useMemo(() =>
    [...new Set(unitRecords.map(r => r.material).filter(Boolean))].sort(),
    [unitRecords]
  );

  // Registros do material selecionado
  const materialRecords = useMemo(() =>
    selectedMaterial ? unitRecords.filter(r => r.material === selectedMaterial) : [],
    [unitRecords, selectedMaterial]
  );

  // Heatmap records para o material selecionado
  const heatmapRecords = useMemo((): HeatmapRecord[] =>
    materialRecords
      .filter(r => r.antimicrobiano)
      .map(r => ({
        agent: extractAgentFromResult(r.resultado),
        antibiotic: r.antimicrobiano,
        classification: r.classificacao,
      })),
    [materialRecords]
  );

  // Distribuição de materiais
  const materialDist = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of unitRecords) {
      const m = r.material || 'N/A';
      map.set(m, (map.get(m) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [unitRecords]);

  // Últimas culturas (agrupadas por OS)
  const latestByOS = useMemo(() => {
    const map = new Map<string, CultureRecord>();
    for (const r of unitRecords) {
      if (!map.has(r.codigoOS)) map.set(r.codigoOS, r);
    }
    return Array.from(map.values()).slice(0, 8);
  }, [unitRecords]);

  // Tooltip de hover: ATBs sensíveis para aquele paciente
  const hoverSensitive = useMemo(() => {
    if (!hoveredRecord) return [];
    return allRecords
      .filter(r => r.codigoOS === hoveredRecord.codigoOS && normalizeClassification(r.classificacao) === 'S')
      .map(r => r.antimicrobiano)
      .filter(Boolean);
  }, [hoveredRecord, allRecords]);

  const hoverAgent = useMemo(() =>
    hoveredRecord ? extractAgentFromResult(hoveredRecord.resultado) : '',
    [hoveredRecord]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <nav className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          <span>Controle de Infecção</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-blue-400">Monitoramento por Área</span>
        </nav>
        <h2 className="text-4xl font-black text-white tracking-tight">Monitoramento por Área</h2>
        <p className="text-slate-400 mt-2">Indicadores de resistência segregados por unidade hospitalar.</p>
      </section>

      {/* Cards por unidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {unitMetrics.length === 0 ? (
          <div className="col-span-full bg-slate-800/30 border border-dashed border-slate-700/40 rounded-2xl p-16 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-500 text-lg font-bold">Nenhuma unidade encontrada</p>
            <p className="text-slate-600 text-sm mt-2">Importe um arquivo Excel no Dashboard para visualizar os dados por área.</p>
          </div>
        ) : unitMetrics.map((metric, idx) => {
          const isAlert    = metric.pctR >= 30;
          const isSelected = selectedUnit === metric.unit;
          return (
            <motion.div
              key={metric.unit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              onClick={() => {
                setSelectedUnit(isSelected ? '' : metric.unit);
                setSelectedMaterial('');
              }}
              className={`
                cursor-pointer rounded-2xl border p-6 transition-all duration-200
                ${isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/5'
                  : isAlert
                    ? 'border-red-500/30 hover:border-red-400/50 bg-red-500/[0.03]'
                    : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/50'}
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAlert ? 'bg-red-500/15' : 'bg-blue-500/10'}`}>
                    <Building2 className={`w-5 h-5 ${isAlert ? 'text-red-400' : 'text-blue-400'}`} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-100 text-sm">{metric.unit}</p>
                    <p className="text-[10px] text-slate-500">{metric.os} O.S. registradas</p>
                  </div>
                </div>
                {isAlert && (
                  <span className="flex items-center gap-1 text-[9px] font-black text-red-300 bg-red-500/15 border border-red-400/20 rounded-full px-2 py-1 uppercase tracking-wide">
                    <AlertTriangle className="w-3 h-3" /> Alerta
                  </span>
                )}
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-400">Resistência</span>
                  <span className={`text-lg font-black ${metric.pctR >= 30 ? 'text-red-400' : 'text-slate-200'}`}>
                    {metric.pctR}%
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.pctR}%` }}
                    transition={{ duration: 1.2, delay: idx * 0.1 }}
                    className={`h-full rounded-full ${metric.pctR >= 30 ? 'bg-red-500' : metric.pctR >= 15 ? 'bg-amber-500' : 'bg-green-500'}`}
                  />
                </div>
                <p className="text-[10px] text-slate-600 mt-1">{metric.resistant} de {metric.total} testes</p>
              </div>

              <div className="space-y-1.5">
                {metric.topAgents.slice(0, 3).map(([name, count]) => (
                  <div key={name} className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 italic truncate mr-2">{name}</span>
                    <span className="text-slate-500 font-mono flex-shrink-0">{count}x</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Gráfico comparativo */}
      {chartData.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8">
          <h3 className="text-lg font-bold text-white mb-6">Comparativo de Resistência por Área</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} dy={10} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }}
                  formatter={(value, name) => [value, name === 'culturas' ? 'Culturas (O.S.)' : 'Resistentes']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Legend iconType="circle" iconSize={8} formatter={(v) => v === 'culturas' ? 'Culturas (O.S.)' : 'Resistentes'} />
                <Bar dataKey="culturas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resistentes" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detalhe da unidade selecionada */}
      <AnimatePresence>
        {selectedUnit && unitRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header do detalhe */}
            <div className="bg-slate-800/50 border border-blue-500/30 rounded-2xl overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">
                    Detalhes — <span className="text-blue-400">{selectedUnit}</span>
                  </h3>
                </div>
                
                {/* Filtro de Período */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div className="flex bg-slate-900/50 rounded-lg p-1 border border-slate-700/50">
                    {[
                      { key: 'all', label: 'Todos' },
                      { key: '1y', label: '1 Ano' },
                      { key: '90d', label: '90 Dias' },
                      { key: '30d', label: '30 Dias' },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setPeriod(opt.key as any)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                          period === opt.key
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Distribuição por Material — clicável */}
                <div>
                  <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wide flex items-center gap-2">
                    <FlaskConical className="w-4 h-4" />
                    Distribuição por Material
                    <span className="text-[10px] font-normal text-slate-600 normal-case">(clique para ver heatmap)</span>
                  </h4>
                  <div className="space-y-3">
                    {materialDist.slice(0, 8).map(([mat, count]) => {
                      const pct = Math.round((count / unitRecords.length) * 100);
                      const isActiveMat = selectedMaterial === mat;
                      return (
                        <div
                          key={mat}
                          className={`space-y-1.5 cursor-pointer group rounded-xl px-3 py-2 transition-all ${
                            isActiveMat ? 'bg-blue-500/10 ring-1 ring-blue-500/30' : 'hover:bg-slate-700/30'
                          }`}
                          onClick={() => setSelectedMaterial(isActiveMat ? '' : mat)}
                        >
                          <div className="flex justify-between text-xs">
                            <span className={`font-semibold ${isActiveMat ? 'text-blue-300' : 'text-slate-300 group-hover:text-slate-200'}`}>
                              {mat}
                            </span>
                            <span className="text-slate-500 font-mono">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1 }}
                              className={`h-full rounded-full ${isActiveMat ? 'bg-blue-500' : 'bg-slate-500'}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Últimas culturas com hover e "Ver mais" */}
                <div className="relative">
                  <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wide flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Últimas Culturas na Unidade
                  </h4>
                  <div className="space-y-2">
                    {latestByOS.map(r => {
                      const agent = extractAgentFromResult(r.resultado);
                      return (
                        <div
                          key={r.codigoOS}
                          className="relative flex justify-between items-center text-xs bg-slate-700/30 hover:bg-slate-700/50 rounded-xl px-4 py-2.5 cursor-pointer transition-all group"
                          onMouseEnter={(e) => {
                            setHoveredRecord(r);
                            setHoverPos({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                          onMouseLeave={() => setHoveredRecord(null)}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-200 font-semibold block truncate">{r.nomePaciente}</span>
                            <span className="text-slate-500 font-mono text-[10px]">{r.codigoOS} · {r.dataColeta}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              normalizeClassification(r.classificacao) === 'R' ? 'bg-red-500/15 text-red-400' :
                              normalizeClassification(r.classificacao) === 'S' ? 'bg-green-500/15 text-green-400' :
                              'bg-amber-500/15 text-amber-400'
                            }`}>{r.classificacao || '?'}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); setModalOS({ os: r.codigoOS, nome: r.nomePaciente }); }}
                              className="opacity-0 group-hover:opacity-100 px-2 py-0.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-all"
                            >
                              Ver mais
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap do material selecionado */}
            <AnimatePresence>
              {selectedMaterial && heatmapRecords.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-slate-800/50 border border-cyan-500/30 rounded-2xl overflow-hidden"
                >
                  <div className="px-8 py-5 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FlaskConical className="w-5 h-5 text-cyan-400" />
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Heatmap de Sensibilidade — <span className="text-cyan-400">{selectedMaterial}</span>
                        </h3>
                        <p className="text-xs text-slate-500">{selectedUnit} · {materialRecords.length} registros</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedMaterial('')}
                      className="text-slate-500 hover:text-slate-300 transition-colors text-xs font-bold px-3 py-1 rounded-lg hover:bg-slate-700"
                    >
                      ✕ Fechar
                    </button>
                  </div>
                  <div className="p-8">
                    <SensitivityHeatmap2D
                      records={heatmapRecords}
                      title={`Agentes isolados em ${selectedMaterial} — ${selectedUnit}`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip de hover com agente e ATBs sensíveis */}
      <AnimatePresence>
        {hoveredRecord && (
          <motion.div
            className="fixed z-50 pointer-events-none"
            style={{ left: hoverPos.x + 16, top: hoverPos.y - 80 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
          >
            <div className="bg-slate-900 border border-slate-600/60 rounded-xl shadow-2xl px-4 py-3 max-w-xs">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Agente</p>
              <p className="text-sm font-bold text-white italic mb-2">{hoverAgent || 'Não identificado'}</p>
              {hoverSensitive.length > 0 && (
                <>
                  <p className="text-[10px] font-black text-green-400 uppercase tracking-wider mb-1">ATBs Sensíveis</p>
                  <div className="flex flex-wrap gap-1">
                    {[...new Set(hoverSensitive)].slice(0, 6).map(d => (
                      <span key={d} className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-[10px] font-bold text-green-300">
                        {d}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal "Ver mais" */}
      {modalOS && (
        <CultureDetailModal
          os={modalOS.os}
          nomePaciente={modalOS.nome}
          allRecords={allRecords}
          onClose={() => setModalOS(null)}
        />
      )}
    </div>
  );
}
