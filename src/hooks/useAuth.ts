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
    async function checkAdmin(u: User | null, s: Session | null) {
      if (!u) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }
      setAdminLoading(true);
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', u.id)
          .abortSignal(AbortSignal.timeout(8000))
          .maybeSingle();

        if (error) {
          // Fallback to metadata
          const metaRole = u.user_metadata?.role || u.app_metadata?.role || s?.user?.user_metadata?.role;
          setIsAdmin(metaRole === 'admin');
        } else {
          setIsAdmin(!!data);
        }
      } catch {
        const metaRole = u.user_metadata?.role || u.app_metadata?.role || s?.user?.user_metadata?.role;
        setIsAdmin(metaRole === 'admin');
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
        void checkAdmin(currentUser, session);
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
      void checkAdmin(currentUser, session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, isAdmin, loading, adminLoading, supabase };
}
