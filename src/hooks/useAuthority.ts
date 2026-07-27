import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { AuthorityProfile, AuthorityRole } from '../types/authority';

export const useAuthority = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthorityProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, department')
        .eq('id', userId)
        .single();

      if (error && (error.code === 'PGRST116' || error.message.includes('No rows'))) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              role: user.user_metadata?.role || 'student',
              department: user.user_metadata?.department || null
            }, { onConflict: 'id' })
            .select('id, full_name, role, department')
            .single();

          if (!createError && newProfile) {
            setProfile(newProfile as AuthorityProfile);
            return;
          }
        }
      }

      if (error) {
        console.error('Error fetching authority profile:', error);
        setProfile(null);
      } else {
        setProfile(data as AuthorityProfile);
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authListener: any = null;

    const setupAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error in useAuthority setupAuth:', error);
        if (mounted) setIsLoading(false);
      }

      if (!mounted) return;

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted || event === 'INITIAL_SESSION') return;
        
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      });
      authListener = subscription;
    };

    setupAuth();

    return () => {
      mounted = false;
      if (authListener) authListener.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, fullName: string, role: AuthorityRole, department: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            department: department
          },
        },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Error in authority signUp:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      // Fetch profile immediately after sign in to verify role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) throw profileError;
      
      return { data, profile: profileData, error: null };
    } catch (error: any) {
      console.error('Error in authority signIn:', error);
      return { data: null, profile: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Error in authority signOut:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    profile,
    isLoading,
    signUp,
    signIn,
    signOut
  };
};
