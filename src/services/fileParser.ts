import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { CultureRecord, EXCEL_COLUMN_MAP } from '../types';

// =====================================================================
// File Parser — Painel de Controle Infectológico
// Colunas reais do Excel:
// Unidade de coleta | Código da O.S. | Data da O.S. | Hora da O.S. |
// Nome do paciente | Sexo | Idade | Data de nascimento | Mnemônico |
// Procedimento | Material | Status | Grupo | Resultado |
// Notificação Compulsória | Data coleta | Hora coleta |
// Data assinatura | Hora assinatura | Contagem de colônias |
// Observações do isolado | Antimicrobiano | Classificação | Mic
// =====================================================================

/** Normaliza para lowercase sem acentos nem espaços extras */
const normalize = (s: string): string =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/\s+/g, ' ')              // colapsa espaços múltiplos
    .trim();

/**
 * Mapeamento direto + aliases alternativos para garantir máxima compatibilidade.
 * Chaves: versão normalizada do cabeçalho real do Excel.
 */
const COLUMN_ALIASES: Record<string, keyof CultureRecord> = {
  // Unidade
  'unidade de coleta': 'unidadeColeta',
  'unidade':           'unidadeColeta',

  // OS
  'codigo da o.s.':    'codigoOS',
  'codigo da os':      'codigoOS',
  'codigo os':         'codigoOS',
  'num os':            'codigoOS',
  'os':                'codigoOS',

  // Datas/horas da OS
  'data da o.s.':      'dataOS',
  'data da os':        'dataOS',
  'data os':           'dataOS',
  'hora da o.s.':      'horaOS',
  'hora da os':        'horaOS',
  'hora os':           'horaOS',

  // Paciente
  'nome do paciente':  'nomePaciente',
  'paciente':          'nomePaciente',
  'nome paciente':     'nomePaciente',
  'nome':              'nomePaciente',
  'sexo':              'sexo',
  'idade':             'idade',
  'data de nascimento':'dataNascimento',
  'nascimento':        'dataNascimento',

  // Exame
  'mnemonico':         'mnemonico',
  'mnemônico':         'mnemonico',
  'procedimento':      'procedimento',
  'material':          'material',
  'status':            'status',
  'grupo':             'grupo',
  'resultado':         'resultado',

  // Notificação
  'notificacao compulsoria': 'notificacaoCompulsoria',
  'notificação compulsória': 'notificacaoCompulsoria',
  'notificacao':             'notificacaoCompulsoria',

  // Coleta
  'data coleta':       'dataColeta',
  'hora coleta':       'horaColeta',

  // Assinatura
  'data assinatura':   'dataAssinatura',
  'hora assinatura':   'horaAssinatura',

  // Cultura
  'contagem de colonias':   'contagemColonias',
  'contagem de colônias':   'contagemColonias',
  'contagem colonias':      'contagemColonias',
  'contagem':               'contagemColonias',
  'observacoes do isolado': 'observacoesIsolado',
  'observações do isolado': 'observacoesIsolado',
  'observacoes':            'observacoesIsolado',

  // Antibiograma
  'antimicrobiano':    'antimicrobiano',
  'classificacao':     'classificacao',
  'classificação':     'classificacao',
  'mic':               'mic',
};

/** Aplica também as entradas do EXCEL_COLUMN_MAP original */
const buildMergedMap = (): Record<string, keyof CultureRecord> => {
  const merged: Record<string, keyof CultureRecord> = { ...COLUMN_ALIASES };
  for (const [k, v] of Object.entries(EXCEL_COLUMN_MAP)) {
    const nk = normalize(k);
    if (!merged[nk]) merged[nk] = v;
  }
  return merged;
};

const MERGED_MAP = buildMergedMap();

/** Encontra o campo correto para um cabeçalho, tentando várias estratégias */
const resolveField = (rawKey: string): keyof CultureRecord | null => {
  const n = normalize(rawKey);

  // 1. Correspondência exata
  if (MERGED_MAP[n]) return MERGED_MAP[n];

  // 2. Correspondência parcial por substring
  for (const [alias, field] of Object.entries(MERGED_MAP)) {
    if (n.includes(alias) || alias.includes(n)) return field;
  }

  return null;
};

