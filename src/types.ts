// =====================================================================
// Types — Painel de Controle Infectológico
// Schema baseado nas colunas reais do Excel laboratorial
// =====================================================================

/** Registro completo de uma linha do Excel de microbiologia */
export interface CultureRecord {
  // --- Identificação ---
  /** Chave de deduplicação no Firestore: `${codigoOS}_${antimicrobiano}` */
  id: string;
  unidadeColeta: string;
  codigoOS: string;
  dataOS: string;
  horaOS: string;

  // --- Paciente ---
  nomePaciente: string;
  sexo: string;
  idade: string;
  dataNascimento: string;

  // --- Exame ---
  mnemonico: string;
  procedimento: string;
  material: string;
  status: string;
  grupo: string;
  resultado: string;
  notificacaoCompulsoria: string;
  dataColeta: string;
  horaColeta: string;
  dataAssinatura: string;
  horaAssinatura: string;
  contagemColonias: string;
  observacoesIsolado: string;

  // --- Antibiograma ---
  antimicrobiano: string;
  /** S = Sensível, I = Intermediário, R = Resistente */
  classificacao: 'S' | 'I' | 'R' | string;
  mic: string;

  // --- Metadados de ingestão ---
  uploadedAt?: string;
  uploadedBy?: string;
  fileName?: string;
}

/** Resumo de sensibilidade para um agente × antibiótico */
export interface SensitivitySummary {
  agent: string;
  antibiotic: string;
  total: number;
  s: number;
  i: number;
  r: number;
  pctS: number;
  pctI: number;
  pctR: number;
}

/** Item do mapa de patógenos por unidade */
export interface PathogenMapItem {
  sector: string;
  agents: { name: string; count: number }[];
  total: number;
}

/** Estado dos filtros do dashboard */
export interface FilterState {
  periodo: '30d' | '90d' | 'year' | 'all';
  setor: string;
  agente: string;
}

/** KPIs calculados a partir dos registros */
export interface KpiData {
  totalCulturas: number;
  prevalenciaMDR: number;
  alertasCriticos: number;
}

/** Perfil do usuário no Firestore (coleção: usuarios) */
export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  status: 'pendente' | 'aprovado' | 'bloqueado';
  role: 'user' | 'admin';
  criadoEm: string;
}

/** Mapeamento normalizado de colunas do Excel */
export const EXCEL_COLUMN_MAP: Record<string, keyof CultureRecord> = {
  'unidade de coleta': 'unidadeColeta',
  'código da o.s.': 'codigoOS',
  'codigo da o.s.': 'codigoOS',
  'data da o.s.': 'dataOS',
  'hora da o.s.': 'horaOS',
  'nome do paciente': 'nomePaciente',
  'sexo': 'sexo',
  'idade': 'idade',
  'data de nascimento': 'dataNascimento',
  'mnemônico': 'mnemonico',
  'mnemonico': 'mnemonico',
  'procedimento': 'procedimento',
  'material': 'material',
  'status': 'status',
  'grupo': 'grupo',
  'resultado': 'resultado',
  'notificação compulsória': 'notificacaoCompulsoria',
  'notificacao compulsoria': 'notificacaoCompulsoria',
  'data coleta': 'dataColeta',
  'hora coleta': 'horaColeta',
  'data assinatura': 'dataAssinatura',
  'hora assinatura': 'horaAssinatura',
  'contagem de colônias': 'contagemColonias',
  'contagem de colonias': 'contagemColonias',
  'observações do isolado': 'observacoesIsolado',
  'observacoes do isolado': 'observacoesIsolado',
  'antimicrobiano': 'antimicrobiano',
  'classificação': 'classificacao',
  'classificacao': 'classificacao',
  'mic': 'mic',
};

/** Agentes MDR conhecidos */
export const MDR_AGENTS = ['MRSA', 'VRE', 'KPC', 'ESBL', 'NDM', 'OXA-48', 'Acinetobacter', 'baumannii'];

/** Classificação S/I/R para label e cor */
export const SENSITIVITY_CONFIG = {
  S: { label: 'Sensível', color: '#15803d', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  I: { label: 'Intermediário', color: '#b45309', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  R: { label: 'Resistente', color: '#b91c1c', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
} as const;
