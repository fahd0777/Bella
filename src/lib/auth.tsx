import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

type AuthCtx = { session: Session | null; loading: boolean; recovery: boolean; clearRecovery: () => void; signOut: (all?: boolean) => Promise<void> };
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') qc.clear(); // never keep private data in memory after logout
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const signOut = async (all = false) => {
    await supabase.auth.signOut({ scope: all ? 'global' : 'local' });
    sessionStorage.clear();
    qc.clear();
  };

  return <Ctx.Provider value={{ session, loading, recovery, clearRecovery: () => setRecovery(false), signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
