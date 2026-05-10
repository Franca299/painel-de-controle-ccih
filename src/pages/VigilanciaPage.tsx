import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, ChevronRight, User, FlaskConical, TestTube, Dna } from 'lucide-react';
import { subscribeToCultures } from '../services/firestoreService';
import { CultureRecord } from '../types';
import { normalizeClassification } from '../components/SensitivityHeatmap2D';

// =====================================================================
// VigilanciaPage — Vigilância de Culturas (busca em tempo real)
// =====================================================================

const SensitivityBadge = ({ cl }: { cl: string }) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    R: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Resistente' },
    S: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Sensível' },
    I: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Intermediário' },
  };
  const k = normalizeClassification(cl);
  const cfg = map[k] || { bg: 'bg-slate-700', text: 'text-slate-300', label: cl || '—' };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold uppercase ${cfg.bg} ${cfg.text} border border-current/20`}>
      {cfg.label}
    </span>
  );
};

export default function VigilanciaPage() {
  const [allRecords, setAllRecords] = useState<CultureRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');

  useEffect(() => {
    return subscribeToCultures(records => {
      setAllRecords(records);
    });
  }, []);

  const uniqueMaterials = useMemo(
    () => [...new Set(allRecords.map(r => r.material).filter(Boolean))].sort(),
    [allRecords]
  );

  // Filtro combinado: busca por paciente, agente, antimicrobiano, OS
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allRecords.filter(r => {
      const matchesSearch = !q || [
        r.nomePaciente, r.resultado, r.antimicrobiano, r.codigoOS,
        r.material, r.unidadeColeta, r.classificacao
      ].some(f => f?.toLowerCase().includes(q));

      const matchesMaterial = !filterMaterial || r.material === filterMaterial;
      return matchesSearch && matchesMaterial;
    });
  }, [allRecords, search, filterMaterial]);

  // Agrupar por OS para a visualização em cards
  const grouped = useMemo(() => {
    const map = new Map<string, CultureRecord[]>();
    for (const r of filtered) {
      const key = r.codigoOS || 'sem-os';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).slice(0, 40);
  }, [filtered]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <nav className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          <span>Controle de Infecção</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-blue-400">Vigilância de Culturas</span>
        </nav>
        <h2 className="text-4xl font-black text-white tracking-tight">Vigilância de Culturas</h2>
        <p className="text-slate-400 mt-2">Monitoramento em tempo real · {filtered.length} registros correspondentes</p>
      </section>

      {/* Busca + filtro */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="search-vigilancia"
            type="text"
            placeholder="Buscar por paciente, agente, antimicrobiano, O.S., material..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-700 rounded-xl pl-11 pr-4 py-3.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <select
          value={filterMaterial}
          onChange={e => setFilterMaterial(e.target.value)}
          className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer min-w-[200px]"
        >
          <option value="">Todos os Materiais</option>
          {uniqueMaterials.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Cards agrupados por O.S. */}
      <div className="space-y-6">
        {grouped.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-bold">Nenhum resultado encontrado</p>
            <p className="text-sm">Ajuste os termos de busca ou limpe os filtros</p>
          </div>
        ) : (
          grouped.map(([os, rows], idx) => {
            const first = rows[0];
            const rCount = rows.filter(r => normalizeClassification(r.classificacao) === 'R').length;
            const sCount = rows.filter(r => normalizeClassification(r.classificacao) === 'S').length;
            const hasCritical = rCount > 0;
            const isFullySensitive = !hasCritical && sCount > 0;
            return (
              <motion.div
                key={os}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`bg-slate-800/50 border rounded-2xl overflow-hidden transition-all
                  ${hasCritical ? 'border-red-500/30' : isFullySensitive ? 'border-green-500/30' : 'border-slate-700/50'}`}
              >
                {/* Card Header */}
                <div className={`px-6 py-4 flex flex-wrap justify-between items-center gap-4
                  ${hasCritical ? 'bg-red-500/5' : isFullySensitive ? 'bg-green-500/5' : 'bg-slate-800/60'} border-b border-slate-700/40`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                      ${hasCritical ? 'bg-red-500/10' : isFullySensitive ? 'bg-green-500/10' : 'bg-blue-500/10'}`}>
                      <User className={`w-5 h-5 ${hasCritical ? 'text-red-400' : isFullySensitive ? 'text-green-400' : 'text-blue-400'}`} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-100 text-base">{first.nomePaciente}</p>
                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 mt-0.5 font-medium">
                        <span>OS: <span className="text-slate-300 font-mono">{os}</span></span>
                        <span>Sexo: <span className="text-slate-300">{first.sexo}</span></span>
                        <span>Idade: <span className="text-slate-300">{first.idade}</span></span>
                        <span>Unidade: <span className="text-slate-300">{first.unidadeColeta}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <TestTube className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-slate-400">{first.material}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Dna className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-slate-400 max-w-[200px] truncate" title={first.resultado}>{first.resultado}</span>
                    </div>
                    {hasCritical && (
                      <span className="px-3 py-1 bg-red-500/15 border border-red-400/30 rounded-full text-[10px] font-extrabold text-red-300 uppercase tracking-wide animate-pulse">
                        {rCount} Resistente{rCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Antibiogram rows */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-700/30 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <th className="px-6 py-3">Antimicrobiano</th>
                        <th className="px-6 py-3">Classificação</th>
                        <th className="px-6 py-3">MIC</th>
                        <th className="px-6 py-3">Data Coleta</th>
                        <th className="px-6 py-3">Data Assinatura</th>
                        <th className="px-6 py-3">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/20 text-sm">
                      {rows.map(row => (
                        <tr key={row.id} className="hover:bg-blue-500/[0.03] transition-colors">
                          <td className="px-6 py-3 font-semibold text-slate-200 flex items-center gap-2">
                            <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
                            {row.antimicrobiano || '—'}
                          </td>
                          <td className="px-6 py-3"><SensitivityBadge cl={row.classificacao} /></td>
                          <td className="px-6 py-3 font-mono text-slate-400 text-xs">{row.mic || '—'}</td>
                          <td className="px-6 py-3 font-mono text-slate-500 text-xs">{row.dataColeta}</td>
                          <td className="px-6 py-3 font-mono text-slate-500 text-xs">{row.dataAssinatura}</td>
                          <td className="px-6 py-3 text-slate-500 text-xs italic">{row.observacoesIsolado || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
