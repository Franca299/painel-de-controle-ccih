import React, { useMemo } from 'react';
import { motion } from 'motion/react';

// =====================================================================
// SensitivityHeatmap2D — Grade Agente × Antibiótico com S/I/R colorido
// =====================================================================

export interface HeatmapRecord {
  agent: string;          // agente bacteriano
  antibiotic: string;     // nome do ATB
  classification: string; // S, I, R ou texto completo
}

interface Props {
  records: HeatmapRecord[];
  title?: string;
  maxAgents?: number;
  maxAntibiotics?: number;
}

/** Normaliza classificação para S | I | R | '' */
export const normalizeClassification = (c: string): 'S' | 'I' | 'R' | '' => {
  const u = (c || '').toUpperCase().trim();
  if (u === 'S' || u.startsWith('SEN')) return 'S';
  if (u === 'I' || u.startsWith('INT') || u.startsWith('INTER')) return 'I';
  if (u === 'R' || u.startsWith('RES')) return 'R';
  return '';
};

interface Cell {
  s: number; i: number; r: number; total: number;
  pctS: number; pctR: number; dominant: 'S' | 'I' | 'R' | 'none';
}

const CELL_COLORS = {
  S:    { bg: 'bg-green-500/20',  border: 'border-green-500/30',  text: 'text-green-300' },
  I:    { bg: 'bg-amber-500/20',  border: 'border-amber-500/30',  text: 'text-amber-300' },
  R:    { bg: 'bg-red-500/20',    border: 'border-red-500/30',    text: 'text-red-300'   },
  none: { bg: 'bg-slate-800/40',  border: 'border-slate-700/30',  text: 'text-slate-600' },
};

export default function SensitivityHeatmap2D({ records, title, maxAgents = 12, maxAntibiotics = 20 }: Props) {
  const { agents, antibiotics, matrix } = useMemo(() => {
    // Contar frequência de agentes e ATBs
    const agentCount = new Map<string, number>();
    const abxCount   = new Map<string, number>();

    for (const r of records) {
      if (!r.agent || !r.antibiotic) continue;
      agentCount.set(r.agent, (agentCount.get(r.agent) || 0) + 1);
      abxCount.set(r.antibiotic, (abxCount.get(r.antibiotic) || 0) + 1);
    }

    // Ordenar por frequência, limitar
    const agents = Array.from(agentCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxAgents)
      .map(([a]) => a);

    const antibiotics = Array.from(abxCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxAntibiotics)
      .map(([a]) => a);

    // Construir matriz
    const matrix: Map<string, Map<string, Cell>> = new Map();

    for (const agent of agents) {
      const row = new Map<string, Cell>();
      for (const abx of antibiotics) {
        row.set(abx, { s: 0, i: 0, r: 0, total: 0, pctS: 0, pctR: 0, dominant: 'none' });
      }
      matrix.set(agent, row);
    }

    for (const r of records) {
      const agentRow = matrix.get(r.agent);
      if (!agentRow) continue;
      const cell = agentRow.get(r.antibiotic);
      if (!cell) continue;

      const cl = normalizeClassification(r.classification);
      if (cl === 'S') cell.s++;
      else if (cl === 'I') cell.i++;
      else if (cl === 'R') cell.r++;

      cell.total = cell.s + cell.i + cell.r;
      cell.pctS  = cell.total > 0 ? Math.round((cell.s / cell.total) * 100) : 0;
      cell.pctR  = cell.total > 0 ? Math.round((cell.r / cell.total) * 100) : 0;

      if (cell.r >= cell.s && cell.r >= cell.i) cell.dominant = cell.total > 0 ? 'R' : 'none';
      else if (cell.s >= cell.i) cell.dominant = cell.total > 0 ? 'S' : 'none';
      else cell.dominant = cell.total > 0 ? 'I' : 'none';
    }

    return { agents, antibiotics, matrix };
  }, [records, maxAgents, maxAntibiotics]);

  if (agents.length === 0 || antibiotics.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 text-sm">
        Dados insuficientes para gerar o heatmap.
      </div>
    );
  }

  return (
    <div>
      {title && <h4 className="text-sm font-bold text-slate-300 mb-4">{title}</h4>}

      {/* Legenda */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {(['S', 'I', 'R'] as const).map(k => (
          <div key={k} className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className={`w-3 h-3 rounded-sm border ${CELL_COLORS[k].bg} ${CELL_COLORS[k].border}`} />
            <span className={CELL_COLORS[k].text}>
              {k === 'S' ? 'Sensível' : k === 'I' ? 'Intermediário' : 'Resistente'}
            </span>
          </div>
        ))}
        <span className="text-[10px] text-slate-600 ml-2">Valor = % predominante</span>
      </div>

      {/* Grid scrollável */}
      <div className="overflow-x-auto">
        <table className="min-w-max border-collapse text-[11px]">
          <thead>
            <tr>
              {/* Célula vazia no canto */}
              <th className="sticky left-0 z-10 bg-slate-900 min-w-[160px] pr-3 pb-2 text-left text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                Agente \ ATB
              </th>
              {antibiotics.map(abx => (
                <th key={abx} className="px-1 pb-2 font-bold text-slate-400" style={{ minWidth: 64 }}>
                  <div className="text-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', maxHeight: 80, fontSize: 10 }}>
                    {abx}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {agents.map((agent, agIdx) => (
              <motion.tr
                key={agent}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: agIdx * 0.04 }}
              >
                {/* Nome do agente */}
                <td className="sticky left-0 z-10 bg-slate-900 py-1.5 pr-3 font-semibold text-slate-200 whitespace-nowrap italic">
                  {agent}
                </td>
                {/* Células */}
                {antibiotics.map(abx => {
                  const cell = matrix.get(agent)?.get(abx);
                  const d = cell?.dominant ?? 'none';
                  const cfg = CELL_COLORS[d];
                  const display = cell && cell.total > 0
                    ? (d === 'S' ? cell.pctS : d === 'R' ? cell.pctR : cell.i > 0 ? Math.round((cell.i / cell.total) * 100) : 0)
                    : null;

                  return (
                    <td key={abx} className="px-1 py-1">
                      <div
                        className={`w-14 h-9 rounded-lg border flex flex-col items-center justify-center cursor-default transition-all hover:scale-105 ${cfg.bg} ${cfg.border}`}
                        title={cell && cell.total > 0
                          ? `${agent} × ${abx}\nS: ${cell.s} (${cell.pctS}%) | I: ${cell.i} | R: ${cell.r} (${cell.pctR}%)\nTotal: ${cell.total}`
                          : `${agent} × ${abx} — sem dados`}
                      >
                        {cell && cell.total > 0 ? (
                          <>
                            <span className={`font-black text-xs ${cfg.text}`}>{display}%</span>
                            <span className="text-[8px] text-slate-500">{cell.total}t</span>
                          </>
                        ) : (
                          <span className="text-slate-700 text-xs">—</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
