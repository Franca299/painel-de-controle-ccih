import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Microscope, FlaskConical } from 'lucide-react';
import { CultureRecord } from '../types';
import { extractAgentFromResult } from '../services/fileParser';
import { normalizeClassification } from './SensitivityHeatmap2D';

// =====================================================================
// CultureDetailModal — Modal "Ver mais" de uma O.S./paciente
// =====================================================================

interface Props {
  os: string;
  nomePaciente: string;
  allRecords: CultureRecord[];
  onClose: () => void;
}

type Period = 'all' | '30d' | '90d' | '1y';

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: '30d', label: 'Último mês' },
  { key: '90d', label: '3 meses' },
  { key: '1y',  label: 'Este ano' },
];

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

const SIRBadge = ({ cl }: { cl: string }) => {
  const n = normalizeClassification(cl);
  const cfg = {
    S: 'bg-green-500/15 text-green-300 border-green-500/25',
    I: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
    R: 'bg-red-500/15 text-red-300 border-red-500/25',
    '': 'bg-slate-700/40 text-slate-400 border-slate-600/30',
  }[n];
  const label = { S: 'Sensível', I: 'Interm.', R: 'Resistente', '': cl || '—' }[n];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${cfg}`}>
      {label}
    </span>
  );
};

export default function CultureDetailModal({ os, nomePaciente, allRecords, onClose }: Props) {
  const [period, setPeriod] = useState<Period>('all');

  // Todos os registros para essa O.S.
  const osRecords = useMemo(() =>
    allRecords.filter(r => r.codigoOS === os),
    [allRecords, os]
  );

  // Filtrar por período
  const filtered = useMemo(() => {
    if (period === 'all') return osRecords;
    const now = Date.now();
    const ms = { '30d': 30, '90d': 90, '1y': 365 }[period] * 86400000;
    return osRecords.filter(r => {
      const d = parseDateBR(r.dataColeta);
      return d && (now - d.getTime()) <= ms;
    });
  }, [osRecords, period]);

  // Agrupar por material + agente
  const groups = useMemo(() => {
    const map = new Map<string, { agent: string; material: string; records: CultureRecord[] }>();
    for (const r of filtered) {
      const agent = extractAgentFromResult(r.resultado);
      const key = `${r.material || 'N/A'}__${agent}`;
      if (!map.has(key)) map.set(key, { agent, material: r.material || 'N/A', records: [] });
      map.get(key)!.records.push(r);
    }
    return Array.from(map.values()).sort((a, b) => b.records.length - a.records.length);
  }, [filtered]);

  // Sensíveis encontrados
  const sensitiveDrugs = useMemo(() =>
    filtered.filter(r => normalizeClassification(r.classificacao) === 'S').map(r => r.antimicrobiano).filter(Boolean),
    [filtered]
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          className="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-8 py-5 border-b border-slate-700/50 flex-shrink-0">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalhe da O.S.</p>
              <h3 className="text-xl font-black text-white mt-0.5">{nomePaciente}</h3>
              <p className="text-sm text-slate-400 font-mono">O.S. {os}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filtro de período */}
          <div className="px-8 py-4 border-b border-slate-800/60 flex items-center gap-3 flex-shrink-0">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Período:</span>
            <div className="flex gap-2">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setPeriod(opt.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    period === opt.key
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-slate-500">{filtered.length} registros</span>
          </div>

          {/* Corpo scrollável */}
          <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="text-lg font-bold">Nenhum registro neste período</p>
              </div>
            ) : (
              <>
                {/* ATBs sensíveis */}
                {sensitiveDrugs.length > 0 && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl px-5 py-4">
                    <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">
                      ✓ Antimicrobianos Sensíveis Encontrados
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set(sensitiveDrugs)].map(d => (
                        <span key={d} className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs font-bold text-green-300">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grupos agente × material */}
                {groups.map((g, gi) => (
                  <div key={gi} className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-700/30 flex items-center gap-3">
                      <FlaskConical className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-slate-100 text-sm italic">{g.agent}</p>
                        <p className="text-[10px] text-slate-500">Material: {g.material}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-700/30">
                            {['Antimicrobiano', 'Classificação', 'MIC', 'Data Coleta', 'Data Assinatura'].map(h => (
                              <th key={h} className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {g.records.map((r, ri) => (
                            <tr key={ri} className="hover:bg-blue-500/[0.04] transition-colors">
                              <td className="px-4 py-2.5 text-sm font-medium text-slate-200">{r.antimicrobiano || '—'}</td>
                              <td className="px-4 py-2.5"><SIRBadge cl={r.classificacao} /></td>
                              <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.mic || '—'}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.dataColeta || '—'}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{r.dataAssinatura || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
