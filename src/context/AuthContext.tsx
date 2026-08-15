import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { toast } from 'react-hot-toast';

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
    console.log('AuthProvider initialized');
    
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'Session exists' : 'No session');
      if (session?.user) {
        console.log('Session user found:', session.user.email);
        fetchUser(session.user.id);
      } else {
        console.log('No session user found');
        setLoading(false);
      }
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
      if (session?.user) {
        console.log('New session user:', session.user.email);
        await fetchUser(session.user.id);
      } else {
        console.log('User signed out or session expired');
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUser = async (userId: string) => {
    console.log('Fetching user profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, display_name, role, points, created_at, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        toast.error('Error loading user profile');
        setUser(null);
        return;
      }

      if (!data) {
        console.error('No user data found for ID:', userId);
        toast.error('User profile not found');
        setUser(null);
        return;
      }

      // Convert the data to match our User type
      const userData: User = {
        id: data.user_id,
        email: data.email,
        name: data.display_name,
        role: data.role || 'user',
        points: Number(data.points) || 0,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      };

      console.log('User profile fetched:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Unexpected error fetching user:', error);
      toast.error('Unexpected error loading user profile');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const maxRetries = 3;
    let retryCount = 0;

    const attemptSignIn = async (): Promise<void> => {
      try {
        console.log(`Attempt ${retryCount + 1} to sign in for:`, email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        console.log('Sign in successful:', data.user?.email);
        toast.success('Welcome back!');
      } catch (error: any) {
        console.error(`Sign in error (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < maxRetries - 1 && 
            (error.message?.includes('fetch') || error.message?.includes('network'))) {
          retryCount++;
          console.log(`Retrying sign in... (attempt ${retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          return attemptSignIn();
        }
        
        toast.error(error.message || 'Failed to sign in');
        throw error;
      }
    };

    return attemptSignIn();
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
        console.log('Attempting to create/update user profile for:', data.user.id);
        
        // First, check if the profile already exists (by user_id)
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
          console.error('Error checking existing profile:', fetchError);
          throw new Error('Failed to check existing profile: ' + fetchError.message);
        }

        if (existingProfile) {
          console.log('Profile already exists:', existingProfile);
          // Update display_name only, preserve existing role and points
          const { error: updateError, data: updatedProfile } = await supabase
            .from('profiles')
            .update({ display_name: name })
            .eq('user_id', data.user.id)
            .select()
            .single();

          if (updateError) {
            console.error('Profile update error:', updateError);
            throw new Error('Failed to update user profile: ' + updateError.message);
          }
          console.log('Profile updated successfully:', updatedProfile);
        } else {
          // Create new profile
          const newProfile = {
            user_id: data.user.id,
            email,
            display_name: name,
            role: 'user',
            points: 1000, // Starting bankroll of 1000 fake dollars
            is_eliminated: false,
            on_redemption_island: false
          };

          const { error: insertError, data: createdProfile } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

          if (insertError) {
            console.error('Profile creation error:', insertError);
            console.error('Profile creation error details:', {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint
            });
            throw new Error('Failed to create user profile: ' + insertError.message);
          }
          console.log('Profile created successfully:', createdProfile);
        }
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
    if (error) {
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }

    // Clear local user state immediately
    setUser(null);
    toast.success('Signed out successfully');
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