/** Mapeia uma linha bruta para CultureRecord */
const mapRowToRecord = (
  rawRow: Record<string, unknown>,
  uploadedBy: string,
  rowIndex: number,
  fileName: string
): CultureRecord | null => {
  const record: Partial<CultureRecord> = {
    uploadedAt: new Date().toISOString(),
    uploadedBy,
    fileName,
  };

  for (const [rawKey, rawValue] of Object.entries(rawRow)) {
    const field = resolveField(rawKey);
    if (field) {
      (record as Record<string, unknown>)[field] = rawValue != null ? String(rawValue).trim() : '';
    }
  }

  // Validar campo mínimo obrigatório: Código da O.S.
  if (!record.codigoOS || record.codigoOS === '') {
    return null; // Linha sem OS é inválida (pode ser rodapé ou linha vazia)
  }

  // Garantir campos com valor padrão
  record.nomePaciente         = record.nomePaciente         || '';
  record.unidadeColeta        = record.unidadeColeta        || '';
  record.dataOS               = record.dataOS               || '';
  record.horaOS               = record.horaOS               || '';
  record.sexo                 = record.sexo                 || '';
  record.idade                = record.idade                || '';
  record.dataNascimento       = record.dataNascimento       || '';
  record.mnemonico            = record.mnemonico            || '';
  record.procedimento         = record.procedimento         || '';
  record.material             = record.material             || '';
  record.status               = record.status               || '';
  record.grupo                = record.grupo                || '';
  record.resultado            = record.resultado            || '';
  record.notificacaoCompulsoria = record.notificacaoCompulsoria || 'Não';
  record.dataColeta           = record.dataColeta           || '';
  record.horaColeta           = record.horaColeta           || '';
  record.dataAssinatura       = record.dataAssinatura       || '';
  record.horaAssinatura       = record.horaAssinatura       || '';
  record.contagemColonias     = record.contagemColonias     || '';
  record.observacoesIsolado   = record.observacoesIsolado   || '';
  record.antimicrobiano       = record.antimicrobiano       || '';
  record.classificacao        = record.classificacao        || '';
  record.mic                  = record.mic                  || '';

  // Gerar ID de deduplicação (mais estrito agora, incluindo data de coleta):
  const abx = record.antimicrobiano.replace(/[^a-zA-Z0-9]/g, '_');
  const os  = record.codigoOS.replace(/[^a-zA-Z0-9]/g, '_');
  const dt  = record.dataColeta.replace(/[^a-zA-Z0-9]/g, '_');
  record.id = abx ? `${os}_${dt}_${abx}` : `${os}_${dt}_row${rowIndex}`;

  return record as CultureRecord;
};

/** Remove duplicatas dentro do arquivo (mesmo ID composto) */
const deduplicateLocal = (records: CultureRecord[]): CultureRecord[] => {
  const seen = new Set<string>();
  return records.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
};

export interface ParseResult {
  records: CultureRecord[];
  total: number;
  skipped: number;
  diagnostics: string;   // Informações para exibir ao usuário
}

/** Parse de XLSX */
const parseXLSX = (file: File, uploadedBy: string): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false, cellText: true });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Ler linhas como arrays para inspecionar os cabeçalhos reais
        const aoa: string[][] = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: '',
          raw: false,
        });

        if (aoa.length < 2) {
          return resolve({ records: [], total: 0, skipped: 0, diagnostics: 'Arquivo vazio ou sem dados.' });
        }

        // Encontrar a linha de cabeçalho (primeira linha com "O.S." ou "paciente" ou "Antimicrobiano")
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(10, aoa.length); i++) {
          const rowStr = aoa[i].join(' ').toLowerCase();
          if (
            rowStr.includes('o.s.') ||
            rowStr.includes('paciente') ||
            rowStr.includes('antimicrobiano') ||
            rowStr.includes('material')
          ) {
            headerRowIndex = i;
            break;
          }
        }

        const headers: string[] = aoa[headerRowIndex].map(h => String(h));
        const diagnostics = `Cabeçalhos encontrados (linha ${headerRowIndex + 1}): ${headers.filter(Boolean).join(' | ')}`;

        // Converter linhas de dados em objetos com os cabeçalhos encontrados
        const records: CultureRecord[] = [];
        let skipped = 0;

        for (let rowIdx = headerRowIndex + 1; rowIdx < aoa.length; rowIdx++) {
          const row = aoa[rowIdx];
          // Pular linhas completamente vazias
          if (row.every(cell => !cell || String(cell).trim() === '')) {
            skipped++;
            continue;
          }

          // Montar objeto com cabeçalhos reais
          const rowObj: Record<string, unknown> = {};
          headers.forEach((h, colIdx) => {
            if (h) rowObj[h] = row[colIdx] ?? '';
          });

          const record = mapRowToRecord(rowObj, uploadedBy, rowIdx, file.name);
          if (record) {
            records.push(record);
          } else {
            skipped++;
          }
        }

        const deduped = deduplicateLocal(records);
        resolve({
          records: deduped,
          total: deduped.length,
          skipped,
          diagnostics,
        });
      } catch (err) {
        reject(new Error(`Erro ao processar XLSX: ${(err as Error).message}`));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsArrayBuffer(file);
  });
};

