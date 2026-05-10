import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CultureRecord } from '../types';

// =====================================================================
// Firestore Service — Painel de Controle Infectológico
// Coleção: "culturas" — cada documento = 1 linha do antibiograma
// ID do documento = chave de deduplicação: codigoOS_antimicrobiano
// =====================================================================

const COLLECTION = 'culturas';

/**
 * Salva registros no Firestore usando setDoc (upsert por ID único).
 * ID = codigoOS_antimicrobiano → garante deduplicação.
 */
export const uploadCultures = async (
  records: CultureRecord[]
): Promise<{ saved: number; skipped: number; errors: number; errorDetails: string[] }> => {
  let saved = 0;
  let skipped = 0;
  const errorDetails: string[] = [];

  if (records.length === 0) {
    return { saved: 0, skipped: 0, errors: 0, errorDetails: ['Nenhum registro válido encontrado no arquivo.'] };
  }

  console.log(`[Firestore] Iniciando upload de ${records.length} registros...`);

  // Testar acesso ao Firestore antes do upload
  try {
    await getDocs(collection(db, COLLECTION));
    console.log('[Firestore] Acesso à coleção OK.');
  } catch (testErr: unknown) {
    const msg = (testErr as Error).message || String(testErr);
    console.error('[Firestore] Falha no teste de acesso:', msg);
    errorDetails.push(`PERMISSÃO NEGADA: ${msg}`);
    return { saved: 0, skipped: 0, errors: records.length, errorDetails };
  }

  // Salvar em lotes de 50 para melhor controle de erros
  const CHUNK_SIZE = 50;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async (record) => {
      try {
        const docRef = doc(db, COLLECTION, record.id);
        await setDoc(docRef, {
          ...record,
          _updatedAt: Timestamp.now(),
        });
        saved++;
        console.log(`[Firestore] Salvo: ${record.id}`);
      } catch (err: unknown) {
        const msg = (err as Error).message || String(err);
        console.error(`[Firestore] Erro no doc ${record.id}:`, msg);
        errorDetails.push(`${record.id}: ${msg}`);
        if (msg.includes('Missing or insufficient permissions')) {
          skipped++;
        }
      }
    }));
  }

  const errors = errorDetails.length;
  console.log(`[Firestore] Upload concluído: ${saved} salvos, ${skipped} bloqueados, ${errors} erros`);
  return { saved, skipped, errors, errorDetails };
};

/**
 * Listener em tempo real — SEM orderBy para evitar exigência de índice.
 * Ordenação feita no cliente.
 */
export const subscribeToCultures = (
  callback: (records: CultureRecord[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  // Query simples sem orderBy — não exige índice composto
  const q = query(collection(db, COLLECTION));

  console.log('[Firestore] Iniciando listener em tempo real...');

  return onSnapshot(
    q,
    (snapshot) => {
      console.log(`[Firestore] Snapshot recebido: ${snapshot.size} documentos`);
      const records: CultureRecord[] = snapshot.docs.map(d => d.data() as CultureRecord);

      // Ordenar por data de coleta no cliente (mais recente primeiro)
      records.sort((a, b) => {
        const parseDate = (s: string) => {
          if (!s) return 0;
          // Suporta DD/MM/YYYY e YYYY-MM-DD
          const parts = s.includes('/') ? s.split('/').reverse() : s.split('-');
          return new Date(parts.join('-')).getTime();
        };
        return parseDate(b.dataColeta) - parseDate(a.dataColeta);
      });

      callback(records);
    },
    (err) => {
      console.error('[Firestore] Erro no listener:', err.message);
      onError?.(err);
    }
  );
};
