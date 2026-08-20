import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin(u: User | null) {
      if (!u) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }
      setAdminLoading(true);
      try {
        const { data, error } = await supabase.rpc('is_admin').abortSignal(AbortSignal.timeout(8000));
        setIsAdmin(error ? false : data === true);
      } catch {
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    }

    // Busca sessão atual
    async function initializeSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        void checkAdmin(currentUser);
      } catch {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setAdminLoading(false);
      } finally {
        setLoading(false);
      }
    }

    void initializeSession();

    // Escuta mudanças de auth (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
      void checkAdmin(currentUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, isAdmin, loading, adminLoading, supabase };
}