/** Parse de CSV */
const parseCSV = (file: File, uploadedBy: string): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (result) => {
        try {
          const headers = result.meta.fields || [];
          const diagnostics = `Cabeçalhos CSV: ${headers.join(' | ')}`;
          const records: CultureRecord[] = [];
          let skipped = 0;

          result.data.forEach((row, idx) => {
            const record = mapRowToRecord(row, uploadedBy, idx, file.name);
            if (record) records.push(record);
            else skipped++;
          });

          const deduped = deduplicateLocal(records);
          resolve({ records: deduped, total: deduped.length, skipped, diagnostics });
        } catch (err) {
          reject(new Error(`Erro CSV: ${(err as Error).message}`));
        }
      },
      error: (err) => reject(new Error(`Erro de parse: ${err.message}`)),
    });
  });
};

/** Dispatcher principal */
export const parseFile = async (
  file: File,
  uploadedBy: string
): Promise<ParseResult> => {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXLSX(file, uploadedBy);
  }
  if (name.endsWith('.csv')) {
    return parseCSV(file, uploadedBy);
  }
  throw new Error('Formato não suportado. Use XLSX, XLS ou CSV.');
};

// =====================================================================
// Agregação de sensibilidade para Heatmap
// =====================================================================

export interface AgentSensitivityProfile {
  antimicrobiano: string;
  total: number;
  s: number;
  i: number;
  r: number;
  pctS: number;
  pctI: number;
  pctR: number;
}

/** Extrai o agente do campo "resultado" */
export const extractAgentFromResult = (resultado: string): string => {
  if (!resultado) return 'Desconhecido';
  const patterns = [
    /OBSE?\s*[-–]?\s*(.+?)(?:\s+(?:Não|Sim)|$)/i,
    /Si Par\s+(.+?)(?:\s+(?:Não|Sim)|$)/i,
    /([A-Z][a-z]+ [a-z]+(?:\s+[a-z]+)?)/,
    /([A-Z][a-z]{3,})/,
  ];
  for (const p of patterns) {
    const m = resultado.match(p);
    if (m && m[1]?.trim().length > 2) return m[1].trim();
  }
  return resultado.trim().slice(0, 40) || 'Desconhecido';
};

/** Calcula perfil de sensibilidade por agente */
export const aggregateSensitivityForAgent = (
  records: CultureRecord[],
  agentKeyword: string
): AgentSensitivityProfile[] => {
  const kw = agentKeyword.toLowerCase();
  const agentRecords = records.filter(r =>
    (r.resultado || '').toLowerCase().includes(kw) ||
    extractAgentFromResult(r.resultado).toLowerCase().includes(kw)
  );

  const byAbx = new Map<string, { s: number; i: number; r: number }>();
  for (const rec of agentRecords) {
    if (!rec.antimicrobiano) continue;
    if (!byAbx.has(rec.antimicrobiano)) byAbx.set(rec.antimicrobiano, { s: 0, i: 0, r: 0 });
    const c = byAbx.get(rec.antimicrobiano)!;
    const cl = (rec.classificacao || '').toUpperCase();
    if (cl === 'S') c.s++;
    else if (cl === 'I') c.i++;
    else if (cl === 'R') c.r++;
  }

  return Array.from(byAbx.entries())
    .map(([antimicrobiano, c]) => {
      const total = c.s + c.i + c.r;
      return {
        antimicrobiano,
        total,
        ...c,
        pctS: total > 0 ? Math.round((c.s / total) * 100) : 0,
        pctI: total > 0 ? Math.round((c.i / total) * 100) : 0,
        pctR: total > 0 ? Math.round((c.r / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.pctR - a.pctR);
};
