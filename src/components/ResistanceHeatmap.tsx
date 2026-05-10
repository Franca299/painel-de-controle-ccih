import React, { useState, useRef } from 'react';
import { ANTIBIOTIC_GROUPS, AGENT_GROUPS, HEATMAP_MATRIX, HeatCell } from '../data/heatmapData';
import { Filter } from 'lucide-react';
import { motion } from 'motion/react';

// ---- helpers ----
function pct(cell: HeatCell): number | null {
  if (!cell || cell.n === 0) return null;
  return Math.round((cell.r / cell.n) * 100);
}

function getColor(p: number | null): string {
  if (p === null) return '#f1f5f9';
  if (p === 0)    return '#dcfce7';
  if (p <= 15)    return '#86efac';
  if (p <= 30)    return '#fde68a';
  if (p <= 50)    return '#fdba74';
  if (p <= 75)    return '#f87171';
  return '#b91c1c';
}

function getTextColor(p: number | null): string {
  if (p === null) return '#94a3b8';
  if (p <= 50)    return '#1e293b';
  return '#fff';
}

interface Tooltip {
  cell: HeatCell;
  agente: string;
  antibiotico: string;
  x: number;
  y: number;
}

// ---- all antibiotics flattened in group order ----
const ALL_ANTIBIOTICS = ANTIBIOTIC_GROUPS.flatMap(g => g.antibioticos);
const ALL_AGENTS = AGENT_GROUPS.flatMap(g => g.agentes);

