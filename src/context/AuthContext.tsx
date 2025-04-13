import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUser(session.user.id);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUser = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return;
    }

    setUser(data);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log('Starting signup process...');
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.error('Auth signup error:', signUpError);
        // Check for rate limiting error
        if (signUpError.message?.includes('security purposes') || signUpError.message?.includes('after')) {
          throw new Error('Please wait a moment before trying to sign up again.');
        }
        throw new Error(signUpError.message);
      }

      console.log('Auth signup successful:', data);

      if (data.user) {
        const userProfile = {
          id: data.user.id,
          email,
          name,
          role: 'user',
          points: 0,
          is_super: false,
          is_anonymous: false
        };
        
        console.log('Attempting to create user profile:', userProfile);
        
        const { error: profileError, data: profileData } = await supabase
          .from('users')
          .insert([userProfile])
          .select()
          .single();

        if (profileError) {
          console.error('Profile creation error:', profileError);
          console.error('Profile creation error details:', {
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint
          });
          throw new Error('Failed to create user profile: ' + profileError.message);
        }

        console.log('Profile created successfully:', profileData);
      } else {
        throw new Error('No user data returned from signup');
      }
    } catch (error: any) {
      console.error('Signup process error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 