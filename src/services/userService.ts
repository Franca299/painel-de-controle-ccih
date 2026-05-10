import { collection, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

// =====================================================================
// userService — Gerenciamento de acesso (coleção: usuarios)
// =====================================================================

/** Listener em tempo real para todos os usuários (uso exclusivo do admin) */
export const subscribeToAllUsers = (
  callback: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): (() => void) => {
  return onSnapshot(
    collection(db, 'usuarios'),
    (snap) => {
      const users = snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
      users.sort((a, b) => a.nome.localeCompare(b.nome));
      callback(users);
    },
    (err) => onError?.(err)
  );
};

/** Atualiza o status de um usuário */
export const updateUserStatus = async (
  uid: string,
  status: 'pendente' | 'aprovado' | 'bloqueado'
): Promise<void> => {
  await updateDoc(doc(db, 'usuarios', uid), { status });
};

/** Atualiza a role de um usuário */
export const updateUserRole = async (
  uid: string,
  role: 'user' | 'admin'
): Promise<void> => {
  await updateDoc(doc(db, 'usuarios', uid), { role });
};
