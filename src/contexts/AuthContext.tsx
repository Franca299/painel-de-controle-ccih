import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  AuthError,
} from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

// =====================================================================
// AuthContext — Painel de Controle Infectológico
// =====================================================================

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nome: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const formatAuthError = (code: string): string => {
  const messages: Record<string, string> = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/weak-password': 'A senha deve ter ao menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.',
    'auth/invalid-credential': 'Credenciais inválidas. Verifique e-mail e senha.',
    'auth/network-request-failed': 'Erro de rede. Verifique sua conexão.',
  };
  return messages[code] || `Erro de autenticação: ${code}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Ref para poder cancelar o listener de perfil ao trocar de usuário
  const unsubProfileRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Cancela listener anterior de perfil
      if (unsubProfileRef.current) {
        unsubProfileRef.current();
        unsubProfileRef.current = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        const profileRef = doc(db, 'usuarios', firebaseUser.uid);
        // Listener em tempo real: se o admin aprovar, o usuário é liberado automaticamente
        unsubProfileRef.current = onSnapshot(
          profileRef,
          async (snap) => {
            if (snap.exists()) {
              // Documento encontrado — atualiza perfil e libera loading
              setUserProfile({ uid: snap.id, ...snap.data() } as UserProfile);
              setLoading(false);
            } else {
              // Documento NÃO existe (usuário criado antes do sistema de acesso).
              // Cria automaticamente com status "pendente" para não travar o loading.
              try {
                await setDoc(profileRef, {
                  uid: firebaseUser.uid,
                  nome: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
                  email: firebaseUser.email || '',
                  status: 'pendente',
                  role: 'user',
                  criadoEm: new Date().toISOString(),
                });
                // O próximo snapshot (disparado pelo setDoc acima) vai setar o perfil
              } catch {
                // Se as regras do Firestore bloquearem a criação, paramos o loading aqui
                setUserProfile(null);
                setLoading(false);
              }
            }
          },
          () => {
            setUserProfile(null);
            setLoading(false);
          }
        );
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfileRef.current) unsubProfileRef.current();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(formatAuthError((err as AuthError).code));
      throw err;
    }
  };

  /**
   * Registra novo usuário no Firebase Auth E cria ficha no Firestore
   * com status "pendente" — aguardando aprovação do administrador.
   */
  const register = async (email: string, password: string, nome: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'usuarios', cred.user.uid), {
        uid: cred.user.uid,
        nome: nome.trim(),
        email,
        status: 'pendente',
        role: 'user',
        criadoEm: new Date().toISOString(),
      });
    } catch (err) {
      setAuthError(formatAuthError((err as AuthError).code));
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, login, register, logout, authError, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