export default function ResistanceHeatmap() {
  const [filterGrupo, setFilterGrupo] = useState<string>('Todos');
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleAgents = filterGrupo === 'Todos'
    ? ALL_AGENTS
    : AGENT_GROUPS.find(g => g.nome === filterGrupo)?.agentes ?? ALL_AGENTS;

  // Column widths
  const AGENT_COL = 164;
  const CELL_W    = 56;
  const CELL_H    = 42;

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl border border-outline-variant shadow-xl shadow-primary/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-8 py-6 border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low/40">
        <div>
          <h3 className="text-xl font-bold text-primary">Heatmap de Resistência Antimicrobiana</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Antibiograma coletivo — % de resistência (R) por agente × antimicrobiano
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-wrap">
          {[
            { label: 'Sem dados', color: '#f1f5f9', text: '#94a3b8' },
            { label: '0%',        color: '#dcfce7', text: '#1e293b' },
            { label: '≤ 15%',     color: '#86efac', text: '#1e293b' },
            { label: '≤ 30%',     color: '#fde68a', text: '#1e293b' },
            { label: '≤ 50%',     color: '#fdba74', text: '#1e293b' },
            { label: '≤ 75%',     color: '#f87171', text: '#fff'    },
            { label: '> 75%',     color: '#b91c1c', text: '#fff'    },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-sm border border-black/10 flex-shrink-0" style={{ background: l.color }} />
              <span className="text-[10px] font-bold text-on-surface-variant">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 border-b border-outline-variant/60 flex items-center gap-4 bg-white">
        <Filter className="w-4 h-4 text-on-surface-variant" />
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Grupo</span>
        <div className="flex gap-2 flex-wrap">
          {['Todos', ...AGENT_GROUPS.map(g => g.nome)].map(g => (
            <button
              key={g}
              onClick={() => setFilterGrupo(g)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                filterGrupo === g
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto" ref={containerRef}>
        <div style={{ minWidth: AGENT_COL + ALL_ANTIBIOTICS.length * CELL_W + 16, position: 'relative' }}>

          {/* === ANTIBIOTIC GROUP HEADERS === */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-outline-variant/60">
            {/* spacer for agent column */}
            <div style={{ width: AGENT_COL, minWidth: AGENT_COL }} className="flex-shrink-0 border-r border-outline-variant/40" />
            {ANTIBIOTIC_GROUPS.map(group => (
              <div
                key={group.nome}
                style={{
                  width: group.antibioticos.length * CELL_W,
                  minWidth: group.antibioticos.length * CELL_W,
                  borderLeft: `3px solid ${group.cor}`,
                }}
                className="flex-shrink-0 px-2 py-2 text-[10px] font-extrabold uppercase tracking-wider truncate"
                title={group.nome}
              >
                <span style={{ color: group.cor }}>{group.nome}</span>
              </div>
            ))}
          </div>

          {/* === ANTIBIOTIC NAME ROW === */}
          <div className="flex sticky top-[37px] z-20 bg-white/95 backdrop-blur-sm border-b-2 border-outline-variant">
            <div style={{ width: AGENT_COL, minWidth: AGENT_COL }} className="flex-shrink-0 px-3 py-2 text-[10px] font-extrabold text-on-surface-variant uppercase tracking-widest border-r border-outline-variant/40">
              Agente
            </div>
            {ALL_ANTIBIOTICS.map(ab => (
              <div
                key={ab}
                style={{ width: CELL_W, minWidth: CELL_W, height: 52 }}
                className="flex-shrink-0 flex items-end justify-center pb-1.5 border-l border-outline-variant/20"
              >
                <span
                  className="text-[9px] font-bold text-on-surface-variant/70 whitespace-nowrap"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 48, overflow: 'hidden' }}
                >
                  {ab}
                </span>
              </div>
            ))}
          </div>

          {/* === AGENT ROWS === */}
          {AGENT_GROUPS.map(group => {
            const agents = group.agentes.filter(a => visibleAgents.includes(a));
            if (!agents.length) return null;
            return (
              <React.Fragment key={group.nome}>
                {/* group label row */}
                <div
                  className="flex items-center px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-b border-outline-variant/30"
                  style={{ background: group.cor + '12', color: group.cor }}
                >
                  <span style={{ width: AGENT_COL - 16 }}>◆ {group.nome}</span>
                </div>

                {agents.map((agente, ai) => {
                  const row = HEATMAP_MATRIX[agente] ?? {};
                  return (
                    <motion.div
                      key={agente}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: ai * 0.04 }}
                      className={`flex items-center border-b border-outline-variant/20 hover:bg-primary/[0.02] transition-colors group ${ai % 2 === 1 ? 'bg-surface-container-low/30' : 'bg-white'}`}
                    >
                      {/* Agent name cell */}
                      <div
                        style={{ width: AGENT_COL, minWidth: AGENT_COL, height: CELL_H, borderLeft: `3px solid ${group.cor}` }}
                        className="flex-shrink-0 flex items-center px-3 border-r border-outline-variant/40"
                      >
                        <span className="text-xs font-bold text-on-surface italic truncate">{agente}</span>
                      </div>

                      {/* Antibiotic cells */}
                      {ALL_ANTIBIOTICS.map((ab, ci) => {
                        const cell = row[ab] ?? null;
                        const p = pct(cell);
                        return (
                          <div
                            key={ab}
                            style={{
                              width: CELL_W,
                              minWidth: CELL_W,
                              height: CELL_H,
                              background: getColor(p),
                              color: getTextColor(p),
                              borderLeft: ci === 0 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                            }}
                            className="flex-shrink-0 flex items-center justify-center text-[11px] font-black cursor-pointer relative transition-all hover:z-10 hover:scale-110 hover:shadow-lg hover:shadow-black/10"
                            onMouseEnter={e => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const cont = containerRef.current?.getBoundingClientRect();
                              setTooltip({
                                cell,
                                agente,
                                antibiotico: ab,
                                x: rect.left - (cont?.left ?? 0) + rect.width / 2,
                                y: rect.top - (cont?.top ?? 0),
                              });
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {p === null ? '—' : `${p}%`}
                          </div>
                        );
                      })}
                    </motion.div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-50 bg-on-surface text-white text-xs rounded-xl shadow-2xl px-4 py-3 min-w-[180px]"
            style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
          >
            <p className="font-black italic text-sm mb-1">{tooltip.agente}</p>
            <p className="font-bold text-white/70 mb-2">{tooltip.antibiotico}</p>
            {tooltip.cell ? (
              <>
                <div className="flex justify-between gap-4"><span className="text-green-300 font-bold">S</span><span>{tooltip.cell.s} ({Math.round(tooltip.cell.s/tooltip.cell.n*100)}%)</span></div>
                <div className="flex justify-between gap-4"><span className="text-yellow-300 font-bold">I</span><span>{tooltip.cell.i} ({Math.round(tooltip.cell.i/tooltip.cell.n*100)}%)</span></div>
                <div className="flex justify-between gap-4"><span className="text-red-300 font-bold">R</span><span>{tooltip.cell.r} ({Math.round(tooltip.cell.r/tooltip.cell.n*100)}%)</span></div>
                <div className="border-t border-white/20 mt-2 pt-1.5 text-white/60 text-[10px]">n = {tooltip.cell.n} testes</div>
              </>
            ) : (
              <p className="text-white/50 italic text-[11px]">Não aplicável</p>
            )}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-8 py-4 border-t border-outline-variant/60 bg-surface-container-low/30 flex flex-wrap gap-6 text-[11px] text-on-surface-variant">
        <span>Agentes: <strong className="text-primary">{ALL_AGENTS.length}</strong></span>
        <span>Antimicrobianos: <strong className="text-primary">{ALL_ANTIBIOTICS.length}</strong></span>
        <span>Testes totais: <strong className="text-primary">
          {Object.values(HEATMAP_MATRIX).reduce((acc, row) =>
            acc + Object.values(row).reduce((a, c) => a + (c?.n ?? 0), 0), 0)}
        </strong></span>
        <span className="ml-auto italic text-[10px]">Período: Jan–Mai 2026 · Dados laboratoriais anonimizados</span>
      </div>
    </motion.section>
  );
}
