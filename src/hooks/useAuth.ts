import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin(u: User | null, s: Session | null) {
      if (!u) {
        setIsAdmin(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', u.id)
          .maybeSingle();

        if (error) {
          // Fallback to metadata
          const metaRole = u.user_metadata?.role || u.app_metadata?.role || s?.user?.user_metadata?.role;
          setIsAdmin(metaRole === 'admin');
        } else {
          setIsAdmin(!!data);
        }
      } catch {
        setIsAdmin(false);
      }
    }

    // Busca sessão atual
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await checkAdmin(currentUser, session);
      }
      setLoading(false);
    });

    // Escuta mudanças de auth (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await checkAdmin(currentUser, session);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, isAdmin, loading, supabase };
}
