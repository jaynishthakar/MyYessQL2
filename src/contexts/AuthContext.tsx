import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'student' | 'lab' | 'hod' | 'principal' | 'admin' | 'librarian' | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authListener: any = null;

    const setupAuth = async () => {
      try {
        // Only fetch session once
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching initial session:', error);
        if (mounted) setLoading(false);
      }

      if (!mounted) return;

      // Subscribe to future changes, ignoring the immediate INITIAL_SESSION
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted || event === 'INITIAL_SESSION') return;
        
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setRole(null);
          setLoading(false);
        }
      });
      authListener = subscription;
    };

    setupAuth();

    return () => {
      mounted = false;
      if (authListener) authListener.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      // 1. Try to fetch the role
      let { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      // 2. If profile is missing (PGRST116 code), create it automatically
      if (error && (error.code === 'PGRST116' || error.message.includes('No rows'))) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              role: user.user_metadata?.role || 'student',
              student_uid: user.user_metadata?.student_uid || null,
              department: user.user_metadata?.department || null
            }, { onConflict: 'id' })
            .select('role')
            .single();

          if (!createError && newProfile) {
            setRole(newProfile.role as UserRole);
            return;
          } else {
            console.error('Failed to auto-heal profile:', createError);
          }
        }
      }

      if (error) {
        console.error('Error fetching role:', error);
        setRole(null);
      } else {
        setRole(data?.role as UserRole);
      }
    } catch (err) {
      console.error('Unexpected error fetching role:', err);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setUser(null);
      setRole(null);
      setSession(null);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshRole = async () => {
    if (user) await fetchUserRole(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, role, session, loading, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
